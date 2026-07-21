# Motivation

_[← Strategy layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Stakeholder, Driver, Goal, Principle.

## Stakeholders and drivers

| Stakeholder | Concern | Driver |
| ----------- | ------- | ------ |
| Pilot | The archreator template should be usable without reading its skill files directly | No document in the parent template shows the EA-first process, or the human/AI actor notation, actually applied |
| Template adopters (external) — especially AI-first builders / "vibe coders" | Understanding how to bootstrap and run the method correctly, and seeing that a human-in-the-loop, AI-executed workflow is what the method delivers | Same driver, from the reader's side |

## Goals

- **G1 — Legible guidance.** A prospective adopter can learn the EA-first
  method and the human/AI/hybrid actor notation from the published site
  alone, without first reading `.claude/skills/*/SKILL.md`.
- **G2 — Living proof.** The site itself is built by following the method
  it describes, so it doubles as evidence the process works on a real,
  small project — including a real AI actor with a defined autonomy level.
- **G3 — Frictionless, free start.** A newcomer with no prior GitHub or
  command-line experience can get from "no account" to a first reviewed
  change without paying for anything or installing a code editor. Realized
  by [`site/start.html`](../../../site/start.html); see
  [3_value-stream.md](./3_value-stream.md)'s **Adopt** stage.

## Principles

- **P1 — Guidance stays traceable to its source.** Every page on the site
  links back to the skill file or EA document it summarizes rather than
  restating it as a second canonical copy. If the two ever disagree, the
  linked source wins — the site is a derived view, not a second
  authority (see
  [3_information/1_data-objects.md](../3_information/1_data-objects.md)).
- **P2 — No unreviewed content reaches the public site.** The Copilot
  may draft complete changes, but nothing publishes without a human
  merging it (see
  [2_business/1_business-actors-and-roles.md](../2_business/README.md) and
  [../decisions/1_docs-agent-autonomy.md](../../decisions/1_docs-agent-autonomy.md)).

A proposed change that would publish unreviewed AI-drafted content, or
that would make the site restate rather than link to its source, violates
a Principle here — surface it instead of proceeding (`ea-first-change`,
step 1).
