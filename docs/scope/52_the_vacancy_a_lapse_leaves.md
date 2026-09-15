# Project Scope — The Vacancy a Lapse Leaves

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

BR50's last clause, left open as WP6 of
[scope 50](./50_the_card_is_checked_where_it_matters.md):

> ...blocks new ones, and **notifies both the holder and the responsible
> coordinator** that the resulting vacancies need re-filling.

The withdrawal has worked since migration 0044. The notice has not, so a
coordinator found out that Saturday's referee had been removed by looking at
the match sheet — and the official found out by being turned away.

## A vacancy is a row, not a reason string

Nothing recorded that a withdrawal had happened *for this reason*. The
obvious shortcut is to select withdrawn assignments whose `reason` matches
the sentence the sweep writes. That makes an English sentence load-bearing:
the day somebody improves the wording, the notifications stop, silently, and
nothing fails. It also cannot tell a lapse from a coordinator who typed the
same words.

So `clearance_lapse_vacancy` records what each lapse emptied, in words
captured **at the time** — a vacancy read six weeks later must still say
*Assistant Referee — Rivals, 15 October* even if the fixture has since been
renamed, because that is what the notice it justifies said.

**Idempotence is in the schema, not in the caller.** `unique
(appointment_id)` and `unique (team_member_id)` mean the nightly sweep can
run while the revocation trigger fires, and nobody is told twice about one
vacancy. Scope 50's comment promised that a second pass must not re-notify;
this makes the promise structural rather than a property of whichever code
happens to call it.

**The holder and the coordinator are marked separately**, and each only when
its own send came back `sent`. They are two messages to two people: a holder
who has unsubscribed (BR129) must not silence the coordinator's notice, a
club with no coordinator recorded must still tell the official, and a send
that failed tonight is retried tomorrow rather than logged as delivered.

**Nothing in the database sends.** A trigger that sent email would be a
trigger that can fail a transaction because a provider is slow. The database
records that a notice is owed; the nightly route composes and sends it
through the same suppression-honouring path every other message takes
(BR127–BR129).

## Two messages, not one sent twice

The coordinator needs a list to act on. The holder needs to know they have
been removed, and why, before they turn up.

Neither says the card is invalid as a fact about the person. A clearance
lapses for ordinary reasons — a renewal in the post, a card recorded and not
yet re-verified — and a message that reads as an accusation is one the club
has to apologise for. What the platform knows is that the club's record does
not currently cover these dates, and that is what both say. The holder's
also asks them not to attend in the meantime, because the reassurance must
not read as *so carry on*; a test asserts both halves.

**One message per holder, not per vacancy.** Somebody withdrawn from four
commitments has lost one thing: their card is not currently on file. Four
emails would say that four times and be read as a system fault.

## Two things the suite found, both of them scope 50's

Worth recording plainly: neither was reasoned about in advance, and the
second means part of scope 50 never worked at all.

**A conflict that arose after the appointment blocked the withdrawal.**
0025's guard fires on update as well as insert — rightly, because promoting
a proposal to accepted is the obvious way round a check that only guards
insertion. But it fires on the update that *removes* an official too, and
then refuses it: an official who joined the fixture's team after being
appointed could not be withdrawn, because BR109 says they should not be
there. So BR50's sweep could not take an uncleared adult off a children's
match on the grounds that a second rule also disapproved of them.

**And the team half of the sweep had never worked.** `team_member` is
guarded by `assert_official_is_cleared`, which refuses a row whose holder
has no valid card — on update as well as insert. The sweep marks the row
withdrawn; the trigger sees a person with no card and refuses the withdrawal
*because* they have no card. Scope 50 shipped that half and never exercised
it: suite 45's lapse emptied appointments only. It is the case where BR50
matters most — somebody standing next to children every week, rather than
for ninety minutes on a Sunday.

Both are fixed the same way, and the way 0044 already chose for the card
check: **removing somebody is never the moment to refuse on the grounds that
they should not be there.** One early return each, bodies otherwise
untouched.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** This finishes a rule rather than adding one |
| **2_business** | **No new rules.** BR50's last clause gets code; BR129's suppression is honoured by construction, because these go through the same send path as everything else |
| **3_information** | **New object: Clearance Lapse Vacancy** — an assignment a lapse emptied, and whether the two people BR50 names have been told |
| **4_application** | `app_withdraw_lapsed_clearances` records what it empties; two templates; `notifyLapseVacancies`; the nightly route sends as well as sweeps. Two existing guards stop refusing a removal |
| **5_technology** | **No change.** The cron surface already exists |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A lapse withdraws silently. The coordinator finds out from the match sheet, the official by being turned away — and a lapsed coach could not be withdrawn at all |
| **Target** | Every emptied assignment is recorded as a vacancy, both people BR50 names are told once, a failed send is retried, and a team role is withdrawn as readily as an appointment |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | `clearance_lapse_vacancy`, unique per assignment | **Delivered** |
| **WP2** | The sweep records what it empties, in words captured at the time | **Delivered** |
| **WP3** | Two templates — the holder's and the coordinator's | **Delivered** |
| **WP4** | `notifyLapseVacancies`, marking each side only on a successful send | **Delivered** |
| **WP5** | The nightly route sends what is owed, including last night's failures | **Delivered** |
| **WP6** | The two guards stop refusing a removal | **Delivered** |
| **WP7** | Behavioural suite (11 scenarios) and template unit tests | **Delivered** |

## Verified to fail

| Mutation | Result |
| -------- | ------ |
| The unique constraint and its `on conflict` removed | Caught — the same assignment emptying twice produced a second vacancy |
| 0025's conflict guard refuses a removal again | Caught |
| 0010's team-member card guard refuses a removal again | Caught, with the exact error that made the team half dead |
| The sweep stops excluding past fixtures | Caught — by **suite 45**, before this one runs. Left that way rather than reordered: the guarantee belongs to scope 50, and moving the assertion here would take it away from the suite that owns it |

## What this initiative does not do

- **No vacancy screen.** A coordinator is emailed; there is no page listing
  what a lapse has emptied. The email carries the list, which is what BR50
  asks for, and a screen is a convenience the rule does not require.
- **Nothing is re-appointed automatically.** Filling a vacancy is a
  coordinator's decision about who is available, which is the whole of C4's
  designation screen. A platform that quietly re-appointed somebody would be
  making exactly the call [decision 1](../decisions/1_ai-assistant-autonomy-level.md)
  says it never makes.
- **No carnival sweep**, for the reason scope 50 gives: those tables carry
  no `person_id` column at all (BR139), so there is nobody assigned to
  withdraw.
- **The revocation path still waits for the nightly run to send.** The
  withdrawal is immediate, by trigger; the notice follows within the day.
  Nothing in the application revokes a clearance from a screen yet, so there
  is no server action to call the notifier from — the day there is, it calls
  the same function.
