#!/bin/bash
set -e

# ---- Resolve SPARK_HOME dynamically at runtime -------------------------
# A hardcoded path guess here was the bug that caused
# "start-connect-server.sh: command not found" - if the guessed path was
# wrong, $SPARK_HOME/sbin didn't exist, so nothing under it could be found.
# Asking pyspark directly is always correct, regardless of base image/
# Python version.
export SPARK_HOME="$(python3 -c 'import pyspark, os; print(os.path.dirname(pyspark.__file__))')"
export PATH="${SPARK_HOME}/bin:${SPARK_HOME}/sbin:${PATH}"
mkdir -p "${SPARK_HOME}/logs"

echo "[entrypoint] SPARK_HOME resolved to: ${SPARK_HOME}"
echo "[entrypoint] sbin contents:"
ls "${SPARK_HOME}/sbin" 2>/dev/null || echo "[entrypoint]   (no sbin directory found)"

METASTORE_HOST="${METASTORE_HOST:-metastore-db}"
POSTGRES_DB="${POSTGRES_DB:-metastore_db}"
POSTGRES_USER="${POSTGRES_USER:-spark}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-spark_dev_password}"

DELTA_SQL_CONF="spark.sql.extensions=io.delta.sql.DeltaSparkSessionExtension"
DELTA_CATALOG_CONF="spark.sql.catalog.spark_catalog=org.apache.spark.sql.delta.catalog.DeltaCatalog"
PACKAGES="org.apache.spark:spark-connect_${SCALA_BIN_VERSION}:${PYSPARK_VERSION},io.delta:delta-spark_${SCALA_BIN_VERSION}:${DELTA_VERSION}"
# NOTE: Postgres JDBC driver is intentionally NOT in this --packages list -
# it's baked into $SPARK_HOME/jars at image build time instead (Dockerfile).
# See the comment there for why (java.sql.DriverManager classloader gotcha).

CONNECT_CONF_ARGS=(
    --packages "${PACKAGES}"
    --conf "${DELTA_SQL_CONF}"
    --conf "${DELTA_CATALOG_CONF}"
    --conf "spark.sql.warehouse.dir=/home/spark/data/delta/warehouse"
    --conf "spark.hadoop.javax.jdo.option.ConnectionURL=jdbc:postgresql://${METASTORE_HOST}:5432/${POSTGRES_DB}"
    --conf "spark.hadoop.javax.jdo.option.ConnectionDriverName=org.postgresql.Driver"
    --conf "spark.hadoop.javax.jdo.option.ConnectionUserName=${POSTGRES_USER}"
    --conf "spark.hadoop.javax.jdo.option.ConnectionPassword=${POSTGRES_PASSWORD}"
    --conf "spark.driver.memory=4g"
    --conf "spark.sql.shuffle.partitions=8"
    --conf "spark.hadoop.hive.metastore.schema.verification=false"
)
# NOTE: kept in sync with shared/spark_session.py. Hive settings need the
# `spark.hadoop.` prefix to reach the Hive conf. Verification is off because
# metastore-init/ seeds schema version 2.3.0 while Spark 3.5.3 bundles the
# hive-metastore-2.3.9 client. And do NOT add
# datanucleus.schema.autoCreateAll - on Postgres it self-deadlocks (see
# metastore-init/README.md); the schema is pre-seeded instead.

echo "[entrypoint] Starting Spark Connect server on :15002 ..."
if [ -x "${SPARK_HOME}/sbin/start-connect-server.sh" ]; then
    # Preferred path: the real launcher script (daemonizes itself).
    start-connect-server.sh "${CONNECT_CONF_ARGS[@]}"
else
    # Fallback: sbin/ isn't present in this pyspark install for some reason -
    # start the same server class directly via spark-submit (always present
    # in bin/), backgrounded manually since spark-submit runs in the foreground.
    echo "[entrypoint] sbin/start-connect-server.sh not found - falling back to spark-submit"
    nohup spark-submit \
        --class org.apache.spark.sql.connect.service.SparkConnectServer \
        --name "spark-connect-server" \
        "${CONNECT_CONF_ARGS[@]}" \
        > "${SPARK_HOME}/logs/spark-connect-server.out" 2>&1 &
    disown
fi

# Wait (up to ~60s) for the Connect server's gRPC port to come up before
# handing off to Jupyter, so early client connections don't fail silently.
echo "[entrypoint] Waiting for :15002 to accept connections..."
for i in $(seq 1 30); do
    if (echo > /dev/tcp/127.0.0.1/15002) >/dev/null 2>&1; then
        echo "[entrypoint] Spark Connect server is up (after ${i}0s max wait)"
        break
    fi
    sleep 2
done
echo "[entrypoint] Spark Connect server logs: ${SPARK_HOME}/logs/"

echo "[entrypoint] Starting JupyterLab on :8888 ..."

# Empty token = friction-free localhost dev access from VSCode.
# - disable_check_xsrf: needed or you'll hit "'_xsrf' argument missing from POST"
#   when VSCode creates a kernel session over REST.
# - allow_origin='*' + allow_remote_access=True: needed or the REST session
#   create can succeed while the follow-up WebSocket kernel channel gets
#   silently rejected by Jupyter Server's Origin/Host checks (VSCode's
#   webview sends an Origin like vscode-webview://... that a bare server
#   doesn't trust by default) - this is what causes
#   "Kernel not initialized in Session" even though curl .../api works fine.
# This container should NEVER be exposed beyond localhost/dev use.
exec jupyter lab \
    --ip=0.0.0.0 --port=8888 --no-browser --allow-root \
    --ServerApp.token= --ServerApp.password= \
    --ServerApp.disable_check_xsrf=True \
    --ServerApp.allow_origin='*' \
    --ServerApp.allow_remote_access=True \
    --notebook-dir=/home/spark/work
