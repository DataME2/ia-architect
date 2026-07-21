#!/usr/bin/env python3
"""Check that relative links in this repo resolve to real targets.

Two file kinds are validated:

**Markdown** (`*.md`) — relative `[text](target)` links must resolve to a
real file. Two categories are deliberately not flagged:

- Links inside fenced code blocks or inline code spans — skill files quote
  illustrative link syntax (e.g. `./<n>_*.md`) as examples, not real links.
- Links under docs/ea/ whose target is a numbered EA content file
  (`<n>_kebab-name.md`) that doesn't exist yet — layer READMEs deliberately
  forward-reference the numbered docs a downstream project will write; a
  pure, unfilled template (like this repo's own main branch) is expected to
  have every one of these unresolved.

**HTML** (`*.html`) — relative `href`/`src` targets must resolve to a real
file, and any fragment (`#id`, or `page.html#id`) must resolve to an element
`id` in the target HTML file. This catches broken page-to-page links and
stale in-page anchors in the guidance site.

Absolute or non-file targets (http, https, mailto, tel, data, javascript)
are never checked in either kind.
"""
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
FENCE_RE = re.compile(r"```.*?```", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")
NUMBERED_EA_DOC_RE = re.compile(r"^\d+_[\w.-]+\.md$")
# href/src attribute values; the lookbehind avoids matching data-src, xlink:href, etc.
HREF_RE = re.compile(r"""(?<![\w:-])(?:href|src)\s*=\s*["']([^"']+)["']""")
# element ids; the lookbehind avoids matching data-id, grid=, etc.
ID_RE = re.compile(r"""(?<![\w-])id\s*=\s*["']([^"']+)["']""")

EXTERNAL_PREFIXES = ("http://", "https://", "mailto:", "tel:", "data:", "javascript:")

_ids_cache: dict[Path, set[str]] = {}


def is_external(target: str) -> bool:
    return target.startswith(EXTERNAL_PREFIXES)


def strip_code(text: str) -> str:
    text = FENCE_RE.sub("", text)
    text = INLINE_CODE_RE.sub("", text)
    return text


def is_expected_forward_reference(resolved: Path) -> bool:
    try:
        resolved.relative_to(REPO_ROOT / "docs" / "ea")
    except ValueError:
        return False
    return bool(NUMBERED_EA_DOC_RE.match(resolved.name))


def ids_in(html_file: Path) -> set[str]:
    if html_file not in _ids_cache:
        try:
            _ids_cache[html_file] = set(ID_RE.findall(html_file.read_text(encoding="utf-8")))
        except (OSError, UnicodeDecodeError):
            _ids_cache[html_file] = set()
    return _ids_cache[html_file]


def check_markdown(md_file: Path) -> list[str]:
    errors = []
    text = strip_code(md_file.read_text(encoding="utf-8"))
    for match in LINK_RE.finditer(text):
        target = match.group(1).strip()
        if not target or is_external(target) or target.startswith("#"):
            continue
        path_part = target.split("#", 1)[0]
        if not path_part:
            continue
        resolved = (md_file.parent / path_part).resolve()
        if resolved.exists() or is_expected_forward_reference(resolved):
            continue
        errors.append(f"{md_file.relative_to(REPO_ROOT)}: broken link -> {target}")
    return errors


def check_html(html_file: Path) -> list[str]:
    errors = []
    rel = html_file.relative_to(REPO_ROOT)
    for target in HREF_RE.findall(html_file.read_text(encoding="utf-8")):
        target = target.strip()
        if not target or is_external(target):
            continue
        path_part, _, fragment = target.partition("#")
        if not path_part:
            # Same-page anchor, e.g. href="#main".
            if fragment and fragment not in ids_in(html_file):
                errors.append(f"{rel}: missing anchor -> #{fragment}")
            continue
        resolved = (html_file.parent / path_part).resolve()
        if not resolved.exists():
            errors.append(f"{rel}: broken link -> {target}")
            continue
        if fragment and resolved.suffix == ".html" and fragment not in ids_in(resolved):
            errors.append(f"{rel}: missing anchor -> {target}")
    return errors


def main() -> int:
    all_errors = []
    for path in REPO_ROOT.rglob("*"):
        if ".git" in path.parts or not path.is_file():
            continue
        if path.suffix == ".md":
            all_errors.extend(check_markdown(path))
        elif path.suffix == ".html":
            all_errors.extend(check_html(path))
    if all_errors:
        print("Broken relative links found:")
        for error in all_errors:
            print(f"  {error}")
        return 1
    print("All relative Markdown and HTML links resolve.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
