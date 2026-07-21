---
name: scope-doc
description: Use when creating or updating a project scope document in docs/scope/ — one per initiative, written before implementation as step 2 of the ea-first-change process.
---

# Writing a scope document

One file per initiative in `docs/scope/`, named `<n>_<kebab-case-name>.md`
where `<n>` is the next number in the chronological sequence (check the
index table in `docs/scope/README.md`, and add the new document to it).

## Template

```markdown
# Project Scope — <Initiative Name>

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** <branch and/or PR reference>.

<One paragraph: what this initiative changes and why now.>

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | <new/changed goals, drivers — or "no change" + why> |
| 2_business    | <services, processes, rules, glossary>              |
| 3_information | <data objects, flows, storage, classification>      |
| 4_application | <services, components, ports>                       |
| 5_technology  | <runtimes, build, CI, hosting>                      |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | <state before the change> |
| **Target** (delivered) | <state after the change>  |

## Work packages and deliverables

### WP1 — <name>

- **Deliverables:** <files, modules, docs — concrete artifacts>
- **Outcome:** <the capability gained>

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| …        | …                                           |

## Gap notes

- <Each out-of-scope item that leaves a real gap: what closing it would
  take, and what makes it easy or hard.>

## Open questions

- <Only if there are any: adopted interpretations that the product owner
  or stakeholders still need to confirm, each linked to the document where
  the interpretation was applied.>
```

## Rules

- **Every layer gets a verdict** in the EA-alignment table, including
  explicit "no change" — silence is not a decision.
- **Deliverables are concrete artifacts** (file paths, page/screen names),
  never vague ("improved UX").
- **Out of scope is as important as in scope**: it is where the next
  initiative's backlog lives. Pair each meaningful exclusion with a gap
  note.
- A merged initiative's scope document is a **historical record** — do not
  rewrite it later; follow-up work gets a new numbered document.
- Optionally include a small Mermaid plateau diagram using the
  `implementation` classDef from the EA notation conventions
  (`docs/ea/README.md`).

## Optional: the open-questions log

Projects with an external stakeholder or governing body who cannot be
consulted synchronously (a board, a client, a compliance owner) benefit
from a single living index, `docs/scope/open-questions.md`, listing every
adopted interpretation across all scope documents that still needs
confirmation. If the project keeps one:

- **Every new (or resolved) "Open questions" row is mirrored there** in the
  same change — it is the consolidated index reviewed between initiatives
  so questions don't get lost in old scope documents.
- Step 0 of `ea-first-change` reads it before starting a new change.

Projects without an external stakeholder to reconcile with can skip this
file entirely — the "Open questions" section within each scope document is
enough.
