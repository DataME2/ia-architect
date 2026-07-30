# Project Scope — Stakeholder Answers, July 2026

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

A second stakeholder answering round resolved eight open questions
(6, 12, 18, 20, 23, 24, 25, 26) and partially answered a ninth (1). Four
of the answers were confirmations of interpretations already adopted and
changed nothing; five introduced new architectural content — SQUADI named
as the system of record, a three-year retention period, referee fee
determinants, a decline/withdrawal reason requirement, and the pilot
club's actual measure of success.

**The most consequential outcome is a contradiction, not an addition.**
The pilot club's confirmed success metric is SQUADI/Football Australia
registration synchronisation — an integration this architecture currently
defers past the MVP, and for which no official API exists. The answer is
recorded faithfully and the conflict raised as
[open question #28](./open-questions.md) rather than resolved in either
direction, because choosing between narrowing the metric and widening MVP
scope is the stakeholder's call, not this initiative's. No application
code is written.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | **Goal G6** gains its confirmed success outcome (SQUADI/Football Australia registration sync) with the scope conflict flagged inline; new Resource entry naming SQUADI as system of record; the "defer direct external integrations" Course of Action carries an explicit unresolved-tension callout. No new Goal, Driver, Capability, or Principle — every answer refines existing elements (see [1_motivation.md](../ea/1_strategy/1_motivation.md), [2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md)) |
| 2_business    | New business rules **BR39–BR42** (system of record, retention, fee determinants, decline/withdrawal reason); new **Appointment Response** business object; Club Voucher Program Enablement records Queensland Play On! as the pilot club's approved program; the Referee appointment process gains response handling and a calendar opt-in branch; the Calendar subscription process now begins at acceptance. No new actor or service |
| 3_information | No change — not started. Now additionally queued to model the Appointment Response object and, importantly, to own the **retention policy** (BR40) that `3_data-architecture.md` is the designated home for |
| 4_application | No change — not started |
| 5_technology  | No change — not started |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | Ten questions pending, including four the MVP-build initiative could not start without (system of record, retention, success metric, fee schedule). Success criteria were unconfirmed, so no scope conflict was visible |
| **Target** (delivered) | Nineteen of twenty-nine questions resolved. SQUADI is named authoritative; retention is three years; referee fee determinants are codified; declines carry reasons. The MVP's central scope conflict is now explicit and owned by a numbered question rather than latent |

## Work packages and deliverables

### WP1 — Strategy layer

- **Deliverables:** `docs/ea/1_strategy/1_motivation.md` (G6 success
  outcome), `docs/ea/1_strategy/2_capabilities-and-resources.md` (SQUADI
  system-of-record resource; unresolved-tension callout on the
  deferred-integrations Course of Action)
- **Outcome:** the pilot club's actual definition of success is recorded
  where goals live, and the conflict it creates with MVP scope is visible
  at the point a reader would otherwise assume deferral is settled.

### WP2 — Business layer

- **Deliverables:** `docs/ea/2_business/5_domain-context-and-rules.md`
  (BR39–BR42), `docs/ea/2_business/4_business-objects.md` (Appointment
  Response; Play On! recorded on Club Voucher Program Enablement),
  `docs/ea/2_business/3_business-processes.md` (referee response handling,
  calendar opt-in at acceptance)
- **Outcome:** each substantive answer is a checkable rule or object
  rather than prose — a future implementer can act on "SQUADI wins
  reconciliation ties" and "a decline needs a reason" without re-reading
  this document.

### WP3 — Governance scaffolding

- **Deliverables:** this scope document, `docs/scope/README.md` index row,
  `docs/scope/open-questions.md` (eight resolutions, one partial, three new
  questions, refreshed preamble)
- **Outcome:** the open-questions log stays the single reviewed index, and
  the three new questions — one blocking, two legal/procedural — are
  positioned for step 0 of the next `ea-first-change` walk.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Recording all nine answers, with the four no-change confirmations stated explicitly rather than silently dropped | **Resolving** the MVP scope conflict the success metric creates ([#28](./open-questions.md)) — a stakeholder decision |
| BR39 (SQUADI system of record), BR40 (three-year retention), BR41 (fee determinants), BR42 (decline/withdrawal reason) | The referee **rate table** itself — only its determinants are known ([#1](./open-questions.md)) |
| Appointment Response object; Play On! recorded as the approved voucher program | A legal answer on whether three-year retention is lawful for every record class ([#30](./open-questions.md)) |
| Calendar sync offered at the point of acceptance; withdrawal is the referee's own calendar responsibility | The evidentiary standard for Committee approval ([#29](./open-questions.md)) |
| — | Any code — no `src/`, no tests, no build |

## Gap notes

- **The success-metric conflict is the project's largest open risk.** It
  is not a documentation gap: as things stand, the MVP could be delivered
  exactly as architected and still fail the pilot club's own acceptance
  test. Whichever of the three routes in
  [#28](./open-questions.md) is chosen changes MVP scope, the value
  stream's Operate stage, or the agreed success criteria — so it should be
  answered before the MVP-build initiative is scoped, not during it.
- **Retention has a legal dependency the project cannot self-serve.**
  BR40 records the stated three-year policy, but Australian financial
  record-keeping and child-safety obligations plausibly exceed it. Building
  a deletion job against BR40 as written could destroy records the club is
  legally required to keep — the reason [#30](./open-questions.md) is
  raised now rather than at implementation time.
- **"SQUADI is the system of record" has reconciliation consequences not
  yet designed.** BR39 makes SQUADI authoritative, but what a
  reconciliation exception *is* (how it is surfaced, who resolves it, what
  happens to a Let'sDataTalk value that loses) belongs to the Compliance &
  data quality service's information- and application-layer design.
- **Current practice for reaching young officials is WhatsApp groups**,
  per the answer to question 25 — informal, per-club, and outside any
  audit trail. That is context for both the Communications service (C7)
  and the deferred WhatsApp integration; nothing in this initiative
  changes either.

## Open questions

Three raised, all recorded in [open-questions.md](./open-questions.md):

- **#28 — blocking.** How to reconcile the confirmed success metric
  (SQUADI/Football Australia registration sync) with that integration's
  deferral and the absence of an API.
- **#29.** What artifact evidences a Committee's approval of a Voucher
  Program (BR21's approval record has no defined standard).
- **#30.** Whether three-year retention (BR40) is lawful uniformly, given
  Australian statutory minimums for financial and child-safety records.

Question 1 (referee fee schedule) remains **partially** open: its
determinants are now codified as BR41, its rate table is still unknown.
