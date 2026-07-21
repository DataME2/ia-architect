# CLAUDE.md

<!--
  TEMPLATE — replace this comment block and the placeholders below when you
  bootstrap a new project from archreator. Keep the "rule that governs
  everything else" section; it's the whole point of this template.
-->

<One or two sentences: what this project is, what state it's in.>

## The rule that governs everything else

**Strategy and business architecture are validated before any other
layer.** A change in requirements is never coded directly: align it through
the numbered EA layers (`docs/ea/1_strategy` → … → `5_technology`), record
it in a scope document (`docs/scope/`), then implement. Use the
`ea-first-change` skill for the process, `scope-doc` for the scope
document, `ea-doc-style` when touching anything under `docs/`, and
`pr-description` when opening or updating a PR (the body must cover the
whole branch, not just the latest commit). Pure bug fixes that change no
documented behavior can skip the alignment, but still keep the docs true.

## Layout

<!-- Replace with the real source layout once the project has code, e.g.:
- `src/` — ...
- `tests/` — ...
-->

- `docs/ea/` — the documentation home (numbered ArchiMate layers);
  `docs/scope/` — one document per initiative.

## Commands

<!-- Replace with the project's real commands once they exist, e.g.:
```bash
npm run lint
npm run typecheck
npm test
npm run build
```
All of them must be green before pushing; CI runs the same.
-->

## Conventions

<!-- Project-specific conventions go here as they're established —
     glossary location, code language, naming rules, single point of
     enforcement for business rules, etc. Keep this section short; link to
     the EA docs for anything that has a canonical home there instead of
     restating it. -->

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, …).
