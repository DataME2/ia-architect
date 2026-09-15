# Project Scope — The Card Is Checked Where It Matters

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

Asked to build R20.7 — *expiry withdraws the holder from every future
assignment, not merely blocks new ones*. Reading the schema to find where
the withdrawal should go turned up something worse in the same rule family,
and both are in scope here because they are one question asked at two
moments: **is the card checked when it matters, and does it stop mattering
when it lapses?**

## The hole, found while looking for something else

**An adult with no Working with Children Check can be appointed to officiate
a children's fixture.** Proved against the real schema rather than argued: a
person with no `clearance` row and no `referee` season role was accepted
into `match_official_appointment` for a fixture thirty days out.

BR84 is enforced — on `person_role`. `assert_season_role_is_cleared` refuses
the `referee` and `coach` season roles without a verified clearance covering
the season's end, and the same probe confirms it still does. What has no
clearance check at all is the **appointment**: 0025's guard is called *the
three refusals* in its own comment and enforces BR6, BR9, BR109 and BR11 —
conflicts and double-booking — and never asks about a card.

**R20.4 claims this is implemented.** *"WHEN a match official is appointed,
THEN the system SHALL require the same verified clearance a team official
requires. ✅"* It is not, and the tick has been there since the requirement
was written.

### Why it is reachable rather than theoretical

The screens list officials from `referee_profile`, and
[scope 39](./39_asking_at_the_door_whether_they_also_officiate.md) creates
that profile **even when BR84 refuses the season role** — its
`accepted_without_role` outcome, added deliberately so a coordinator's
decision is not lost when a trigger they cannot argue with fires.

That was the right call locally. Losing the decision would be worse, and the
screen says a card is what is missing. But the consequence was not followed
through to the appointment path, so the product's own flow produces exactly
the person this hole admits: someone with a referee profile, no role, no
card, and nothing between them and a fixture.

**It is the BR56 failure the 0025 comment warns about, one table along** — a
safeguarding-shaped rule documented and unchecked.

## Why the check belongs on the appointment and not only the role

The obvious alternative is to require the `referee` season role before an
appointment, letting BR84's existing trigger do the work. It is rejected for
the reason 0010 gives for putting BR83 in the database rather than the
screen: *there will be more than one way this row gets written.* A rule
enforced by a second rule enforced somewhere else is two hops a future
migration can break without touching either.

So the appointment asks the same question directly, through the **same two
functions** `assert_season_role_is_cleared` uses — `app_needs_clearance` for
BR84's under-18 exemption and `app_clearance_covers` for the card. One
definition, two callers; a second definition would drift, and it would drift
on the safeguarding side.

**Measured against the fixture's date**, not the season's end. BR54 draws
that line for a season role because a season role lasts the season; an
appointment is one afternoon, and BR111 already measures accreditation
against the date of the fixture for exactly this reason. A card expiring in
July does not disqualify somebody from a match in June.

## The second half: R20.7, which is BR50

BR50 has been written since the business layer was drafted and has never had
code:

> Expiry or revocation of a Working with Children Check automatically
> withdraws the holder from every *future* assignment — match official
> appointments, carnival fixtures, and any child-related role — blocks new
> ones, and notifies both the holder and the responsible coordinator that
> the resulting vacancies need re-filling. Past assignments are left
> untouched as historical record.

Three things fall out of the wording.

**Two triggers, one function.** Revocation is a write and fires immediately;
expiry is the passage of time and fires nightly. Both call the same
function, so the paths cannot disagree about what a lapse means. The nightly
half reuses [scope 48](./48_arrears_visibility_wwcc_reminders_and_the_administrator_constraint.md)'s
cron surface rather than adding a second one.

**Withdrawal is recorded, not deleted.** An appointment already has a
`withdrawn` state and a check constraint that refuses one without a reason —
so the withdrawal writes *why*, and "their Working with Children Check
expired on 12 June" is a better audit trail than a missing row. A team role
has no such state and gains one, because BR50 says past assignments stay as
historical record and a `delete` is the opposite of that.

**Carnival fixtures are named in the rule and have nobody to withdraw.**
[Scope 40](./40_carnivals_and_the_one_thing_the_public_may_see.md) built
those tables with **no `person_id` column at all** (BR139) and BR28's
official-conflict path is not wired. There is nothing to sweep, and saying
so is better than a reader assuming it was missed.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** P7 and the safeguarding goals are unchanged; this makes two of them true |
| **2_business** | **No new rules.** BR84 gains the enforcement point its own requirement already claimed, and BR50 gets code for the first time. A rule written and unenforced is the thing being fixed, not a thing being added |
| **3_information** | `team_member` gains `withdrawn_at` and `withdrawn_reason`. No new object |
| **4_application** | The appointment guard asks about the card; `app_withdraw_lapsed_clearances()`; a trigger on `clearance` for revocation; a nightly route beside scope 48's |
| **5_technology** | **No change.** The cron surface already exists |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | An uncleared adult can be appointed to officiate. A card that lapses mid-season leaves every existing assignment standing |
| **Target** | The card is checked at the appointment, against the fixture's date; and a lapse withdraws every future assignment, records why, and tells the coordinator there is a vacancy |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | BR84 enforced on `match_official_appointment`, against the fixture date | **Delivered** |
| **WP2** | `team_member.withdrawn_at` / `withdrawn_reason` | **Delivered** |
| **WP3** | `app_withdraw_lapsed_clearances(club)` — idempotent, callable by hand and by cron | **Delivered** |
| **WP4** | Revocation trigger on `clearance`, calling the same function | **Delivered** |
| **WP5** | The nightly route, beside scope 48's | **Delivered** |
| **WP6** | BR50's notifications, reusing BR42's coordinator template | **Delivered in [scope 52](./52_the_vacancy_a_lapse_leaves.md)** — and not by reusing BR42's template, which says the official withdrew themselves |
| **WP7** | Behavioural suite (9 scenarios), **verified to fail** on all three guarantees | **Delivered** |

## Four suites were appointing uncleared adults

Worth recording, because it is the strongest evidence the hole was real
rather than theoretical. Adding the trigger turned suites 28, 29, 30 and 38
red at once: every one appointed an adult with no clearance, and every one
had been passing.

They were fixed by **giving those officials real cards**, not by relaxing
the rule — and the fourteen-year-old in suite 38 was deliberately left
without one, because BR84 exempts them and a fixture that quietly gave a
child a Working with Children Check would have hidden the exemption the
suite exists to prove.

## What this initiative does not do

- **BR50's notifications were not built here** (WP6), and are now:
  [scope 52](./52_the_vacancy_a_lapse_leaves.md). The guess recorded here —
  that BR42's coordinator template could be reused — was wrong: that one
  says the official *withdrew from it after accepting*, which is not what a
  lapse does, and reusing it would have told a coordinator something untrue
  about who did what. Two new templates instead. Building it also found that
  **the team-role half of this scope's sweep had never worked**: the
  `team_member` guard refused the withdrawal because the holder had no card,
  which is the very fact the withdrawal was recording.

- **No retrospective sweep of past assignments.** BR50 says past
  assignments are historical record; a card that lapsed in August does not
  rewrite who refereed in June.
- **No carnival sweep**, because there is nobody assigned to sweep — see
  above.
- **BR51's register linkage** (R20.8) is still not built. The six-monthly
  reminder from scope 48 is the secondary mechanism; the primary one, being
  notified by the state register, needs a relationship with the register
  that does not exist.
