# Business Objects

_[← Business layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Business Object.

The things the processes in
[3_business-processes.md](./3_business-processes.md) handle. Each will
become a data object in [3_information/1_data-objects.md](../3_information/README.md)
(not started) once that layer is assessed.

## Identity

| Object | What it represents |
| ------ | -------------------- |
| **Person** | The single identity behind every role — see Principle P1 ([1_strategy/1_motivation.md](../1_strategy/README.md)) |
| **Person Role** | One role (player, referee, coach, guardian, committee member, …) a Person holds, at a club, for a season, with an effective date range |
| **Person Document** | An identity or compliance document belonging to a Person (passport, birth certificate, visa, Working with Children Check evidence, …) |

## Organisation

| Object | What it represents |
| ------ | -------------------- |
| **Club / Organisation** | A tenant — the unit of logical data separation (Principle P5) |
| **Season** | A club's operating period; registrations, fees, and referee designations are scoped to one |

## Player registration & finance

| Object | What it represents |
| ------ | -------------------- |
| **Player Registration** | A Person's registration to a club/team/category for a season, with a status (see [3_business-processes.md](./3_business-processes.md#player-registration-process)) |
| **Guardianship** | The link between a minor Player and their Parent/Guardian |
| **Fee / Invoice** | What a registration or program costs |
| **Payment Plan / Installment** | How a fee is scheduled and paid down |
| **Voucher** | A discount instrument, including the Queensland **PlayOn Sports Voucher** (A$200, tracked by code, beneficiary, value, issue/use dates, status, applied invoice, and duplicate risk) |

## Match officials

| Object | What it represents |
| ------ | -------------------- |
| **Referee Profile** | A Person's referee-specific profile |
| **Official Classification / Classification History** | A referee's current and past classification on the Football Queensland pathway (MiniRefs 5.0 through FIFA Referee / AFC Elite), kept as history, never a single overwritten value |
| **Fitness Test / Training Attendance / Course Completion** | Evidence that a referee meets the requirements for their classification and competition |
| **Referee Availability** | A referee's declared availability window |
| **Match Official Appointment** | A proposed, accepted, or declined designation to a match |
| **Appointment Conflict** | A detected blocking conflict or warning for a proposed appointment (see [3_business-processes.md](./3_business-processes.md#referee-appointment-process)) |
| **Referee Payment Claim** | A claim for payment tied to a verified match, moving through approval to a payment batch |

## Compliance & communications

| Object | What it represents |
| ------ | -------------------- |
| **Data Quality Issue** | A deterministic-rule violation (duplicate, missing field, expired document, …) surfaced for human review |
| **Audit Event** | A record of a change, exception, or approval, for traceability |
| **Communication** | A transactional message or reminder, whether human-authored or Assistant-drafted (see [1_business-actors-and-roles.md](./1_business-actors-and-roles.md#ai-actor)) |
