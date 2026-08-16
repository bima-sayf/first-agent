# From this project to an "AI Kitchen" architecture

## A quick assumption, stated up front

"AI Kitchen" isn't a term with a fixed technical meaning, so I'm assuming you mean something like: *a
platform where various data sources ("ingredients") flow through pipelines ("recipes") into curated
datasets that feed AI/ML outputs* — a general-purpose data + AI platform, built on the Delta Lake + Spark
foundation you already have. If you actually mean something more specific (a literal cooking/recipe AI
product, a multi-agent orchestration framework, something else entirely), the *pattern* below still
mostly applies, but tell me more and I can tailor it further.

## The core idea: extend, don't replace

Everything you've built — `server/` (Spark + Delta + metastore), `client/` (catalog-driven scripts),
`shared/` (common session logic) — is the right skeleton for this. An "AI Kitchen" platform is this same
skeleton with two additions: (1) a data organization convention (the medallion architecture) and (2) an
AI-specific serving layer on top. Nothing here means throwing away what exists.

## 1. Organize `data/` using the medallion architecture

Right now everything lands in one `sandbox` database. As this grows, split storage into layers by how
refined the data is — this is the standard Delta Lake pattern for a reason (each layer has a clear job,
and failures/reprocessing are contained to one layer):

- **Bronze** — raw ingested data, as close to the source format as possible, append-only, minimal
  transformation. This is your audit trail; if a downstream bug corrupts Silver/Gold, you reprocess from
  here.
- **Silver** — cleaned, deduplicated, conformed to a schema, joined across sources where it makes sense.
  This is "trustworthy data," but still fairly granular/raw-shaped.
- **Gold** — business/AI-ready: aggregated tables, engineered features, anything a model or a dashboard
  consumes directly.

Concretely, this could just be three more databases (`bronze`, `silver`, `gold`) in the same metastore you
already have, with catalog YAMLs in `client/catalogs/` per pipeline stage, e.g.
`catalogs/bronze_ingest_recipes.yaml`, `catalogs/silver_clean_recipes.yaml`,
`catalogs/gold_recipe_features.yaml` — each with a matching `scripts/*.py`.

## 2. Add the AI-specific serving layer

This is what turns a lakehouse into an "AI Kitchen." Depending on what you're building, some subset of:

- **Feature store** — Gold-layer tables specifically shaped for model training/inference (point-in-time
  correct features). Could start as just well-organized Delta tables; tools like Feast exist if you need
  online (low-latency) feature serving later.
- **Vector store** — if anything involves embeddings/semantic search/RAG (plausible for a "kitchen"
  domain — e.g. recipe similarity, ingredient substitution). Options range from a Postgres extension
  (`pgvector` — notably, you already have a Postgres instance running) to dedicated stores (Chroma,
  Qdrant, LanceDB) depending on scale.
- **Model registry** — MLflow is the common choice, tracks trained model versions/metrics, integrates
  cleanly with Spark/Delta.
- **Inference/serving API** — a thin service (FastAPI is a common lightweight choice) that loads a
  registered model and serves predictions, kept separate from the Spark/Delta pipeline code.

## 3. Add orchestration once you have more than a couple of pipelines

`client/main.py --catalog <name>` is a perfectly good manual runner for now. Once you have several
bronze→silver→gold steps with dependencies between them, that's the signal to introduce a scheduler —
**Dagster** or **Airflow** are the standard choices. Both can literally shell out to
`python main.py --catalog <name>` as a task, so you don't need to rewrite anything — you're wrapping
what exists, not replacing it.

## 4. Add data quality checks between layers

Since you're already on Delta Lake, you get transaction-log history and schema enforcement for free.
Layer on explicit checks between Bronze→Silver→Gold — either simple `assert`-style validation (the
pattern already in `server/tests/` and `client/tests/`) or a dedicated library like **Great Expectations**
once the rule set gets large enough that ad-hoc asserts become hard to manage.

## 5. When (and only when) you actually need to scale beyond one laptop

Everything above works fine on the current single-container setup. The path to real scale, when you need
it, is a set of swaps rather than a rewrite:

| Component today | Swap for, at scale |
|---|---|
| Local disk (`./data`) | S3 / GCS / Azure Blob |
| Postgres-backed embedded metastore | AWS Glue Catalog, or a standalone Hive Metastore Service (see the metastore-alternatives doc) |
| Spark Connect server on `local[*]` | Spark Connect server pointed at a real cluster (Standalone/YARN/Kubernetes) — your `client/` code doesn't change at all, see the architecture note in the main README |
| Manual `main.py` runs | Dagster/Airflow |

## Suggested next concrete step

Rather than building all of this at once: pick **one** real end-to-end slice — one Bronze source, one
Silver transform, one Gold table, one thing an AI component actually consumes — and build it through the
existing `client/catalogs/` + `scripts/` pattern. That'll surface which of the pieces above you actually
need for your specific case faster than designing the whole platform up front.
