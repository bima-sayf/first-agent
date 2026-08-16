"""
PySpark DataFrame-API counterpart to scripts/example_client.py.

NOT run directly. Invoked by client/main.py:

    python main.py --catalog pyspark_api_demo

which loads catalogs/pyspark_api_demo.yaml and calls run(catalog) below.

WHY THIS EXISTS
---------------
`example_client.py` drives everything through `spark.sql("...")` strings. This
script does the same kind of work using the DataFrame API - `pyspark.sql.functions`
column expressions, `groupBy/agg`, and `Window` - which is generally preferable:

- Errors surface at build time. A typo in `F.col('amont')` fails when the plan is
  analyzed, naming the column; a typo inside a SQL string fails as a parse or
  resolution error that is harder to trace back.
- Expressions compose. `is_valid` below is defined once as a Column and reused to
  build both the clean and the quarantine set. The SQL version would need the
  predicate duplicated in two WHERE clauses, free to drift apart.
- No string interpolation of values into SQL, so no quoting/escaping hazards.
  `example_client.py` builds `INSERT INTO ... VALUES` by f-string - fine for a
  trusted demo catalog, but it is the shape of an injection bug.

Same performance either way: both go through Catalyst and produce the same plan.

RUNS OVER SPARK CONNECT
-----------------------
`get_spark()` (shared/spark_session.py) detects it is outside the container and
connects to sc://localhost:15002. Everything used here - createDataFrame, column
expressions, Window, groupBy/agg, DataFrameWriter.saveAsTable - is supported over
Connect. The one gap is `delta.tables.DeltaTable`'s builder methods
(.merge()/.vacuum()), which are incomplete over Connect on delta-spark 3.2.x; see
the note in section 6 for the workaround if you need an upsert.
"""
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    DateType,
    DoubleType,
    LongType,
    StringType,
    StructField,
    StructType,
)
from pyspark.sql.window import Window
from spark_session import get_spark

# Matches the shape of catalog['source']['rows']. All fields nullable so the
# dirty rows (null amount) are representable, and so writes don't try to push a
# narrower schema into the Hive metastore than the table declares.
ORDERS_SCHEMA = StructType([
    StructField("order_id", LongType(), nullable=True),
    StructField("customer", StringType(), nullable=True),
    StructField("amount", DoubleType(), nullable=True),
    StructField("order_date", DateType(), nullable=True),
])


def _read_source(spark: SparkSession, rows: list[dict]) -> DataFrame:
    """Build the source DataFrame from the catalog's inline rows.

    order_date arrives as a 'YYYY-MM-DD' string from YAML, so it is read as a
    string and cast with F.to_date rather than parsed in Python - the cast is
    part of the plan and applies uniformly, including to any null.
    """
    string_dates = StructType([
        StructField("order_id", LongType(), nullable=True),
        StructField("customer", StringType(), nullable=True),
        StructField("amount", DoubleType(), nullable=True),
        StructField("order_date", StringType(), nullable=True),
    ])
    tuples = [
        (r.get("order_id"), r.get("customer"), r.get("amount"), r.get("order_date"))
        for r in rows
    ]
    return (
        spark.createDataFrame(tuples, schema=string_dates)
        .withColumn("order_date", F.to_date("order_date", "yyyy-MM-dd"))
    )


def _validity_expr(require_non_null: list[str], min_amount: float):
    """Build ONE reusable boolean Column from the catalog's rules.

    Defined once and used to derive both the clean and quarantine sets, so the
    two can never disagree about what "valid" means.

    F.coalesce(..., False) is essential: comparing against NULL yields NULL, not
    False, and `~NULL` is also NULL - so without it a row with a null amount
    would be filtered out of BOTH sides and silently vanish.
    """
    expr = F.lit(True)
    for column in require_non_null:
        expr = expr & F.col(column).isNotNull()
    expr = expr & (F.col("amount") >= F.lit(min_amount))
    return F.coalesce(expr, F.lit(False))


def _reject_reason(require_non_null: list[str], min_amount: float):
    """Human-readable reason per rejected row, for the quarantine table."""
    parts = [
        F.when(F.col(c).isNull(), F.lit(f"{c} is null")) for c in require_non_null
    ]
    parts.append(
        F.when(F.col("amount") < F.lit(min_amount), F.lit(f"amount < {min_amount}"))
    )
    # concat_ws skips nulls, so only the reasons that actually fired appear.
    return F.concat_ws("; ", *parts)


