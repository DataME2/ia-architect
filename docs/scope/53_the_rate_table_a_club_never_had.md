# Project Scope — The Rate Table a Club Never Had

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

[Scope 34](./34_paying_the_officials.md) built referee finance and left WP2
open: a club cannot author a fee schedule through a screen. The consequence
is larger than the wording suggests.

**No official could be paid at all.** `referee_fee_schedule` and
`referee_fee_rate` have existed since migration 0026, and
`src/domain/officiating/fees.ts` resolves a rate correctly and is well
tested. But the platform deliberately seeds no rates — scope 34's open
question #1 was resolved by *dissolving* it: there is no single rate table,
each club's Committee sets its own — and there was no way for a club to
write one. So every club had zero rates, every `rateFor` returned `none`,
and every claim found no rate. The machinery was complete and unreachable.

## The editor

**A schedule is published, not edited.** BR115 makes it a dated version: a
club that raises the assistant referee rate in July has not changed what it
owed in May. The screen offers *publish a new schedule* and, prominently,
**copy the rates from** an existing one — because the ordinary act is a few
dollars moving at the AGM, and retyping twelve cells to change two is how a
club ends up editing last season's schedule instead. The compliant path is
made the easy one.

**Every dimension but the role defaults to *any*.** Most clubs mean one rate
per role for everything, and 0026's nullable columns say so. A club that
needs more narrows a row; a club that does not never sees the question.

**The club is told what an incomplete table costs, on the page.** A schedule
with no rates, or a role with no rate, looks finished on screen and produces
`none` at the moment a treasurer raises a claim months later. `gaps()` says
it now, and says the distinction that matters: **no rate is not a rate of
zero.**

**A clash is named before the constraint has to say it.** 0026's `unique
nulls not distinct` refuses a cell defined twice, and it would refuse it
with a constraint name. The editor says which row already answers that cell
and what it pays — comparing the way `rateFor` compares, trimmed and
case-insensitively, because "Div 3" and "div 3 " are one competition typed
twice.

## A superseded schedule is history, and that is enforced

The editor does not offer to change a schedule some later one has taken over
from. **That offer being absent is not a control** — this repository keeps a
list of rules displayed and unenforced, in `docs/spec/tasks.md`'s T2 section,
precisely because they read as guarantees and are not.

So migration 0047 refuses it: a superseded schedule's rates cannot be added
to, changed, or removed.

**Superseded, not merely past.** The schedule in force stays editable,
because a rate mistyped this morning must be correctable — and a rule that
refused would send the club to publish a second schedule starting today,
which is worse history than the typo. What is closed is a schedule something
later has already taken over from, and `app_fee_schedule_on` decides which
that is. The trigger asks **it** rather than re-deriving the comparison; a
second definition would drift, and it would drift over which version of the
table a claim was priced by.

**Publishing closes the earlier one at that moment**, with nothing editing
the earlier one. This is the part a `closed` flag would get wrong: somebody
would have to remember to set it, and the somebody would be a screen.

**Existing claims were never at risk**, which is worth saying so this is not
read as protecting them. BR116 stores the amount on the claim at the moment
it was computed and never recomputes it. What a rewritten schedule would
move is the price of a claim raised *later* for a match already played —
same club, same match, different answer.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change** |
| **2_business** | **No new rules.** BR115 gains an enforcement point and, more to the point, a way for a club to comply with it at all. BR116 is untouched |
| **3_information** | **No change.** 0026's two tables were already right |
| **4_application** | `src/web/fee-schedule-form.ts`, `src/data/fees.ts`, `/registrar/fees`, and 0047's trigger. The **Referee finance management** service stops being blocked at its first step |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | Rate resolution is complete, tested, and unreachable: no club can author a schedule, so every lookup returns "no rate" and no official can be paid |
| **Target** | A club publishes dated schedules, copies rates forward, is told what an incomplete table will cost, and cannot rewrite what it has already paid |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | The pure decisions — parsing a schedule and a cell, naming a clash, standings, gaps | **Delivered** |
| **WP2** | `src/data/fees.ts`, including copying rates into a new dated version | **Delivered** |
| **WP3** | `/registrar/fees`, with reads wider than writes as 0026's policies have it | **Delivered** |
| **WP4** | Migration 0047 — a superseded schedule is history | **Delivered** |
| **WP5** | 25 unit tests and a behavioural suite (9 scenarios), **verified to fail** | **Delivered** |

## Verified to fail

| Mutation | Result |
| -------- | ------ |
| The trigger never refuses | Caught — three ways, including last season's rate reading 9900 |
| It closes the schedule in force as well | Caught by **suite 29**, which seeds a May rate and could no longer write one |

## What this initiative does not do

- **No claim screen.** A treasurer still cannot raise or approve a claim
  through the application; scope 34 delivered that in the database only, and
  `notifyClaimApproved` is still built and unwired. Authoring the rates was
  the first blocker, not the last one.
- **Competition is still free text**, matched by string against
  `fixture.competition`. C11's catalogue is the answer and the editor says
  so on the field rather than pretending otherwise.
- **No import.** A club with a rate table in a spreadsheet types it in
  once — and then copies it forward every season, which is the case that
  actually repeats.
- **No banking details**, deliberately, as scope 34 records.
