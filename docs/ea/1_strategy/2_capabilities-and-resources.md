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
| C12 | **Carnival & event management** — create and manage one-off, multi-club carnival/grassroots events (draws or fixtures, results), and publish an account-free public view of them for coaches, parents, and the general public | G7 |
| C13 | **Calendar distribution** — publish a Person's own confirmed commitments (initially referee appointments) as a standards-based calendar feed their existing Gmail, Outlook, or Apple calendar subscribes to, so appointments, changes, and cancellations appear in the calendar they already use | G4, G5 |

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
| Voucher-program claim mechanisms (researched July 2026) | None of the six state programs exposes a general-purpose claims API at the pilot club's scale: QLD, SA, WA, Victoria, and Tasmania all require a human or CSV-upload interaction with a government-run provider portal to redeem a voucher and be reimbursed; NSW's Active and Creative Kids API exists but is restricted to organisations with 1,000+ under-18 members, which the pilot club (~700 seasonal registrations/year) does not meet. Source of Voucher Claim (C3) and the CSV/portal-based claim submission approach in the Voucher application and claim process ([2_business/3_business-processes.md](../2_business/3_business-processes.md#voucher-application-and-claim-process)); see [open question #21](../../scope/open-questions.md) on formally requesting dedicated API access |
| iCalendar (RFC 5545) and the `webcal:` subscription convention | Open, vendor-neutral standard every major calendar client already consumes — Google Calendar, Outlook/Microsoft 365, and Apple Calendar all subscribe to an ICS URL without any per-vendor API, OAuth grant, or app-store presence. The basis for C13 delivering "add it to my Gmail/Outlook calendar" without Let'sDataTalk holding write access to anyone's mailbox or calendar account (see decision [4](../../decisions/4_calendar-distribution-by-feed-not-account-access.md)) |
| Regional carnivals and grassroots events (stakeholder-provided examples) | MiniRoos Invitational Carnivals (single-day, round-robin, club-hosted), Girls United Carnivals (modified-format, female football celebration carnivals in regions such as Brisbane, Townsville, and Hervey Bay through October–November), and other named events (WinterFest, Pacific Championships, talent-ID tournaments) hosted by local clubs and Football Queensland. No catalogued reference document exists yet for the full list and exact format rules per event type (unlike the *Australia Competitions per State* resource for C11) — source of the Carnival/Grassroots Event object (C12); see [open question #22](../../scope/open-questions.md) |

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
- **Carnival & event management (C12) is deferred past the Q4 2026 MVP.**
  It is architected now (goal G7, this capability, the business layer
  additions in [2_business/](../2_business/README.md)) so the public-access
  model is designed alongside tenant isolation from the start rather than
  bolted on later, but it builds after the season-long capabilities (C1–C11)
  it partly reuses (e.g. referee eligibility checks) — adopted
  interpretation, see [open question #24](../../scope/open-questions.md).
- **Calendar reaches referees by subscription, not by account access.** C13
  publishes each Person's own appointments as an iCalendar feed their
  existing Google/Outlook/Apple calendar subscribes to — the calendar client
  pulls, Let'sDataTalk never holds a credential for, or writes into, anyone's
  personal calendar account. This keeps Principle P2 intact with no exception
  needed, and works identically across every provider instead of requiring a
  separate integration per vendor. Two-way sync via the Google Calendar API
  or Microsoft Graph (which *would* need write access, per-vendor OAuth, and
  a P2 exception) is deliberately deferred — see decision
  [4](../../decisions/4_calendar-distribution-by-feed-not-account-access.md)
  and [open question #26](../../scope/open-questions.md).
- **Free/low-cost tiers first.** Infrastructure for the prototype and
  pilot stays on free or low-cost tiers where possible, with a deliberate
  decision point before moving to paid plans as volume grows — see
  [5_technology](../5_technology/README.md) once a stack is chosen.
- **Two-track approach to government voucher integration.** No state
  voucher program currently offers the pilot club a general claims API
  (see the voucher-program claim mechanisms resource above), so C3 pursues
  two tracks in parallel: (1) **pending, not started** — formally request
  dedicated API/endpoint access from each state government administering
  a voucher program, starting with the pilot club's own jurisdiction (see
  [open question #21](../../scope/open-questions.md)); (2) **interim,
  scoped for the MVP** — the Assistant (AI actor) verifies a Voucher code
  against the issuing government's own public verification interface
  (read-only, advisory — see decision
  [2](../../decisions/2_ai-voucher-code-verification.md)) and records the
  result before Finance Admin or Treasurer applies it (BR22, BR25,
  [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md));
  the actual reimbursement claim is still submitted through each
  program's own CSV/portal mechanism until track 1 succeeds.
