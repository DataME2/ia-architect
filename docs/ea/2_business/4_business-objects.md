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
| **Season** | A club's operating period; registrations, fees, competition entries, and referee designations are scoped to one |

## Competitions & calendar

| Object | What it represents |
| ------ | -------------------- |
| **Governing Body / Association** | The external football association for a state/region (Football Queensland, Football NSW, Northern NSW Football, Capital Football, Football South Australia, Football West, New Zealand Football, …) that defines competition structure and publishes the season calendar; not a tenant — shared reference data across every club in its jurisdiction |
| **Competition** | A named competition run by a Governing Body for a season (e.g. NPL Queensland, FQPL 1, Kappa Queensland Cup), with a type (Weekly Competition or Tournament), a format (Knock Out, Round Robin, Double Round Robin, or Enhanced Round Robin), and a tier/division |
| **Season Competition Entry** | A club's team entered into a Competition for a given Season — links Club, Team, Competition, and Season |
| **Match** | A single scheduled fixture between two teams within a Competition, with a date, venue, round, and status (scheduled, played, postponed, abandoned); what a Match Official Appointment designates a referee to, and what a Referee Payment Claim's verified match refers to |
| **Competition Calendar** | The ordered set of Matches (rounds and dates) for a Competition in a Season |

## Carnivals & grassroots events

| Object | What it represents |
| ------ | -------------------- |
| **Carnival / Grassroots Event** | A one-off, often multi-club event (MiniRoos Invitational Carnival, Girls United Carnival, WinterFest, Pacific Championships, talent-ID tournament, …) with a type, format (round-robin, modified, or other), date(s), venue, hosting Club or Governing Body, participating Clubs, a **responsible person** (the Person holding Events Coordinator for it, BR29), and a publication status (Draft/Published) — distinct from a **Competition**: short-lived, not season-long, and typically spans multiple clubs by design |
| **Carnival Conditions** | The event-specific rules its Events Coordinator/responsible person configures before publishing: points system and tie-breakers for the ladder, match format details (e.g. small-sided rules, match duration), eligibility criteria, code of conduct, and the BR26 public-names opt-in flag — configuration data attached to one Carnival/Grassroots Event, not code (BR29) |
| **Carnival Fixture** | A single scheduled match within a Carnival/Grassroots Event, between two participating Club/Team entries, with a date, kickoff time, venue, round, and result — separate from **Match** (season Competition Calendar) to avoid conflating a one-off carnival game with an ongoing league fixture, though both share the same referee eligibility/conflict rules (BR6–BR11, BR28) |
| **Carnival Result** | The recorded outcome of a Carnival Fixture |
| **Carnival Ladder / Standings** | The computed table of participating teams' points/position for a round-robin-format Carnival, derived from Carnival Results using that event's Carnival Conditions (points system, tie-breakers) |
| **Public Event View** | The account-free, published representation of a Carnival/Grassroots Event: schedule and draw (date, kickoff time, and venue per fixture), each team's next unplayed fixture, the ladder/standings (where the format has one), and results — club/team-level only by default (BR26); the specific, scoped exception to tenant isolation (Principle P6, BR27) |

## Player registration & finance

| Object | What it represents |
| ------ | -------------------- |
| **Player Registration** | A Person's registration to a club/team/category for a season, with a status (see [3_business-processes.md](./3_business-processes.md#player-registration-process)) |
| **Guardianship** | The link between a minor Player and their Parent/Guardian |
| **Fee / Invoice** | What a registration or program costs |
| **Payment Plan / Installment** | How a fee is scheduled and paid down |
| **Voucher Program** | A state government youth-sport discount scheme a club may choose to accept (e.g. Queensland Play On!/FairPlay, NSW Active and Creative Kids, SA Sports Vouchers, WA KidSport, Victoria Get Active Kids, Tasmania Ticket to Play), with jurisdiction, per-child value, frequency, and eligibility criteria; shared reference data, not tenant-owned, until a Club enables it |
| **Club Voucher Program Enablement** | A Club's decision to accept a Voucher Program for its own invoices — records the Committee's approval and date (BR21); gates whether Finance Admin or Treasurer can apply that program's Vouchers |
| **Voucher** | A discount instrument redeemed against an invoice under a Club's enabled Voucher Program (e.g. a Queensland Play On! voucher), tracked by code, beneficiary, value, issue/use dates, status, applied invoice, and duplicate risk |
| **Voucher Verification** | A check of a Voucher's code against the issuing government's own public verification interface, performed by the Assistant (AI, advisory) or manually by Finance Admin/Treasurer, with its result and timestamp recorded before the Voucher can be applied (BR25) |
| **Voucher Claim** | The club's request to a Voucher Program's issuing government for reimbursement of a Voucher already applied to an invoice, moving `NOT_CLAIMED → SUBMITTED → PAID \| REJECTED`, submitted through that program's own CSV/portal mechanism (BR23, BR24) |

## Match officials

| Object | What it represents |
| ------ | -------------------- |
| **Referee Profile** | A Person's referee-specific profile |
| **Official Classification / Classification History** | A referee's current and past classification on the Football Queensland pathway (MiniRefs 5.0 through FIFA Referee / AFC Elite), kept as history, never a single overwritten value |
| **Fitness Test / Training Attendance / Course Completion** | Evidence that a referee meets the requirements for their classification and competition |
| **Referee Availability** | A referee's declared availability window |
| **Match Official Appointment** | A proposed, accepted, or declined designation to a **Match** (see Competitions & calendar, above) |
| **Appointment Conflict** | A detected blocking conflict or warning for a proposed appointment (see [3_business-processes.md](./3_business-processes.md#referee-appointment-process)) |
| **Referee Payment Claim** | A claim for payment tied to a verified match, moving through approval to a payment batch |

## Compliance & communications

| Object | What it represents |
| ------ | -------------------- |
| **Data Quality Issue** | A deterministic-rule violation (duplicate, missing field, expired document, …) surfaced for human review |
| **Audit Event** | A record of a change, exception, or approval, for traceability |
| **Communication** | A transactional message or reminder, whether human-authored or Assistant-drafted (see [1_business-actors-and-roles.md](./1_business-actors-and-roles.md#ai-actor)) |
