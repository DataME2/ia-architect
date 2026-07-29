# Project Scope — Calendar Distribution for Referee Appointments

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

Referees want their appointments to appear in the calendar they already
use — Gmail or Outlook. This initiative adds **Capability C13, Calendar
distribution**: each Person's own confirmed appointments published as a
private, revocable iCalendar feed their existing Google, Outlook, or Apple
calendar subscribes to. The architecturally significant call is *how*: a
subscription feed the calendar client pulls, rather than OAuth account
access the platform writes into — which keeps Principle P2 intact with no
exception, serves every calendar vendor with one artifact, and avoids
holding refresh tokens for personal accounts (decision 4). No application
code is written; this is architecture only.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | New Capability C13 (Calendar distribution), realizing existing **G4** and **G5** — no new Goal or Driver; new Resource entry for iCalendar/RFC 5545; new Course of Action recording the feed-not-account-access posture; the Value Stream's Operate row now names C13. **No Principle changes, and no P2 exception** — the design deliberately avoids needing one (see [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md), [1_strategy/3_value-stream.md](../ea/1_strategy/3_value-stream.md)) |
| 2_business    | New "Calendar distribution" business service; new "Calendar subscription process"; the Referee appointment process gains a calendar-feed branch; new business objects Calendar Subscription and Calendar Event; new business rules BR30–BR34; three new glossary terms; the system-context diagram gains the referee's own calendar as a *pulling* external client (see the five files under [2_business/](../ea/2_business/README.md)). No new actor — the existing **Referee** (all classifications) and **Parent/Guardian** roles already cover who subscribes |
| 3_information | No change — not started. Deferred to the MVP-build initiative, which now additionally needs to model Calendar Subscription (including feed-token generation, storage, and rotation, per BR31) and Calendar Event |
| 4_application | No change — not started. The future application layer will need a feed-serving endpoint and an ICS serializer; noted as a gap, not designed here |
| 5_technology  | No change — not started. No stack is chosen; a static-ish authenticated feed endpoint carries no unusual runtime requirement |

A [decision record](../decisions/4_calendar-distribution-by-feed-not-account-access.md)
accompanies this scope document: the feed-vs-account-access choice is a
single consequential call, smaller than the initiative but exactly the kind
a future reader will ask "why not just integrate with Google Calendar?"
about — and it is what keeps Principle P2 unamended.

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | An accepted designation existed only inside the platform; a referee learned about it through the portal or a transactional email and re-entered it into their own calendar by hand, with no propagation when a match was rescheduled or cancelled |
| **Target** (delivered) | Calendar distribution is a modeled capability (C13) with a service, process, two objects, and five rules; a referee subscribes once and their Gmail/Outlook/Apple calendar tracks their appointments thereafter, with the platform holding no credential for that calendar account |

## Work packages and deliverables

### WP1 — Strategy layer

- **Deliverables:** `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (Capability C13, iCalendar resource, calendar Course of Action),
  `docs/ea/1_strategy/3_value-stream.md` (Operate row names C13)
- **Outcome:** the capability is recorded and traceable to the existing
  goals it serves (G4, G5), and the "subscription, not account access"
  posture is stated at strategy level where the P2 tension actually lives.

### WP2 — Business layer

- **Deliverables:** `docs/ea/2_business/2_business-services.md` (Calendar
  distribution service), `docs/ea/2_business/3_business-processes.md`
  (Calendar subscription process; Referee appointment process gains the
  feed branch), `docs/ea/2_business/4_business-objects.md` (Calendar
  Subscription, Calendar Event), `docs/ea/2_business/5_domain-context-and-rules.md`
  (system context diagram, three glossary terms, BR30–BR34)
- **Outcome:** every actor, service, process, object, and rule a future
  MVP-build initiative needs to implement calendar distribution — including
  the privacy and duty-of-care boundaries — has a home in the business layer.

### WP3 — Governance scaffolding

- **Deliverables:** `docs/decisions/4_calendar-distribution-by-feed-not-account-access.md`,
  `docs/decisions/README.md` index row, this scope document,
  `docs/scope/README.md` index row, `docs/scope/open-questions.md` (rows 25–26)
- **Outcome:** the feed-vs-account-access call has a citable rationale, and
  the two unconfirmed points (guardian-issued feeds for minors; whether
  two-way sync is ever wanted) are tracked rather than silently assumed.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Capability C13, the Calendar distribution service, the Calendar subscription process, Calendar Subscription and Calendar Event objects, BR30–BR34 | Two-way sync via the Google Calendar API or Microsoft Graph — would need a P2 exception; deferred ([open question #26](./open-questions.md)) |
| The decision that calendar reaches referees by pulled subscription, never by platform write-access to a personal account | Information-layer design of feed-token generation, storage, and rotation (BR31) |
| Privacy and duty-of-care boundaries on feed content: own-appointments-only, no third-party personal data, guardian-issued for minors | Application-layer feed endpoint and ICS serializer |
| Referee appointments as the first (and only) content type in a feed | Extending feeds to player registrations, team training, competition fixtures, or carnival fixtures — the objects allow it, no initiative scopes it |
| — | Any code — no `src/`, no tests, no build |

## Gap notes

- **Feed-token custody.** BR31 requires unguessable, revocable, rotatable
  feed URLs, but the mechanism (token length, hashing at rest, rotation
  UX, whether revocation is per-feed or per-Person) belongs to the
  information and application layers. It is a new credential class for this
  project — worth explicit attention when those layers are first assessed,
  since a leaked feed URL exposes a referee's (possibly a child's) movements.
- **Refresh latency is a product constraint, not a bug.** Subscribed
  calendar clients poll on their own schedule — commonly hours. Any
  requirement phrased as "the referee must know within minutes" is a
  Communications (C7) requirement, not a calendar-feed one; the two should
  not be conflated when the MVP-build initiative writes acceptance criteria.
- **Other content types are unmodeled but adjacent.** Player registration
  dates, training sessions, competition fixtures, and carnival fixtures are
  all plausible feed content, and the Calendar Subscription object would
  extend to them without redesign — but nothing here scopes that, and each
  would need its own pass over BR30/BR32's privacy boundaries.

## Open questions

- **Guardian-issued feeds for minor referees.** Adopted interpretation:
  for a minor, the Calendar Subscription is issued to the Parent/Guardian
  rather than the child (BR33), mirroring BR1's duty-of-care pattern. The
  pilot club has not confirmed this matches how it actually communicates
  with young match officials today — see
  [open question #25](./open-questions.md).
- **Two-way sync appetite.** Adopted interpretation: one-way (platform →
  calendar) is sufficient, and declining or confirming a designation stays
  in the platform (BR34). Whether referees will expect to act on an
  appointment *from* their calendar is unconfirmed — see
  [open question #26](./open-questions.md).