def run(catalog: dict) -> None:
    spark = get_spark("pyspark-api-demo")

    db = catalog["database"]
    out = catalog["output"]
    rules = catalog["validation"]
    tuning = catalog["transform"]

    mode = out["mode"]
    fmt = out["format"]

    # ---- 0. Namespace -------------------------------------------------
    # SQL only for DDL: there is no DataFrame-API way to create a database
    # (spark.catalog can list/check, but not create).
    spark.sql(f"CREATE DATABASE IF NOT EXISTS {db}")

    orders = _read_source(spark, catalog["source"]["rows"])
    print("Source rows:")
    orders.show()

    # ---- 1. Validate: partition into clean vs quarantine ---------------
    is_valid = _validity_expr(rules["require_non_null"], rules["min_amount"])

    clean = orders.filter(is_valid)
    quarantine = orders.filter(~is_valid).withColumn(
        "reject_reason", _reject_reason(rules["require_non_null"], rules["min_amount"])
    )

    total, n_clean, n_bad = orders.count(), clean.count(), quarantine.count()
    print(f"\nValidation: total={total} clean={n_clean} quarantined={n_bad}")
    if n_bad:
        quarantine.show(truncate=False)

    # Invariants worth asserting: the split is lossless, and clean really is
    # clean. (Asserting "zero bad rows" would be wrong here - the catalog seeds
    # dirty rows on purpose, so that assert could only ever fail.)
    assert n_clean + n_bad == total, "validation split lost or duplicated rows"
    assert clean.filter(~is_valid).count() == 0, "clean set still holds invalid rows"

    # ---- 2. Row-level transformations (pyspark.sql.functions) ----------
    enriched = (
        clean
        .withColumn("amount", F.round("amount", 2))
        .withColumn(
            "amount_with_tax",
            F.round(F.col("amount") * F.lit(tuning["tax_multiplier"]), 2),
        )
        .withColumn(
            "value_band",
            F.when(F.col("amount") >= tuning["high_value_threshold"], F.lit("high"))
             .when(F.col("amount") >= tuning["mid_value_threshold"], F.lit("medium"))
             .otherwise(F.lit("low")),
        )
        .withColumn("customer_key", F.upper(F.trim("customer")))
        .withColumn("order_dow", F.date_format("order_date", "E"))
        .withColumn("days_ago", F.datediff(F.current_date(), F.col("order_date")))
        .withColumn("month_start", F.trunc("order_date", "month"))
    )

    print("\nEnriched (row-level column expressions):")
    enriched.select(
        "order_id", "customer_key", "amount", "amount_with_tax",
        "value_band", "order_dow", "month_start",
    ).orderBy("order_id").show(truncate=False)

    # ---- 3. Window functions ------------------------------------------
    # A Window adds aggregate/ranking context WITHOUT collapsing rows, which is
    # the part plain groupBy cannot do.
    per_day_ranked = Window.partitionBy("order_date").orderBy(F.col("amount").desc())
    per_day_all = Window.partitionBy("order_date")

    ranked = (
        enriched
        .withColumn("rank_in_day", F.row_number().over(per_day_ranked))
        .withColumn("day_revenue", F.round(F.sum("amount").over(per_day_all), 2))
        .withColumn(
            "pct_of_day",
            F.round(F.col("amount") / F.col("day_revenue") * F.lit(100), 1),
        )
    )

    top_n = tuning["top_n_per_day"]
    print(f"\nTop {top_n} orders per day (Window + row_number):")
    (
        ranked.filter(F.col("rank_in_day") <= F.lit(top_n))
        .select("order_date", "rank_in_day", "customer_key", "amount", "pct_of_day")
        .orderBy("order_date", "rank_in_day")
        .show(truncate=False)
    )

    # ---- 4. Aggregate rollup ------------------------------------------
    daily = (
        enriched.groupBy("order_date")
        .agg(
            F.count("*").alias("order_count"),
            F.countDistinct("customer_key").alias("distinct_customers"),
            F.round(F.sum("amount"), 2).alias("revenue"),
            F.round(F.avg("amount"), 2).alias("avg_order"),
            F.max("amount").alias("max_order"),
        )
        .orderBy("order_date")
    )
    print("\nDaily rollup (groupBy/agg):")
    daily.show(truncate=False)

    # ---- 5. Persist ----------------------------------------------------
    # saveAsTable both writes the Delta files and registers the table in the
    # shared Hive metastore, so these are visible to the notebook, to
    # server-side pytest, and to any other client - not just this process.
    # overwriteSchema lets derived-table shapes evolve as the catalog changes.
    def write(df: DataFrame, table: str) -> None:
        (df.write.format(fmt).mode(mode)
           .option("overwriteSchema", "true")
           .saveAsTable(table))
        print(f"  wrote {table} ({df.count()} rows)")

    print("\nWriting Delta tables:")
    write(enriched.drop("days_ago"), out["clean_table"])  # days_ago is not stable day to day
    write(quarantine, out["quarantine_table"])
    write(daily, out["summary_table"])

    # ---- 6. Read back + Delta history ---------------------------------
    print(f"\nRead back from {out['clean_table']}:")
    spark.table(out["clean_table"]).orderBy("order_id").show(truncate=False)

    # DESCRIBE HISTORY is SQL-only - there is no DataFrame-API equivalent, and
    # DeltaTable.history() is unreliable over Spark Connect on delta-spark 3.2.x.
    # Same reason an upsert here would use spark.sql("MERGE INTO ...") rather
    # than DeltaTable.merge(): see example_client.py and the notebook's section 7.
    print(f"\nDelta history for {out['clean_table']} (proves it's a real Delta table):")
    (
        spark.sql(f"DESCRIBE HISTORY {out['clean_table']}")
        .select("version", "timestamp", "operation")
        .orderBy("version")
        .show(truncate=False)
    )

    print("\nDone.")
    spark.stop()
