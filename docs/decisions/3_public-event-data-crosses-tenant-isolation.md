# Decision 3 — Public event data crosses tenant isolation

_[← Decisions index](./README.md)_

**Status:** Accepted
**Date:** 2026-07-22
**Touches:** [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md) (Principle P6), [2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) (BR26, BR27)

## Context

Principle P5 ("Strict tenant isolation" — one club's data is never visible
to another tenant) has held without exception since the platform's
strategy layer was first drafted. Carnival and grassroots events
(MiniRoos Invitational Carnivals, Girls United Carnivals, WinterFest, the
Pacific Championships, talent-ID tournaments) break that assumption on
purpose: a carnival is hosted by one club or Football Queensland but
played *by* several clubs' teams *against* each other, and its entire
point is to be followed by coaches, parents, and the general public —
including people with no account on any participating club's tenant.
Building carnival/event management without addressing this directly would
mean either (a) silently violating P5 the first time someone asks "why can
Club B's families see Club A's event," or (b) making carnivals
account-gated per club, which defeats the actual requirement (a public,
cross-club, spectator-facing view).

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| Keep P5 absolute; require every visitor to have a club account to see any carnival content | Defeats the actual requirement — carnivals are explicitly meant to be followed by the general public and by people from clubs other than the host, without an account |
| Model carnivals as a separate, ungoverned public system outside the platform's tenant model entirely | Loses the AI-assistant guardrails, audit trail, and the reuse of existing referee-eligibility rules (BR6–BR11) that carnival fixtures need just as much as season matches do |
| **Scope the exception precisely** — add Principle P6: only a Carnival/Grassroots Event's *published* schedule/draw/results (club/team-level, no personal data by default per BR26) cross tenant boundaries once its Events Coordinator publishes it; everything else (registration, finance, compliance, unpublished drafts) stays under P5 | Keeps P5 intact for every kind of data it was actually meant to protect, while giving carnivals the cross-club public visibility they need by design — the exception is narrow, named, and auditable rather than a blanket carve-out |

## Decision

Principle P6 is added as a **named, scoped exception to P5**: a Carnival/
Grassroots Event's Public Event View (schedule, draw, results — never
individual player names unless the event opts in as adult/open-age, BR26)
becomes visible to any visitor, authenticated or not, across every
participating club, only once its Events Coordinator explicitly publishes
it (BR27). No other business object gains a similar exception without its
own decision record.

## Consequences

- Every other tenant-isolated object (Player Registration, Fee/Invoice,
  Person Document, Voucher, …) keeps P5's absolute guarantee — this
  decision changes nothing about them.
- The "public by design" surface area is exactly one object (Public Event
  View) and exactly one gating action (an Events Coordinator's publish
  step), which keeps it easy to audit and easy to keep narrow as the
  information layer designs the actual access-control implementation.
- A future capability that wants similar cross-tenant public visibility
  (e.g. a public club-vs-club results ticker outside of carnivals) needs
  its own decision record, not a silent extension of P6's scope.
