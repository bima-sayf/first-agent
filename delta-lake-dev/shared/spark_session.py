"""
Shared SparkSession factory - works BOTH inside the server container
(Jupyter kernel, pytest via `docker compose exec`) AND from a Mac .venv
(client/ scripts run via `python main.py --catalog ...`, or client/tests/
via pytest), through the SAME `get_spark()` call. Lives in shared/ so both
server/ and client/ import the exact same file - no duplication.

Usage, identical either way:

    from spark_session import get_spark
    spark = get_spark()

How the auto-detection works:
- Inside the container, /.dockerenv exists (Docker creates this file in
  every container) -> uses master="local[*]" with a direct JDBC connection
  to the Postgres metastore.
- On your Mac, /.dockerenv does not exist -> uses Spark Connect
  (SparkSession.builder.remote(...)) to talk to the Spark Connect server
  exposed on localhost:15002. No local Java/Spark required.

Both paths ultimately hit the SAME driver process / metastore running
inside the container - "in-container mode" and "Connect mode" are just two
different ways of driving that one shared environment.
"""
import os

from pyspark.sql import SparkSession

WAREHOUSE_DIR = "/home/spark/data/delta/warehouse"


def _running_in_container() -> bool:
    return os.path.exists("/.dockerenv")


def _get_spark_in_container(app_name: str) -> SparkSession:
    from delta import configure_spark_with_delta_pip

    metastore_host = os.environ.get("METASTORE_HOST", "metastore-db")
    postgres_db = os.environ.get("POSTGRES_DB", "metastore_db")
    postgres_user = os.environ.get("POSTGRES_USER", "spark")
    postgres_password = os.environ.get("POSTGRES_PASSWORD", "spark_dev_password")

    builder = (
        SparkSession.builder.appName(app_name)
        .master("local[*]")
        .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
        .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog")
        .config("spark.sql.warehouse.dir", WAREHOUSE_DIR)
        .config("spark.hadoop.javax.jdo.option.ConnectionURL",
                f"jdbc:postgresql://{metastore_host}:5432/{postgres_db}")
        .config("spark.hadoop.javax.jdo.option.ConnectionDriverName", "org.postgresql.Driver")
        .config("spark.hadoop.javax.jdo.option.ConnectionUserName", postgres_user)
        .config("spark.hadoop.javax.jdo.option.ConnectionPassword", postgres_password)
        # Hive/Hadoop settings must go through the `spark.hadoop.` prefix to be
        # copied into the Hive conf - this was previously `spark.hive.metastore.
        # schema.verification`, which is not a reliable route for it.
        # Verification stays OFF because the schema seeded by
        # server/metastore-init/ reports version 2.3.0 while Spark 3.5.3's
        # bundled client is hive-metastore-2.3.9 - compatible, but the strict
        # version check would reject the mismatch.
        # NOTE: do NOT add datanucleus.schema.autoCreateAll here to "help" Spark
        # build a missing schema - on Postgres it deadlocks against itself and
        # hangs forever. The schema is created up front by
        # server/metastore-init/*.sql instead. See that directory's README.
        .config("spark.hadoop.hive.metastore.schema.verification", "false")
        .config("spark.driver.memory", "4g")
        .config("spark.sql.shuffle.partitions", "8")
        .enableHiveSupport()
    )
    # NOTE: no extra_packages for the Postgres driver here anymore - it's
    # baked directly into $SPARK_HOME/jars at image build time (see
    # server/Dockerfile). Resolving JDBC drivers via spark.jars.packages/
    # Ivy is unreliable for Hive metastore connections: java.sql.DriverManager
    # often can't see drivers added that way, causing
    # "No suitable driver found for jdbc:postgresql://...".
    spark = configure_spark_with_delta_pip(builder).getOrCreate()
    spark.sparkContext.setLogLevel("WARN")
    return spark


def _get_spark_via_connect(app_name: str) -> SparkSession:
    remote_url = os.environ.get("SPARK_CONNECT_REMOTE", "sc://localhost:15002")
    spark = SparkSession.builder.appName(app_name).remote(remote_url).getOrCreate()
    return spark


def get_spark(app_name: str = "delta-dev") -> SparkSession:
    """Build (or fetch the existing) SparkSession with Delta Lake and the
    shared Hive metastore wired up - works identically whether called from
    inside the container or from a local .venv script/test on your Mac.
    """
    if _running_in_container():
        return _get_spark_in_container(app_name)
    return _get_spark_via_connect(app_name)
