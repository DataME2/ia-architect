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

**Confirmed by conversation rather than guessed:** the confirmation is
purely informational — "the match happened and my child was there" — with
an optional score for statistics only. It does not feed BR119, and it does
not write `fixture.goals_for`/`goals_against` (the club's own score of
record, entered by a coordinator elsewhere) — a guardian's recollection of
a scoreline is kept apart so it can never silently overwrite what the club
recorded.

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

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No new goal. Extends duty-of-care coverage (P1) to a gap BR113 and BR84 already established the reasoning for, at a narrower age than either. |
| 2_business    | **BR151 added.** New object, **Match Confirmation**, deliberately distinct from Submission Record and BR119's verification. |
| 3_information | **One new table, `referee_match_confirmation`** — no existing table's shape reused wholesale, since nothing in the schema answered this question before. |
| 4_application | New panel on the guardian workspace, for each under-13 official child, listing past accepted appointments awaiting confirmation. |
| 5_technology  | No change. |

## Deliverables

- **Migration:** `supabase/migrations/0055_a_minirefs_guardian_confirms_the_match.sql` — `referee_match_confirmation`, a trigger enforcing BR151 (under thirteen at the fixture's date, confirmed by an authority guardian), RLS (family read/insert, officer read/manage).
- **Domain:** `src/web/match-confirmation-view.ts` — the pure "is this official under thirteen as of this fixture" and "does this appointment still need a confirmation" decisions.
- **Data:** `src/data/match-confirmation.ts` — `loadConfirmableAppointments`, `recordMatchConfirmation`.
- **Screens:** a panel in `GuardianWorkspace.tsx`, `confirmMatchAction`.
- **Tests:** `supabase/tests/56_a_minirefs_guardian_confirms_the_match.sql`.
- **Rule:** BR151.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| A guardian confirming a past, accepted appointment for their under-13 official | A self-report for an official of any age — no such capability exists anywhere yet, for anyone |
| An optional score, for statistics only | Feeding that score into any reporting or aggregate — recorded and nowhere read back, the same honesty scope 65's gap notes already use for a first cut |
| Officers correcting a wrong confirmation | A guardian correcting their own — low-stakes enough to route through the club rather than build a second edit path in the same change |

## Gap notes

- **No reminder chases an unconfirmed match.** The panel lists what is
  waiting; nothing nudges a guardian who has not looked.
- **The thirteen-to-seventeen gap is real and known, not silently
  dropped.** BR113 already gives that age band a guardian who answers
  their designation; nobody yet gets to say the match happened, adult
  officials included. The next candidate, not this rule's job.
