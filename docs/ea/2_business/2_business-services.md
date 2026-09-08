# Business Services

_[← Business layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Business Service.

What the club offers its people, and **how much of each actually exists**.

> **Corrected September 2026.** This table spent months saying every service
> was "Pending — future initiative" and describing the application layer as
> "not started", while identity, registration, validation, teams,
> safeguarding, governance and half of finance were built and running. The
> business layer was simply never revisited when the application layer was.
>
> That is the failure mode of a documented architecture: the layer nearest
> the code gets updated because somebody is looking at it, and the layer
> that describes the *business* silently rots into fiction. Every status
> below is now taken from
> [4_application/1_application-services.md](../4_application/1_application-services.md),
> which was itself checked against the routes, server actions, domain
> modules and tables rather than against intent.

**Delivered** means a person can do it today. **Partial** names what is
missing, because in each case the missing part is not a detail. **Pending**
means no code.

| Service | Offered to | What it does | Realized by process | Status |
| ------- | ---------- | -------------- | --------------------- | ------ |
| **Identity & membership** | All club actors | Maintains one `Person` per human, with roles across clubs and seasons (C1) | Runs inside every other process | **Delivered** — legal and preferred names kept apart (BR55), overlapping season roles, guardianship separating authority from contact (BR67), BR5 duplicate detection and an audited merge that tombstones rather than deletes (BR82) |
| **Player registration** | Player, Parent/Guardian, Registrar | Season registration, guardian association, required documents, registration status tracking, and international transfer clearance (ITC) for players whose last registration was overseas (C2) | [Player registration process](./3_business-processes.md#player-registration-process), [International transfer clearance process](./3_business-processes.md#international-transfer-clearance-process) | **Delivered**, except ITC — one creation path serves both the public family link and the registrar's form, so neither can drift from the rules. **International transfer clearance is not built** |
| **Player finance** | Player, Parent/Guardian, Finance Admin, Treasurer | Fees, payment plans, installments, vouchers — state government youth-sport voucher programs, each enabled for a club only with Committee approval, applied and claimed only by Finance Admin or Treasurer — reconciliation (C3) | [Payment plan process](./3_business-processes.md#payment-plan-process), [Voucher program enablement process](./3_business-processes.md#voucher-program-enablement-process), [Voucher application and claim process](./3_business-processes.md#voucher-application-and-claim-process) | **Partial.** Delivered: payment plans whose instalments must sum to the total (BR74), append-only payments and refunds (BR77), vouchers attached, verified or rejected with the relief receipt they imply (BR81), and no-pay-no-play including the case that looks finished everywhere and is not (BR79). **Missing: any movement of money.** Square is chosen and unintegrated, so a treasurer types in what arrived; no invoicing, no provider reconciliation, no guardian notification, and no treasurer's own screen |
| **Document management** | All registering actors, Registrar | Secure upload, storage, versioning, and review of registration and compliance documents | Part of the player registration process | **Partial** — registration documents, voucher files and clearance card scans are stored in club-scoped private buckets, with `provided_at` recorded as a time rather than a flag. **No versioning**, and no document vault outside registration |
| **Competition & calendar management** | Director of Football, Head of Women's Football, Registrar, Referee Coordinator | Maintains each season's competition entries (team → competition/division) and the resulting match calendar, sourced from the Governing Body / Association (C11) | [Season competition setup process](./3_business-processes.md#season-competition-setup-process) | Pending |
| **Referee management** | Referee, Assistant Referee, Club Based Match Official, MiniRef, Referee Coordinator | Profile, classification history, fitness/training/knowledge requirements, accreditation (C4) | — | Pending — **no code at all.** A referee can hold the role and a clearance; nothing else of C4 exists |
| **Referee availability & appointment** | Referee (all classifications), Referee Coordinator | Availability declaration, designation, confirmation/decline, conflict checks, post-match verification (C4) | [Referee appointment process](./3_business-processes.md#referee-appointment-process) | Pending |
| **Calendar distribution** | Referee (all classifications), Parent/Guardian of a minor referee | Publishes a Person's own confirmed appointments as a private iCalendar feed their existing Google, Outlook, or Apple calendar subscribes to; changes, reschedules, and cancellations propagate on the calendar client's next refresh (C13) | [Calendar subscription process](./3_business-processes.md#calendar-subscription-process) | Pending |
| **Referee finance** | Referee, Referee Coordinator, Treasurer | Fee schedules, claims, approval, payment batches, remittances (C5) | [Referee payment process](./3_business-processes.md#referee-payment-process) | Pending |
| **External registration reconciliation** | Registrar, Club Admin, Digital Technology Manager, Director of Football | Compares the club's registrations against SQUADI and PlayFootball/Football Australia extracts, resolves identity without a shared key, and raises each gap as a dated eligibility exception rather than a spreadsheet row (C14) | [External registration reconciliation process](./3_business-processes.md#external-registration-reconciliation-process) | Pending |
| **Consent & privacy rights** | Parent/Guardian, Player, Secretary / Member Protection Officer, Blue Card Administration, Club Admin, Super Admin | Captures scoped, revocable guardian consent for minors; services access, correction, and erasure requests against a recorded lawful basis; holds the per-tenant privacy configuration; drives scheduled WWCC re-verification and the automatic withdrawal that follows expiry (C15) | [Consent and erasure process](./3_business-processes.md#consent-and-erasure-process), [WWCC clearance lifecycle process](./3_business-processes.md#wwcc-clearance-lifecycle-process) | **Partial** — capture works for all four consents (BR48, BR56, BR57, BR93). **Nothing can be revoked**: `revoked_at` exists on every consent record and no code sets it, and access, correction and erasure (BR49) are unbuilt. Scheduled re-verification is unbuilt |
| **Compliance & data quality** | Registrar, Finance Admin, Referee Coordinator, Club Admin, Blue Card Administration, Volunteer Coordinator | Deterministic rule evaluation, duplicate/exception detection, audit trail (C6) | Runs inside every other process, not a standalone process | **Delivered** — BR1, BR2, BR3, BR48 and BR55 evaluated and **persisted**, so "what is missing" has a history; duplicates surfaced for a human; an append-only audit log that not even an admin can rewrite |
| **Communications** | All actors | Transactional messages, reminders, generic FAQ answers (C7) | Drafted by the Assistant, sent after the owning human's review — see [1_business-actors-and-roles.md](./1_business-actors-and-roles.md#ai-actor) | Pending |
| **Reporting & dashboards** | Club Admin, Treasurer, Registrar, Referee Coordinator, Super Admin | Registration, financial, and referee dashboards (C8) | — | Pending — the registrar queue answers "what is blocking this season" on the way past, but nothing here is a dashboard, and this is what imported history (C9) would be *for* |
| **Historical data consolidation** | Pilot club, Let'sDataTalk operator | Restated September 2026 as a **repeatable onboarding step driven by a club-supplied export**, rather than extraction from the pilot club's systems (C9) | [Historical data consolidation process](./3_business-processes.md#historical-data-consolidation-process) | Pending — **blocked on a question, not on effort.** [#57](../../scope/open-questions.md) asks what lawful basis covers a decade of children's records handed over by a club, and [scope 28](../../scope/28_onboarding-a-club-and-its-history.md) says it must be answered before the first import |
| **Multitenant platform operations** | Super Admin, Club Admin | Tenant provisioning, role-based access, per-club configuration (C10) | — | **Delivered** — tenant isolation enforced by the database and proved behaviourally; a platform console that provisions clubs, records who is responsible for each and what was agreed commercially, and **reads nothing inside a tenant** ([decision 9](../../decisions/9_platform_administration_provisions_but_never_reads.md)); a club admin managing their own club's access. **No per-club branding**, and clubs cannot provision themselves ([decision 7](../../decisions/7_tenant-provisioning-by-owner-issued-invitation.md)) |
| **Carnival & event management** | Events Coordinator, Referee Coordinator, Coach, Team Manager, Parent/Guardian, Player, General Public/Spectator | Configures a carnival's conditions (points system, format, eligibility), creates and manages one-off, multi-club carnival/grassroots events (MiniRoos Invitational Carnivals, Girls United Carnivals, WinterFest, Pacific Championships, talent-ID tournaments), generates draws/fixtures, records results and the resulting ladder, and publishes an account-free public view — schedule (date, time, venue), next fixture, ladder, and results at club/team level only, by default (C12) | [Carnival event lifecycle process](./3_business-processes.md#carnival-event-lifecycle-process) | Pending — deferred past the Q4 2026 MVP (see [1_strategy/2_capabilities-and-resources.md](../1_strategy/2_capabilities-and-resources.md)) |

See
[4_application/1_application-services.md](../4_application/1_application-services.md)
for how each of these is realised, what is partial and why, and the eight
capabilities with no code at all.

**Two things a reader should not have to infer.** Nothing in this product
sends a message — no email, no SMS, no reminder — so every communication
today is a human copying something out of a screen. And nothing in it takes
money: the rules about money are enforced, the movement of it is not.
