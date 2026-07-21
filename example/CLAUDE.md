# CLAUDE.md

archreator-guide is a small static site publishing the archreator EA-first
+ AI-actor method for browsing. It is itself built by following that same
process — see [`../CLAUDE.md`](../CLAUDE.md) for the rule, and
[`docs/scope/1_publish-guidance-site.md`](./docs/scope/1_publish-guidance-site.md)
for how it was applied here.

## The rule that governs everything else

**Strategy and business architecture are validated before any other
layer.** A change in requirements is never coded directly: align it through
the numbered EA layers (`docs/ea/1_strategy` → … → `5_technology`), record
it in a scope document (`docs/scope/`), then implement. Use the
`ea-first-change` skill for the process, `scope-doc` for the scope
document, `ea-doc-style` when touching anything under `docs/`, and
`pr-description` when opening or updating a PR. If a change touches the
Copilot's autonomy level or decision rights, also see
[`docs/decisions/1_docs-agent-autonomy.md`](./docs/decisions/1_docs-agent-autonomy.md)
and the `decision-record` skill.

## Layout

- `docs/ea/` — this project's current-state architecture (numbered
  ArchiMate layers); `docs/scope/` — one document per initiative;
  `docs/decisions/` — smaller rationale calls, notably the Copilot's
  autonomy.
- `site/` — the static guidance pages, deployed as-is (no build step) by
  GitHub Actions to GitHub Pages. `index.html`, `guide.html`,
  `walkthrough.html`, `architecture.html`, `styles.css`.

## Commands

No build step. `site/` is hand-written, dependency-free HTML/CSS —
open any page directly in a browser to preview it. Deployment runs
automatically via
[`../.github/workflows/deploy-example-site.yml`](../.github/workflows/deploy-example-site.yml)
on push to `main`.

## Conventions

- Documentation language: English.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, …).
- Site content is a **derived** representation of this project's own
  `docs/ea/` and of the canonical skill files under `../.claude/skills/` —
  it summarizes them for a public reader, it is not a second canonical
  source. If a page and its source EA doc disagree, the EA doc is right
  and the page is stale (see
  [`docs/ea/3_information/1_data-objects.md`](./docs/ea/3_information/1_data-objects.md)).
