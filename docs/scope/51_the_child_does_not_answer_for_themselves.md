# Project Scope — The Child Does Not Answer for Themselves

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

BR113 has been written since the business layer was drafted and has never
had code:

> A designation for a **match official under 18 is proposed to their
> Parent/Guardian**, who accepts or declines it.

Until this change a twelve-year-old's designation went straight to
`accepted` with no adult named and none asked, and nothing in the row
recorded whose answer it was. `supabase/tests/46` proved it before the
migration was written.

## It is the twin of the rule just built

[Scope 50](./50_the_card_is_checked_where_it_matters.md) put BR84 on the
appointment, and BR84's first clause is an **exemption**: a person under 18
needs no Working with Children Check, because Football Queensland's pathway
begins at MiniRefs and twelve-year-olds cannot hold a card. That exemption
is right, and it is the only thing the appointment asked about age.

So the product knew a child was a child, declined to ask them for a card for
exactly the right reason — and then took their word for a Sunday morning
without asking the adult responsible for them. The card rule and the consent
rule point in opposite directions for the same person, and only one of them
had been coded.

It is not an edge case. MiniRefs are the youngest half of the pathway, and a
designation flow that assumes the official answers for themselves assumes
that half away.

## Where the answer lives

**Whose answer it is, is a column** — `responded_by_person_id` — not a
screen that shows the question to the right person. Migration 0025 gives the
reason: there will be more than one way this row gets written. And a record
of a decision that does not say who made it is not a record of consent,
which is the whole of what BR113 asks for.

**One definition of who may answer.** `app_may_answer_designation(person,
club, as_of)` returns the official themselves once they are eighteen, and
until then every Parent/Guardian holding authority. The trigger refuses
anybody else through it; the coordinator's screen names the adult through
it. A second definition would drift, and it would drift over which adult may
commit a child to a fixture.

**`is_authority`, never `is_contact`.** BR67 keeps the two flags apart for
precisely this moment: the grandparent the club rings when nobody answers is
not the person who may say yes.

**A proposal nobody can answer is not a proposal.** An under-18 official with
no guardian holding authority is **not designated at all**, rather than
designated into a state that can never be left. The refusal names the thing
a coordinator can act on — the missing guardianship record.

**Measured at the moment the answer is given, not at the fixture.** This is
the opposite of BR111's line and of scope 50's, deliberately: a card is
valid on a day, so it is checked against that day, whereas authority is
about who may decide *now*. Somebody who is seventeen today cannot consent
today because they turn eighteen before the match — and once they have, they
answer for themselves with nobody rewriting the row.

**A withdrawal is not a response.** Nobody is being asked: the club is
removing an official, and BR50's nightly sweep writes exactly that row. It
must not be blocked by a guardianship since removed — the lesson 0044
learned one trigger along.

**Adults are untouched.** BR113 is a rule about children, and a rule about
children that quietly changed how adults are appointed would be a different
rule.

## The age arithmetic, once

`app_is_adult_on(person, as_of)` returns **null** for a person whose date of
birth is unknown, rather than guessing, because the two callers need
opposite safe defaults from the same fact: BR84 fails closed to *they need a
card*, BR113 fails closed to *ask an adult*. A shared helper that picked one
would be wrong for the other, and wrong on the safeguarding side. So the
arithmetic is shared and each caller states its own default in one visible
place. `app_needs_clearance` is restated in terms of it with **its behaviour
unchanged**.

## What suite 46 found: the guards depended on who was writing

Not reasoned about in advance — found by the suite, and the most important
thing in this change.

The moment a guardian could update `match_official_appointment`, rules that
had been enforced for six migrations stopped being enforced. Silently, and
in the direction that lets somebody onto a pitch.

Both existing triggers on that table read **other** tables with the writer's
visibility, and every one of those is club-officer information. Under a
guardian's session they return nothing at all:

| Rule | What it reads | Under a guardian's session |
| ---- | ------------- | -------------------------- |
| BR84 (0044) | `fixture`, for the date | Date comes back null, so the clearance comparison is null — it refused a child it should exempt, which is how this was found |
| BR6 | `appearance` | Empty, so "the referee played in this match" passes |
| BR109 | `team_member`, `guardianship` | Empty, so the conflicting role passes |
| BR9 | `referee_suspension` | 0025 narrows that table to admin and registrar *on purpose* — so a suspension passes for **every** caller who is not one |

