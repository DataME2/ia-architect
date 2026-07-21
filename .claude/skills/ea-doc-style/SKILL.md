---
name: ea-doc-style
description: Use when creating or editing any document under docs/ea/ or docs/scope/ — numbering, ArchiMate-on-Mermaid notation, grounding rules, and link conventions for this repo's documentation.
---

# EA documentation style

## Language

Pick one documentation language for the project and use it consistently
across `docs/ea/`, `docs/scope/`, commit messages, and code identifiers
(see the project's `CLAUDE.md`). Whatever language is chosen, **folder and
file names stay plain ASCII** (no accents, no non-Latin punctuation) even
if the prose inside is written in a language that uses them — this avoids
cross-platform path and URL-encoding issues. If ArchiMate stereotypes are
translated, keep a correspondence table to the standard English element
names near the top of `docs/ea/README.md`.

## Numbering

- Layer folders are numbered in assessment order and never reordered:
  `1_strategy`, `2_business`, `3_information`, `4_application`,
  `5_technology` (translate the words if the project's doc language isn't
  English, but keep the numbers and the order).
- Files inside a layer carry a numeric prefix giving the **logical analysis
  order**, which each layer README explains in an "Analysis order" table.
  A new file gets the next number, plus a row in that table; only renumber
  when the analysis order genuinely changes.
- Scope documents (`docs/scope/`) are numbered **chronologically** per
  initiative.

## Grounding rule (the most important one)

Every EA element must name the code artifact that realizes it — a page, a
module path, a pipeline file. If you cannot point at the realizing
artifact, either the element doesn't belong in the docs, or the code is
missing and the element should be marked explicitly **"Pending — future
initiative"** (ideally linked to the initiative that will deliver it). This
keeps the whole set verifiable against the code at any time — an outsider
should be able to open any EA document and check it against the repo.

## ArchiMate on Mermaid

ArchiMate has no native Mermaid profile, so these documents encode
ArchiMate semantics onto Mermaid flowcharts with two rules:

1. **Element type as a «stereotype»** in the first line of each node label,
   e.g. `«Business Service»`, `«Data Object»`, `«Capability»`.
2. **One `classDef` per layer**, using the per-layer palette. The exact
   fills (Motivation, Strategy, Business, Application, Technology,
   Implementation & Migration) live in exactly one place —
   [`docs/ea/README.md` § Notation conventions](../../../docs/ea/README.md#notation-conventions).
   Copy the `classDef` lines from there rather than re-tabulating the hexes
   here, so the palette never drifts between documents.

Relationships are labeled with their ArchiMate name (**serves**,
**realizes**, **assigned to**, **accesses**, **triggers**, **flow**,
**aggregates**, **influences**); where Mermaid arrowheads can't distinguish
relation types, the label is authoritative.

## Actors: human, AI, and hybrid

`«Business Actor»` and `«Business Role»` nodes name **who** — and in a
system where an AI can hold a role, "who" is no longer implicitly human.
State the actor's kind on the same line as the stereotype:
`«Business Actor (Human)»`, `«Business Actor (AI)»`, or
`«Business Actor (Hybrid)»` (a human and an AI sharing one role, e.g. a
co-pilot pattern). Default to `(Human)` only when the actor is provably
never an AI system acting with delegated authority — don't omit the
qualifier to save space.

When populating `2_business/1_business-actors-and-roles.md`, explicitly
ask, for every role: **does an AI system perform or assist this role, and
at what autonomy?** — don't let "actor" default to human by omission. For
every `(AI)` or `(Hybrid)` actor, the actors table carries three extra
columns beyond the usual name/description:

| Column | Answers |
| ------ | ------- |
| Autonomy level | One of: **advisory** (suggests, a human decides and acts), **co-pilot** (acts, a human reviews before it takes effect), **autonomous with checkpoint** (acts independently, a human is notified and can intervene after the fact), **fully autonomous** (acts independently, no routine human checkpoint) |
| Decision rights | What this actor is actually authorized to decide or change, in concrete terms — not "helps with X" |
| Escalation path | Who/what it hands off to when it's outside its authority or confidence — a Business Role, not a vague "a human" |

If an initiative changes an AI actor's autonomy level or decision rights,
that's exactly the kind of call the `decision-record` skill is for.

## Document skeleton

- Title (`# …`), then a nav line:
  `_[← <Layer> layer](./README.md) · [EA home](../README.md)_`
  (scope docs link to the scope index instead).
- State the **ArchiMate elements/viewpoint** covered near the top.
- Prefer tables for element inventories, Mermaid for relationships, and
  prose only for rationale (the "why", not the "what" — the diagrams and
  tables already say what).

## Links

- Always relative, always to a specific file (`../2_business/README.md`,
  not `../2_business/`), keeping `#anchors` when pointing at a section.
- Human-readable link text (`[solution design](…)`), not raw paths.
- Each fact lives in exactly one document; everything else links to it. If
  you are about to restate a table or diagram, link instead.
- When renaming or moving a doc, grep the whole repo for the old path and
  fix every reference in the same change.
