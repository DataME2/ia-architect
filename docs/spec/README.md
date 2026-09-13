# Spec

_[← Repository README](../../README.md) · [Enterprise architecture](../ea/README.md) · [Scope documents](../scope/README.md) · [Steering](../steering/README.md)_

**Three design artifacts, produced by separating the design from the build.**
They exist so that a requirement, an architectural decision, and a unit of
work can each be pointed at — rather than re-derived from 29 migrations and
39 scope documents every time somebody asks "what is actually built?"

| Artifact | Answers |
| -------- | ------- |
| [requirements.md](./requirements.md) | **What the system must do**, functional and non-functional, each with a status verified against the code |
| [design.md](./design.md) | **How it is built** — the structural decisions everything else follows from, the patterns, and a recommendation where a decision is still open |
| [tasks.md](./tasks.md) | **What is left**, sized, prioritised, and sequenced |

## How this relates to the rest of `docs/`

It does not replace anything, and it must not become a fourth source of
truth.

```
docs/ea/      the system as it IS, by ArchiMate layer      ← authoritative
docs/scope/   one CHANGE per initiative, numbered          ← authoritative
docs/spec/    a cross-cutting VIEW of both, for planning   ← derived
docs/steering/ standing rules for how work is done         ← authoritative
```

Every row in `requirements.md` points at the goal, capability or business
rule it restates, and at the module realising it. **Where this document and
an EA document disagree, the EA document wins** — and the disagreement is a
defect to be reported, not reconciled quietly here.

## When to re-verify

This is a snapshot, and a snapshot ages. Re-run the verification when:

- an initiative completes (the scope document lands, so the status column
  changed);
- a capability moves between Not built, Designed, Partial and Verified;
- before any planning conversation that will use `tasks.md` as its queue.

The measurements in [requirements.md §1](./requirements.md#1-how-status-was-verified)
are all reproducible from the repository — `npm test`,
`python3 scripts/check_rls.py`, and a `grep` for rule identifiers. Redo them
rather than trusting the numbers written here.

**Last verified:** 13 September 2026, on `spec-driven-development`.
