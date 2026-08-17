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
| **Person** | The single identity behind every role — see Principle P1 ([1_strategy/1_motivation.md](../1_strategy/README.md)). Carries **two names, both first-class**: the *legal name* as it appears on the passport or birth certificate, which is what external registration and cross-system matching use, and the *preferred name* the Person is actually called, which is what humans see (BR55). May also carry an identification **headshot photograph**, held as sensitive personal data under consent and never processed by an uncontrolled AI service (BR56) |
| **Person Role** | One role (player, referee, coach, guardian, committee member, …) a Person holds, at a club, for a season, with an effective date range |
| **Person Document** | An identity or compliance document belonging to a Person (passport, birth certificate, visa, Working with Children Check evidence, Minor ITC Application supporting documents, …) |

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
| **Playing Format** | The on-field rules an age group or competition is played under — players per side (e.g. MiniRoos 4v4, 7v7, 9v9), field and goal dimensions, ball size, match duration, and whether results/ladders are published at all. Authored by the Governing Body / Association and consumed as reference data; a Carnival's own Carnival Conditions may reference one instead of restating it |
| **Competition Regulation** | A rule an association imposes on a Competition beyond its format — eligibility and age-dispensation rules, squad and interchange limits, finals qualification, forfeit and disciplinary consequences. Reference data authored by the association, and the material a future association tier would own centrally ([open question #31](../../scope/open-questions.md)) |

## Carnivals & grassroots events

| Object | What it represents |
| ------ | -------------------- |
| **Carnival / Grassroots Event** | A one-off, often multi-club event (MiniRoos Invitational Carnival, Girls United Carnival, WinterFest, Pacific Championships, talent-ID tournament, …) with a type, format (round-robin, modified, or other), date(s), venue, hosting Club or Governing Body, participating Clubs, a **responsible person** (the Person holding Events Coordinator for it, BR29), and a publication status (Draft/Published) — distinct from a **Competition**: short-lived, not season-long, and typically spans multiple clubs by design |
| **Carnival Conditions** | The event-specific rules its Events Coordinator/responsible person configures before publishing: points system and tie-breakers for the ladder, match format details (e.g. small-sided rules, match duration), eligibility criteria, code of conduct, and the BR26 public-names opt-in flag — configuration data attached to one Carnival/Grassroots Event, not code (BR29) |
| **Carnival Fixture** | A single scheduled match within a Carnival/Grassroots Event, between two participating Club/Team entries, with a date, kickoff time, venue, round, and result — separate from **Match** (season Competition Calendar) to avoid conflating a one-off carnival game with an ongoing league fixture, though both share the same referee eligibility/conflict rules (BR6–BR11, BR28) |
| **Carnival Result** | The recorded outcome of a Carnival Fixture |
| **Carnival Ladder / Standings** | The computed table of participating teams' points/position for a round-robin-format Carnival, derived from Carnival Results using that event's Carnival Conditions (points system, tie-breakers) |
| **Public Event View** | The account-free, published representation of a Carnival/Grassroots Event: schedule and draw (date, kickoff time, and venue per fixture), each team's next unplayed fixture, the ladder/standings (where the format has one), and results — club/team-level only by default (BR26); the specific, scoped exception to tenant isolation (Principle P6, BR27) |

## International transfers

| Object | What it represents |
| ------ | -------------------- |
| **International Transfer Certificate (ITC)** | A certificate from a Player's former national association authorising their registration with a new one; required whenever the Player's immediately preceding registration was with a different national association (BR35), requested solely by Football Australia (BR38) — gates a Player Registration at status `PENDING_EXTERNAL_REGISTRATION` |
| **Minor ITC Application** | One of six FIFA-prescribed application forms a Minor (ITC) — aged 10–17 — submits, matching a specific FIFA Art. 19 exception category, with supporting documentation, via the Member Federation, to obtain international clearance (BR37); a Minor under 10 is exempt entirely |

## Player registration & finance

| Object | What it represents |
| ------ | -------------------- |
| **Player Registration** | A Person's registration to a club/team/category for a season, with a status (see [3_business-processes.md](./3_business-processes.md#player-registration-process)) |
| **Guardianship** | The link between a minor Player and their Parent/Guardian |
| **Fee / Invoice** | What a registration or program costs |
| **Payment Plan / Installment** | How a fee is scheduled and paid down |
| **Voucher Program** | A state government youth-sport discount scheme a club may choose to accept (e.g. Queensland Play On!/FairPlay, NSW Active and Creative Kids, SA Sports Vouchers, WA KidSport, Victoria Get Active Kids, Tasmania Ticket to Play), with jurisdiction, per-child value, frequency, and eligibility criteria; shared reference data, not tenant-owned, until a Club enables it |
| **Club Voucher Program Enablement** | A Club's decision to accept a Voucher Program for its own invoices — records the Committee's approval and date (BR21); gates whether Finance Admin or Treasurer can apply that program's Vouchers. **The pilot club's Committee has approved Queensland's Play On! program** (confirmed July 2026); what artifact evidences that approval is still open ([question #28](../../scope/open-questions.md)) |
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
| **Appointment Response** | A referee's answer to a proposed designation — accept, decline, or withdraw-after-accepting — carrying the response timestamp and, for a decline or withdrawal, the brief reason the referee recorded (BR42); the input to the decline-rate calculation in BR12 |
| **Appointment Conflict** | A detected blocking conflict or warning for a proposed appointment (see [3_business-processes.md](./3_business-processes.md#referee-appointment-process)) |
| **Referee Payment Claim** | A claim for payment tied to a verified match, moving through approval to a payment batch |
| **Calendar Subscription** | A Person's opt-in to receive their own appointments as an iCalendar feed, holding the tokenised private feed URL, who it was issued to (the Person, or their Guardian for a minor — BR33), its issue date, and its revoked/rotated status (BR31) |
| **Calendar Event** | The published iCalendar representation of one confirmed appointment within a Calendar Subscription's feed — competition, date/time, venue, and the subscriber's own role only (BR32); a convenience copy of the authoritative Match Official Appointment, never a substitute for it |

## External reconciliation

| Object | What it represents |
| ------ | -------------------- |
| **External System Extract** | A CSV report pulled from an external system — the Squadi Registration Report, the Squadi User Report, or a PlayFootball equivalent — carrying its rows *and* its known limitations: which rows it silently omits (`De-Registered`), which roles it covers, which fields it lacks (the User Report has carried no FA ID since March 2025, and no registration date), and what season scope it spans (BR45). It additionally records the **authorisation basis** under which the platform may ingest it at all; unconfirmed means not permitted, and blocks ingestion rather than defaulting to allowed (BR53) |
| **Registration Submission Pack** | The outbound counterpart of an External System Extract: the club's own validated registrations for a season, assembled into an immutable, versioned artifact for the governing body to import — carrying its generation timestamp, its manifest of included Persons, the generating user, and the channel it was handed over through (BR58, BR59) |
| **Submission Record** | One Person's presence in one Submission Pack, and what became of it: sent, confirmed present in the governing body's system, or rejected with a reason. It is what keeps *sent* and *registered* distinct (BR60) |
| **Participation Response** | A Person's available / not-available answer to a fixture or appointment, with the brief reason required on a negative, the time it was given, and who gave it — the Guardian where the participant is a minor (BR62, BR63). The player-side counterpart of **Appointment Response**, sharing its pattern deliberately rather than duplicating it |
| **Active Role Context** | Which of a Person's roles they are currently acting in, and therefore what the app shows and permits. Not a permission in itself — permissions remain on Person Role — but the selector that decides which set applies right now (BR61) |
| **Reconciliation Run** | One comparison of the club's own registrations against an External System Extract, recording the extract's as-at date, the counts matched, and the differences found (BR46) — the modeled form of what a club does manually today via Majestri's "Run Squadi Comparison" |
| **Reconciliation Exception** | A single difference the run surfaced. The consequential kind is a Player registered with the club but absent from the governing body's system: under BR43 that Player cannot take the field, so the exception carries an eligibility consequence, not just a data delta (BR47) |
| **Identity Match Candidate** | A proposed match between a club Person and an external record, made without a shared identifier — name + date of birth + email — with its confidence and evidence, awaiting human confirmation and never auto-merged (BR44, extending BR5) |

## Consent, privacy rights & safeguarding

| Object | What it represents |
| ------ | -------------------- |
| **Consent Record** | An explicit grant of permission to process a minor's data, scoped to a stated purpose, attributed to the consenting Guardian, timestamped, and revocable — distinct from **Guardianship**, which establishes *who is responsible* rather than *what was agreed to* (BR48) |
| **Erasure Request** | A data subject's (or guardian's) request to delete their data, carrying its outcome — erased, de-identified, or refused — and, whenever anything short of full erasure occurs, the **specific lawful basis** relied on (BR49) |
| **WWCC Clearance** | A holder's Working with Children Check as the platform tracks it: clearance number, issuing jurisdiction, validity dates, and current status (valid, expiring, expired, suspended, revoked). Re-verified on a schedule (BR51); a transition out of *valid* automatically withdraws the holder from future assignments (BR50) |
| **Privacy Configuration** | The per-tenant record of which privacy framework governs that tenant — Australian Privacy Principles, New Zealand's Privacy Act 2020, or GDPR — determining consent wording, retention handling, and how erasure requests are answered (BR52) |

## Compliance & communications

| Object | What it represents |
| ------ | -------------------- |
| **Data Quality Issue** | A deterministic-rule violation (duplicate, missing field, expired document, …) surfaced for human review |
| **Audit Event** | A record of a change, exception, or approval, for traceability |
| **Communication** | A transactional message or reminder, whether human-authored or Assistant-drafted (see [1_business-actors-and-roles.md](./1_business-actors-and-roles.md#ai-actor)) |
