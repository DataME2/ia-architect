#!/usr/bin/env python3
"""Assert the Assistant's autonomy level in code, not in convention (R33.6).

[Decision 1](docs/decisions/1_ai-assistant-autonomy-level.md) settles that
the Assistant is **advisory**: it may draft, summarise, explain, classify
and flag, and a human decides and acts. Requirement 33 turns that into five
criteria, four of which are true today because `AssistantNote` structurally
cannot render a committing control. The fifth -- R33.6 -- asks for the
other four to be asserted by a check rather than by a reviewer noticing.

This is that check, and it is written to be true *before* a generative
integration exists rather than after, because the edit that adds one is
exactly the edit that would otherwise quietly widen the surface. Three
things are asserted:

  1. **The Assistant's surface is one component.** A second one is how a
     "just for the reminder case" send button arrives -- in a file nobody
     is watching. Only `_components/AssistantNote.tsx` may render it.
  2. **That component commits nothing.** No form, no server action, no
     `<button type="submit">`, no mutating handler. Its two controls are a
     link that hands the draft to a human and a button that dismisses it.
  3. **Nothing calls a model.** No generative SDK is imported anywhere in
     `src/`. When one is added this check fails, on purpose: adding it is
     the moment to re-read decision 1 and to extend R33.5's rule about a
     minor's data, not a moment to discover the guardrail was a comment.

Run:  python3 scripts/check_assistant.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
SURFACE = SRC / "app" / "_components" / "AssistantNote.tsx"

# Ways a React component commits something. `action=` covers both a server
# action and a form post; `formAction` is the same door with another name.
COMMITTING = [
    (re.compile(r"<form\b"), "renders a <form>"),
    (re.compile(r"\baction=\{"), "binds an action"),
    (re.compile(r"\bformAction\b"), "binds a formAction"),
    (re.compile(r"type=[\"']submit[\"']"), "renders a submit control"),
    (re.compile(r"\buse server\b"), "declares a server action"),
    (re.compile(r"\bonSubmit\b|\bonClick=\{(?!\s*\(\s*\)\s*=>\s*void)"), "wires a handler"),
    (re.compile(r"\bfetch\(|\bsupabase\b|createClient", re.I), "reaches a client or the network"),
]

# Generative clients. Named rather than guessed at: a check that tries to
# detect "an AI library" by keyword flags every file mentioning the word.
GENERATIVE = re.compile(
    r"""from\s+['"](?:@anthropic-ai/[\w-]+|openai|@google/gener\w+|@mistralai/[\w-]+"""
    r"""|cohere-ai|@aws-sdk/client-bedrock\w*|replicate|ollama)['"]"""
)


def main() -> int:
    problems: list[str] = []

    if not SURFACE.exists():
        print(f"{SURFACE.relative_to(ROOT)} is missing — R33.3's guardrail is the file itself", file=sys.stderr)
        return 1

    surface_text = SURFACE.read_text(encoding="utf-8")

    # 1. One surface.
    for path in sorted(SRC.rglob("*.tsx")) + sorted(SRC.rglob("*.ts")):
        if path == SURFACE:
            continue
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(ROOT)
        if re.search(r"className=[\"'][^\"']*\bassistant\b", text) or re.search(
            r"<aside[^>]*aria-label=\{?[`\"']Assistant", text
        ):
            problems.append(
                f"{rel} renders an Assistant surface of its own. There is exactly one "
                f"({SURFACE.relative_to(ROOT)}), because a second is where a committing "
                "control arrives unreviewed (decision 1)"
            )
        if GENERATIVE.search(text):
            problems.append(
                f"{rel} imports a generative client. R33.5 and R33.2 are vacuously true "
                "only while nothing calls a model — adding one means re-reading decision 1, "
                "not editing this check"
            )

    if GENERATIVE.search(surface_text):
        problems.append(
            f"{SURFACE.relative_to(ROOT)} imports a generative client — the surface renders "
            "a draft, it does not produce one"
        )

    # 2. The surface commits nothing.
    for pattern, what in COMMITTING:
        if pattern.search(surface_text):
            problems.append(
                f"{SURFACE.relative_to(ROOT)} {what}. The Assistant is advisory (R33.2, "
                "R33.3): it offers exactly two controls — use the draft, or dismiss it — "
                "and no third that commits anything"
            )

    if problems:
        print("Assistant autonomy check FAILED (R33.6, decision 1):\n", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1

    print(
        "Assistant autonomy OK — one advisory surface, committing nothing, "
        "and nothing in src/ calls a model"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
