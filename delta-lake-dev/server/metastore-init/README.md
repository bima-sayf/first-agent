# `metastore-init/` — Hive metastore schema bootstrap for Postgres

These SQL scripts are bind-mounted into the `metastore-db` service at
`/docker-entrypoint-initdb.d/` (see `../docker-compose.yml`). The official
`postgres` image runs every `*.sql` in that directory **once**, in lexical
order, and **only when the data directory is empty** — i.e. on the very first
boot of the `metastore_pgdata` volume.

## Why this exists

Embedded Derby let Spark create the Hive metastore schema itself on first use.
Pointing `javax.jdo.option.ConnectionURL` at an external Postgres changes that:
Spark treats the metastore as externally managed and assumes the schema already
exists. Nothing created it, so the first `CREATE DATABASE`/`CREATE TABLE` failed
with:

```
MissingTableException: Required table missing : "DBS" in Catalog "" Schema ""
AnalysisException: MetaException(message:Hive metastore database is not initialized.
  Please use schematool (e.g. ./schematool -initSchema -dbType ...) to create the schema.
```

Normally you'd run `schematool -initSchema -dbType postgres`. That is not an
option in this image: pyspark ships only the Hive *client* jars
(`hive-metastore-2.3.9.jar`), not a Hive distribution, so there is no
`schematool` binary and the jar carries no schema SQL. Seeding the schema
through the Postgres entrypoint is the equivalent, and it happens before Spark
ever connects.

## Do NOT "fix" this with datanucleus.schema.autoCreateAll

The error message suggests enabling `datanucleus.schema.autoCreateTables` /
`autoCreateAll`. On Postgres that **deadlocks against itself** and hangs
indefinitely. DataNucleus creates tables lazily across several JDBC
connections, so it ends up running DDL on one connection while another holds an
open transaction on the same tables:

```
pid  | state               | query
3532 | idle in transaction | INSERT INTO "TABLE_PARAMS" (...) VALUES ($1,$2,$3)
3528 | active (Lock:relation) | ALTER TABLE "TBL_PRIVS" ADD CONSTRAINT "TBL_PRIVS_FK1"
                                FOREIGN KEY ("TBL_ID") REFERENCES "TBLS"...
-- pg_blocking_pids(3528) = {3532}
```

The `ALTER TABLE` waits on a relation lock the open transaction blocks, forever.
The observable result is a half-built schema (~28 of ~57 tables), a populated
`DBS` but an **empty `TBLS`**, and Spark calls that never return.

## Provenance

Pulled verbatim from Apache Hive, tag `rel/release-2.3.9`, path
`metastore/scripts/upgrade/postgres/` (matching Spark 3.5.3's bundled
`hive-metastore-2.3.9.jar`, whose expected schema version is `2.3.0`):

| File | Upstream source |
|---|---|
| `01-hive-schema.sql` | `hive-schema-2.3.0.postgres.sql` |
| `02-hive-txn-schema.sql` | `hive-txn-schema-2.3.0.postgres.sql` |
| `03-hive-version.sql` | the trailing `INSERT INTO "VERSION"` from `hive-schema-2.3.0.postgres.sql` |

Only one edit was made to upstream content: `01-hive-schema.sql`'s
`\i hive-txn-schema-2.3.0.postgres.sql;` line was replaced with a comment.
`psql` resolves `\i` against its working directory, and the Postgres entrypoint
runs these files from `/`, so the include would fail. Splitting into `01` →
`02` → `03` reproduces upstream's execution order.

Licensed under the Apache License 2.0, as part of
[Apache Hive](https://github.com/apache/hive).

## Re-running them

Init scripts only fire on an empty data directory. To re-seed you must drop the
volume, and because Delta table *files* live in the separate `../data` bind
mount, you have to clear both halves or the catalog and filesystem disagree:

```bash
cd server
docker compose down -v      # drops metastore_pgdata
rm -rf ../data/*            # drops Delta files whose catalog rows just went away
docker compose up -d
```

Dropping only the volume (`down -v` alone) leaves orphaned Delta directories
whose metastore rows are gone. `CREATE TABLE` on those names then fails with
`DELTA_CREATE_TABLE_WITH_NON_EMPTY_LOCATION`.

## Verifying it worked

```bash
docker exec delta-lake-metastore-db psql -U spark -d metastore_db \
  -c 'select * from "VERSION"' -c '\dt' | head -20
```

Expect one `VERSION` row reading `2.3.0` and ~57 tables. A `VERSION` row is the
quick signal: `autoCreateAll` never managed to write one.
