# Project Scope — The Role-Based Mobile Experience

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

Until now the architecture had no mobile surface. Everything a person
received arrived through a channel the platform does not control — a
calendar feed that refreshes on the client's schedule (BR30–BR34), an
email, or in practice a WhatsApp group. This initiative adds **Capability
C17**, the first place a `Person` interacts with the platform directly.

Adds five business rules (**BR61–BR65**), two business objects, and one
open question. It also records the **go-to-market timing** stance from the
same conversation. No application code is written.

## What the app is for, in one sentence each

| Role | What they open the app to do |
| ---- | ---------------------------- |
| **Player** (or their Guardian) | See the next fixture — venue, kick-off, what to bring — and answer *am I available*, with a reason if not |
| **Match official** | The same, for appointments, plus their own classification and compliance standing |
| **Coach / technical director** | See who has responded, who has not, and who is out and why |
| **Referee coordinator** | See who is available and who is not, before appointing rather than after |
| **Guardian** | All of the above, on behalf of their child |

## The role switcher is where P1 becomes visible

The single-`Person`-many-roles model has been the project's founding
principle since the first initiative, but until now it has been an
*internal* property — true in the data model, invisible to the human it
benefits. A parent who is also a referee coordinator, or a 17-year-old who
plays and officiates, currently experiences that fact as nothing at all.

**C17 is where they experience it.** One account, one identity, an explicit
switch between contexts. That makes the app the first user-facing proof of
P1 and, not incidentally, the clearest demonstration to a prospective club
of what the platform is — worth remembering when
[decision 5](../decisions/5_replace-the-incumbent-rather-than-integrate.md)'s
displacement conversation needs something to show.

**BR61 is what stops that convenience becoming a leak.** One active role
context at a time, no merged views. A parent acting as a parent must not
see coordinator data because they happen to hold that role too. The
boundary belongs in a rule, not in a screen layout, because screen layouts
change and this one must not.

## Availability, extended from referees to players

The referee side of this already existed: availability windows,
appointments, and **BR42**'s requirement that a decline carries a brief
reason with the coordinator notified. Players had nothing equivalent —
their availability lived in a coach's head or a group chat.

**BR62 generalises the pattern** rather than inventing a second one. The
coach's real question was never *who declined* but *why*: injury, holiday,
and quiet disengagement need three different responses, and a bare count
distinguishes none of them. Two deliberate constraints ship with it:

- The reason is visible to the **responsible coach, technical director, or
  coordinator only** — never to other participants. A reason visible to
  teammates would be written for teammates, and stop being useful.
- For a minor, both the account and the response belong to the
  **Guardian** (**BR63**), mirroring BR33 exactly. An app that tells
  whoever holds the phone where a child will be and when is the same
  disclosure as the calendar feed, and a commitment made for a nine-year-
  old is the guardian's commitment to make.

## Two things the app fixes that were previously recorded as gaps

**BR64 closes BR50's blast radius.** The withdrawal rule removes a lapsed
official from future assignments, but the copies lag: a subscribed
calendar clears only on the client's next refresh, which may be after the
match. A push notification is the only copy that reliably arrives before
Saturday. The same applies to a moved kick-off or a changed venue — and
the platform's record stays authoritative over every cached copy, exactly
as BR34 already required for calendars.

**BR65 turns the reconciliation backlog into self-service.** The 40 players
missing from Squadi were invisible to the only people motivated to fix
them: their own families. Showing a person *their own* eligibility status
and precisely what is outstanding puts the information where it can be
acted on. Scoped to *own* status, so P5 and the BR32 pattern hold.

## Go-to-market timing, recorded in the same change

The commercial moment to publish and promote is when clubs are visibly
struggling — registration season, a bad release, a backlog of unregistered
players. Arriving then answers a question clubs are already asking.

