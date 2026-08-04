#!/usr/bin/env python3
"""Create dedicated non-personal staging smoke credentials."""

from __future__ import annotations

import argparse
import os
import secrets
import tempfile
from pathlib import Path


SMOKE_VALUES = {
    "STAGING_SMOKE_CUSTOMER_EMAIL": "smoke-customer@staging.valx.invalid",
    "STAGING_SMOKE_DETAILER_EMAIL": "smoke-detailer@staging.valx.invalid",
}


def encode_compose_value(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", required=True, type=Path)
    args = parser.parse_args()
    env_file: Path = args.env_file.resolve()
    if not env_file.is_file():
        raise SystemExit(f"Missing staging environment file: {env_file}")

    values = {
        **SMOKE_VALUES,
        "STAGING_SMOKE_CUSTOMER_PASSWORD": secrets.token_urlsafe(32),
        "STAGING_SMOKE_DETAILER_PASSWORD": secrets.token_urlsafe(32),
    }
    existing = env_file.read_text(encoding="utf-8").splitlines()
    updated: list[str] = []
    remaining = set(values)
    for line in existing:
        key = line.split("=", 1)[0]
        if key in values:
            updated.append(f"{key}={encode_compose_value(values[key])}")
            remaining.discard(key)
        else:
            updated.append(line)
    if remaining:
        updated.append("")
        updated.append("# Dedicated non-personal accounts for live staging smoke tests.")
        for key in values:
            if key in remaining:
                updated.append(f"{key}={encode_compose_value(values[key])}")

    stat = env_file.stat()
    temporary_name = ""
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=env_file.parent,
            prefix=".env.smoke-",
            delete=False,
        ) as temporary:
            temporary_name = temporary.name
            temporary.write("\n".join(updated) + "\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        os.chmod(temporary_name, 0o600)
        os.chown(temporary_name, stat.st_uid, stat.st_gid)
        os.replace(temporary_name, env_file)
    finally:
        if temporary_name and os.path.exists(temporary_name):
            os.unlink(temporary_name)

    print("Dedicated staging smoke credentials configured without disclosure")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
