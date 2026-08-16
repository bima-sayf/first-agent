# Delta Lake dev environment — client / server / shared

## Layout

```
delta-lake-dev/
├── server/                  ← everything that runs INSIDE Docker
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── .env                 (Postgres credentials, git-ignored)
│   ├── metastore-init/      ← Hive metastore schema SQL, seeded into Postgres
│   │   └── README.md          on first boot (see §3 - without it nothing works)
│   ├── log4j2.properties    ← silences one benign Hive/Delta schema-alter WARN (see §3)
│   ├── notebooks/
│   │   └── 00_demo_delta_lake.ipynb
│   └── tests/
│       └── test_orders_quality.py   (runs via `docker compose exec ... pytest`)
│
├── client/                  ← everything that runs LOCALLY on your Mac
│   ├── main.py               (entry point: python main.py --catalog <name>)
│   ├── requirements.txt      (installed into your .venv)
│   ├── catalogs/
│   │   ├── example_client.yaml
│   │   └── pyspark_api_demo.yaml
│   ├── scripts/
│   │   ├── example_client.py       (SQL-string style)
│   │   └── pyspark_api_demo.py     (DataFrame API style - prefer this)
│   └── tests/
│       ├── conftest.py
│       └── test_connect_smoke.py     (runs via plain `pytest`, no docker exec)
│
├── shared/
│   └── spark_session.py     ← single source of truth, imported by BOTH
│                               server/ (bind-mounted in) and client/
│
├── data/                     ← Delta table files (bind-mounted into server/)
├── docs/                     ← deeper dives: metastore internals, Dockerfile walkthrough,
│   └── ...                     Docker command cheat sheet, scaling ideas (see §10 below)
├── PROJECT-CONTEXT.md        ← mental model, constraints, diagnosed bugs
└── .gitignore
```

**Why this split:** `server/` is the thing you build and run with Docker — Spark, Delta, Postgres
metastore, JupyterLab, Spark Connect. `client/` is plain Python that runs directly on your Mac in a
`.venv`, talking to `server/` over the network (Spark Connect) — no Docker commands needed once it's
running. `shared/spark_session.py` is imported by both sides so the connection logic isn't duplicated.

## 1. Build & run the server

```bash
cd server
docker compose up --build -d
docker compose logs -f spark-delta
```
Look for, in order: `SPARK_HOME resolved to...` → `Starting Spark Connect server...` → `Spark Connect
server is up` → `Starting JupyterLab...` → `Jupyter Server ... is running`.

`server/.env` holds the dev-only Postgres credentials `docker-compose.yml` reads automatically (it must
stay next to `docker-compose.yml` for Compose to auto-load it).

## 2. VSCode ↔ container Jupyter kernel

1. Install the **Jupyter** extension in VSCode.
2. Open `server/notebooks/00_demo_delta_lake.ipynb`.
3. Kernel picker → **Select Another Kernel** → **Existing Jupyter Server** → `http://localhost:8888/`.
4. Run cells — they execute inside the container.

Server-side pytest: `docker compose exec spark-delta pytest tests/ -v` (run from `server/`).

## 3. Concurrent metastore access (Postgres, not embedded Derby)

`metastore-db` (postgres:16-alpine) sits on the compose network, unreachable from your Mac directly — only
`spark-delta` talks to it. `shared/spark_session.py` and `entrypoint.sh` (the Spark Connect server) both
point `spark.hadoop.javax.jdo.option.ConnectionURL` at it. Multiple processes — the Jupyter kernel, a
server-side pytest run, the Spark Connect server (and therefore any number of client scripts) — can all
read/write the same catalog concurrently, which embedded Derby could not do.

