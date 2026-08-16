# The Dockerfile, explained for a Docker beginner

This walks through `server/Dockerfile` section by section. A couple of core concepts first, since they
explain *why* the file is structured the way it is.

## Core concepts

**Image vs. container.** A Dockerfile describes how to build an **image** — a read-only snapshot of a
filesystem plus some metadata (what command to run, what ports it uses, etc.). A **container** is a
running instance of that image. You build the image once (`docker compose build`); you can start/stop many
containers from it.

**Layers and caching.** Each instruction that changes the filesystem (`RUN`, `COPY`, `ADD`) creates a new
**layer**, stacked on top of the previous one. Docker caches layers: if a layer's instruction and its
inputs haven't changed since the last build, Docker reuses the cached result instead of re-running it.
This is why instruction *order* matters — put things that change rarely (installing system packages) near
the top, and things that change often (your own code) near the bottom. If you edit one line in an early
`RUN`, every layer after it gets rebuilt, even if unrelated.

With that, here's the file top to bottom:

## `FROM python:3.11-slim-bookworm`
Every image starts `FROM` a base image. This one is the official Python 3.11 image, `slim` variant
(smaller — fewer preinstalled packages than the default Python image), on Debian "bookworm". It's built
for multiple CPU architectures (amd64 and arm64), which is why it works unmodified on your Apple Silicon
Mac and would also work on an Intel machine or a cloud VM.

## `ENV ... noninteractive / unbuffered / no pip cache`
`ENV` sets environment variables that persist into the running container (not just at build time).
- `DEBIAN_FRONTEND=noninteractive` — stops `apt-get` from trying to pop up interactive prompts (there's no
  terminal to answer them during a build, so this avoids the build hanging).
- `PYTHONUNBUFFERED=1` — makes Python's `print()` output show up immediately in `docker compose logs`
  instead of being buffered and appearing in delayed chunks.
