# Metastore options: alternatives to Postgres, and when to use each

The question a metastore answers is always the same: *"given a table name, where's its data and what does
it look like?"* Below are the common ways to answer that, roughly in order of "least to most
infrastructure."

## 1. No metastore at all — path-based Delta tables
```python
df = spark.read.format("delta").load("/some/path")
df.write.format("delta").mode("append").save("/some/path")
```
**How it works:** you address tables by filesystem/object-store path, always. No `CREATE TABLE`, no
catalog, no database process of any kind.

**Best for:** single-script pipelines, ad-hoc analysis, anywhere you don't need SQL table names or
multiple people/tools discovering tables by name.

**Tradeoffs:** no `SHOW TABLES`, no shared naming, no access control — every consumer needs to already
know the exact path.

## 2. Embedded Derby (Spark's default, zero-config)
This is what a bare `enableHiveSupport()` gives you with no other configuration — a local, file-based,
single-user database Spark creates automatically.

**Best for:** solo laptop work, one process at a time, throwaway sessions. It's genuinely the simplest
option and was this project's original setup.

**Tradeoffs:** only one JVM can hold the Derby file open at once — a second process (another notebook, a
pytest run, a Spark Connect server) trying to attach fails outright. Not portable, easy to end up with an
inconsistent state if a process crashes mid-write.

## 3. Embedded Hive metastore + a real RDBMS (Postgres or MySQL) — **what this project uses**
Same embedded-in-the-driver metastore client as Derby, just pointed at Postgres/MySQL via
`javax.jdo.option.ConnectionURL` instead. Every Spark driver process still talks to the database directly
— there's no separate service in between.

**Best for:** local/team dev environments where more than one process needs to see the same catalog
concurrently (which is exactly our situation: Jupyter kernel + Spark Connect server + pytest all sharing
one catalog). Good balance of "realistic enough to catch concurrency bugs" vs. "still simple to run."

**Tradeoffs:** every Spark process needs direct network access + credentials to the metastore DB. The
metastore's internal schema (`DBS`, `TBLS`, etc.) is tied to a specific Hive metastore library version
bundled with Spark — upgrading Spark sometimes means a metastore schema migration. And unlike Derby, that
schema is **yours to create**: Spark auto-creates the catalog tables only for the Derby database it
provisions itself, so moving to Postgres/MySQL means seeding ~57 tables up front (normally
`schematool -initSchema`; here, `server/metastore-init/*.sql` via the Postgres entrypoint). See
`01-why-postgres-metastore.md` for the failure mode when that step is missing.

## 4. Manifest-driven — a checked-in catalog instead of a database

A middle ground between option 1 (no catalog) and option 3 (a real metastore), aimed specifically at
resilience rather than features. Instead of a database holding "table name → path," a version-controlled
file does — this project's own `client/catalogs/*.yaml` is already exactly that idea, just scoped to
client scripts rather than the whole warehouse:

```yaml
# a hypothetical catalog/manifest.yaml covering the whole warehouse
sandbox:
  orders: sandbox.db/orders
  orders_api_clean: sandbox.db/orders_api_clean
```

A thin wrapper resolves `spark.table("sandbox.orders")`-style calls into
`spark.read.format("delta").load(path)` by looking the name up in the manifest, and/or replays the
manifest as `CREATE TABLE ... LOCATION` statements to (re)populate a real Hive metastore, disposably, on
demand. Because it's a text file, it's diffable, reviewable in a PR, and trivially reconstructible even if
every other piece of infrastructure is gone.

**Best for:** exactly the separated-storage-and-compute shape this project is aimed at, where you want the
catalog itself to be as durable as the data instead of tied to whatever's running the metastore this week.
Also a reasonable fit for a small, mostly-static set of tables where a full RDBMS metastore is more
operational surface than the problem needs.

**Tradeoffs:** you're building and maintaining the wrapper yourself — no `SHOW TABLES`/`DESCRIBE`/grants
for free the way a real metastore gives you. Doesn't help with genuinely dynamic table creation (lots of
tables appearing/disappearing at runtime) since someone has to update the manifest. Full walkthrough,
including a script that *generates* this kind of manifest by scanning the warehouse for `_delta_log`
directories, in
[`docs/06-failover-scenario-handling.md`](06-failover-scenario-handling.md).