**One discipline makes that safe.** Marketing aimed at *Squadi being bad*
contradicts the same organisation the project needs for partner status
([#41](./open-questions.md)), an eventual API ([#42](./open-questions.md)),
and possibly as a customer ([#31](./open-questions.md)). A vendor cannot
publicly criticise a platform and privately ask its owner for privileged
access to it. The message therefore targets the **club's own pain** —
weeks to register, the same details typed three times, players who cannot
take the field — never the federation. That framing is also the honest
one: BR39 and BR60 say the federation owns eligibility, and the product is
built on agreeing with that.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | New **Capability C17**; new Course of action on go-to-market timing and its one discipline. No new Goal — this serves G1 (visibly), G4, and G5. No new Principle: C17 is P1 *realised*, not extended |
| 2_business    | New rules **BR61–BR65**; new objects **Participation Response** and **Active Role Context**; two glossary terms. No new actor — every role involved already exists, including the technical director alongside the coach |
| 3_information | No change — not started. Added to its queue: Active Role Context is session state rather than a permission, and Participation Response deliberately mirrors Appointment Response rather than duplicating it — worth resolving into one shape when the data model is drawn |
| 4_application | No change — not started. **This is the layer C17 most affects when it is assessed:** a mobile client is a new delivery channel with push notification infrastructure, device state, and an app-store release cycle none of the existing capabilities need |
| 5_technology  | No change — not started. C17 will drive the stack choice more than any other capability — see the `stack-selection` skill when that layer is assessed |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | No mobile surface. A person received their commitments through a calendar feed that refreshes on someone else's schedule, or through WhatsApp. Player availability was not modeled at all; only referees could respond to anything. One identity with many roles was true in the data and invisible to the human |
| **Target** (delivered) | One app per Person, showing the active role's context with an explicit switch; players and officials answer availability with a reason; coaches and coordinators see who is in, who is out, and why; guardians act for their children; changes reach people before the match rather than on the next refresh; and each person can see their own eligibility gap and act on it |

## Work packages and deliverables

### WP1 — Capability and timing

- **Deliverables:** `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (C17; the go-to-market Course of action)
- **Outcome:** the mobile surface is a named capability rather than an
  implied one, and the marketing stance is recorded with the constraint
  that keeps it from burning the federation relationship.

### WP2 — Participation and role context

- **Deliverables:**
  `docs/ea/2_business/5_domain-context-and-rules.md` (BR61–BR65, glossary),
  `docs/ea/2_business/4_business-objects.md` (Participation Response,
  Active Role Context)
- **Outcome:** availability is a first-class concept for players and not
  only referees, the reason reaches exactly the person who needs it, and
  role switching has a rule rather than a convention.

### WP3 — Governance scaffolding

- **Deliverables:** this scope document, `docs/scope/README.md` index row,
  `docs/scope/open-questions.md` (#47)
- **Outcome:** the offline question that a mobile app makes unavoidable is
  owned rather than deferred by omission.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| C17, BR61–BR65, two objects, the role switcher, availability responses | **Offline behaviour** ([#47](./open-questions.md)) — the question a mobile app forces and nobody has answered |
| Coach and coordinator visibility of who is in, out, and why | Team selection itself — knowing who is available is not choosing the team, and selection has its own rules that do not exist yet |
| Guardian acting for a minor (BR63) | Where a young person takes that over ([#37](./open-questions.md)) — unchanged and still open |
| Change notification reaching participants (BR64) | The notification *channel* — push, SMS, or email is an application/technology decision, not a business one |
| Own-eligibility visibility (BR65) | Payments and finance in the app; deliberately not included in this pass |
| — | Any code — no `src/`, no tests, no build |

## Gap notes

- **Offline is now unavoidable and still unanswered.** It has been recorded
  as a gap since the non-functional requirements were first written, on the
  grounds that match-day capture happens at grounds that may have no
  signal. A mobile app makes it a design decision rather than a note:
  whether a person can see their next fixture and respond to it without
  connectivity changes the client architecture fundamentally, and it cannot
  be retrofitted cheaply. See [#47](./open-questions.md).
- **Two response objects now exist for one idea.** Appointment Response
  (referees, BR42) and Participation Response (players, BR62) share a
  pattern deliberately, but they are two objects for what may be one
  concept. Resolving them into a single shape is an information-layer
  decision — worth doing there rather than letting the duplication harden.
- **"Who is available" is not "who is selected".** BR62 gives a coach the
  inputs to team selection and nothing more. Selection rules — squad
  limits, interchange, age dispensation — live in Competition Regulation
  and are not modeled. A coach reading an availability list as a team sheet
  would be reading it wrong, and the app should not encourage that.
- **A phone showing a child's schedule is the same disclosure as the
  calendar feed.** BR63 puts it with the guardian, but unlike the feed
  there is no revocable URL to rotate — a shared or lost device is a
  different failure. Worth explicit handling when the application layer
  designs session and device management.

## Open questions

- **#47 (new).** Must the mobile app work offline — at minimum showing the
  next fixture and queuing an availability response — and to what degree?
  Adopted interpretation: **unresolved, and blocking the client
  architecture.** It must be answered before C17 is designed, not during.
