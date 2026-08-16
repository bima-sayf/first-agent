# Why Postgres, and how it connects to Spark

## First, an important correction to the framing

Postgres in this project is **not** "the Delta table." It never stores a single row of your actual data.
Worth being precise about this because it's the most common source of confusion with Spark + Delta + Hive
setups.

Two completely separate things are happening:

| What                          | Where it lives                                      | What's in it |
|--------------------------------|------------------------------------------------------|---------------|
| **Delta table data**            | Local filesystem (`./data`, bind-mounted from `/home/spark/data/delta`) | Parquet files (your actual rows) + a `_delta_log/` folder (JSON files recording every write as a transaction) |
| **Hive metastore**             | Postgres (`metastore-db` container)                  | Catalog *metadata only*: which databases/tables exist, what columns and types they have, and — critically — **where their data lives** (a path) |

So when you run:
```sql
CREATE TABLE sandbox.orders (order_id BIGINT, ...) USING DELTA
```
Postgres gets a new row in its internal `TBLS` table (and related tables like `DBS`, `COLUMNS_V2`) saying
"there's a table called `sandbox.orders`, its columns are X/Y/Z, and its data lives at
`/home/spark/data/delta/warehouse/sandbox.db/orders`." No actual order data touches Postgres. When you
later run `SELECT * FROM sandbox.orders`, Spark asks the metastore "where does this table live and what
does it look like?", gets that path + schema back, and then reads the Parquet files directly from disk.

## Why Spark needs a metastore at all

You don't, strictly. Spark can read/write Delta tables with zero catalog involved:
```python
df = spark.read.format("delta").load("/home/spark/data/delta/warehouse/sandbox.db/orders")
```
This works with no metastore, no `CREATE TABLE`, nothing — you're just pointing Spark at a folder. This is
called a **path-based** (or "unmanaged") table.

The metastore exists for the convenience layer on top of that: human-readable names
(`sandbox.orders` instead of a filesystem path), `SHOW TABLES`, `DESCRIBE`, and — the big one — letting
**multiple different sessions/processes agree on where a table lives** without everyone hardcoding paths.
Once you want SQL like `CREATE DATABASE`, `CREATE TABLE ... USING DELTA`, or just `USE sandbox`, you're
using the catalog, and Spark's SQL catalog implementation for this is (by convention across the whole
ecosystem — Spark, Trino, Presto, Flink) the **Hive Metastore** API, even though nothing here involves
actually running Hive.

## How the connection actually works, concretely

1. `shared/spark_session.py` calls `.enableHiveSupport()` on the `SparkSession` builder. This tells Spark:
   "use the Hive catalog implementation" (`spark.sql.catalogImplementation=hive`).
2. Hive's metastore client code is a Java library that ships as part of Spark's dependencies — it runs
   **embedded inside the Spark driver process itself**. There is no separate "Hive Metastore service"
   running anywhere in this project (that's a different, heavier option — see the companion doc on
   alternatives). Each Spark driver (the Jupyter kernel's session, the Spark Connect server's session, a
   pytest run) independently loads this library and talks to the metastore database directly.
3. That embedded client needs somewhere to persist its catalog tables (`DBS`, `TBLS`, `COLUMNS_V2`, etc.).
   By default, with no configuration, Spark auto-creates a local, single-user, file-based **Derby**
   database for this (a `metastore_db/` folder) — this is what earlier versions of this project used.
4. We instead point it at Postgres via four config keys:
   ```python
   .config("spark.hadoop.javax.jdo.option.ConnectionURL",
           "jdbc:postgresql://metastore-db:5432/metastore_db")
   .config("spark.hadoop.javax.jdo.option.ConnectionDriverName", "org.postgresql.Driver")
   .config("spark.hadoop.javax.jdo.option.ConnectionUserName", "spark")
   .config("spark.hadoop.javax.jdo.option.ConnectionPassword", "...")
   ```
   `javax.jdo.option.*` are **JDO** (Java Data Objects — an old Java ORM standard) properties that Hive's
   metastore code reads to know which database to open a JDBC connection to, and with what credentials.
   Swap Derby for Postgres here, and the exact same embedded Hive metastore code now writes its catalog
   rows into a real, network-accessible, multi-user database instead of a local file.

## The catch those four config keys hide: who creates `DBS`/`TBLS`?

Step 3 above glosses over something that bit this project. Derby didn't just *store* the catalog tables —
Spark **created** them for you, because Spark treats its auto-provisioned Derby database as its own to
manage. The moment you supply a `ConnectionURL`, Spark reclassifies the metastore as *externally managed*
and assumes its schema already exists. It will happily connect and then fail on the first query:

```
MissingTableException: Required table missing : "DBS" in Catalog "" Schema ""
MetaException(message:Hive metastore database is not initialized. Please use schematool ...)
```

So the four keys above are necessary but **not sufficient** — something has to create ~57 catalog tables
first. Normally that's `schematool -initSchema -dbType postgres`, but it isn't available here: pyspark
bundles only the Hive metastore *client* jars, not a Hive distribution, and those jars don't carry the
schema SQL either.

This project seeds the schema through Postgres itself: `server/metastore-init/*.sql` (Hive's official
2.3.0 Postgres schema) is mounted into the `metastore-db` container's `/docker-entrypoint-initdb.d/`, and
the Postgres image runs it once, on first boot of an empty data directory — before any Spark driver
connects. See `server/metastore-init/README.md`.

Two traps worth naming, because both look like reasonable fixes and neither is:

- **`datanucleus.schema.autoCreateAll=true`** — the error message recommends it. On Postgres it deadlocks
  against itself: DataNucleus creates tables lazily across several JDBC connections, so it ends up running
  `ALTER TABLE ... ADD CONSTRAINT ... REFERENCES "TBLS"` on one connection while another sits *idle in
  transaction* holding locks on the same tables. It hangs indefinitely and leaves a half-built schema
  (~28 of 57 tables, populated `DBS`, empty `TBLS`).
- **Assuming a working setup stays working.** The schema lives in the `metastore_pgdata` volume while the
  Delta files live in the `./data` bind mount. `docker compose down -v` wipes the first and not the
  second, which orphans every table on disk. Reset both together.

The reason it's `spark.hadoop.javax.jdo.option.*` and not `spark.javax.jdo.option.*`, incidentally, is
that Spark only forwards keys prefixed `spark.hadoop.` into the Hadoop/Hive configuration. Same reason
it's `spark.hadoop.hive.metastore.schema.verification`.

## The picture end to end

```
 Jupyter kernel ──┐
 pytest (server) ──┼── each has its own embedded Hive metastore client ──JDBC──► Postgres (metastore-db)
 Spark Connect ────┘                                                              (catalog metadata only)
        │
        └── separately, reads/writes Parquet + _delta_log ──► local disk (./data)
                                                                (actual table data)
```

Postgres and the filesystem never talk to each other directly. Spark is the thing that looks something up
in one (Postgres: "where's this table and what's its schema?") and then goes and acts on the other
(filesystem: "read/write these Parquet files"). Because Postgres is a real multi-user database instead of
a single Derby file, several of these embedded metastore clients can now open connections to it
concurrently — which is the whole reason it replaced Derby in this project.
## What happens if the metastore is lost but the data isn't

Worth walking through deliberately, because this project's whole point — data files (`./data`) on one
storage layer, compute + metastore (`metastore-db`) on another — means a compute-side disaster (the
container host destroyed, `docker compose down -v`, a bad disk on the metastore's volume) can wipe the
catalog while the Delta files sit untouched on their own storage.

The short version: **this is recoverable, and cheaply, because of something specific to Delta.** A plain
Hive table on raw Parquet genuinely loses information here — the metastore is the *only* place its schema
and partition structure live, so losing it means reverse-engineering partitions from directory names and
inferring a schema from whichever Parquet file happens to be readable. A Delta table doesn't have that
problem: its schema, partitioning, and complete file listing all live in `_delta_log/`, which is *inside
the table's own directory*, not in the metastore. The metastore only ever held a name → path pointer plus
a cached copy of the schema for SQL convenience (see the walkthrough above) — convenience, not the source
of truth.

So losing the metastore means losing the ability to say `SELECT * FROM sandbox.orders` — not losing
`sandbox.orders` itself. Recovery is: bring up an empty metastore (this project already does that
automatically — `server/metastore-init/*.sql` seeds a fresh Hive schema into Postgres on first boot, see
section 3), then re-point each table name at its already-complete directory:

```sql
CREATE DATABASE IF NOT EXISTS sandbox;
CREATE TABLE sandbox.orders USING DELTA LOCATION '/home/spark/data/delta/warehouse/sandbox.db/orders';
```

No column list, no `PARTITIONED BY`, no `MSCK REPAIR TABLE` — Spark reads schema and partitioning
straight out of `_delta_log`. This was tested directly against this project's own tables: after
deliberately letting several tables drift out of the metastore, re-running `CREATE TABLE ... LOCATION`
against each one recovered exact row counts, full schemas, and complete `DESCRIBE HISTORY` output,
because none of that history ever lived anywhere but the log itself.

The full recovery procedure — a script that re-attaches *every* table on disk in one pass, what does and
doesn't survive, and how to stop this from being a scramble in the first place — is worked through in
[`docs/06-failover-scenario-handling.md`](06-failover-scenario-handling.md).