- `PIP_NO_CACHE_DIR=1` — tells `pip` not to keep its own download cache, which would otherwise bloat the
  image for no benefit (you're not going to `pip install` again inside a running container).

## Installing system packages
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
        openjdk-17-jdk-headless \
        procps \
        curl \
    && rm -rf /var/lib/apt/lists/*
```
`RUN` executes a shell command *at build time*, and its result (the filesystem changes it makes) becomes
a layer. A few things worth noting:
- Everything is chained with `&&` into **one** `RUN` instruction on purpose. If `apt-get update` and
  `apt-get install` were separate `RUN` lines, Docker might cache the `update` layer from days ago and
  reuse it even though the package index is stale — chaining them means they always run together fresh.
- `openjdk-17-jdk-headless` is the actual point of this block: Spark is a JVM (Java) application, so it
  needs a Java runtime present, "headless" meaning no GUI components (unneeded in a server/container
  context, saves space).
- `--no-install-recommends` skips optional packages apt would otherwise pull in "just in case" — smaller
  image.
- `rm -rf /var/lib/apt/lists/*` at the end deletes apt's package index cache. It's only useful for future
  `apt-get` calls, which won't happen (we're done with apt), so keeping it would just waste image space.

## Resolving `JAVA_HOME`
```dockerfile
RUN JAVA_PATH="$(dirname "$(dirname "$(readlink -f "$(which javac)")")")" \
    && ln -s "$JAVA_PATH" /opt/java-home
ENV JAVA_HOME=/opt/java-home
ENV PATH="$JAVA_HOME/bin:$PATH"
```
Java tools (like Spark) need a `JAVA_HOME` environment variable pointing at where Java is installed. The
catch: Debian installs OpenJDK to a path that includes the CPU architecture in the folder name —
`.../java-17-openjdk-amd64` on Intel, `.../java-17-openjdk-arm64` on your Mac. Hardcoding either one would
break the other architecture. Instead, this asks the system directly: "where's the `javac` binary that's
actually on the PATH right now?" (`which javac`), resolves any symlinks to find the real location
(`readlink -f`), and walks up two directories (`dirname` twice: from `.../bin/javac` up to the JDK root).
It then creates a fixed symlink (`/opt/java-home`) pointing at whatever that turned out to be, so the rest
of the file can just say `JAVA_HOME=/opt/java-home` regardless of architecture.

## `ARG` vs `ENV` for versions
```dockerfile
ARG PYSPARK_VERSION=3.5.3
...
ENV PYSPARK_VERSION=${PYSPARK_VERSION} ...
```
`ARG` defines a **build-time-only** variable (usable inside the Dockerfile / passable via
`docker build --build-arg`, but gone once the image exists). `ENV` defines a variable that's baked into
the image and available in every container started from it. This project needs the version numbers in
both places: at build time (to `pip install pyspark==${PYSPARK_VERSION}`) and at container runtime
(`entrypoint.sh` reads `$PYSPARK_VERSION` to build a `--packages` string when starting Spark Connect) — so
each version is declared once as `ARG`, then re-exposed as `ENV` so it survives into the running
container.

## Installing Python packages
```dockerfile
RUN pip install --no-cache-dir \
        "pyspark[connect]==${PYSPARK_VERSION}" \
        "delta-spark==${DELTA_VERSION}" \
        jupyterlab==4.2.5 \
        ipykernel \
        pandas \
        pytest
```
Standard `pip install`, pinned to specific versions where it matters (Spark/Delta must stay compatible
with each other — see the version table in the main README). `pyspark[connect]` — the `[connect]` is an
**extra**: it tells pip to also install the additional dependencies (`grpcio`, `protobuf`, etc.) that
Spark Connect needs, which aren't part of a plain `pyspark` install.

## Baking Delta/Spark-Connect jars into the image
```dockerfile
RUN python -c "\
from pyspark.sql import SparkSession; \
from delta import configure_spark_with_delta_pip; \
...
s = configure_spark_with_delta_pip(b, extra_packages=[...]).getOrCreate(); \
s.stop()"
```
This one is subtle: Delta and Spark Connect's actual Java/Scala code lives in separate `.jar` files that
Spark normally downloads on demand (via Maven, similar to how `pip` downloads Python packages) the first
time a session needs them. If that download happened at *container startup* instead, every
`docker compose up` would need internet access and would be slow. So instead, this `RUN` line starts and
immediately stops a throwaway Spark session **during the image build** (which does have internet access)
purely to trigger that download, so the `.jar` files end up cached inside the image itself. Every
container started from this image afterwards already has them — no network needed, fast startup.

## The Postgres JDBC driver — a real file, not a package
```dockerfile
RUN SPARK_JARS_DIR="$(python3 -c '...')" \
    && curl -sSL -o "${SPARK_JARS_DIR}/postgresql-${POSTGRES_JDBC_VERSION}.jar" "https://..."
```
Similar goal (get a `.jar` into the image), different mechanism, for a specific reason: the Postgres JDBC
driver needs to be visible to Java's `DriverManager` at JVM startup (see the metastore doc for the full
explanation) — the Maven-download approach above doesn't guarantee that. So instead this just directly
`curl`s the `.jar` file from Maven Central straight into Spark's own `jars/` folder, which Java always
scans at startup. Simpler and more reliable for this specific case.

## Setting up the workspace
```dockerfile
WORKDIR /home/spark
RUN mkdir -p /home/spark/work /home/spark/src /home/spark/tests /home/spark/data/delta
ENV PYTHONPATH="/home/spark/src:${PYTHONPATH}"
```
`WORKDIR` sets the default directory for subsequent instructions (and for commands run inside the
container later) — like `cd`, but persistent. The `mkdir -p` creates empty folders that `docker-compose.yml`'s
volume mounts will later attach your host folders to (`server/notebooks` → `/home/spark/work`, etc.) —
these need to exist before the mount happens. `PYTHONPATH` tells Python where else to look for importable
modules — this is what lets `from spark_session import get_spark` work anywhere in the container without
manually fiddling with `sys.path`.

## Copying in the entrypoint script
```dockerfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
```
`COPY` brings a file from your build context (the `server/` folder on your Mac, where you run
`docker build`/`docker compose build` from) into the image. `chmod +x` marks it executable — without this,
trying to run the script would fail with a permissions error.

## `EXPOSE`
```dockerfile
EXPOSE 8888 4040 15002
```
This is **documentation only** — a common beginner trip-up. `EXPOSE` doesn't actually make a port
reachable from your Mac; it just declares "this image listens on these ports" for anyone reading the
Dockerfile (and for tools that inspect the image). The thing that *actually* makes ports reachable is the
`ports:` section in `docker-compose.yml` (`"8888:8888"` etc.), which maps a port on your Mac to a port
inside the container.

## `ENTRYPOINT`
```dockerfile
ENTRYPOINT ["/entrypoint.sh"]
```
This is the command that runs when a container starts. `ENTRYPOINT` (as opposed to the similar `CMD`
instruction) makes it the fixed, always-runs command for this image — `entrypoint.sh` is what starts the
Spark Connect server and then JupyterLab (see the script itself, or the main README, for what it does).
Using the array syntax (`["/entrypoint.sh"]` rather than `/entrypoint.sh` as a bare string) runs it
directly rather than wrapping it in a shell, which is the generally-recommended form.

## Why the instruction order is what it is

Tying back to the caching concept from the top: system packages (rarely change) come first, then Python
package installs (change occasionally), then the jar-baking steps (change if you bump Spark/Delta
versions), then the workspace setup and `entrypoint.sh` copy (changes most often, as you iterate). This
ordering means editing `entrypoint.sh` and rebuilding only re-runs the last couple of layers — it doesn't
re-download Java, re-run `pip install`, or re-fetch jars, which is why `docker compose build` (without
`--no-cache`) is fast for small changes but `--no-cache` (which ignores all caching) is slow — you're
asking it to redo everything from scratch.
