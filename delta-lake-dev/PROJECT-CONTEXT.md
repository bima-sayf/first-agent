# `delta-lake-dev` — working context

Orientation notes for anyone (human or agent) picking this repo up cold. `README.md` is the
user-facing setup guide; this file is the mental model, the non-obvious constraints, and the bugs
that have already been diagnosed so they don't get re-litigated.

---

## 1. What this is

A single-node Spark 3.5.3 + Delta Lake 3.2.0 development environment that you can drive **two ways
through one code path**:

| | runs where | how it reaches Spark | used by |
|---|---|---|---|
| **in-container mode** | inside the `delta-lake-dev` container | `master("local[*]")`, direct JDBC to the metastore | Jupyter kernel, `server/tests/` |
| **Connect mode** | your Mac's `.venv` | gRPC to `sc://localhost:15002` | `client/scripts/`, `client/tests/` |

Both call the same `get_spark()` in `shared/spark_session.py`, which branches on whether
`/.dockerenv` exists. Both ultimately read and write the **same** Delta files and the **same** Hive
metastore, so a table created in the notebook is immediately visible to a client script.

The client side needs no local Java or Spark install — `pyspark[connect]` is a pure Python/gRPC
client. That is the main ergonomic win of this layout.

## 2. Layout and why it's split this way

```
delta-lake-dev/
├── server/            # everything that runs INSIDE Docker
│   ├── Dockerfile         # Spark+Delta+Jupyter+Connect image
│   ├── docker-compose.yml # spark-delta + metastore-db services
│   ├── entrypoint.sh      # launches Connect server, then JupyterLab
│   ├── metastore-init/    # Hive metastore schema SQL (see §4 - critical)
│   ├── log4j2.properties # silences one benign log line (see §7)
│   ├── notebooks/         # 00_demo_delta_lake.ipynb
│   └── tests/             # pytest, run via `docker compose exec`
├── client/            # everything that runs LOCALLY in a .venv
│   ├── main.py            # entry point: python main.py --catalog <name>
│   ├── catalogs/<n>.yaml  # declarative config per script
│   ├── scripts/<n>.py     # must define run(catalog: dict)
│   └── tests/             # pytest, plain (no docker exec)
├── shared/spark_session.py  # imported by BOTH sides - single source of truth
└── data/                    # Delta files, bind-mounted into server/
```

`shared/` is bind-mounted into the container at `/home/spark/src` and is on `PYTHONPATH`, which is
why in-container code does `sys.path.append('/home/spark/src')` and client code has `main.py` insert
`../shared` on `sys.path`. Same file, two mount points.

### The catalog pattern

`client/` scripts are never run directly. `main.py --catalog foo` loads `catalogs/foo.yaml` into a
plain `dict` and calls `scripts/foo.py`'s `run(catalog)`. The names must match. Scripts hardcode no
table names, paths, modes, or thresholds — all of it comes from the YAML, so "what data does this
touch" is reviewable without reading Python.

To add a script: drop `catalogs/my_job.yaml` + `scripts/my_job.py` defining `run(catalog)`.

## 3. State lives in exactly two places

This is the single most important thing to internalize, because nearly every confusing failure in
this project comes from these two halves disagreeing:

| half | what's in it | where it lives | survives `down -v`? |
|---|---|---|---|
| **Delta files** | parquet + `_delta_log` | `./data` — a **host bind mount** | **yes** |
| **table registration** | `DBS`, `TBLS`, `SDS`, ... | `metastore_pgdata` — a **named volume** | **no** |

A Delta table is only usable when *both* halves agree. `docker compose down -v` destroys the
metastore volume but leaves `./data` untouched, so every table directory becomes an orphan: the files
are there, the catalog rows are gone. The next `CREATE TABLE` on that name then fails with

```
[DELTA_CREATE_TABLE_WITH_NON_EMPTY_LOCATION] Cannot create table ('`sandbox`.`orders`').
The associated location (...) is not empty and also not a Delta table.
```

**Always reset both halves together:**

```bash
cd server && docker compose down -v && rm -rf ../data/* && docker compose up -d
```

## 4. The metastore schema must be seeded up front

**Diagnosed and fixed.** Full write-up in `server/metastore-init/README.md`; the short version:

Embedded Derby let Spark create the Hive metastore schema itself. Once
`javax.jdo.option.ConnectionURL` points at an external Postgres, Spark assumes the schema already
exists and creates nothing. Nothing else created it either, so the first `CREATE DATABASE` failed:

```
MissingTableException: Required table missing : "DBS" in Catalog "" Schema ""
MetaException: Hive metastore database is not initialized. Please use schematool ...
```

`schematool` is not an option here: pyspark ships only the Hive *client* jars
(`hive-metastore-2.3.9.jar`), not a Hive distribution, and the jar carries no schema SQL.

**Fix:** `server/metastore-init/*.sql` (Hive 2.3.0 Postgres schema, pulled from apache/hive
`rel/release-2.3.9`) is bind-mounted to the `metastore-db` container's `/docker-entrypoint-initdb.d/`.
The Postgres image runs those once, on first boot of an empty data directory — before Spark ever
connects.

