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
questions" section. 11 were answered by the pilot club/stakeholder in a
follow-up discovery document (*Business Actors and Open Questions*) and are
now recorded below in Resolved; the remaining 7 block the *MVP-build*
initiative more than this one.

## Pending

| # | Question | Adopted interpretation | Raised in |
| - | -------- | ------------------------ | --------- |
| 1 | What is the current referee fee schedule? | None yet — [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) models fee schedules as configuration, not fixed values | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 6 | Which source system is the official system of record for each data item? | None yet | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 12 | What is the data retention period? | None yet | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 14 | Which rules differ between Australia and New Zealand? | None yet — all current rules assume Australia (Football Queensland) as the reference; NZ variance is unassessed. Includes New Zealand's Working with Children Check equivalent (see question 5, resolved for Australia) | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 16 | What level of support will each club purchase? | None yet — commercial question, out of scope for the EA | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 17 | What will the commercial pricing be? | None yet — commercial question, out of scope for the EA | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 18 | What metrics will the pilot club accept as evidence of success? | None yet — candidate metrics listed in the discovery document (registration completeness, reconciliation time, referee coverage, …) are not yet confirmed as the agreed success criteria | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 19 | Which Governing Body / Association does the pilot club's competitions actually run under, and is any machine-readable fixture feed available, or is manual/CSV entry the only option for the season calendar? | None yet — mirrors question #7's SQUADI/PlayFootball situation; CSV import assumed as the MVP mechanism until confirmed otherwise | [3_competitions-and-calendar-per-season.md](./3_competitions-and-calendar-per-season.md) |
| 20 | Which state Voucher Program(s), if any, has the pilot club's Committee actually approved (or plans to bring to a vote), and what counts as a valid record of that approval (e.g. meeting minutes, a signed motion)? | None yet — BR21 requires Committee approval before a Voucher Program is enabled, but the pilot club's actual approved program(s) and its evidentiary standard for "approved" are unconfirmed | [4_voucher-programs-and-committee-approval.md](./4_voucher-programs-and-committee-approval.md) |
| 21 | Which state government(s) will Let'sDataTalk formally request dedicated Voucher Program API/endpoint access from (a written request), in what order, and on what timeline? | None yet — a pending, unstarted outreach task; NSW is the only program with a documented API today, gated to organisations with 1,000+ under-18 members, which the pilot club does not meet | [4_voucher-programs-and-committee-approval.md](./4_voucher-programs-and-committee-approval.md) |

## Resolved

| # | Question | Resolution | Resolved in |
| - | -------- | ---------- | ----------- |
| 2 | Who pays the referee: the club, the competition, or the association? | The appointing party pays: the club pays when it made the designation (every club player can also opt in as a local/club referee at registration); an association or government entity (e.g. Football Queensland) pays when it made the appointment. Codified as BR16 | [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) |
| 3 | How are cancellations and abandoned matches handled for referee payment? | No payment claim for a cancelled match. For an abandoned match, the referee must explain the reason before payment eligibility is determined. Codified as BR17/BR18 | [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) |
| 4 | What banking details can legally be stored, especially for minor referees? | Adopted operational interpretation: the club may retain the minor's own banking details (if they have an account), their personal information, and must maintain ongoing contact with the minor's responsible person/guardian. This is not a legal/privacy sign-off — Principle P4 ([1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md)) still applies and this remains sensitive/regulated data pending further legal confirmation | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 5 | Which Working with Children Checks are required, and how are they verified? | Confirmed for Australia: required for paid and volunteer workers in child-related roles, verified in real time through state government online portals (clearance/application number + surname + date of birth) — e.g. Queensland's Blue Card ("no card, no start"), NSW's WWCC clearance via the Office of the Children's Guardian, Victoria's clearance under the Worker Screening Act 2020 via Service Victoria. Modeled as the **Blue Card Administration** actor and BR19. New Zealand's equivalent is unconfirmed — folded into question 14 | [2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md), [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) |
| 7 | How are SQUADI and PlayFootball data currently imported/exported by the club? | Confirmed: CSV import/export, matching the MVP assumption already adopted — no official API exists | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 8 | Which integrations are the highest priority after the MVP? | Confirmed: Identity & role management (C1) and Player registration management (C2) are the highest-priority capabilities. Square is adopted as the first payment provider (see question 9); Xero is next priority for treasurer/accounting integration. WhatsApp, Strava, SQUADI, PlayFootball, and Football Queensland integrations remain deferred | [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md) |
| 9 | Which payment provider is used first? | Adopted: **Square** — supersedes the discovery document's original Stripe assumption | [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md), [2_business/3_business-processes.md](../ea/2_business/3_business-processes.md) |
| 10 | Which group will be the first pilot cohort (whole club, one season, one team)? | Adopted: the whole club, across season 2025-2026 and into the start of 2027 | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 11 | What data can be used for development/testing environments? | Confirmed: the pilot club's own historical data, consistent with the ≥3 years already recorded as a Resource ([1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md)). Principle P4 and privacy-by-design still govern how it's handled | [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md) |
| 13 | Who approves exceptions (blocked registrations, referee conflicts, compliance flags)? | Confirmed: the Registrar or Finance Admin, matching the interpretation already adopted. An **Appeals Panel** actor is now modeled for appeals against those decisions | [2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md) |
| 15 | Which functionality is mandatory for the Q4 2026 launch vs. deferrable? | Confirmed: Identity & role management (C1) and Player registration management (C2) are both mandatory, matching the build order already adopted | [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md) |
