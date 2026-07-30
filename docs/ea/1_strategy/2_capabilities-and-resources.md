# Capabilities and Resources

_[← Strategy layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Capability, Resource, Course of Action.

## Capabilities

What Let'sDataTalk must be able to do to realize the goals in
[1_motivation.md](./1_motivation.md).

| # | Capability | Realizes goal(s) |
| - | ---------- | ------------------ |
| C1 | **Identity & role management** — maintain one `Person` per human, with roles (player, referee, coach, guardian, committee member, …) that can overlap and change over time | G1 |
| C2 | **Player registration management** — season registrations, guardians, required documents, registration status, and international transfer clearance (ITC) for players whose last registration was overseas | G2 |
| C3 | **Player finance management** — fees, payment plans, installments, vouchers, reconciliation | G3 |
| C4 | **Referee lifecycle management** — profile, classification pathway, fitness/training/knowledge requirements, availability, appointments, role-conflict detection, post-match verification | G4 |
| C5 | **Referee finance management** — fee schedules, payment claims, approval, payment batches, remittances | G4 |
| C6 | **Data quality & compliance** — deterministic rule evaluation, duplicate detection, exception lists, audit trail | G2, G4, G5 |
| C7 | **Communications** — templated transactional messages, reminders, generic-question FAQ handling | G5 |
| C8 | **Reporting & dashboards** — registration, financial, and referee dashboards for administrative decisions | G2, G3, G4 |
| C9 | **Historical data consolidation** — read-only extraction of the pilot club's multi-year data into a RAW → STAGING → unified model pipeline | G6 |
| C10 | **Multitenant platform operations** — tenant provisioning, role-based access control, per-club branding and season configuration, central super-administration | G1–G6 (cross-cutting) |
| C11 | **Competition & calendar management** — maintain each governing association's competition catalog (tiers, format), its **Competition Regulations and Playing Formats** (small-sided rules, field and ball dimensions, match duration, squad sizes per age group), each club's season entries into those competitions, and the resulting match calendar that referee appointment and team/registration structure depend on | G2, G4 |
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
| **SQUADI — the pilot club's system of record (confirmed July 2026)** | SQUADI is the authoritative source for the data items it holds; where Let'sDataTalk and SQUADI disagree, SQUADI wins and the difference is raised as a reconciliation exception rather than silently overwritten (BR39, [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md)). This makes SQUADI simultaneously the system of record (this row), the club's most-wanted integration (Goal G6's confirmed success outcome, [1_motivation.md](./1_motivation.md)), and an integration with no official API — the three facts together are what [open question #27](../../scope/open-questions.md) has to reconcile |
| Technology stack | Not yet chosen — see [5_technology](../5_technology/README.md) (not started) and the `stack-selection` skill when that layer is assessed |
| Australian state government youth-sport voucher programs (discovery reference) | Six state programs catalogued: Queensland Play On!/FairPlay (up to A$200/child/financial year, low-income families), NSW Active and Creative Kids (2 × A$50/child/year, school-aged), SA Sports Vouchers (2 × A$100/child/calendar year, Reception–Year 9), WA KidSport (up to A$300/child aged 5–18, concession-card holders), Victoria Get Active Kids Voucher (up to A$200, concession-card holders), Tasmania Ticket to Play (2 × A$100/child aged 5–18, concession-card holders); source of the Voucher Program object C3 must encode as configuration data, not code, and of the per-club Committee approval gate (BR21, [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md)). New Zealand has no equivalent nationwide government voucher scheme — alternative funding (Tū Manawa Active Aotearoa, local council grants, gaming/philanthropic trusts) runs through the existing Grants Committee Member / Grants Coordinator roles instead of this resource (see [open question #20](../../scope/open-questions.md)) |
| Voucher-program claim mechanisms (researched July 2026) | None of the six state programs exposes a general-purpose claims API at the pilot club's scale: QLD, SA, WA, Victoria, and Tasmania all require a human or CSV-upload interaction with a government-run provider portal to redeem a voucher and be reimbursed; NSW's Active and Creative Kids API exists but is restricted to organisations with 1,000+ under-18 members, which the pilot club (~700 seasonal registrations/year) does not meet. Source of Voucher Claim (C3) and the CSV/portal-based claim submission approach in the Voucher application and claim process ([2_business/3_business-processes.md](../2_business/3_business-processes.md#voucher-application-and-claim-process)); see [open question #21](../../scope/open-questions.md) on formally requesting dedicated API access |
| iCalendar (RFC 5545) and the `webcal:` subscription convention | Open, vendor-neutral standard every major calendar client already consumes — Google Calendar, Outlook/Microsoft 365, and Apple Calendar all subscribe to an ICS URL without any per-vendor API, OAuth grant, or app-store presence. The basis for C13 delivering "add it to my Gmail/Outlook calendar" without Let'sDataTalk holding write access to anyone's mailbox or calendar account (see decision [4](../../decisions/4_calendar-distribution-by-feed-not-account-access.md)) |
| Regional carnivals and grassroots events (stakeholder-provided examples) | MiniRoos Invitational Carnivals (single-day, round-robin, club-hosted), Girls United Carnivals (modified-format, female football celebration carnivals in regions such as Brisbane, Townsville, and Hervey Bay through October–November), and other named events (WinterFest, Pacific Championships, talent-ID tournaments) hosted by local clubs and Football Queensland. No catalogued reference document exists yet for the full list and exact format rules per event type (unlike the *Australia Competitions per State* resource for C11) — source of the Carnival/Grassroots Event object (C12); see [open question #22](../../scope/open-questions.md) |
| Football Australia *Guide to International Transfer Certificates* (March 2019) | External reference document; source of the ITC/Minor ITC Application business objects and BR35–BR38 ([2_business/4_business-objects.md](../2_business/4_business-objects.md#international-transfers), [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md)). Predates the national association's 2021 rebrand from FFA to Football Australia, and names the "Play Football" self-registration platform already modeled as PlayFootball elsewhere in this document — currency of both the guide and the platform name is unconfirmed, see [open question #27](../../scope/open-questions.md) |

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

  > **Resolved by the staged registration ladder (below).** The apparent
  > conflict with Goal G6's success outcome — SQUADI/Football Australia
  > synchronisation — is settled by *sequencing* rather than by rewriting
  > either the metric or this deferral: stage 1 proves the value without
  > any integration at all, and stages 2–3 add the integrations if and when
  > access exists.
- **Registration proves itself in three stages, and only stage 1 is
  unconditional.** Adopted July 2026 to resolve what was
  [open question #27](../../scope/open-questions.md):

  | Stage | What it proves | Depends on |
  | ----- | -------------- | ---------- |
  | **1 — SQUADI-ready ("one-shot")** | How fast a registration can be completed from the *club's* perspective, and — critically — submitted to SQUADI **right first time**: collected once, deterministically validated (BR1–BR5), and handed over as a complete, correct submission instead of a guardian guessing their way through an unfamiliar interface. Demonstrable **pre-MVP**, on the pilot club's real historical data | Nothing external — no API, no integration. This is why it is the stage the project commits to |
  | **2 — SQUADI synchronisation** | The same registration flowing through to SQUADI, removing the duplicate entry a parent or guardian performs manually today | SQUADI API access, which does not exist today (see the CSV import/export resource, and [open question #19](../../scope/open-questions.md)) |
  | **3 — Football Australia** | National-level registration, including the ITC path for players arriving from overseas (BR35–BR38) | Football Australia access, and stage 2 in place |

  Staging this way means the pilot club can see and judge the core benefit
  — speed of registration — **before** any API negotiation succeeds or
  fails, while keeping its stated success outcome (Goal G6) intact as the
  destination rather than the entry ticket. Stages 2 and 3 remain
  conditional and are not promised on the Q4 2026 timeline.

  > **Stage 1 must attack the real bottleneck, not route around it.** The
  > confirmed baseline is *weeks*, and the stated cause is SQUADI itself —
  > hard to use, and a hard gate: no SQUADI registration, no playing time
  > (BR43). A stage 1 that merely made the *club's* internal process fast
  > while leaving the family to fight SQUADI unaided would improve a
  > number nobody is complaining about. What makes stage 1 worth
  > demonstrating without an API is **first-time-right submission** —
  > collect once, validate deterministically, and hand SQUADI a complete
  > and correct registration, so the step that currently fails and
  > re-loops stops doing so.
  >
  > This only works on the portion of those weeks caused by confusion,
  > error, and abandonment. Any portion caused by association processing
  > time, payment clearing, or the 30-day ITC provisional window (BR36) is
  > **not removable by better data entry** — which is why decomposing the
  > baseline is the measurement task in
  > [open question #32](../../scope/open-questions.md), and why stage 1's
  > target should be set against the removable portion only.
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
- **A governing-body tier is a strategic option, not a committed
  direction.** If Let'sDataTalk reaches decision-makers at a governing
  entity (Football Queensland is the named example), the multitenant
  architecture could serve the *association* as the customer — the
  association driving registration across its member clubs, and owning
  Competition Regulations and Playing Formats centrally rather than each
  club holding its own copy. Commercially this is the largest available
  move: it converts a per-club sale into a jurisdiction-wide one, and it
  makes the association the authority for exactly the reference data
  (regulations, playing formats, competition structure) that clubs
  currently re-key.

  The registration baseline sharpens this considerably. Football
  Queensland mandates SQUADI registration as a precondition for playing
  (BR43), and the same registration currently takes weeks because SQUADI
  is hard to use — so the governing body's own policy is what converts a
  usability problem into lost playing time across its whole jurisdiction.
  That is an association-level problem with an association-level
  incentive to fix, and it is a materially stronger opening than a
  per-club efficiency pitch.

  It is recorded here as a **Course of Action under consideration**, not
  as architecture, because it is conditional on access this project does
  not yet have — and because it collides with a Principle. An association
  tenant that can see across its member clubs is precisely what
  **Principle P5 (strict tenant isolation)** forbids today. Serving it
  needs an *association-tier tenancy model* — nested or hierarchical
  tenancy, with a scoped exception like P6's — designed deliberately
  rather than discovered mid-build. See
  [open question #31](../../scope/open-questions.md); nothing in the
  current business layer assumes this tier exists.
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
