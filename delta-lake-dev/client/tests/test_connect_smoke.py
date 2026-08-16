"""
Runs LOCALLY on your Mac (in the .venv), not inside the container:

    source .venv/bin/activate
    pip install -r client/requirements.txt
    pytest client/tests/ -v

Talks to Spark inside Docker via Spark Connect (get_spark() in
shared/spark_session.py auto-detects this and connects to
sc://localhost:15002) - no `docker compose exec` needed. server/tests/ still
exists for anything you specifically want to validate INSIDE the container's
own execution environment.
"""


def test_connect_session_is_alive(spark):
    row = spark.sql("SELECT 1 AS one").collect()[0]
    assert row["one"] == 1


def test_create_schema_and_delta_table(spark):
    spark.sql("CREATE DATABASE IF NOT EXISTS sandbox")
    spark.sql("USE sandbox")
    spark.sql("""
        CREATE TABLE IF NOT EXISTS sandbox.local_pytest_check (
            id    BIGINT,
            label STRING
        )
        USING DELTA
    """)
    spark.sql("DELETE FROM sandbox.local_pytest_check")  # clean slate for reruns
    spark.sql("""
        INSERT INTO sandbox.local_pytest_check VALUES
            (1, 'from local pytest via Spark Connect')
    """)

    df = spark.table("sandbox.local_pytest_check")
    assert df.count() == 1


def test_validation_no_null_labels(spark):
    bad = spark.sql("SELECT * FROM sandbox.local_pytest_check WHERE label IS NULL")
    assert bad.count() == 0
