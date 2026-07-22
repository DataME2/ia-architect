# Open Questions

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

A living index of every adopted interpretation, across all scope documents,
that still needs confirmation from the project's stakeholder(s) — the
pilot club, Let'sDataTalk product ownership, or (where noted) an
association/federation. Reviewed as step 0 of `ea-first-change` before
starting a new initiative, and kept in sync with each scope document's own
"Open questions" section. Kept for this project because the pilot club and
other external stakeholders can't always be consulted synchronously.

These 18 questions come directly from the discovery document's own "open
questions" section; none has an adopted interpretation yet, since the
strategy/business layer describes the target architecture without needing
to guess these values — they block the *MVP-build* initiative more than
this one.

## Pending

| # | Question | Adopted interpretation | Raised in |
| - | -------- | ------------------------ | --------- |
| 1 | What is the current referee fee schedule? | None yet — [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) models fee schedules as configuration, not fixed values | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 2 | Who pays the referee: the club, the competition, or the association? | None yet | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 3 | How are cancellations and abandoned matches handled for referee payment? | None yet | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 4 | What banking details can legally be stored, especially for minor referees? | None yet — treated as sensitive/regulated data pending an answer (see Principle P4, [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md)) | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 5 | Which Working with Children Checks are required, and how are they verified? | None yet — not modeled as a business object until confirmed | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 6 | Which source system is the official system of record for each data item? | None yet | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 7 | How are SQUADI and PlayFootball data currently imported/exported by the club? | None yet — CSV import/export assumed as the MVP mechanism (no official API exists) | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 8 | Which integrations are the highest priority after the MVP? | None yet — Stripe assumed first; Square, Xero, WhatsApp, Strava deferred (see [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md)) | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 9 | Which payment provider is used first? | Adopted: Stripe, per the discovery document's stated initial integration | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 10 | Which group will be the first pilot cohort (whole club, one season, one team)? | None yet | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 11 | What data can be used for development/testing environments? | None yet — Principle P4 and general privacy-by-design apply until scoped further | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 12 | What is the data retention period? | None yet | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 13 | Who approves exceptions (blocked registrations, referee conflicts, compliance flags)? | Adopted for now: the owning human role per case type (Registrar, Finance Admin, Referee Coordinator — see [2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md)); needs confirmation this matches each club's actual governance | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 14 | Which rules differ between Australia and New Zealand? | None yet — all current rules assume Australia (Football Queensland) as the reference; NZ variance is unassessed | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 15 | Which functionality is mandatory for the Q4 2026 launch vs. deferrable? | None yet beyond the MVP scope already listed in the discovery document | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 16 | What level of support will each club purchase? | None yet — commercial question, out of scope for the EA | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 17 | What will the commercial pricing be? | None yet — commercial question, out of scope for the EA | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 18 | What metrics will the pilot club accept as evidence of success? | None yet — candidate metrics listed in the discovery document (registration completeness, reconciliation time, referee coverage, …) are not yet confirmed as the agreed success criteria | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |

## Resolved

| # | Question | Resolution | Resolved in |
| - | -------- | ---------- | ----------- |
|   |          |            |             |