### Fixed: `Hive metastore database is not initialized` / `Required table missing : "DBS"`
Switching the metastore from embedded Derby to Postgres silently dropped schema creation. Derby let
Spark build the metastore tables itself; once `javax.jdo.option.ConnectionURL` points at an external
database, Spark assumes the schema is already there and creates nothing. Nothing else did either, so the
first `CREATE DATABASE`/`CREATE TABLE` died with:
```
MissingTableException: Required table missing : "DBS" in Catalog "" Schema ""
AnalysisException: MetaException(message:Hive metastore database is not initialized.
  Please use schematool (e.g. ./schematool -initSchema -dbType ...) to create the schema.
```
`schematool` isn't available to run: pyspark ships only the Hive *client* jars
(`hive-metastore-2.3.9.jar`), not a Hive distribution, and the jar carries no schema SQL.

**Fix:** `server/metastore-init/*.sql` holds the Hive 2.3.0 Postgres schema (from apache/hive
`rel/release-2.3.9`), bind-mounted to `metastore-db`'s `/docker-entrypoint-initdb.d/`. The Postgres image
runs those **once, on first boot of an empty data directory** — before Spark connects. Details and
provenance in `server/metastore-init/README.md`.

**Do not "fix" this with `datanucleus.schema.autoCreateAll`.** The error message suggests it; on Postgres
it deadlocks against itself and hangs forever (DataNucleus runs DDL on one JDBC connection while another
holds an open transaction on the same tables). It leaves a half-built schema — ~28 of 57 tables, a
populated `DBS` but an empty `TBLS` — and Spark calls that never return.

Health check — expect 57 tables and one `VERSION` row reading `2.3.0`:
```bash
docker exec delta-lake-metastore-db psql -U spark -d metastore_db -c 'select * from "VERSION"' -c '\dt'
```
Because init scripts only fire on an empty data directory, re-seeding needs a full reset (see §6).

### Fixed: `No suitable driver found for jdbc:postgresql://...`
This was a real class-loading bug, not a config typo. The Postgres JDBC driver was being resolved via
`spark.jars.packages` (Ivy/`--packages`) — but Hive's metastore connection pool looks up JDBC drivers
through `java.sql.DriverManager`, which only reliably sees drivers that were on the classpath **at JVM
startup**. A jar added later via `spark.jars.packages` lives in a separate classloader that
`DriverManager` can't see — so the driver is technically downloaded but invisible when the connection is
actually attempted.

**Fix:** `server/Dockerfile` now downloads the Postgres JDBC jar directly into `$SPARK_HOME/jars/` at
image build time — a real file in Spark's default classpath directory, present from JVM startup. It's no
longer in any `--packages` list anywhere (`shared/spark_session.py`, `entrypoint.sh`). Rebuild to pick it
up:
```bash
cd server
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 4. Local `.py` on your Mac — catalog-driven, via `.venv` + Spark Connect

The `.venv` in active use lives at the **workspace root** (one level above `delta-lake-dev/`), not inside
this project folder — worth knowing since the path below is relative to `client/` two levels down.

```bash
cd delta-lake-dev/client
python3 -m venv ../../.venv
source ../../.venv/bin/activate
pip install -r requirements.txt        # pyspark[connect] - no local Java/Spark needed
python main.py --catalog example_client
```

If your shell is already inside `delta-lake-dev/` rather than the workspace root, that's `../.venv`
instead of `../../.venv`. Either way, it should end up as a sibling of `delta-lake-dev/`, not nested
inside it — that's where the venv this project has been tested against actually lives.

### How the catalog pattern works
Instead of calling a script directly, you run it through `main.py`, naming a **catalog**:
```bash
python main.py --catalog example_client
python main.py --list                  # see what's available
```
`main.py` loads `catalogs/example_client.yaml` and passes it as a plain `dict` into
`scripts/example_client.py`'s `run(catalog)` function. The script never hardcodes a database, table name,
or write mode — it reads all of that from the catalog:

```yaml
# client/catalogs/example_client.yaml
database: sandbox
output:
  full_table_name: sandbox.local_client_check
  format: delta
  mode: append
sample_rows:
  - id: 1
    label: "written from local .venv"
