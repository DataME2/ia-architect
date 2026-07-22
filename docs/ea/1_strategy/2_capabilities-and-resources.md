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

## Resources

| Resource | Notes |
| -------- | ----- |
| Pilot club's ≥3 years of historical data | Read-only access (Principle P2); the primary asset for validating C6, C8, C9 before wider rollout |
| Football Queensland *Referee Pathway & Promotion Structure for Match Officials* | External reference document; source of the classification and administrative-requirement rules C4/C6 must encode as data, not code |
| Stripe (initial payment provider) | First integration for C3; Square and Xero are deferred (see Courses of action) |
| CSV import/export tooling | No official SQUADI or Football Australia API is available; C2/C4/C9 depend on CSV-based reconciliation rather than live integration |
| Technology stack | Not yet chosen — see [5_technology](../5_technology/README.md) (not started) and the `stack-selection` skill when that layer is assessed |

## Courses of action

- **Build in module order:** platform base (C1, C10) → player registration
  and finance (C2, C3) → referee management (C4, C5) → communications and
  dashboards (C6, C7, C8) → historical consolidation running alongside from
  the start (C9), since the pilot club's data is available immediately and
  profiling it early de-risks C2–C6.
- **Defer direct external integrations.** SQUADI, PlayFootball, Football
  Queensland, WhatsApp, Xero, Square, and Strava integrations are deferred
  past the MVP (see [3_value-stream.md](./3_value-stream.md)); the MVP
  relies on CSV import/export and supervised reconciliation instead.
- **Free/low-cost tiers first.** Infrastructure for the prototype and
  pilot stays on free or low-cost tiers where possible, with a deliberate
  decision point before moving to paid plans as volume grows — see
  [5_technology](../5_technology/README.md) once a stack is chosen.
