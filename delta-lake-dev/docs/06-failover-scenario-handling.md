# Failover: recovering the catalog when the metastore is lost but the data isn't

This project deliberately separates data (`./data`, a host bind mount — its own storage) from compute and
catalog (the `spark-delta` container and the `metastore-db` container's `metastore_pgdata` volume). That
separation is the point: it lets compute be disposable. But it also means a compute-side disaster —
`docker compose down -v`, a destroyed host, a corrupted volume — can take the catalog out from under data
that's still completely intact. This doc is the "now what" for that scenario: how to confirm what's
actually been lost, how to get it back, what genuinely doesn't come back, and how to stop it from being a
scramble next time.

Everything below was tested directly against this project's own running containers and its own tables,
not written speculatively — the "before" state shown is the real state this repo was in while writing
this.

## Why this is recoverable at all

The short version, expanded from `docs/01-why-postgres-metastore.md`: a Delta table's schema,
partitioning, and complete file listing all live in `_delta_log/`, inside the table's own directory —
**not** in the metastore. The metastore only ever held a name → path pointer plus a cached schema copy for
SQL convenience. Losing it means losing the ability to type `sandbox.orders` in a query. It does not mean
losing `sandbox.orders`.

This is a real advantage over plain Hive tables on raw Parquet, where the metastore genuinely is the only
record of schema and partition structure — recovering one of those means inferring a schema from whatever
Parquet file happens to be readable and reverse-engineering partitions from directory names. A Delta table
carries that information with it.

## Step 1: confirm what actually happened

Don't assume — check both sides independently before doing anything else.

**Is the metastore actually empty/gone?**
```bash
docker exec delta-lake-metastore-db psql -U spark -d metastore_db -c 'select * from "VERSION"'
```
No rows, or the container/database doesn't exist at all → the metastore is gone. A populated `VERSION`
row plus tables you don't recognize is a different problem (see `server/metastore-init/README.md`'s
warning about `datanucleus.schema.autoCreateAll`, not this doc).

**Is the data actually still there?**
```bash
find data/delta/warehouse -maxdepth 3 -type d
```
If `./data` survived (which is the entire premise of separating it from compute), you'll see
`<db>.db/<table>/_delta_log/` directories. That `_delta_log` folder is what makes a directory a real Delta
table rather than a folder of orphaned Parquet files — its presence is what you're checking for.

Live example, from this repo, right now — the metastore currently only knows about one table, while five
exist on disk (this happened gradually through this project's own diagnostic sessions, not a real
disaster, but it's a real, present example of metastore/data drift, which is the same shape of problem
whether it happened gradually or all at once):

```
$ docker exec delta-lake-metastore-db psql -U spark -d metastore_db -c 'select "TBL_NAME" from "TBLS"'
 TBL_NAME
----------
 orders
(1 row)

$ find data/delta/warehouse/sandbox.db -maxdepth 1 -type d
data/delta/warehouse/sandbox.db/orders
data/delta/warehouse/sandbox.db/orders_api_clean
data/delta/warehouse/sandbox.db/orders_api_daily
data/delta/warehouse/sandbox.db/orders_api_quarantine
data/delta/warehouse/sandbox.db/local_pytest_check
data/delta/warehouse/sandbox.db/local_pytest_check
```

Four tables (`orders_api_clean`, `orders_api_daily`, `orders_api_quarantine`, `local_pytest_check`) exist
on disk with complete `_delta_log` history and are entirely unreachable by name until re-registered. The
rest of this doc recovers exactly this state, on this project's real tables, with real output.

## Step 2: bring up an empty metastore

If the `metastore-db` container/volume is gone, this project already handles this part automatically —
that's what `server/metastore-init/*.sql` is for:

```bash
cd server
docker compose up -d       # or `down -v && up -d` if the container exists but the volume is corrupted
```

The Postgres image runs the schema-seeding SQL once, on first boot of an empty data directory, before
Spark ever connects. Confirm it worked before moving on:

```bash
docker exec delta-lake-metastore-db psql -U spark -d metastore_db -c 'select * from "VERSION"'
```
Expect one row reading `2.3.0`. If that's missing, stop here and fix that first — see
`server/metastore-init/README.md`. Nothing past this point works without it.

## Step 3: re-register each table by pointing at its existing directory

This is the actual recovery step, and it's the one that only works because of what section "why this is
recoverable at all" explained above.

### One table, by hand

```sql
CREATE DATABASE IF NOT EXISTS sandbox;

CREATE TABLE sandbox.orders_api_clean
USING DELTA
LOCATION '/home/spark/data/delta/warehouse/sandbox.db/orders_api_clean';
```

