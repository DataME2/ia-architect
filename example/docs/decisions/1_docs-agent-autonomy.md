# Decision 1 — Docs Agent autonomy level

_[← Decisions index](./README.md)_

**Status:** Accepted
**Date:** 2026-07-20
**Touches:** [2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md)

> **Terminology note (added later):** the AI actor called "Docs Agent" below
> was renamed **Copilot**, and "Maintainer" renamed **Pilot** — see
> [decision 3](./3_actor-naming.md). This record keeps its original wording
> and filename as an immutable decision; only the names have moved on.

## Context

This project exists partly to demonstrate an AI actor with a real,
non-trivial autonomy level — not "advisory" (too weak a demonstration:
indistinguishable from a human using an AI tool for suggestions) and not
maximally autonomous by default (the site is public and represents the
project; wrong or misleading guidance publishing unreviewed has real
reputational cost). The autonomy level needed to be both a genuine
demonstration of delegated authority and safe to actually run.

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| Advisory only — Docs Agent suggests, Maintainer writes the final content | Too weak: doesn't actually demonstrate an AI holding decision rights, only assisting a human who retains all of them |
| Fully autonomous — Docs Agent merges and publishes directly | No review step before public-facing content ships; violates the instinct that a small reputational-risk surface deserves a human checkpoint, and would need a separate escalation mechanism for when it's wrong that doesn't yet exist |
| **Co-pilot** — Docs Agent drafts complete changes (content, EA docs, scope docs) and opens a PR; nothing merges or deploys without Maintainer review | Real decision rights (it authors the actual change, not just a suggestion), bounded blast radius (a human always reviews before publish), and a clear audit trail (every change is a reviewed PR) |

## Decision

Docs Agent operates at **co-pilot** autonomy: it may draft and commit
complete changes to `example/site/`, `example/docs/ea/`, and
`example/docs/scope/`, and open a PR, but has no merge rights and no
access to repository/Pages settings. Maintainer reviews and merges every
change before it can deploy.

## Consequences

- Every published change has a human-reviewed PR behind it — a full audit
  trail, at the cost of publishing latency (nothing goes live the moment
  Docs Agent finishes a draft).
- Docs Agent's escalation path (surface Principle conflicts or ambiguous
  scope to Maintainer rather than guessing) does real work here, since it
  can't unilaterally resolve them by publishing anyway.
- If this project later wants to demonstrate a higher autonomy level (e.g.
  autonomous-with-checkpoint, auto-merging typo fixes), that's a new
  decision superseding this one, not an edit to it.
