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

## 4. A standalone Hive Metastore Service (HMS)
A long-running Thrift service (its own process/container) sits in front of the same kind of RDBMS backend.
Spark, Trino, Presto, Flink, etc. all talk to *that one service* over the network instead of opening their
own direct JDBC connections to the database.

**Best for:** multiple different query engines sharing one catalog (e.g. Spark for ETL, Trino for BI
queries, both against the same tables), or when you want to centralize schema changes and connection
management in one place rather than every engine holding DB credentials.

**Tradeoffs:** another service to run, monitor, and keep available — if it's down, every engine's catalog
access is down. Adds a network hop of latency to every catalog lookup.

## 5. AWS Glue Data Catalog
A managed, serverless, Hive-metastore-API-compatible catalog on AWS.

**Best for:** Spark running on AWS (EMR, Glue Jobs, or Databricks-on-AWS) where you want zero ops and
tight integration with other AWS services (Athena, Redshift Spectrum, Glue crawlers) that can also read
the same catalog.

**Tradeoffs:** ties your catalog to AWS specifically.

## 6. Databricks Unity Catalog
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
| Multiple query engines (Spark + Trino + …) sharing tables | Standalone Hive Metastore Service |
| Production on AWS | AWS Glue Catalog |
| Production on Databricks, or need real governance/lineage | Unity Catalog |
| Single pipeline, no need for SQL table names | Skip the metastore — path-based tables |

## One adjacent thing worth knowing

Everything above is about the **Hive Metastore API**, which is table-format-agnostic in principle but
historically Hive/Spark-flavored. If you ever evaluate **Apache Iceberg** instead of (or alongside) Delta
Lake, Iceberg's ecosystem leans toward newer catalog styles — a **REST Catalog** spec, or tools like
**Nessie** (which adds Git-like branching/versioning to the catalog itself). Not relevant to change
anything today, but worth knowing the vocabulary exists if this project ever needs multi-format support.
