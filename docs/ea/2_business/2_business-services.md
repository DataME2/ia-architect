# Business Services

_[← Business layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Business Service.

Every service below is **Pending — future initiative**: this change drafts
the target business architecture, but no MVP-build initiative has been
scoped yet (see
[docs/scope/1_bootstrap-strategy-and-business-architecture.md](../../scope/1_bootstrap-strategy-and-business-architecture.md)).
Once an MVP-build initiative exists, each row should link the application
service that realizes it (in `4_application/1_application-services.md`,
under the [application layer](../4_application/README.md), not started)
instead of saying "Pending."

| Service | Offered to | What it does | Realized by process | Status |
| ------- | ---------- | -------------- | --------------------- | ------ |
| **Identity & membership** | All club actors | Maintains one `Person` per human, with roles across clubs and seasons (Capability C1) | — | Pending |
| **Player registration** | Player, Parent/Guardian, Registrar | Season registration, guardian association, required documents, registration status tracking, and international transfer clearance (ITC) for players whose last registration was overseas (C2) | [Player registration process](./3_business-processes.md#player-registration-process), [International transfer clearance process](./3_business-processes.md#international-transfer-clearance-process) | Pending |
| **Player finance** | Player, Parent/Guardian, Finance Admin, Treasurer | Fees, payment plans, installments, vouchers — state government youth-sport voucher programs, each enabled for a club only with Committee approval, applied and claimed only by Finance Admin or Treasurer — reconciliation (C3) | [Payment plan process](./3_business-processes.md#payment-plan-process), [Voucher program enablement process](./3_business-processes.md#voucher-program-enablement-process), [Voucher application and claim process](./3_business-processes.md#voucher-application-and-claim-process) | Pending |
| **Document management** | All registering actors, Registrar | Secure upload, storage, versioning, and review of registration and compliance documents | Part of the player registration process | Pending |
| **Competition & calendar management** | Director of Football, Head of Women's Football, Registrar, Referee Coordinator | Maintains each season's competition entries (team → competition/division) and the resulting match calendar, sourced from the Governing Body / Association (C11) | [Season competition setup process](./3_business-processes.md#season-competition-setup-process) | Pending |
| **Referee management** | Referee, Assistant Referee, Club Based Match Official, MiniRef, Referee Coordinator | Profile, classification history, fitness/training/knowledge requirements, accreditation (C4) | — | Pending |
| **Referee availability & appointment** | Referee (all classifications), Referee Coordinator | Availability declaration, designation, confirmation/decline, conflict checks, post-match verification (C4) | [Referee appointment process](./3_business-processes.md#referee-appointment-process) | Pending |
| **Calendar distribution** | Referee (all classifications), Parent/Guardian of a minor referee | Publishes a Person's own confirmed appointments as a private iCalendar feed their existing Google, Outlook, or Apple calendar subscribes to; changes, reschedules, and cancellations propagate on the calendar client's next refresh (C13) | [Calendar subscription process](./3_business-processes.md#calendar-subscription-process) | Pending |
| **Referee finance** | Referee, Referee Coordinator, Treasurer | Fee schedules, claims, approval, payment batches, remittances (C5) | [Referee payment process](./3_business-processes.md#referee-payment-process) | Pending |
| **External registration reconciliation** | Registrar, Club Admin, Digital Technology Manager, Director of Football | Compares the club's registrations against SQUADI and PlayFootball/Football Australia extracts, resolves identity without a shared key, and raises each gap as a dated eligibility exception rather than a spreadsheet row (C14) | [External registration reconciliation process](./3_business-processes.md#external-registration-reconciliation-process) | Pending |
| **Compliance & data quality** | Registrar, Finance Admin, Referee Coordinator, Club Admin, Blue Card Administration, Volunteer Coordinator | Deterministic rule evaluation, duplicate/exception detection, audit trail (C6) | Runs inside every other process, not a standalone process | Pending |
| **Communications** | All actors | Transactional messages, reminders, generic FAQ answers (C7) | Drafted by the Assistant, sent after the owning human's review — see [1_business-actors-and-roles.md](./1_business-actors-and-roles.md#ai-actor) | Pending |
| **Reporting & dashboards** | Club Admin, Treasurer, Registrar, Referee Coordinator, Super Admin | Registration, financial, and referee dashboards (C8) | — | Pending |
| **Historical data consolidation** | Pilot club, Let'sDataTalk operator | Read-only extraction and RAW → STAGING → unified-model consolidation of the pilot club's historical data (C9) | [Historical data consolidation process](./3_business-processes.md#historical-data-consolidation-process) | Pending |
| **Multitenant platform operations** | Super Admin, Club Admin | Tenant provisioning, role-based access, per-club configuration (C10) | — | Pending |
| **Carnival & event management** | Events Coordinator, Referee Coordinator, Coach, Team Manager, Parent/Guardian, Player, General Public/Spectator | Configures a carnival's conditions (points system, format, eligibility), creates and manages one-off, multi-club carnival/grassroots events (MiniRoos Invitational Carnivals, Girls United Carnivals, WinterFest, Pacific Championships, talent-ID tournaments), generates draws/fixtures, records results and the resulting ladder, and publishes an account-free public view — schedule (date, time, venue), next fixture, ladder, and results at club/team level only, by default (C12) | [Carnival event lifecycle process](./3_business-processes.md#carnival-event-lifecycle-process) | Pending — deferred past the Q4 2026 MVP (see [1_strategy/2_capabilities-and-resources.md](../1_strategy/2_capabilities-and-resources.md)) |

See the [application layer](../4_application/README.md) (not started,
future `1_application-services.md`) for how these will be realized once
the MVP-build initiative is scoped.