No column list. No `PARTITIONED BY`. No `MSCK REPAIR TABLE`. Spark reads schema and partitioning straight
out of `_delta_log` the moment it opens the table.

Verified against this project's real `orders_api_clean` table — re-registered with the single statement
above, then immediately:

```
>>> spark.table("sandbox.orders_api_clean").count()
3
>>> spark.table("sandbox.orders_api_clean").printSchema()
root
 |-- order_id: long (nullable = true)
 |-- customer: string (nullable = true)
 |-- amount: double (nullable = true)
 |-- order_date: date (nullable = true)
 |-- amount_with_tax: double (nullable = true)
 |-- value_band: string (nullable = true)
 |-- customer_key: string (nullable = true)
 |-- order_dow: string (nullable = true)
 |-- month_start: date (nullable = true)

>>> spark.sql("DESCRIBE HISTORY sandbox.orders_api_clean") \
...     .select("version", "timestamp", "operation").show(truncate=False)
+-------+-----------------------+---------------------------------+
|version|timestamp              |operation                        |
+-------+-----------------------+---------------------------------+
|0      |2026-08-16 08:57:28.172|CREATE OR REPLACE TABLE AS SELECT|
+-------+-----------------------+---------------------------------+
```

Exact row count, the full 9-column schema (including columns added by transformations, not just the
original 4-column table definition), and the complete transaction history — none of it typed in by hand,
none of it re-derived. It was never gone.

### Every table on disk, in one pass

For a real disaster you won't want to do this one table at a time. This script walks the warehouse,
finds every directory that's actually a Delta table (has a `_delta_log`), and registers whatever the
metastore doesn't already know about — safe to re-run, since it skips anything already registered:

```python
"""bulk_reattach.py - run inside the container:
    docker exec delta-lake-dev python /home/spark/src/../bulk_reattach.py
(or copy in via `docker cp` first, if it's not bind-mounted anywhere)
"""
import sys, os
sys.path.append('/home/spark/src')
from spark_session import get_spark

spark = get_spark('bulk-reattach')
WAREHOUSE = "/home/spark/data/delta/warehouse"

for db_dir in sorted(os.listdir(WAREHOUSE)):
    if not db_dir.endswith(".db"):
        continue
    db = db_dir[:-3]
    db_path = os.path.join(WAREHOUSE, db_dir)
    spark.sql(f"CREATE DATABASE IF NOT EXISTS {db}")
    existing = {r["tableName"] for r in spark.sql(f"SHOW TABLES IN {db}").collect()}

    for tbl in sorted(os.listdir(db_path)):
        tbl_path = os.path.join(db_path, tbl)
        if not os.path.isdir(tbl_path) or not os.path.exists(os.path.join(tbl_path, "_delta_log")):
            continue
        if tbl in existing:
            print(f"skip   {db}.{tbl} (already registered)")
            continue
        print(f"attach {db}.{tbl} -> {tbl_path}")
        spark.sql(f"CREATE TABLE {db}.{tbl} USING DELTA LOCATION '{tbl_path}'")

print("\nFinal state:")
for db_dir in sorted(os.listdir(WAREHOUSE)):
    if db_dir.endswith(".db"):
        spark.sql(f"SHOW TABLES IN {db_dir[:-3]}").show()
spark.stop()
```

Run against this project's actual drifted state (the four missing tables from Step 1), verified output:

```
attach sandbox.local_pytest_check -> /home/spark/data/delta/warehouse/sandbox.db/local_pytest_check
attach sandbox.orders_api_clean -> /home/spark/data/delta/warehouse/sandbox.db/orders_api_clean
attach sandbox.orders_api_daily -> /home/spark/data/delta/warehouse/sandbox.db/orders_api_daily
attach sandbox.orders_api_quarantine -> /home/spark/data/delta/warehouse/sandbox.db/orders_api_quarantine

Final state:
+---------+--------------------+-----------+
|namespace|           tableName|isTemporary|
+---------+--------------------+-----------+
|  sandbox|  local_pytest_check|      false|
|  sandbox|              orders|      false|
|  sandbox|    orders_api_clean|      false|
|  sandbox|    orders_api_daily|      false|
|  sandbox|orders_api_quaran...|      false|
+---------+--------------------+-----------+
```

Every table on disk, recovered, in one pass, with `orders` (the one that was never lost) correctly left
alone by the `already registered` skip.

### A useful side effect: re-registered tables become safer by default

