# Capabilities and Resources

_[← Strategy layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Capability, Resource, Course of Action.

## Capabilities

What Let'sDataTalk must be able to do to realize the goals in
[1_motivation.md](./1_motivation.md).

| # | Capability | Realizes goal(s) |
| - | ---------- | ------------------ |
| C1 | **Identity & role management** — maintain one `Person` per human, with roles (player, referee, coach, guardian, committee member, …) that can overlap and change over time | G1 |
| C2 | **Player registration management** — season registrations, guardians, required documents, registration status | G2 |
| C3 | **Player finance management** — fees, payment plans, installments, vouchers, reconciliation | G3 |
| C4 | **Referee lifecycle management** — profile, classification pathway, fitness/training/knowledge requirements, availability, appointments, role-conflict detection, post-match verification | G4 |
| C5 | **Referee finance management** — fee schedules, payment claims, approval, payment batches, remittances | G4 |
| C6 | **Data quality & compliance** — deterministic rule evaluation, duplicate detection, exception lists, audit trail | G2, G4, G5 |
| C7 | **Communications** — templated transactional messages, reminders, generic-question FAQ handling | G5 |
| C8 | **Reporting & dashboards** — registration, financial, and referee dashboards for administrative decisions | G2, G3, G4 |
| C9 | **Historical data consolidation** — read-only extraction of the pilot club's multi-year data into a RAW → STAGING → unified model pipeline | G6 |
| C10 | **Multitenant platform operations** — tenant provisioning, role-based access control, per-club branding and season configuration, central super-administration | G1–G6 (cross-cutting) |
| C11 | **Competition & calendar management** — maintain each governing association's competition catalog (tiers, format), each club's season entries into those competitions, and the resulting match calendar that referee appointment and team/registration structure depend on | G2, G4 |

## Resources

| Resource | Notes |
| -------- | ----- |
| Pilot club's ≥3 years of historical data | Read-only access (Principle P2); the primary asset for validating C6, C8, C9 before wider rollout |
| Football Queensland *Referee Pathway & Promotion Structure for Match Officials* | External reference document; source of the classification and administrative-requirement rules C4/C6 must encode as data, not code |
| Square (initial payment provider) | First integration for C3, per pilot-club confirmation (supersedes the discovery document's original Stripe assumption — see [docs/scope/open-questions.md](../../scope/open-questions.md)); Xero is the next post-MVP priority for treasurer/accounting integration (see Courses of action) |
| *Australia Competitions per State* discovery reference (state associations + New Zealand Football) | External reference document cataloguing each state/regional association's competitions, tiers, and format taxonomy (Weekly Competition / Tournament; Knock Out, Round Robin, Double Round Robin, Enhanced Round Robin — Fixed Number of Rounds / Full Rounds Only); source of the Competition object C11 must encode as configuration data, not code. Confirms real structural variance between Australian state associations and New Zealand Football (national + regional leagues, Chatham Cup, Kate Sheppard Cup), relevant to [open question #14](../../scope/open-questions.md) |
| CSV import/export tooling | No official SQUADI or Football Australia API is available; C2/C4/C9 depend on CSV-based reconciliation rather than live integration |
| Technology stack | Not yet chosen — see [5_technology](../5_technology/README.md) (not started) and the `stack-selection` skill when that layer is assessed |
| Australian state government youth-sport voucher programs (discovery reference) | Six state programs catalogued: Queensland Play On!/FairPlay (up to A$200/child/financial year, low-income families), NSW Active and Creative Kids (2 × A$50/child/year, school-aged), SA Sports Vouchers (2 × A$100/child/calendar year, Reception–Year 9), WA KidSport (up to A$300/child aged 5–18, concession-card holders), Victoria Get Active Kids Voucher (up to A$200, concession-card holders), Tasmania Ticket to Play (2 × A$100/child aged 5–18, concession-card holders); source of the Voucher Program object C3 must encode as configuration data, not code, and of the per-club Committee approval gate (BR21, [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md)). New Zealand has no equivalent nationwide government voucher scheme — alternative funding (Tū Manawa Active Aotearoa, local council grants, gaming/philanthropic trusts) runs through the existing Grants Committee Member / Grants Coordinator roles instead of this resource (see [open question #20](../../scope/open-questions.md)) |

## Courses of action

- **Build in module order:** platform base (C1, C10) → player registration
  and finance (C2, C3) → referee management (C4, C5) → communications and
  dashboards (C6, C7, C8) → historical consolidation running alongside from
  the start (C9), since the pilot club's data is available immediately and
  profiling it early de-risks C2–C6.
- **Defer direct external integrations except payments.** SQUADI,
  PlayFootball, Football Queensland, WhatsApp, Xero, and Strava
  integrations are deferred past the MVP (see
  [3_value-stream.md](./3_value-stream.md)); the MVP relies on CSV
  import/export and supervised reconciliation instead. Square (C3) is the
  exception — it is the adopted first payment provider, integrated from
  the MVP rather than deferred.
- **Free/low-cost tiers first.** Infrastructure for the prototype and
  pilot stays on free or low-cost tiers where possible, with a deliberate
  decision point before moving to paid plans as volume grows — see
  [5_technology](../5_technology/README.md) once a stack is chosen.
