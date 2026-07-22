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
| **Player registration** | Player, Parent/Guardian, Registrar | Season registration, guardian association, required documents, registration status tracking (C2) | [Player registration process](./3_business-processes.md#player-registration-process) | Pending |
| **Player finance** | Player, Parent/Guardian, Finance Admin, Treasurer | Fees, payment plans, installments, vouchers, reconciliation (C3) | [Payment plan process](./3_business-processes.md#payment-plan-process) | Pending |
| **Document management** | All registering actors, Registrar | Secure upload, storage, versioning, and review of registration and compliance documents | Part of the player registration process | Pending |
| **Referee management** | Referee, Assistant Referee, Club Based Match Official, MiniRef, Referee Coordinator | Profile, classification history, fitness/training/knowledge requirements, accreditation (C4) | — | Pending |
| **Referee availability & appointment** | Referee (all classifications), Referee Coordinator | Availability declaration, designation, confirmation/decline, conflict checks, post-match verification (C4) | [Referee appointment process](./3_business-processes.md#referee-appointment-process) | Pending |
| **Referee finance** | Referee, Referee Coordinator, Treasurer | Fee schedules, claims, approval, payment batches, remittances (C5) | [Referee payment process](./3_business-processes.md#referee-payment-process) | Pending |
| **Compliance & data quality** | Registrar, Finance Admin, Referee Coordinator, Club Admin | Deterministic rule evaluation, duplicate/exception detection, audit trail (C6) | Runs inside every other process, not a standalone process | Pending |
| **Communications** | All actors | Transactional messages, reminders, generic FAQ answers (C7) | Drafted by the Assistant, sent after the owning human's review — see [1_business-actors-and-roles.md](./1_business-actors-and-roles.md#ai-actor) | Pending |
| **Reporting & dashboards** | Club Admin, Treasurer, Registrar, Referee Coordinator, Super Admin | Registration, financial, and referee dashboards (C8) | — | Pending |
| **Historical data consolidation** | Pilot club, Let'sDataTalk operator | Read-only extraction and RAW → STAGING → unified-model consolidation of the pilot club's historical data (C9) | [Historical data consolidation process](./3_business-processes.md#historical-data-consolidation-process) | Pending |
| **Multitenant platform operations** | Super Admin, Club Admin | Tenant provisioning, role-based access, per-club configuration (C10) | — | Pending |

See the [application layer](../4_application/README.md) (not started,
future `1_application-services.md`) for how these will be realized once
the MVP-build initiative is scoped.
