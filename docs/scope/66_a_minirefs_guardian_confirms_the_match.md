# Project Scope — A MiniRef's Guardian Confirms the Match

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/minirefs-match-confirmation`.
**Status: built.**

## Why this exists

A registrar looking at the referee workspace reported a real gap: nothing
anywhere lets a match official under thirteen — a MiniRef, the youngest
half of the Football Queensland pathway — or the guardian who already
answers everything else on their behalf (BR113) say that a fixture they
were appointed to actually happened.

`/registrar/verification` (BR119) exists, but tracing it confirmed it does
not answer this question: it is deliberately the **club officer's** act,
kept apart from the appointed official for the same separation of duties
that stops a coordinator refereeing their own match from signing off their
own claim. That is a question about who may unlock a payment. Whether a
twelve-year-old's Saturday happened at all is a different question, asked
of a different person, and had no answer anywhere.

## Deliberately narrower than BR113

BR113 already routes a designation answer to a guardian for **any** match
official under eighteen. This confirmation exists only for an official
**under thirteen**, because — traced directly rather than assumed — no
self-report or guardian-confirmation capability exists yet for a referee of
*any* age, adult included. Building the adult self-report half is separate,
larger work this does not attempt; scoping this rule to what was actually
asked kept it to the one gap that was reported.

**Confirmed by conversation rather than guessed:** "the match happened and
my child was there," with an optional score. It never feeds BR119.

**Whether that score should reach `fixture.goals_for`/`goals_against`
changed the day after the first cut shipped.** Built first as purely
informational, kept apart so a guardian's recollection could never
overwrite the club's own record. Asked directly, immediately after: for a
MiniRef's non-competitive fixture, the guardian confirming is very often
the *only* person who will ever report it at all — a confirmation that
never reaches the fixture is not a smaller feature, it is a form that goes
nowhere. Migration 0056 (the same branch, before merge) makes it write
through, with the one safeguard that matters: **it only fills an empty
score, never overwrites one the club already entered.** The reasoning for
keeping the two questions apart — *may this confirmation exist* versus
*what does it do once it does* — held; only the second answer changed.

## The shape

`referee_match_confirmation`: one row per (fixture, official), guarded by a
trigger that checks the official's age **on the day of the fixture** (not
today — this is a fact about a Saturday that already happened, not a
decision whose authority could shift, the opposite of BR113's "measured
now" reasoning) and that the confirming Person holds authority (BR67's
`is_authority` flag) over that official. RLS admits the official's own
family to read and insert (never update — a wrong score is low-stakes
enough that a correction goes through the club) and admits
admin/registrar/coordinator/coach to read and fully manage, the same
latitude those roles hold over every table like it.

A second, separate trigger (0056) runs after the first and copies the
confirmation onto `fixture`: status moves `scheduled` → `played` (never
reopening a cancelled, abandoned or forfeited game), and `goals_for`/
`goals_against` are filled only where currently null. The two triggers stay
apart on purpose — one decides whether the row may exist, the other what an
existing row does to the fixture — the same separation 0025's three
refusals and 0045's "family only answers" guard already keep on other
tables.

**The columns were renamed** `home_score`/`away_score` → `goals_for`/
`goals_against` in the same migration, because the original names were
wrong rather than merely unclear: "home score" is a different number from
the club's own goals on an away fixture, and the sync trigger would have
copied the opponent's score into the club's own column on every away
MiniRef match. `fixture.home_away` was never asked of the guardian — only
"scored" and "conceded," the same language `FixtureForm.tsx` already uses.

**The gap this surfaced: there was no way to enter a fixture's result after
creation at all.** `createFixtureAction` takes a score only at the moment
of creation; `updateFixtureAction` (BR64) deliberately never touches one —
its own comment says a score changing is "a correction to the record of a
game that happened," and stops there, leaving nothing that makes that
correction. `recordFixtureResultAction` closes it: admin, registrar or
coordinator may enter or correct `goals_for`/`goals_against` on any
existing fixture, unconditionally — officers already hold full write on
`fixture` (`fixture_manage`, migration 0020), so this changes no RLS,
only the screen.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No new goal. Extends duty-of-care coverage (P1) to a gap BR113 and BR84 already established the reasoning for, at a narrower age than either. |
| 2_business    | **BR151 added.** New object, **Match Confirmation**, deliberately distinct from Submission Record and BR119's verification. |
| 3_information | **One new table, `referee_match_confirmation`** — no existing table's shape reused wholesale, since nothing in the schema answered this question before. |
| 4_application | New panel on the guardian workspace, for each under-13 official child, listing past accepted appointments awaiting confirmation. New "record the result" affordance on `/registrar/fixtures` for an officer to fill in a score after the fact. |
| 5_technology  | No change. |

## Deliverables

- **Migrations:**
  - `supabase/migrations/0055_a_minirefs_guardian_confirms_the_match.sql` — `referee_match_confirmation`, a trigger enforcing BR151 (under thirteen at the fixture's date, confirmed by an authority guardian), RLS (family read/insert, officer read/manage).
  - `supabase/migrations/0056_the_confirmed_match_marks_itself_played.sql` — renames the score columns to `goals_for`/`goals_against`, and a second trigger that copies a confirmation onto `fixture` (status `scheduled`→`played`, score filled only where empty).
- **Domain:** `src/web/match-confirmation-view.ts` — the pure "is this official under thirteen as of this fixture", "does this appointment still need a confirmation" and score-parsing decisions.
- **Data:** `src/data/match-confirmation.ts` — `loadConfirmableAppointments`, `recordMatchConfirmation`. `recordFixtureResultAction` in `src/app/registrar/fixtures/actions.ts` for the officer's own path.
- **Screens:** a panel in `GuardianWorkspace.tsx`, `confirmMatchAction`; a result form on `/registrar/fixtures`.
- **Tests:** `supabase/tests/56_a_minirefs_guardian_confirms_the_match.sql`.
- **Rule:** BR151.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| A guardian confirming a past, accepted appointment for their under-13 official, marking it played | A self-report for an official of any age — no such capability exists anywhere yet, for anyone |
| An optional score, filling `fixture.goals_for`/`goals_against` only where empty | Overwriting a score the club already entered — the guardian's recollection never wins that conflict |
| An officer entering or correcting a result on any fixture, after the fact | Bundling the result form into BR64's notified change screen — deliberately separate; a result is a correction to a game that happened, not a change somebody needs to act on before it does |

## Gap notes

- **No reminder chases an unconfirmed match.** The panel lists what is
  waiting; nothing nudges a guardian who has not looked.
- **The thirteen-to-seventeen gap is real and known, not silently
  dropped.** BR113 already gives that age band a guardian who answers
  their designation; nobody yet gets to say the match happened, adult
  officials included. The next candidate, not this rule's job.
- **A second official confirming the same fixture after the first already
  filled the score contributes nothing.** Coalesce-only means whichever
  confirmation lands first wins; a second guardian's different
  recollection is silently not written. Not signalled anywhere today.
