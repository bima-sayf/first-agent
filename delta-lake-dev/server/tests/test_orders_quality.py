"""
Run inside the container:
    docker compose exec spark-delta pytest tests/ -v

(or from VSCode's integrated terminal after `docker compose exec spark-delta bash`)
"""
import sys
sys.path.append("/home/spark/src")

import pytest
from pyspark.sql import Row
from spark_session import get_spark


@pytest.fixture(scope="module")
def spark():
    s = get_spark("pytest-delta")
    yield s
    s.stop()


@pytest.fixture
def orders_df(spark):
    return spark.createDataFrame([
        Row(order_id=1, customer="alice", amount=120.50),
        Row(order_id=2, customer="bob", amount=75.00),
    ])


def test_no_null_amounts(orders_df):
    bad = orders_df.filter("amount IS NULL")
    assert bad.count() == 0


def test_no_negative_amounts(orders_df):
    bad = orders_df.filter("amount < 0")
    assert bad.count() == 0


def test_create_and_read_delta_table(spark, tmp_path):
    table_path = "/home/spark/data/delta/tmp/pytest_orders"
    df = spark.createDataFrame([Row(order_id=1, amount=10.0)])
    df.write.format("delta").mode("overwrite").save(table_path)

    result = spark.read.format("delta").load(table_path)
    assert result.count() == 1
    assert result.collect()[0]["amount"] == 10.0
