# Decision 1 — AI Assistant autonomy level

_[← Decisions index](./README.md)_

**Status:** Accepted
**Date:** 2026-07-22
**Touches:** [docs/ea/2_business/1_business-actors-and-roles.md#ai-actor](../ea/2_business/1_business-actors-and-roles.md#ai-actor)

## Context

The discovery document is explicit and detailed about what the platform's
AI Assistant may and may not do: it can validate data, analyze forms,
answer generic queries, classify cases, summarize exceptions, draft
communications, explain missing information, and prioritize cases — but it
must never approve identity documents, reject a player, modify a debt,
approve a payment, promote a referee, use a minor's personal data in
uncontrolled free-tier services, or expose private information in generic
bots. Registration, finance, and referee-conflict decisions all carry real
consequences (a wrongly approved document, an incorrectly promoted
referee, a mishandled minor's data) for a domain (youth sport
administration) where errors are costly to reverse and where regulatory/
duty-of-care exposure is real. The autonomy level needed to reflect that
the source material draws this line deliberately, not loosely.

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| **Co-pilot** — the Assistant acts (e.g. auto-flags a registration as blocked, auto-drafts and queues a payment reminder for send) and a human reviews before it takes effect | The discovery document's restriction list forbids the Assistant from taking any action with effect at all, not just from acting *unreviewed* — a co-pilot pattern implies the Assistant's action becomes real once reviewed, which doesn't fit "never approves," "never modifies," "never promotes" |
| **Autonomous with checkpoint** — the Assistant acts independently (e.g. auto-updates a data-quality flag) and a human is notified after the fact | Same problem, worse: it would let the Assistant change system state before any human sees it, directly contradicting the explicit prohibition list |
| **Advisory** — the Assistant only suggests, drafts, summarizes, or flags; a human decides and acts on everything | Matches the source material precisely: every one of its confirmed use cases (validation, summarization, drafting, classification, explanation, prioritization) is something that informs a human decision, and every one of its prohibitions (approve, reject, modify, promote) is an action it must never take itself |

## Decision

The AI Assistant operates at **advisory** autonomy: it may validate data
against deterministic rules and surface the result, classify and summarize
pending cases, draft communications and generic-question answers, explain
missing information, and propose case priority — but every one of those
outputs requires a human (Registrar, Finance Admin, or Referee Coordinator,
routed by case type) to act on it before it has any effect. It has no
decision rights over identity documents, player rejection, debts, payments,
or referee promotion, under any confidence level.

## Consequences

- Every state change in the system (a document approved, a registration
  rejected, a debt adjusted, a payment approved, a referee promoted) has a
  human actor as its origin — a full audit trail with no ambiguity about
  who is accountable, at the cost of the Assistant not being able to
  accelerate throughput on its own for these actions.
- The Assistant's escalation path (route to the owning human role by case
  type, per [1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md#ai-actor))
  does real work: it never resolves an ambiguous or out-of-policy case
  itself, it hands it off.
- If a later initiative wants the Assistant to hold real decision rights
  over a specific, narrow action (e.g. auto-sending a reminder it drafted,
  without per-message review), that is a new decision record superseding
  this one for that specific action — not a silent expansion of "advisory."
