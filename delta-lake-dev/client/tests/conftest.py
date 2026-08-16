"""
Makes `spark_session.get_spark()` importable from tests under client/tests/,
and provides a shared `spark` fixture so each test doesn't reconnect
separately.

Run from the project root, with the .venv active and the server running:

    pytest client/tests/ -v
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "shared"))

import pytest
from spark_session import get_spark  # noqa: E402


@pytest.fixture(scope="session")
def spark():
    s = get_spark("pytest-local-connect")
    yield s
    s.stop()
