#!/usr/bin/env python3
"""Fail the build on the accessibility defects that regress silently (NFR-15).

This is not an audit. WCAG 2.2 AA is mostly judgement -- whether a heading
describes its section, whether an error message says what to do -- and no
script settles any of that. The audit is a document
(docs/annexes/accessibility-audit.md); this is the narrow part of it that a
future edit can undo without anybody noticing, because the screen still
looks right afterwards.

Four things are checked, each chosen because it is mechanical, because the
whole codebase currently passes it, and because the failure is invisible to
a sighted reviewer:

  1. Every form control has an accessible name -- a wrapping <label>, a
     matching htmlFor, or an aria-label. (1.3.1, 3.3.2, 4.1.2)
  2. Every <img> carries alt. An empty alt is a decision and is allowed;
     an absent one is an omission. (1.1.1)
  3. Every <svg> is either hidden from assistive technology or named --
     including by an ancestor, which is how the Assistant's mark is hidden.
     A control read out as "button" is unusable. (1.1.1, 4.1.2)
  4. No positive tabIndex. It reorders focus against the reading order and
     breaks every subsequent element on the page. (2.4.3)

**Tags are scanned rather than matched with a regular expression.** The
first version of this script used one and reported three false positives in
a row, all from the `>` inside an `onFocus={(event) => ...}` arrow --
attributes that hold JSX expressions are not a regular language. A checker
that cries wolf gets switched off, which costs more than not having it.

Run:  python3 scripts/check_a11y.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"

VOID = {"input", "img", "br", "hr", "meta", "link", "source", "area", "col"}
CONTROLS = {"input", "select", "textarea"}


class Tag:
    __slots__ = ("name", "attrs", "start", "closing", "self_closing")

    def __init__(self, name: str, attrs: str, start: int, closing: bool, self_closing: bool):
        self.name = name
        self.attrs = attrs
        self.start = start
        self.closing = closing
        self.self_closing = self_closing


def scan(text: str) -> list[Tag]:
    """Every JSX element tag in source order.

    Walks the attribute region tracking brace depth and quotes, so a `>`
    inside `{(e) => e.target.value}` or inside a string does not end the
    tag. Lowercase-named elements only: a `<Component>` has no accessible
    name of its own, its rendered markup does, and that markup is checked
    where it is written.
    """
    tags: list[Tag] = []
    i = 0
    length = len(text)

    while i < length:
        if text[i] != "<":
            i += 1
            continue

        match = re.compile(r"<(/?)([a-z][a-zA-Z0-9-]*)").match(text, i)
        if match is None:
            i += 1
            continue

        j = match.end()
        depth = 0
        quote = ""
        while j < length:
            char = text[j]
            if quote:
                if char == quote:
                    quote = ""
            elif char in "\"'" and depth > 0:
                quote = char
            elif char == '"' or char == "'":
                quote = char
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
            elif char == ">" and depth == 0:
                break
            j += 1

        attrs = text[match.end() : j]
        tags.append(
            Tag(
                name=match.group(2),
                attrs=attrs,
                start=i,
                closing=match.group(1) == "/",
                self_closing=attrs.rstrip().endswith("/"),
            )
        )
        i = j + 1

    return tags


def named(attrs: str) -> bool:
    return "aria-label" in attrs or "aria-labelledby" in attrs or "title=" in attrs


ATTR_VALUE = r"((?:\"[^\"]*\")|(?:'[^']*')|(?:\{(?:[^{}]|\{[^{}]*\})*\}))"
FOR_ATTR = re.compile(r"htmlFor=" + ATTR_VALUE)
ID_ATTR = re.compile(r"\bid=" + ATTR_VALUE)
TAB_INDEX = re.compile(r"tabIndex=\{\s*([1-9]\d*)\s*\}")
HIDDEN_TYPE = re.compile(r"type=[\"']hidden[\"']")


def check_file(path: Path, problems: list[str]) -> None:
    text = path.read_text(encoding="utf-8")
    rel = path.relative_to(SRC.parent)
    tags = scan(text)

    def where(index: int) -> str:
        return f"{rel}:{text[:index].count(chr(10)) + 1}"

    # Every id a <label htmlFor> points at, by the attribute's source text --
    # so `htmlFor={`state-${clubId}`}` matches `id={`state-${clubId}`}`.
    label_targets = {m.group(1) for m in FOR_ATTR.finditer(text)}

    # The ancestors open at each point, so a wrapping <label> names the
    # control inside it and an aria-hidden wrapper hides the whole subtree
    # beneath it -- which is how the Assistant's mark is hidden, on the span
    # rather than on the <svg> itself. A stack rather than a counter,
    # because a closing tag has to remove the element it actually closes.
    stack: list[tuple[str, bool]] = []

    for tag in tags:
        hides = "aria-hidden" in tag.attrs
        closes_immediately = tag.self_closing or tag.name in VOID

        if tag.closing:
            for index in range(len(stack) - 1, -1, -1):
                if stack[index][0] == tag.name:
                    del stack[index:]
                    break
            continue

        open_labels = sum(1 for name, _ in stack if name == "label")
        hidden_depth = sum(1 for _, hidden in stack if hidden)

        if tag.name in CONTROLS:
            if not HIDDEN_TYPE.search(tag.attrs) and not named(tag.attrs) and open_labels == 0:
                own_id = ID_ATTR.search(tag.attrs)
                if own_id is None or own_id.group(1) not in label_targets:
                    problems.append(
                        f"{where(tag.start)}: <{tag.name}> has no accessible name — wrap it "
                        "in a <label>, point a htmlFor at its id, or give it aria-label"
                    )

        elif tag.name == "img":
            if "alt=" not in tag.attrs:
                problems.append(
                    f'{where(tag.start)}: <img> without alt. An empty alt="" is a '
                    "decision and is fine; an absent one is an omission"
                )

        elif tag.name == "svg":
            if hidden_depth == 0 and not hides and not named(tag.attrs):
                problems.append(
                    f"{where(tag.start)}: <svg> is neither hidden from assistive "
                    'technology (aria-hidden="true", on it or on a wrapper) nor named'
                )

        for match in TAB_INDEX.finditer(tag.attrs):
            problems.append(
                f"{where(tag.start)}: tabIndex={match.group(1)} reorders focus against "
                "the reading order. Use 0, or move the element"
            )

        if not closes_immediately:
            stack.append((tag.name, hides))


def main() -> int:
    problems: list[str] = []
    files = sorted(SRC.rglob("*.tsx"))
    for path in files:
        check_file(path, problems)

    if problems:
        print("Accessibility check FAILED (NFR-15):\n", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        print(
            f"\n{len(problems)} problem(s). See docs/annexes/accessibility-audit.md "
            "for what this checks and what it deliberately does not.",
            file=sys.stderr,
        )
        return 1

    print(
        f"Accessibility OK — {len(files)} components; every control is named, every "
        "image declares its alt, no icon is unlabelled, and focus follows the page"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