```

**To add a new runnable script:** drop `catalogs/my_job.yaml` (its config) and `scripts/my_job.py` (must
define `run(catalog: dict)`) — the names must match. Then `python main.py --catalog my_job`. This keeps
"what data does this touch" visible and editable in YAML, separate from the Python logic.

### Two styles shipped — prefer the DataFrame API
```bash
python main.py --catalog pyspark_api_demo   # DataFrame API (pyspark.sql.functions, Window)
python main.py --catalog example_client     # SQL strings (kept for comparison)
```
`pyspark_api_demo.py` is the one to copy. The DataFrame API fails at plan-analysis time and names the
offending column, its expressions compose and can be reused (one `is_valid` Column driving both the clean
and quarantine filters, instead of a duplicated `WHERE` free to drift), and it doesn't interpolate values
into SQL strings the way `example_client.py`'s `INSERT INTO ... VALUES` f-string does. Performance is
identical — both go through Catalyst. It demonstrates typed schemas, null-safe validation with
quarantining, `when`/`coalesce`/`round`/date functions, `groupBy().agg()`, and `Window` ranking.

Keep SQL where it's the better or only tool: `CREATE DATABASE`/`CREATE TABLE` (no DataFrame equivalent),
plus `MERGE INTO` / `DESCRIBE HISTORY` (see the Spark Connect caveat below).

`shared/spark_session.py`'s `get_spark()` auto-detects it's running outside a container (`/.dockerenv`
absent) and connects via `SparkSession.builder.remote("sc://localhost:15002")` — the Spark Connect server
`entrypoint.sh` starts inside `server/`. No local Java/Spark install.

### Local pytest (no `docker compose exec`)
```bash
pytest client/tests/ -v
```
`client/tests/conftest.py` provides a session-scoped `spark` fixture via the same `get_spark()`.

**Two caveats:**
- **Version match matters.** `client/requirements.txt` pins `pyspark[connect]==3.5.3` to match
  `PYSPARK_VERSION` in `server/Dockerfile`. Bump both together.
- **Delta Python API is more limited over Connect.** Plain `spark.sql(...)` and the DataFrame API work
  fully. `delta.tables.DeltaTable`'s `.merge()`/`.vacuum()` builder methods have incomplete support over
  Spark Connect on delta-spark 3.2.x — use SQL (`MERGE INTO ...`, `VACUUM ...`) instead, as
  `scripts/example_client.py` does.

## 5. Does this scale to a real multi-node cluster?

**Yes — without changing client code.** The client (`client/scripts/*.py`, driven by `main.py`) only sends
logical query plans over gRPC. It has no idea whether `sc://...` points at a single `local[*]` container
on your laptop or a 50-node cluster — that's decided entirely **server-side**, by what master the Spark
Connect server is launched with (`entrypoint.sh` currently uses an implicit `local[*]`). To get real
distributed execution: point the Connect server's launch command at a Spark Standalone cluster
(`--master spark://your-master:7077`), YARN, or Kubernetes, with real worker nodes. Your `client/` files
don't change — same `.remote("sc://<connect-server-host>:15002")` call, now pointed wherever that server
actually lives. This is the same mechanism behind Databricks Connect. What you get on a 16GB laptop today
is genuinely single-node (`local[*]` parallelizes across your Mac's cores inside one container, not across
machines) — real multi-node parallelism needs actual additional machines behind the Connect server, but
this client code is already shaped for that day.

## 6. Everyday workflow
- Shared logic → `shared/spark_session.py` (imported by both sides).
- Server-only code (notebooks, container-internal tests) → `server/`.
- Local automation/scripts → `client/scripts/` + a matching `client/catalogs/*.yaml`, run via `main.py`.
- Persistence: `CREATE TABLE`, writes, `DESCRIBE HISTORY` all survive `docker compose restart` /
  `down`+`up` — `../data` and the `metastore_pgdata` volume are what persist.
- Full reset: `cd server && docker compose down -v && rm -rf ../data/* && docker compose up -d`.

> **Reset both halves together — always.** State lives in two places that must agree: Delta **files** in
> `./data` (a host bind mount) and table **registrations** in `metastore_pgdata` (a named volume).
> `docker compose down -v` destroys the volume but leaves `./data` untouched, orphaning every table
> directory — files present, catalog rows gone. The next `CREATE TABLE` on those names then fails with
> `[DELTA_CREATE_TABLE_WITH_NON_EMPTY_LOCATION] ... is not empty and also not a Delta table`.
> `down -v` on its own is never the right reset here.

## 7. Troubleshooting

**How to check `entrypoint.sh` actually ran / where it's stuck**
```bash
cd server && docker compose logs spark-delta
```
Healthy sequence: `SPARK_HOME resolved to: ...` → `sbin contents: ...` → `Starting Spark Connect server on
:15002` → `Spark Connect server is up` → `Starting JupyterLab on :8888` → `Jupyter Server ... is running`.
- No `[entrypoint]` lines at all → the script never ran — `docker compose build --no-cache`.
- Stops after "Starting Spark Connect server" → check
  `docker compose exec spark-delta cat "$SPARK_HOME/logs/spark-connect-server.out"` for the real error.

**`Failed to connect to the remote Jupyter Server ... '_xsrf' argument missing from POST`**
Fixed by `--ServerApp.disable_check_xsrf=True` in `entrypoint.sh`. If still hit after rebuilding, remove
the stale server entry in VSCode: Command Palette → **Jupyter: Manage Jupyter Servers** → remove
`http://localhost:8888/` → reconnect.

**`Failed to connect ... (Kernel not initialized in Session)` even though `curl http://localhost:8888/api` works**
Different failure stage than the `_xsrf` error above: the HTTP API is reachable, but VSCode's WebSocket
kernel channel is getting rejected by Jupyter Server's Origin/Host checks — VSCode's webview sends an
`Origin` header (`vscode-webview://...`) a bare server doesn't trust by default, so the REST session
create can succeed while the actual kernel channel silently fails. Fixed by adding
`--ServerApp.allow_origin='*'` and `--ServerApp.allow_remote_access=True` in `entrypoint.sh`. Requires a
rebuild:
```bash
cd server
docker compose down
docker compose build --no-cache
docker compose up -d
```
Then, as above, clear the stale server entry in VSCode (**Jupyter: Manage Jupyter Servers** → remove →
reconnect) before retrying — VSCode caches failed connection state.

**VSCode notebook won't connect after `docker compose down` + `up`, but opening `http://localhost:8888/`
in a browser first fixes it**
Not a server bug — verified directly with `curl`: right after `docker compose up -d`, `/api` returns 200,
`POST /api/kernels` succeeds, and even a raw WebSocket upgrade to a kernel channel with
`Origin: vscode-webview://...` succeeds on the first try, cold, no browser visit needed. The server is
healthy the whole time.

The actual cause is VSCode's Jupyter extension caching *specific kernel IDs* from the previous container
instance, in
`~/Library/Application Support/Code/User/globalStorage/ms-toolsai.jupyter/remoteKernelSpecCache.json`.
Every `docker compose down`+`up` starts a brand-new Jupyter server process with entirely new kernel IDs —
the old ones no longer exist. VSCode tries to reattach to a cached kernel ID that's gone, rather than
listing kernels fresh, and that reconnect attempt fails silently. Opening the URL in a browser first
works because it makes the extension re-list live kernels for that server, which overwrites the stale
cache entry — after which VSCode's own connection works too. (Related upstream reports:
[microsoft/vscode-jupyter#4199](https://github.com/microsoft/vscode-jupyter/issues/4199).)

Fix, without needing a browser: **Command Palette → Jupyter: Manage Jupyter Servers → remove
`http://localhost:8888/` → reconnect.** This forces a fresh kernel listing instead of reusing the stale
cached ID. Do this once per `docker compose down`/`up` cycle if you skip the browser step.

**`No suitable driver found for jdbc:postgresql://...`**
See section 3 — this was a classloader bug, fixed by baking the Postgres JDBC jar into `$SPARK_HOME/jars`
directly. Requires `docker compose build --no-cache` to pick up.

**`Hive metastore database is not initialized` / `Required table missing : "DBS"`**
The metastore schema wasn't seeded. See section 3. Confirm with the `VERSION`/`\dt` health check there;
if the schema is missing or partial, do a full reset (section 6) so `metastore-init/` re-runs.

**`[DELTA_CREATE_TABLE_WITH_NON_EMPTY_LOCATION] ... is not empty and also not a Delta table`**
The metastore and `../data` have drifted apart — the Delta files exist but their catalog rows don't,
usually after a bare `docker compose down -v`. Full reset (section 6), which clears both halves.

**`WARN HiveExternalCatalog: Could not alter schema of table ...` on every `saveAsTable`**
Never a failure — Delta isn't a Hive-native format, so Spark always tries a Hive-compatible schema alter
first, Hive always refuses it, and Spark falls back to storing the schema in table properties, which is
the normal path for Delta. There's no config flag that skips the doomed attempt (it's unconditional in
Spark's `HiveExternalCatalog`), so `server/log4j2.properties` silences just that one logger at the image
level — cosmetic only, doesn't change what gets written. If you're on an image built before this was
added, rebuild with `docker compose build --no-cache` to pick it up. Same root cause as the companion
`Couldn't find corresponding Hive SerDe for data source provider delta` warning, silenced by the same fix.

**Local script/pytest can't reach `sc://localhost:15002`**
```bash
cd server
docker compose logs spark-delta | grep -i connect
docker compose ps    # both services should show "Up"/"healthy"
```

## 8. Version pins
| Component            | Version |
|-----------------------|---------|
| Spark                  | 3.5.3   |
| delta-spark            | 3.2.0   |
| Postgres                | 16 (alpine) |
| Postgres JDBC driver     | 42.7.4  |
| Python                 | 3.11    |
| Java                    | 17 (Temurin/OpenJDK headless) |

Keep Spark/Delta paired per the [Delta releases compatibility matrix](https://docs.delta.io/latest/releases.html);
remember to bump `client/requirements.txt`'s pyspark version alongside `server/Dockerfile`'s.

## 9. Further upgrade paths
- **S3-compatible storage** → add a `minio` service in `server/docker-compose.yml`, point
  `spark.sql.warehouse.dir` at `s3a://...`, add the Hadoop-AWS jars to the Dockerfile's bake step.
- **Multi-node testing** → see section 5.
- **True Delta-over-Connect parity** → Delta 4.x / Spark 4.x add fuller `DeltaTable` API support over
  Connect ("Delta Connect"); worth revisiting if the SQL-only workaround becomes limiting.

## 10. Further reading (`docs/`)

This README covers day-to-day setup and troubleshooting. For deeper background on *why* things are built
the way they are:

| Doc | Covers |
|---|---|
| [`docs/01-why-postgres-metastore.md`](docs/01-why-postgres-metastore.md) | What the Hive metastore actually stores (and doesn't), how Spark talks to Postgres underneath `.enableHiveSupport()`, and the schema-seeding gotcha from section 3 above in more depth |
| [`docs/02-metastore-alternatives.md`](docs/02-metastore-alternatives.md) | Path-based tables, embedded Derby, embedded metastore + Postgres (what this project uses), standalone Hive Metastore Service, AWS Glue, Unity Catalog — tradeoffs and when to pick each |
| [`docs/03-ai-kitchen-architecture.md`](docs/03-ai-kitchen-architecture.md) | How this skeleton (server/client/shared + the catalog pattern) extends into a medallion-architecture data platform, if that's ever the direction |
| [`docs/04-dockerfile-explained.md`](docs/04-dockerfile-explained.md) | `server/Dockerfile` walked through line by line — image/container/layer basics included, for anyone newer to Docker |
| [`docs/05-manage-docker.md`](docs/05-manage-docker.md) | Cheat sheet for everyday `docker compose` commands (start/stop/logs/shell/reset) |

`PROJECT-CONTEXT.md` is different from all of the above: it's the working-context file, covering
diagnosed bugs, verified fixes, and gotchas hit while building this out. Read it before making changes to
anything metastore- or Connect-related, so a fixed bug doesn't get re-litigated.
