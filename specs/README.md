# specs/

_[← Repository README](../README.md) · [Enterprise architecture](../docs/ea/README.md)_

The spec-driven set for Let'sDataTalk, written as **user stories with
acceptance criteria** and a build queue derived from them.

| File | Answers |
| ---- | ------- |
| [requirements.md](./requirements.md) | **What the system must do** — 37 numbered requirements, each with a user story and `WHEN … THEN … SHALL` acceptance criteria, each criterion marked implemented, partial, or not implemented |
| [design.md](./design.md) | **How it is built** — architecture, schema, policies, patterns, with the code and SQL that implement them, plus proposed designs for what is not built |
| [tasks.md](./tasks.md) | **What is left** — 223 checkboxed tasks in 15 phases — 171 of them already done, each referencing the requirement it satisfies and the design decision that shaped it |

## Two spec sets, on purpose

[`docs/spec/`](../docs/spec/README.md) holds a different genre of the same
subject, and both are kept:

| | `specs/` (here) | `docs/spec/` |
| - | --------------- | ------------ |
| Written as | User stories + acceptance criteria | A verified status ledger |
| Organised by | Product capability | Architecture capability (C1–C20) and NFR |
| Answers | "What must it do, and does it?" | "What is actually true today, measurably?" |
| Use it for | Building, and agreeing scope with a stakeholder | Planning, and auditing documentation drift |

They are consistent by construction — both were derived from the same
reading of the code — but **neither is authoritative.**
[`docs/ea/`](../docs/ea/README.md) describes the system as it is and
[`docs/scope/`](../docs/scope/README.md) describes each change that produced
it. Where a spec here disagrees with an EA document, the EA document wins
and the disagreement is a defect to report, not to reconcile quietly.

## Keeping it honest

A status marker is a claim about code, and claims age. Re-derive them —
don't trust the markers — when an initiative completes, when a capability
changes state, or before any planning conversation that will use
`tasks.md` as its queue. The reproducible measurements are in
[docs/spec/requirements.md §1](../docs/spec/requirements.md).

**Last verified:** 13 September 2026.