Worth knowing, and verified directly: a table created with `CREATE TABLE ... USING DELTA` (no `LOCATION`)
registers as `MANAGED_TABLE` in the metastore, while re-registering the same table with an explicit
`LOCATION` (exactly what recovery does) registers it as `EXTERNAL_TABLE`:

```
TBL_NAME              | TBL_TYPE
-----------------------+----------------
orders                 | MANAGED_TABLE     <- created normally, never lost
local_pytest_check     | EXTERNAL_TABLE    <- re-registered during this recovery
orders_api_clean       | EXTERNAL_TABLE    <- re-registered during this recovery
```

The practical difference: `DROP TABLE` on a `MANAGED_TABLE` deletes the underlying files along with the
catalog entry. On an `EXTERNAL_TABLE`, `DROP TABLE` only removes the catalog entry — the Delta files are
untouched. Verified directly (`DROP TABLE` on a re-registered table left every Parquet file and the full
`_delta_log` on disk afterward). This means recovery doesn't just restore access, it also makes the
recovered tables one accidental `DROP TABLE` safer than they were before — a small, real upside of a
process you'd otherwise think of as pure cleanup.

## What does NOT come back

Everything above works because Delta's log is self-describing. A few things genuinely only ever lived in
the metastore, and no amount of re-registering the table recovers them:

- **Table/column comments.** Pure metastore metadata, not part of the Delta protocol.
- **Hive `VIEW` definitions.** A view has no data directory — nothing on disk to point `LOCATION` at.
  If views mattered, their `CREATE VIEW` statements need to be kept somewhere durable (a `.sql` file in
  version control, not the metastore).
- **Grants / Hive-style authorization**, if you were relying on it. Not used by anything in this project
  today, but worth knowing before this pattern gets more load-bearing.
- **`ANALYZE TABLE` cost-based-optimizer statistics.** These are separate from Delta's own per-file
  min/max stats (which live in `_delta_log` and *do* survive — they're what powers data skipping). CBO
  stats are a performance concern, not a correctness one: queries still return correct results without
  them, just possibly with a worse query plan until you re-run `ANALYZE TABLE`.

None of these currently apply to this project — no views, comments, grants, or `ANALYZE` calls exist
anywhere in `server/` or `client/` today — but they're the boundary to know about before this pattern is
relied on for something with more of that kind of metadata attached.

## Preventing this in the first place

Two independent layers, because they guard against different failure modes:

**1. Stop the volume from being deletable by a stray flag.** Right now `metastore_pgdata` is a
Docker-managed named volume, which is exactly what makes `docker compose down -v` able to delete it in one
command. Bind-mounting it to a host folder instead — the same treatment `../data` already gets — removes
that risk entirely, since `down -v` can only destroy volumes Docker itself manages:

```yaml
# server/docker-compose.yml
services:
  metastore-db:
    volumes:
      - ../metastore-data:/var/lib/postgresql/data   # was: metastore_pgdata:/var/lib/postgresql/data
      - ./metastore-init:/docker-entrypoint-initdb.d:ro
```
(And drop the `metastore_pgdata:` entry from the `volumes:` block at the bottom of the file.) This is a
real config change, not yet applied to this repo — flagged here as the concrete next step if you want to
close this gap, discussed but intentionally not made automatically in an earlier session, since it changes
this project's documented reset procedure (`down -v && rm -rf ../data/*` would become
`down && rm -rf ../metastore-data/* ../data/*` — no longer gated by a flag most people already know to be
careful with).

**2. Back up the schema anyway.** A bind mount only protects against `-v`; it does nothing for an actual
disk failure on that specific mount, filesystem corruption, or someone deleting the folder directly. The
metastore is pure metadata — a `pg_dump` of it is small and cheap to run on a schedule:
```bash
docker exec delta-lake-metastore-db pg_dump -U spark -d metastore_db > metastore_backup.sql
```
Restoring it (`psql -U spark -d metastore_db < metastore_backup.sql` against a freshly-seeded schema) is
faster than re-registering every table individually, though the re-registration script above remains the
fallback if no backup exists — which is the actual point of this doc.

**3. The deeper fix: stop treating the metastore as load-bearing.** If losing the catalog is a recurring
worry rather than a one-off disaster to plan for, the real answer is architectural, not operational — see
option 4 (manifest-driven) in `docs/02-metastore-alternatives.md`. This project's own
`client/catalogs/*.yaml` pattern is already a version-controlled, database-free record of "what exists and
why." Extending that idea to the whole warehouse turns the Postgres metastore into a disposable
SQL-ergonomics cache, rebuildable in minutes from a checked-in manifest, rather than a single point of
failure protecting knowledge that exists nowhere else.
