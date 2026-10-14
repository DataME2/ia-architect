#!/usr/bin/env python3
"""Fail the build if the newest migration does not register itself.

Twice now a migration merged to `main` and never reached the connected
Supabase project's schema cache (committee_resolution, scope 57/61;
person_role_select_family, scope 93) — and nothing told anyone until a
registrar or a QA pass hit the gap directly.

schema_migration_log (0090) is the receipt: every migration from 0090
onward ends with one `insert` naming itself, and `/api/cron/migration-drift`
compares the database's newest row against what the deployed build expects.
That only works if both halves stay honest:

  1. The newest migration file actually contains the insert, naming itself
     correctly.
  2. src/data/migration-drift.ts's EXPECTED_MIGRATION_VERSION and
     EXPECTED_MIGRATION_NAME match that same migration.

A forgotten insert or a forgotten constant bump would make the drift
detector either blind (never alerts) or permanently noisy (always alerts) —
both are the detector failing the exact way this script exists to catch
before it ships.

Run:  python3 scripts/check_migration_receipt.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS = ROOT / "supabase" / "migrations"
DRIFT_MODULE = ROOT / "src" / "data" / "migration-drift.ts"

# The practice starts at 0090 (scope 94) — nothing before it is expected to
# have registered itself, and this script has no opinion about history.
FIRST_REGISTERING_VERSION = 90

FILENAME = re.compile(r"^(\d{4})_(.+)\.sql$")
INSERT = re.compile(
    r"insert\s+into\s+schema_migration_log\s*\([^)]*\)\s*values\s*\(\s*'(\d{4})'\s*,\s*'([^']+)'",
    re.I,
)
EXPECTED_VERSION = re.compile(r"EXPECTED_MIGRATION_VERSION\s*=\s*'(\d{4})'")
EXPECTED_NAME = re.compile(r"EXPECTED_MIGRATION_NAME\s*=\s*'([^']+)'")


def main() -> int:
    files = sorted(MIGRATIONS.glob("*.sql"))
    if not files:
        print("No migrations found — nothing to check.")
        return 0

    latest = files[-1]
    match = FILENAME.match(latest.name)
    if match is None:
        print(f"check_migration_receipt FAILED — {latest.name} does not follow NNNN_name.sql")
        return 1

    version, stem = match.group(1), latest.stem
    if int(version) < FIRST_REGISTERING_VERSION:
        print(f"check_migration_receipt OK — newest migration ({stem}) predates the registering practice (0090).")
        return 0

    problems: list[str] = []

    insert_match = INSERT.search(latest.read_text())
    if insert_match is None:
        problems.append(
            f"{latest.name} has no `insert into schema_migration_log (...) values ('{version}', '{stem}')` "
            f"— the drift detector will never see this migration as applied."
        )
    else:
        found_version, found_name = insert_match.group(1), insert_match.group(2)
        if found_version != version:
            problems.append(
                f"{latest.name} registers version '{found_version}', which does not match its own "
                f"filename prefix '{version}'."
            )
        if found_name != stem:
            problems.append(
                f"{latest.name} registers name '{found_name}', which does not match its own filename stem "
                f"'{stem}'."
            )

    drift_src = DRIFT_MODULE.read_text()
    expected_version_match = EXPECTED_VERSION.search(drift_src)
    expected_name_match = EXPECTED_NAME.search(drift_src)
    if expected_version_match is None or expected_name_match is None:
        problems.append(f"{DRIFT_MODULE.relative_to(ROOT)} has no EXPECTED_MIGRATION_VERSION/NAME constant.")
    else:
        expected_version, expected_name = expected_version_match.group(1), expected_name_match.group(1)
        if expected_version != version:
            problems.append(
                f"{DRIFT_MODULE.relative_to(ROOT)}'s EXPECTED_MIGRATION_VERSION is '{expected_version}', "
                f"but the newest migration is '{version}' ({stem}) — bump it, or the drift detector will "
                f"alert forever even once the database genuinely catches up."
            )
        if expected_name != stem:
            problems.append(
                f"{DRIFT_MODULE.relative_to(ROOT)}'s EXPECTED_MIGRATION_NAME is '{expected_name}', but the "
                f"newest migration is '{stem}'."
            )

    if problems:
        print(f"check_migration_receipt FAILED — {len(problems)} problem(s):\n")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    print(f"check_migration_receipt OK — {stem} registers itself, and the drift detector expects exactly it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
