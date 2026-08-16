"""
Entry point for running client/ scripts against their matching catalog entry.

Usage:
    python main.py --catalog example_client
    python main.py --list

This loads client/catalogs/<name>.yaml (the script's declared inputs/outputs
and parameters), then dynamically runs client/scripts/<name>.py's `run(catalog)`
function with that config. Scripts never hardcode table names/paths/modes -
they read everything from the catalog dict, so behavior changes by editing
YAML, not code.
"""
import argparse
import importlib.util
import sys
from pathlib import Path

import yaml

CLIENT_DIR = Path(__file__).resolve().parent
CATALOGS_DIR = CLIENT_DIR / "catalogs"
SCRIPTS_DIR = CLIENT_DIR / "scripts"
SHARED_DIR = CLIENT_DIR.parent / "shared"

# Scripts import `from spark_session import get_spark` without worrying
# about relative paths - main.py sets that up once, here.
sys.path.insert(0, str(SHARED_DIR))
sys.path.insert(0, str(SCRIPTS_DIR))


def list_catalogs() -> list[str]:
    return sorted(p.stem for p in CATALOGS_DIR.glob("*.yaml"))


def load_catalog(name: str) -> dict:
    path = CATALOGS_DIR / f"{name}.yaml"
    if not path.exists():
        available = ", ".join(list_catalogs()) or "(none found)"
        raise FileNotFoundError(
            f"No catalog file at {path}\nAvailable catalogs: {available}"
        )
    with open(path) as f:
        return yaml.safe_load(f) or {}


def load_script(name: str):
    path = SCRIPTS_DIR / f"{name}.py"
    if not path.exists():
        raise FileNotFoundError(f"No script file at {path} (catalog name must match script filename)")
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not hasattr(module, "run"):
        raise AttributeError(f"{path} must define a run(catalog: dict) function")
    return module


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--catalog",
        help="Name shared by catalogs/<name>.yaml and scripts/<name>.py, e.g. 'example_client'",
    )
    parser.add_argument("--list", action="store_true", help="List available catalog/script names and exit")
    args = parser.parse_args()

    if args.list or not args.catalog:
        names = list_catalogs()
        print("Available catalogs:" if names else "No catalogs found in client/catalogs/")
        for name in names:
            print(f"  - {name}")
        if not args.catalog:
            parser.print_usage()
        return

    catalog = load_catalog(args.catalog)
    module = load_script(args.catalog)
    module.run(catalog)


if __name__ == "__main__":
    main()
