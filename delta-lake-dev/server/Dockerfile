# =========================================================================
# Lightweight Spark + Delta Lake + JupyterLab + Spark Connect dev image
# Works on Apple Silicon (arm64) and amd64 - base python image is multi-arch
# =========================================================================
FROM python:3.11-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# ---- OS deps: JDK (Spark needs a JVM), curl for healthchecks/debug -------
RUN apt-get update && apt-get install -y --no-install-recommends \
        openjdk-17-jdk-headless \
        procps \
        curl \
    && rm -rf /var/lib/apt/lists/*

# JAVA_HOME differs between amd64 (.../java-17-openjdk-amd64) and
# arm64 (.../java-17-openjdk-arm64) Debian packages, so resolve it
# dynamically instead of hardcoding the arch suffix.
RUN JAVA_PATH="$(dirname "$(dirname "$(readlink -f "$(which javac)")")")" \
    && ln -s "$JAVA_PATH" /opt/java-home
ENV JAVA_HOME=/opt/java-home
ENV PATH="$JAVA_HOME/bin:$PATH"

# ---- Versions (kept in sync: Spark 3.5.x <-> delta-spark 3.2.x) ----------
# Declared as ARG *and* ENV so entrypoint.sh can read them at container
# runtime too (plain ARGs disappear after the build).
ARG PYSPARK_VERSION=3.5.3
ARG DELTA_VERSION=3.2.0
ARG SCALA_BIN_VERSION=2.12
ARG POSTGRES_JDBC_VERSION=42.7.4
ENV PYSPARK_VERSION=${PYSPARK_VERSION} \
    DELTA_VERSION=${DELTA_VERSION} \
    SCALA_BIN_VERSION=${SCALA_BIN_VERSION} \
    POSTGRES_JDBC_VERSION=${POSTGRES_JDBC_VERSION}

# pyspark[connect] extra pulls in grpcio/protobuf etc. needed to run the
# Spark Connect server (and would be needed client-side too, if you ever
# ran a connect client from inside this image).
RUN pip install --no-cache-dir \
        "pyspark[connect]==${PYSPARK_VERSION}" \
        "delta-spark==${DELTA_VERSION}" \
        jupyterlab==4.2.5 \
        ipykernel \
        pandas \
        pytest

# SPARK_HOME is resolved dynamically at container runtime in entrypoint.sh
# (via `python3 -c "import pyspark; ..."`) rather than hardcoded here - a
# hardcoded guess previously caused "start-connect-server.sh: command not
# found" because the guessed path didn't match the actual install location.

# ---- Bake Delta + Spark Connect server jars into the image at BUILD time -
# These are loaded via Spark's own extension/class-loading mechanism (not
# java.sql.DriverManager), so Ivy/`--packages` resolution works fine for
# them. Doing it once here (build time has internet) caches everything in
# the image's ivy cache, so `docker compose up` afterwards needs no
# internet and starts fast.
RUN python -c "\
from pyspark.sql import SparkSession; \
from delta import configure_spark_with_delta_pip; \
b = SparkSession.builder \
    .config('spark.sql.extensions', 'io.delta.sql.DeltaSparkSessionExtension') \
    .config('spark.sql.catalog.spark_catalog', 'org.apache.spark.sql.delta.catalog.DeltaCatalog'); \
s = configure_spark_with_delta_pip(b, extra_packages=[ \
    f'org.apache.spark:spark-connect_${SCALA_BIN_VERSION}:${PYSPARK_VERSION}' \
]).getOrCreate(); \
s.stop()"

# ---- Postgres JDBC driver: a REAL jar in Spark's jars/ dir, NOT resolved --
# via --packages/Ivy. This is the fix for:
#   "No suitable driver found for jdbc:postgresql://..."
# The Hive metastore's connection pool looks the driver up via
# java.sql.DriverManager, which only reliably discovers drivers that were
# on the classpath at JVM startup. A jar added later via spark.jars.packages
# lives in a separate classloader that DriverManager can't see - so the
# driver "exists" but is invisible at connection time. Placing it directly
# in $SPARK_HOME/jars (scanned into the classpath from JVM startup) avoids
# that class-loading gap entirely.
RUN SPARK_JARS_DIR="$(python3 -c 'import pyspark, os; print(os.path.join(os.path.dirname(pyspark.__file__), "jars"))')" \
    && curl -sSL -o "${SPARK_JARS_DIR}/postgresql-${POSTGRES_JDBC_VERSION}.jar" \
       "https://repo1.maven.org/maven2/org/postgresql/postgresql/${POSTGRES_JDBC_VERSION}/postgresql-${POSTGRES_JDBC_VERSION}.jar" \
    && echo "Postgres JDBC driver installed to ${SPARK_JARS_DIR}:" \
    && ls "${SPARK_JARS_DIR}" | grep postgresql

# ---- Workspace layout ------------------------------------------------
# /home/spark/work        -> notebooks (bind-mounted, edited from VSCode)
# /home/spark/src         -> ../shared/ (bind-mounted - spark_session.py)
# /home/spark/tests       -> server/tests/ pytest suite (bind-mounted)
# /home/spark/data/delta  -> Delta table files on local filesystem
# (Hive metastore now lives in the separate `metastore-db` Postgres
# container - see docker-compose.yml - not in this image at all.)
WORKDIR /home/spark
RUN mkdir -p /home/spark/work /home/spark/src /home/spark/tests /home/spark/data/delta

ENV PYTHONPATH="/home/spark/src:${PYTHONPATH}"

# ---- Logging: silence the benign Delta-vs-Hive schema ALTER fallback -----
# Every saveAsTable onto an existing Delta table logs:
#   WARN HiveExternalCatalog: Could not alter schema of table ... in a Hive
#   compatible way. Updating Hive metastore in Spark SQL specific format.
# Delta isn't Hive-native, so Spark always tries a Hive-compatible ALTER
# first and always has it rejected before falling back to storing the schema
# in table properties - the correct, working path for Delta. This is
# unconditional in Spark's HiveExternalCatalog (no config flag skips it), so
# log4j2.properties (a copy of Spark's own default, plus one targeted
# suppression - see that file's header) is dropped into SPARK_CONF_DIR
# (pyspark's conf/ dir, resolved the same dynamic way as entrypoint.sh
# resolves SPARK_HOME - this base image is always python3.11-slim-bookworm,
# but avoiding a hardcoded interpreter version keeps this consistent with the
# rest of the file). spark-submit/start-connect-server.sh pick it up
# automatically; it's purely cosmetic and does not change what gets written.
COPY log4j2.properties /tmp/log4j2.properties
RUN SPARK_CONF_DIR="$(python3 -c 'import pyspark, os; print(os.path.join(os.path.dirname(pyspark.__file__), "conf"))')" \
    && mkdir -p "${SPARK_CONF_DIR}" \
    && mv /tmp/log4j2.properties "${SPARK_CONF_DIR}/log4j2.properties"

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8888 4040 15002

ENTRYPOINT ["/entrypoint.sh"]