### Do not "fix" this with `datanucleus.schema.autoCreateAll`

The error message suggests it. On Postgres it **self-deadlocks and hangs forever**. DataNucleus
creates tables lazily across multiple JDBC connections, so it ends up running DDL on one while
another holds an open transaction on the same tables:

```
pid 3532 | idle in transaction    | INSERT INTO "TABLE_PARAMS" (...) VALUES ($1,$2,$3)
pid 3528 | active (Lock:relation) | ALTER TABLE "TBL_PRIVS" ADD CONSTRAINT "TBL_PRIVS_FK1"
                                    FOREIGN KEY ("TBL_ID") REFERENCES "TBLS"...
pg_blocking_pids(3528) = {3532}
```

Symptoms if someone tries it anyway: Spark calls that never return, a half-built schema (~28 of 57
tables), a populated `DBS` but an **empty `TBLS`**, and no `VERSION` row.

**Health check** — expect 57 tables and one `VERSION` row reading `2.3.0`:

```bash
docker exec delta-lake-metastore-db psql -U spark -d metastore_db \
  -c 'select * from "VERSION"' -c '\dt'
```

## 5. Hive config keys need the `spark.hadoop.` prefix

`hive.*` and `datanucleus.*` settings only reach the Hive/Hadoop conf when prefixed. It is
`spark.hadoop.hive.metastore.schema.verification`, not `spark.hive.metastore.schema.verification`
(which was a real bug in `shared/spark_session.py`).

Verification stays **off** on purpose: `metastore-init/` seeds schema version `2.3.0` while Spark
3.5.3's bundled client is `hive-metastore-2.3.9`. Compatible, but the strict check rejects the
mismatch.

## 6. Delta over Spark Connect: what works and what doesn't

Fully supported: `spark.sql(...)`, the whole DataFrame API, `pyspark.sql.functions`, `Window`,
`createDataFrame`, `DataFrameWriter.saveAsTable`.

**Not reliable:** `delta.tables.DeltaTable`'s builder methods — `.merge()`, `.vacuum()`, `.history()`
— on delta-spark 3.2.x over Connect. Use SQL for those (`MERGE INTO`, `VACUUM`, `DESCRIBE HISTORY`).
That's why both client scripts and the notebook use SQL `MERGE`, with the source supplied as a
DataFrame via `createOrReplaceTempView` — a pattern that works identically in both modes.

Delta 4.x / Spark 4.x ("Delta Connect") close this gap; worth revisiting on upgrade.

**Version pins must move together:** `client/requirements.txt`'s `pyspark[connect]==3.5.3` and
`server/Dockerfile`'s `PYSPARK_VERSION`. A mismatch breaks the Connect protocol.

## 7. Expected log noise that is *not* a bug

Harmless: `Failed to get database global_temp, returning NoSuchObjectException`, and
`SparkUI could not bind on port 4040. Attempting port 4041` (something already holds 4040 — usually
the Connect server, since a second driver in the same container needs its own UI port).

### Silenced: the Delta-vs-Hive schema-alter fallback

**Diagnosed and fixed** (`server/log4j2.properties`). Every `saveAsTable` onto an existing Delta table
used to log, in the driver log:

```
ERROR HiveAlterHandler: Failed to alter table sandbox.orders
  InvalidOperationException: The following columns have types incompatible ...: order_id
WARN  HiveExternalCatalog: Could not alter schema of table `sandbox`.`orders` in a Hive
      compatible way. Updating Hive metastore in Spark SQL specific format.
WARN  HiveExternalCatalog: Couldn't find corresponding Hive SerDe for data source provider delta.
```

Root cause, confirmed by reading Spark 3.5.3's `HiveExternalCatalog.scala` directly: Delta is not a
Hive-native format, so `alterTableDataSchema` always attempts a Hive-compatible `ALTER TABLE` first,
always has it rejected, and falls back to storing the schema in table properties — the normal, correct
path for Delta. This is **unconditional** in Spark; no Spark or Delta config flag skips the attempt.
The only lever is the log level of the `org.apache.spark.sql.hive.HiveExternalCatalog` logger itself.

`server/log4j2.properties` is Spark's own default `log4j2-defaults.properties` (extracted from
`spark-core`'s jar) plus one added line silencing that logger to `error`. The Dockerfile copies it to
`$SPARK_HOME/conf/log4j2.properties`, which `spark-submit`/`start-connect-server.sh` read automatically
via `SPARK_CONF_DIR`. Verified this is precisely scoped, not a blanket log suppression: a query against
a nonexistent table still raises `AnalysisException` normally, and unrelated warnings
(`HiveConf`, `ObjectStore`, `SparkStringUtils`) still appear. Also verified the notebook still runs
top-to-bottom with 0 cell errors, now without either of those two log lines.

Rebuild to pick this up if working from an older image: `docker compose build --no-cache`.

## 8. Two notebook bugs that were fixed

`server/notebooks/00_demo_delta_lake.ipynb`:

1. **An assertion that could only ever fail.** The validation cell asserted
   `bad_rows.count() == 0` while the write cell deliberately seeded a null `amount`. Now the data is
   *partitioned* into clean vs quarantine using one reusable boolean Column, and the assertions check
   invariants that genuinely hold (the split is lossless; the clean set is clean).
2. **Non-idempotent writes.** `mode('append')` meant re-running a cell silently doubled the rows,
   invalidating every count below it. Now `mode('overwrite')`, so the whole notebook is re-runnable.

Also worth knowing: `F.coalesce(<predicate>, F.lit(False))` in that cell is load-bearing. Comparing
against `NULL` yields `NULL`, and `~NULL` is `NULL`, so without the coalesce a null-`amount` row gets
filtered out of *both* the clean and quarantine sides and vanishes.

## 9. Which style to write new code in

Prefer the **DataFrame API** (`pyspark.sql.functions`, `Window`) over SQL strings: failures surface at
plan-analysis time naming the column, expressions compose and can be reused (one `is_valid` Column
driving two filters, instead of a duplicated `WHERE` free to drift), and there's no interpolation of
values into SQL. Identical performance — both go through Catalyst.

Keep SQL only where it's the better or only tool, and say why in a comment:
`CREATE DATABASE`/`CREATE TABLE` (no DataFrame equivalent), `MERGE INTO` and `DESCRIBE HISTORY`
(see §6).

Reference implementations:
- `client/scripts/pyspark_api_demo.py` — DataFrame-API style, the one to copy
- `client/scripts/example_client.py` — the older SQL-string style, kept as a comparison

## 10. Commands

```bash
# server
cd server
docker compose up --build -d
docker compose logs -f spark-delta          # expect: SPARK_HOME -> Connect up -> Jupyter running
docker compose exec spark-delta pytest tests/ -v

# client (from delta-lake-dev/client, .venv active)
python main.py --list
python main.py --catalog pyspark_api_demo
pytest tests/ -v

# execute the notebook headlessly (best end-to-end check)
docker exec delta-lake-dev jupyter nbconvert --to notebook --execute \
  --ExecutePreprocessor.timeout=900 --output /tmp/executed.ipynb \
  /home/spark/work/00_demo_delta_lake.ipynb
```

VSCode kernel: Jupyter extension → Select Another Kernel → Existing Jupyter Server →
`http://localhost:8888/`. If it won't attach, clear the cached entry
(**Jupyter: Manage Jupyter Servers** → remove → reconnect); VSCode caches failed connection state.
`entrypoint.sh` already sets the `disable_check_xsrf` / `allow_origin` / `allow_remote_access` flags
those failures need.

### Known issue: VSCode notebook won't reconnect after `down`+`up`, until a browser hits :8888 first

**Diagnosed — not a server bug.** Verified directly with `curl` right after a fresh
`docker compose up -d`: `/api` returns 200 immediately, `POST /api/kernels` returns 201, and a raw
WebSocket upgrade to `/api/kernels/{id}/channels` with `Origin: vscode-webview://...` succeeds on the
first try — cold, no browser visit, no cookies. The server is healthy the whole time this symptom shows
up.

The real cause lives on the client: VSCode's `ms-toolsai.jupyter` extension caches specific **kernel
IDs** from the previous container instance in
`~/Library/Application Support/Code/User/globalStorage/ms-toolsai.jupyter/remoteKernelSpecCache.json`
(inspected directly — found 12 cached server-URI-handle entries for this same
`http://localhost:8888/`, 7 of them `kind: "connectToLiveRemoteKernel"` pinned to kernel IDs from prior
runs). Every `docker compose down`+`up` starts a new Jupyter server process with entirely new kernel IDs.
VSCode tries to reattach to the stale cached ID instead of listing kernels fresh; that ID no longer
exists, so the reconnect fails silently. Opening the URL in a browser first works only because it makes
the extension re-list live kernels for that server, overwriting the stale entry — after which VSCode's
own connection also succeeds. Matches a known class of upstream issues, e.g.
[microsoft/vscode-jupyter#4199](https://github.com/microsoft/vscode-jupyter/issues/4199).

**Fix without a browser:** Command Palette → **Jupyter: Manage Jupyter Servers** → remove
`http://localhost:8888/` → reconnect. Do this once per `down`/`up` cycle instead of opening a browser.
There's no server-side fix — kernel IDs are freshly generated per kernel start by design, so the cache
staleness is inherent to how the extension keys itself, not something `entrypoint.sh` can control.

## 11. Environment gotchas hit while working here

- **`python -u` when redirecting output.** Python block-buffers stdout to a file, so `print()`
  ordering relative to JVM log lines (which go to stderr) is misleading, and a killed process loses
  its buffer entirely.
- **Always `spark.stop()`** in throwaway scripts. Orphaned drivers keep JVMs alive, hold metastore
  connections, and race each other on the same table paths. `mem_limit` is 8g with
  `spark.driver.memory=4g`, so two concurrent drivers is already tight.
- **`docker compose exec` runs a second driver.** It does not attach to the Connect server's JVM.
  Notebook kernel + a `docker compose exec pytest` + the Connect server = three JVMs.
