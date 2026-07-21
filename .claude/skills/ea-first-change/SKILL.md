---
name: ea-first-change
description: Use when requirements change or a new feature/behavior change is requested in this repo. Aligns the change through the enterprise architecture layers (strategy → business → information → application → technology), records it in a scope document, and only then implements. Not needed for pure bug fixes that change no documented behavior.
---

# EA-first change process

In this repository, **strategy and business architecture are validated
before any other layer is touched**. A requirement change is never
implemented directly: it is first aligned through the EA documents
(`docs/ea/`), then captured in a scope document (`docs/scope/`), and only
then coded. The folder numbers give you the assessment order.

## Step 0 — Check the open-questions log (if the project keeps one)

If this project maintains `docs/scope/open-questions.md`, read it: does any
row bear on the requested change? If the user (or whoever owns the product)
answers one during this conversation, record the answer there and in the
originating scope document's "Resolved" section in the same change, before
continuing. Skip this step if the project has no such log yet — it is
optional (see the `scope-doc` skill).

## Step 1 — Walk the EA layers top-down

For each layer, read the layer README and answer its question for the
requested change. Update the affected documents as you go (they are part of
the same change set, not an afterthought):

1. **`docs/ea/1_strategy/`** — Does the change serve an existing goal and
   value-stream stage, or does it introduce a new stakeholder, driver, or
   goal? If it contradicts a Principle in `1_motivation.md`, stop and
   surface the conflict to the user instead of proceeding.
2. **`docs/ea/2_business/`** — Which business services/processes/objects
   are added or changed? New business rules get a row in the rules table of
   `5_domain-context-and-rules.md` (with the _why_) before they get code.
   New terms go into the glossary; reuse existing glossary terms in code.
   If the change adds an actor, or changes an existing AI actor's autonomy
   level or decision rights (`ea-doc-style`'s actor notation), consider a
   `decision-record` alongside the scope document explaining why.
3. **`docs/ea/3_information/`** — New or changed data objects, flows,
   representations, storage, classification, retention?
4. **`docs/ea/4_application/`** — Which application services/components
   change? New ports/interfaces follow `5_interface-contracts.md`; new
   platforms/adapters follow `4_solution-design.md`.
5. **`docs/ea/5_technology/`** — Any impact on runtimes, build, CI, or
   hosting? If no stack has been chosen yet, use the `stack-selection`
   skill instead of re-deriving one from scratch.

Layers with no impact still get a "no change" verdict — say so explicitly
in the scope document rather than skipping them.

## Step 2 — Write the scope document

Create the next-numbered file in `docs/scope/` using the `scope-doc` skill.
Do this **before implementing**; refine it as implementation proceeds.

## Step 3 — Implement

Only now write code. Keep the EA documents and the scope document true to
what is actually delivered — if implementation diverges from the plan,
update them in the same commit series. Follow `CONTRIBUTING.md` for the
development workflow (lint, typecheck, tests, build — whatever this
project's stack defines).

## Step 4 — Verify alignment before finishing

- Every new/changed code artifact is named by some EA document.
- Every EA element you added names the code artifact that realizes it, or
  is marked "Pending — future initiative" with a link to the initiative
  that will deliver it — the EA set stays verifiable against the code.
- The scope document's "in scope / out of scope" table matches the diff.
- Cross-links between docs resolve (paths and anchors both — check anchors
  carefully if the doc language uses accented headings).
- If the scope document gained or resolved an "Open question", the
  project's open-questions log (if it keeps one) reflects the same.

## Step 5 — PR description

When opening (or updating) the pull request, use the `pr-description`
skill: it picks the right template (default, or
`.github/PULL_REQUEST_TEMPLATE/bugfix.md` for a pure bug fix) and covers
the whole branch (`main...HEAD`), not just the latest commit.
