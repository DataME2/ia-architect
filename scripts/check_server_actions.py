#!/usr/bin/env python3
"""Fail the build if a 'use server' module exports anything but async functions.

Next enforces this, but only when the offending module happens to be pulled
into a page's server graph at build time. A module reached solely through a
client component passes `next build` and then throws on the first request --
which is how a broken sign-in page shipped past a green build here.

Types are erased before Next sees the module, so `export type` and
`export interface` are fine. A `const`, `let`, `class` or non-async function
is not.

Run:  python3 scripts/check_server_actions.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"

USE_SERVER = re.compile(r"^\s*['\"]use server['\"]\s*;?\s*$", re.M)
# Exported bindings that survive to runtime. `type` and `interface` do not.
BAD_EXPORT = re.compile(
    r"^export\s+(?!type\b|interface\b|default\s+async\b|async\b)"
    r"(const|let|var|class|function)\s+([A-Za-z_$][\w$]*)",
    re.M,
)


def main() -> int:
    problems: list[str] = []

    for path in sorted(SRC.rglob("*.ts")) + sorted(SRC.rglob("*.tsx")):
        text = path.read_text(encoding="utf-8")
        if not USE_SERVER.search(text[:400]):
            continue
        for match in BAD_EXPORT.finditer(text):
            kind, name = match.group(1), match.group(2)
            line = text[: match.start()].count("\n") + 1
            problems.append(
                f"{path.relative_to(SRC.parent.parent)}:{line}: "
                f"exports {kind} `{name}` — a 'use server' module may export "
                f"only async functions. Move the value to a non-server module "
                f"(src/web/), or inline it at its use site."
            )

    if problems:
        print(f"Server-action exports FAILED — {len(problems)} problem(s):\n")
        for problem in problems:
            print(f"  - {problem}")
        print(
            "\nNext throws this at request time, not always at build time, so a "
            "green build is not evidence the page loads."
        )
        return 1

    print("Server actions OK — every 'use server' module exports only async functions.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
