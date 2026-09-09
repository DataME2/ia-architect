# Project Scope — The Referee Record, and What an Appointment Rests On

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/referee-lifecycle`.
**Status: WP1's database half delivered and proved (migration 0023,
13 scenarios); its screens are not built. WP2–WP4 specified. C5 (referee
finance) is explicitly not in this initiative.**

C4 has been in the capability model since the first bootstrap and has never
had a line of code. Its **business rules, unusually, are already written** —
BR6 to BR14, BR16 to BR18, BR20, BR41, BR42 and BR84 were all recorded by
earlier initiatives, before anything existed to enforce them. That is the
EA-first process paying out: this initiative implements rules rather than
inventing them, and the one rule it changes, it changes on the record.

It is also the capability with the largest gap between what the documents
assume and what the schema can support, and that gap is the substance of
this document.

## What is already true, and what it costs

**The compliance half is partly built.** BR84 — a match official needs the
same verified Working with Children Check a team official does, and a person
under 18 is exempt — is enforced by a database trigger from
[migration 0011](../../supabase/migrations/0011_match_officials_and_governance.sql).
So the platform already refuses to hand an uncleared adult a whistle. It
knows nothing else about them.

**A referee is a role, and nothing more.** `person_role` carries `referee`
as one of five values. There is no classification, no accreditation, no
availability, no appointment, and no record that a match was officiated at
all. Every rule from BR6 to BR12 is a check against data the schema cannot
hold.

**Three of those rules cannot be evaluated even in principle today.**

| Rule | Needs | Exists? |
| ---- | ----- | ------- |
| BR8 — classification meets the competition's minimum | A classification on the referee, and a minimum on the competition | Neither |
| BR10 — no expired mandatory accreditation | Accreditations with expiry dates | No |
| BR12 — decline rate within the configured maximum | A history of proposals and responses | No |
| BR109 — no other role in the same fixture, **across every club** | One `Person` known to span tenants | **Not possible** — see below |

That ordering is why WP1 is the referee's own record and not the
appointment: **an appointment screen built first would have nothing to
check**, and a conflict engine whose checks all pass vacuously is the BR2
failure again — a check that cannot fail, displayed as a check that passed.

## The rule this initiative changes, and why

**BR20 says a Match Official Appointment must reference a Match in the
club's Competition Calendar for the current season.** The Competition
Calendar is C11, which has no design and no code, and which depends on
open question [#19](./open-questions.md) — Football Queensland publishes
fixtures, but in a form nobody has yet seen.

So BR20 as written makes C4 unbuildable until C11 exists, and C11 waits on
an external party. That is a real dependency and not a convenient one.

**What has changed since BR20 was written** is that
[scope 30](./30_the-player-record-and-what-a-statistic-costs.md) added
`fixture`: the club's own record of a game it played, carrying the date,
kick-off, venue, opponent, competition as free text, and a status that
already includes `cancelled` and `abandoned` — the two values BR17 and BR18
turn on. It was built for the player record and it is, structurally, a
match.

**Proposed restatement (BR20a):** an appointment references a **fixture the
club records**, and when C11 exists, an association's competition match
becomes a second kind of fixture rather than a second kind of appointment.

Two things about this are deliberate rather than convenient:

- **It narrows what the platform claims.** A club appointing officials to
  its own fixtures is exactly what the pilot club does today with a
  WhatsApp group. Modelling an association's appointments would be
  modelling somebody else's process from the outside.
- **It does not pretend the gap is closed.** An appointment made here is
  the *club's* appointment. When Football Queensland appoints an official
  to the same match, the platform does not know, and BR16's "the appointing
  party pays" therefore has an answer for one party and a silence for the
  other. That silence is [#68](./open-questions.md) below, not an
  assumption.

## The collision this initiative does not resolve

**A referee is tenant-scoped, and refereeing is not.**

`person` carries `club_id`. A referee who officiates for four clubs in a
season is four `person` rows, and their classification — issued by Football
Queensland, not by any club — is recorded four times, verified four times,
and can disagree with itself four ways.

**And a rule already written depends on solving it.** BR109 — added days
before this initiative began — refuses a designation where the same Person
holds *any* other role in that fixture, and says the check is evaluated
"against the one `Person` record, **across every club**", because the
conflict it exists to catch is the parent who referees the junior grades at
one club and coaches at another. That is a cross-tenant read. `person` is
tenant-scoped, so **the schema cannot evaluate BR109 as written** — the two
records are not known to be the same human.

WP3 therefore implements BR109 *within a club*, which catches the common
case, and records the cross-club half as unenforced rather than claiming it.
Pretending otherwise would be the BR56 failure again: a safeguarding-shaped
rule, documented, unchecked, and believed.

This is not a new problem: it is Principle **P5** doing exactly what it was
written to do, and the same shape as
[#31](./open-questions.md)'s association tier. The registration slice
accepted it because a *player* belongs to a club. A referee does not, which
makes C4 the first capability where the cost is structural rather than
theoretical.

**Adopted for this initiative: the club's own record of its own officials.**
A club records the classification it has sighted, the way it records a
Working with Children Check number it has sighted (`clearance` already works
this way — `verified_at` is separate from the number precisely because
holding a number is not the same as having checked it). Duplication across
clubs is real, is recorded as [#69](./open-questions.md), and is the
argument for the association tier rather than a defect to patch around.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | **No new capability and no new principle.** C4 has existed since the bootstrap; this starts building it. The P5 collision above is P5 working as intended and is recorded, not amended — amending a principle to fit one capability is how principles stop meaning anything |
| 2_business | **BR20 restated** (see above) and **BR110–BR113 added**: what a classification record is, that an accreditation's expiry is checked against the fixture rather than today, that a decline needs a reason before it counts, and that an appointment to a minor official is proposed to their guardian. Glossary gains *Classification*, *Accreditation*, *Availability Window*, *Designation*. The **Referee management** business service moves from Pending to Partial |
| 3_information | New: `referee_profile`, `referee_classification`, `referee_accreditation`, `referee_availability`, `match_official_appointment`. All tenant-scoped like everything else. Classification and accreditation are **narrowed on read** in the pattern `clearance` and `player_profile` established — a referee's suspension history is not ordinary club information |
| 4_application | New service **Referee lifecycle management**; new routes under `/registrar/referees`; new pure module `src/domain/officiating/` for the conflict engine, which is where BR6–BR11 belong because they are rules and not screens |
| 5_technology | **No change.** Migrations and pure modules on the stack that exists. The conflict engine is deliberately pure so it is unit-testable without a database, like the registration rules engine |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (today) | A referee is a role on a `person` row and a Working with Children Check the database insists on. No classification, no accreditation, no availability, no appointment, no record that anybody officiated anything. BR6–BR12 are documented and unevaluable |
| **Target** (this initiative) | A club holds a referee's record — classification with its history, accreditations with expiries, and declared availability — proposes designations against its own fixtures, and has every blocking conflict refused by a rules engine rather than by a coordinator's memory. Post-match verification exists and gates nothing yet, because C5 is not built |

## Work packages and deliverables

### WP1 — The referee's own record *(database delivered; screens not built)*

Nothing else can be checked until this exists.

- **Deliverables:** migration adding `referee_profile` (one per person per
  club, carrying the FQ official number where the club has sighted one),
  `referee_classification` (**history, not a column** — the pathway is a
  progression and "what were they in March" has to be answerable) and
  `referee_accreditation` (kind, issued, expires, `verified_at` separate
  from the identifier, as `clearance` does). `src/web/referee-view.ts` for
  the screen's decisions; `/registrar/referees` and a per-referee page. A
  behavioural suite proving the read-narrowing and tenant isolation.
- **Outcome:** the club can answer what an official is qualified to do, and
  BR8 and BR10 have something to read.

### WP2 — Availability

- **Deliverables:** `referee_availability` (windows, not per-fixture
  answers — a referee says "Saturday mornings", not "yes" to forty
  fixtures), the declaring screen, and the coordinator's view of who is
  available for a given fixture.
- **Outcome:** a coordinator proposes from a list of people who said they
  could, rather than from memory.

### WP3 — Designation and the conflict engine

- **Deliverables:** `match_official_appointment` against `fixture`
  (BR20a), with `state` ∈ {proposed, accepted, declined, withdrawn}, the
  reason BR42 requires, and **`appointed_by` ∈ {club, association}**
  (BR114) — set when the designation is made and never inferred, so the
  club-backup case is legible afterwards rather than reconstructed. `src/domain/officiating/conflicts.ts` — BR6, BR7,
  BR8, BR9, BR10 as **blocking**, BR11's four as **warnings with an audited
  override**, each a pure function returning the rule's own identifier the
  way the registration rules engine does.
- **Outcome:** the checks a coordinator currently performs from memory are
  performed by the platform, and every override is on the audit log.

### WP4 — Post-match verification

- **Deliverables:** verification recorded against an appointment, which is
  the precondition BR13 names for a payment claim that does not yet exist.
- **Outcome:** C5 has something to build on. **Nothing here moves money.**

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| The referee's record: classification history, accreditations, availability | **C5 entirely** — fee schedules, claims, approval, batches, remittances |
| Designation against a club fixture, with BR6–BR11 enforced | Association-made appointments, and any competition the club does not record |
| Post-match verification as a recorded fact | Anything that pays for it |
| Read-narrowing on classification and accreditation | Narrowing the rest of the schema — still [#58](./open-questions.md) |
| BR42's reason on decline and withdrawal | **Notifying** the coordinator of a withdrawal — nothing in this platform sends a message |
| The conflict engine as pure, testable rules | BR12's decline rate, which needs a season of history before it can mean anything |

## Gap notes

- **C5 is not deferred out of laziness.** It is blocked on
  [#1](./open-questions.md): the fee schedule's determinants are confirmed
  (BR41) and the actual rate table is unknown, so every number a claim
  screen displayed would be invented. [#4](./open-questions.md) — what
  banking details may be held for a minor referee — is a second blocker
  with a legal answer nobody has given, and MiniRefs are twelve.
- **BR42's notification half is unbuildable here.** The rule says a
  withdrawal notifies the Referee Coordinator. The platform sends no email,
  no SMS and no reminder, so the withdrawal is recorded and the coordinator
  finds out by looking. Recorded rather than quietly dropped, because a
  rule half-implemented reads as a rule implemented.
- **BR12 ships as a stored count and an unenforced threshold.** A decline
  rate over a configured window needs a window of history. The proposals and
  responses are recorded from WP3 so the data accrues; the threshold is not
  enforced until somebody can say what it should be for each classification,
  which is part of [#1](./open-questions.md).
- **A referee cannot see their own appointments.** Every screen here is the
  coordinator's. The referee's own view is C17 (mobile) and the calendar
  feed is C13, both unbuilt — so a designation reaches the referee exactly
  as it does today, by somebody telling them.

## Open questions

- **[#68] Who appoints the officials?** **Answered, September 2026.** The
  club appoints; Football Queensland appoints for **senior grades only**;
  and where FQ cannot find an official for a senior fixture, **the club
  appoints a backup**. So the club's own appointments are the majority of
  reality rather than the minority this document feared, and the restated
  BR20 was the right shape.

  The answer carries a design consequence WP3 must honour, recorded as
  **BR114**: the designation stores **which party appointed**, and BR16 pays
  on that stored fact rather than on the grade. Deriving the payer from the
  grade would be right most weekends and wrong precisely when somebody
  stepped in at short notice — which is the weekend a volunteer remembers.
  A fixture in a senior grade is therefore not evidence of who is paying.
- **[#69] Is a referee's record the club's or the association's?** Adopted
  for now: **the club's own sighting**, duplicated per club, in the pattern
  `clearance` already uses. The alternative — a referee identity that spans
  tenants — is [#31](./open-questions.md)'s association tier and a P5
  exception, which should be designed once for both rather than twice badly.
- **[#70] Does a minor referee accept their own designations?**
  Adopted for now: **no** — the proposal goes to the guardian, in the shape
  BR33 already uses for the calendar feed. This is
  [#37](./open-questions.md) (at what age a young person takes control)
  arriving in a second place, and it should get one answer, not two.