## 5. A standalone Hive Metastore Service (HMS)
A long-running Thrift service (its own process/container) sits in front of the same kind of RDBMS backend.
Spark, Trino, Presto, Flink, etc. all talk to *that one service* over the network instead of opening their
own direct JDBC connections to the database.

**Best for:** multiple different query engines sharing one catalog (e.g. Spark for ETL, Trino for BI
queries, both against the same tables), or when you want to centralize schema changes and connection
management in one place rather than every engine holding DB credentials.

**Tradeoffs:** another service to run, monitor, and keep available — if it's down, every engine's catalog
access is down. Adds a network hop of latency to every catalog lookup.

## 6. AWS Glue Data Catalog
A managed, serverless, Hive-metastore-API-compatible catalog on AWS.

**Best for:** Spark running on AWS (EMR, Glue Jobs, or Databricks-on-AWS) where you want zero ops and
tight integration with other AWS services (Athena, Redshift Spectrum, Glue crawlers) that can also read
the same catalog.

**Tradeoffs:** ties your catalog to AWS specifically.

## 7. Databricks Unity Catalog
A governance-first catalog: fine-grained access control, lineage, audit logging, cross-workspace data
sharing. Originally Databricks-only; an open-source server (Unity Catalog OSS) now exists for
self-hosting.

**Best for:** production environments with real governance/compliance requirements, multiple teams sharing
data with access control, or when lineage/audit trails matter.

**Tradeoffs:** meaningfully heavier to stand up and operate than the other options; overkill for solo dev.

## Quick recommendation by situation

| Situation | Pick |
|---|---|
| Solo laptop, one process at a time | Embedded Derby |
| Local dev with multiple processes sharing a catalog (this project) | Embedded metastore + Postgres |
| Compute/metastore can be destroyed independently of storage; catalog durability matters more than SQL ergonomics | Manifest-driven |
| Multiple query engines (Spark + Trino + …) sharing tables | Standalone Hive Metastore Service |
| Production on AWS | AWS Glue Catalog |
| Production on Databricks, or need real governance/lineage | Unity Catalog |
| Single pipeline, no need for SQL table names | Skip the metastore — path-based tables |

## If the metastore is ever lost: how each option recovers

Relevant if you're thinking about failover, since "what does it take to get the catalog back" is a
different axis from the feature comparison above:

| Option | Recovery if the metastore/service is destroyed but the data survives |
|---|---|
| Path-based (no metastore) | Nothing to recover — there was never anything to lose |
| Embedded Derby | Same as Postgres below, but you'd be restoring a single local file instead of a networked DB |
| Embedded metastore + Postgres (this project) | Re-seed the empty Hive schema, then re-register each table with `CREATE TABLE ... LOCATION` — schema/partitioning come from Delta's own `_delta_log`, not the metastore. See `docs/06-failover-scenario-handling.md` |
| Manifest-driven | Nothing lost by definition — the manifest **is** the durable copy, checked into version control alongside the code |
| Standalone HMS | Same underlying RDBMS recovery as embedded Postgres, just re-pointed at from one place instead of every engine individually |
| AWS Glue Catalog | AWS's operational problem, not yours — but you're also fully dependent on their recovery, with no local fallback |
| Unity Catalog | Depends entirely on the hosting environment's own backup/DR story |

The embedded-Postgres row is exactly this project's situation, and it's the one case here where recovery
is a **procedure** rather than either "nothing to do" or "someone else's problem" — which is why it gets
its own doc.

## One adjacent thing worth knowing

Everything above is about the **Hive Metastore API**, which is table-format-agnostic in principle but
historically Hive/Spark-flavored. If you ever evaluate **Apache Iceberg** instead of (or alongside) Delta
Lake, Iceberg's ecosystem leans toward newer catalog styles — a **REST Catalog** spec, or tools like
**Nessie** (which adds Git-like branching/versioning to the catalog itself). Not relevant to change
anything today, but worth knowing the vocabulary exists if this project ever needs multi-format support.
