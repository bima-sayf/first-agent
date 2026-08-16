"""
NOT run directly. Invoked by client/main.py:

    python main.py --catalog example_client

which loads catalogs/example_client.yaml and calls run(catalog) below.
Database/table/rows all come from the catalog dict - nothing here is
hardcoded, so copying this file + writing a new catalog YAML is how you'd
create a second, differently-configured script.

Uses the SAME shared/spark_session.py that server-side notebooks and pytest
use - get_spark() auto-detects it's running outside the container and
connects via Spark Connect (sc://localhost:15002) instead of local[*].

CAVEAT: plain SQL (spark.sql(...)) and the DataFrame API work fully over
Spark Connect. The Python `delta.tables.DeltaTable` convenience class
(.merge()/.vacuum() builder methods) has more limited support on
delta-spark 3.2.x - prefer SQL for Delta-specific operations, as below.
"""
from spark_session import get_spark


def run(catalog: dict) -> None:
    spark = get_spark("local-client-demo")

    db = catalog["database"]
    table = catalog["output"]["full_table_name"]
    mode = catalog["output"]["mode"]
    rows = catalog["sample_rows"]

    print("Connected. Databases visible in the shared metastore:")
    spark.sql("SHOW DATABASES").show()

    spark.sql(f"CREATE DATABASE IF NOT EXISTS {db}")
    spark.sql(f"USE {db}")

    spark.sql(f"""
        CREATE TABLE IF NOT EXISTS {table} (
            id    BIGINT,
            label STRING
        )
        USING DELTA
    """)

    values_sql = ", ".join(f"({r['id']}, '{r['label']}')" for r in rows)
    if mode == "overwrite":
        spark.sql(f"DELETE FROM {table}")
    spark.sql(f"INSERT INTO {table} VALUES {values_sql}")

    print(f"\nContents of {table}:")
    spark.table(table).show()

    print("\nDelta history (proves it's a real Delta table, not a temp view):")
    spark.sql(f"DESCRIBE HISTORY {table}").select(
        "version", "timestamp", "operation"
    ).show(truncate=False)

    bad = spark.sql(f"SELECT * FROM {table} WHERE label IS NULL")
    assert bad.count() == 0, "Validation failed: null labels present"
    print("\nValidation passed: no null labels.")

    spark.stop()