A safeguarding rule whose answer depends on who is asking is not a rule.
Both functions are re-declared `security definer` with **the same bodies**:
this migration is not the place to change what BR6, BR9 and BR109 mean, only
to stop them being optional. Scenario 15 of suite 46 asserts it against BR9,
the sharpest of the four.

This is the same class of defect as scope 50's, one layer up. There, a rule
was enforced on the wrong table; here, on the right table, for the wrong
half of the callers.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** P1's single `Person` and the duty-of-care goals are unchanged; this makes one of them true |
| **2_business** | **No new rules.** BR113 gets code for the first time; BR67's `is_authority`/`is_contact` distinction gains a third enforcement point beside BR33's calendar feed and BR63's participation responses |
| **3_information** | `match_official_appointment` gains `responded_by_person_id`. No new object |
| **4_application** | `app_is_adult_on`, `app_may_answer_designation`, the answering trigger, the family's read and answer policies, and the two existing guards made independent of who is writing. The family workspaces gain a panel; the coordinator's screen names the adult |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A twelve-year-old accepts their own designation. Nothing records that anybody was asked |
| **Target** | A minor's designation is answered by a Parent/Guardian holding authority and by nobody else; the answer is recorded with whose it is; a minor with no such guardian is not designated at all; and every older refusal on the table refuses whoever is writing |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | `app_is_adult_on`, with `app_needs_clearance` restated in terms of it | **Delivered** |
| **WP2** | `app_may_answer_designation` — one definition, two callers | **Delivered** |
| **WP3** | `responded_by_person_id` and the trigger that requires it of a minor | **Delivered** |
| **WP4** | The family's read and answer policies, additive in 0028's shape | **Delivered** |
| **WP5** | The two existing guards made independent of who is writing | **Delivered** |
| **WP6** | The family panel (`/me`), for a guardian and for an adult official | **Delivered** |
| **WP7** | The coordinator's screen names whose answer is awaited | **Delivered** |
| **WP8** | Behavioural suite (16 scenarios), **verified to fail** on each guarantee | **Delivered** |

## Verified to fail

Every guarantee was broken deliberately to confirm the suite catches it:

| Mutation | Result |
| -------- | ------ |
| Any guardian may answer, authority or not | Caught |
| The appointment guard reads with the writer's eyes again | Caught |
| The family may change any column while answering | Caught |
| The "name who answered" check deleted | **Not caught at first** — see below |

The last one is the useful failure. Naming nobody and naming the wrong
person are refused by two different checks, and with the first deleted the
second still refused — so a test that only asked *was it refused* went green
while a coordinator who named no guardian at all would have been told their
guardian lacks authority. The scenario now asserts on the **message**, and
catches the mutation.

## A suite of scope 50's had an incomplete fixture

Suite 45's fifteen-year-old MiniRef had no guardian recorded, so BR113 now
refuses the designation and the suite's BR84 exemption could not be reached
at all. Fixed by **giving her a mother**, which is what the rule requires of
the real club — not by exempting the suite.

## What this initiative does not do

- **Nobody is emailed.** A guardian sees the designation when they open
  `/me`; the club does not tell them it is there. That is the same gap
  [scope 50](./50_the_card_is_checked_where_it_matters.md) left open as WP6
  for BR50, it is the next piece of work in the queue, and the two should be
  built together since both want a notification to somebody who is not a
  club officer.
- **The referee record stays the coordinator's.** 0045 opens appointments to
  the person they concern and nothing else. Classification, accreditation
  and what is owed are still officer-only, and the workspace still says so —
  the rest of BR65 is not claimed.
- **BR109's cross-club half is still unenforceable** while `person` is
  tenant-scoped. Scope 33's open question #69 still records it; re-declaring
  the trigger `security definer` does not change what it can know.
- **No handover ceremony at eighteen.** BR67's transition is BR67's work.
  Here, an official who has turned eighteen simply answers for themselves
  the next time they are asked, because the rule is evaluated at the moment
  of the answer rather than stored on the row.
