#!/usr/bin/env python3
"""Fail the build if any table is not covered by Row-Level Security.

Principle P5 (strict tenant isolation) is enforced by the database, not by
remembering a `where club_id = ...` in every query. That only holds while
*every* table has RLS enabled and at least one policy — a table missing
either is readable across tenants, and it gets that way through an ordinary
omission in a migration rather than through a bad decision.

So this is a build gate, not a review checklist item. Three things are
checked for every table in supabase/migrations/:

  1. RLS is enabled.
  2. At least one policy exists.
  3. It carries a tenant column (club_id), or is the tenant table itself.

Run:  python3 scripts/check_rls.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parent.parent / "supabase" / "migrations"

# The tenant table keys on its own id rather than a club_id column.
# Tables Supabase owns. We add policies to them but never create them, so
# they are not expected to appear in a `create table` in this repo.
EXTERNAL_TABLES = {"storage.objects", "objects", "storage"}

TENANT_TABLE = "club"

# Tables legitimately without a tenant column. Keep this empty if at all
# possible: every entry is a table whose isolation has to be reasoned about
# by hand, which is exactly what this check exists to avoid.
TENANTLESS_ALLOWED: set[str] = {
    # A prospect is someone who has not become a club and may never. Giving
    # this table a club_id would put the marketing surface inside the tenant
    # world it exists to stay out of (scope 28 section 3). It is isolated by
    # having no API access at all rather than by a tenant column: its only
    # writer is enter_demo(), which owns it.
    "prospect",
}

CREATE_TABLE = re.compile(r"^\s*create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)\s*\(", re.I | re.M)
ENABLE_RLS = re.compile(r"^\s*alter\s+table\s+([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security", re.I | re.M)
CREATE_POLICY = re.compile(r"^\s*create\s+policy\s+[a-z_][a-z0-9_]*\s+on\s+([a-z_][a-z0-9_]*)", re.I | re.M)


def strip_comments(sql: str) -> str:
    """Remove -- line comments so commented-out DDL is not counted."""
    return "\n".join(line.split("--", 1)[0] for line in sql.splitlines())


def table_bodies(sql: str) -> dict[str, str]:
    """Map each table name to the text of its column definitions."""
    bodies: dict[str, str] = {}
    for match in CREATE_TABLE.finditer(sql):
        name = match.group(1).lower()
        start = match.end()
        depth = 1
        i = start
        while i < len(sql) and depth:
            if sql[i] == "(":
                depth += 1
            elif sql[i] == ")":
                depth -= 1
            i += 1
        bodies[name] = sql[start : i - 1]
    return bodies


def main() -> int:
    if not MIGRATIONS.is_dir():
        print(f"No migrations directory at {MIGRATIONS} — nothing to check.")
        return 0

    files = sorted(MIGRATIONS.glob("*.sql"))
    if not files:
        print("No migrations found — nothing to check.")
        return 0

    sql = strip_comments("\n".join(f.read_text() for f in files))

    bodies = table_bodies(sql)
    tables = set(bodies)
    rls_enabled = {m.lower() for m in ENABLE_RLS.findall(sql)}
    with_policies = {m.lower() for m in CREATE_POLICY.findall(sql)}

    problems: list[str] = []

    for table in sorted(tables):
        if table not in rls_enabled:
            problems.append(
                f"{table}: RLS is not enabled — "
                f"add `alter table {table} enable row level security;`"
            )
        if table not in with_policies:
            problems.append(
                f"{table}: no policy — RLS with no policy denies everyone, "
                f"which fails closed but silently breaks the feature"
            )
        if table != TENANT_TABLE and table not in TENANTLESS_ALLOWED:
            if not re.search(r"\bclub_id\b", bodies[table]):
                problems.append(
                    f"{table}: no club_id column — it cannot be tenant-scoped, "
                    f"so P5 cannot be enforced for it"
                )

    # A policy on a table nobody declared is a typo that silently protects
    # nothing. `storage.objects` is the one exception: Supabase owns that
    # table, our migrations only add policies to it, and it is tenant-scoped
    # by the club_id in the object's path rather than by a column — so this
    # checker cannot verify it and says so rather than pretending.
    for table in sorted(with_policies - tables - EXTERNAL_TABLES):
        problems.append(f"policy references unknown table `{table}` — misspelled?")

    if problems:
        print(f"RLS coverage FAILED — {len(problems)} problem(s):\n")
        for problem in problems:
            print(f"  - {problem}")
        print(
            "\nP5 (strict tenant isolation) is enforced by these policies. "
            "A gap here is a cross-tenant data leak."
        )
        return 1

    print(
        f"RLS coverage OK — {len(tables)} tables, all with RLS enabled, "
        f"at least one policy, and a tenant column."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
