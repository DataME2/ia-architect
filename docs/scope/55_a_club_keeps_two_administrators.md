# Project Scope — A Club Keeps Two Administrators

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

BR124, in the club's own answer:

> A club holds **at least two administrators**. The second is not a
> courtesy: a club with one cannot remove that one, and cannot get back in
> at all if they leave.

What migration 0015 enforces is the **last** administrator: `revoke_club_role`
refuses to leave a club with none. That was the irreversible half, and
deliberately the only half — open question #60 was still open when it was
written. #60 has since been answered, and BR124 is the answer.

A club reduced to one administrator is not locked out today. It is one
resignation, one lost password, or one holiday away from it, and the moment
it happens nobody inside the club can fix it.

## The bypass, found while moving the check

Worth stating plainly, because it is the larger half of this change.

**0002's `club_membership_manage` policy is `for all` to an administrator.**
So an admin can delete a membership row straight through the API without
going near `revoke_club_role` — which means the last-administrator guard has
been bypassable since it was written. The Access screen calls the function,
so the product's own flow was safe; nothing else was.

It is the lesson migration 0010 states and 0044, 0045 and 0046 have each
re-learned on a different table: **there will be more than one way this row
gets written, and a rule that lives in one of the ways is not a rule.**

So the floor moves onto the table, as a trigger, and `revoke_club_role`
**stops counting** — two counts would be two definitions of the floor, and
the one inside the function is the one a future migration can change without
touching the other.

## Three details

**Both directions.** Deleting the row removes the role; so does updating it
to a lesser one, which is the obvious way round a check that only guards
deletion. 0025's trigger records the same lesson about a proposal promoted
to accepted.

**Distinct accounts, not rows.** BR106 makes an account one identified
human, so counting accounts counts people — and an account holding both
`admin` and `registrar` is one administrator, not two.

**Except when the club or the account is going away.** `delete from club`
cascades into these rows, and a floor that refused its own cascade would
make a club undeletable. The rule is about a club that still exists keeping
its administrators, not about the order Postgres unwinds a cascade in.
Suite 49's last scenario deletes a club whose only administrator is the one
that would otherwise be refused.

**Two refusals, not one message.** *You are the only one* and *removing you
would leave one* are different situations with different next steps, and a
single message for both would tell half the clubs to do something they have
already done.

## A test was asserting the old floor

Suite 22, scenario 9: *"with a second admin, the first becomes removable"*.
It was right when it was written and is the opposite of BR124. Rewritten to
assert the rule as it now stands — the second is not enough, a third is —
rather than relaxed, which is how scope 50 handled the four suites that were
appointing uncleared adults.

The unit test on `revocation` said the same thing and got the same treatment.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change** |
| **2_business** | **No new rules.** BR124 gets code; open question #60's answer, already recorded, becomes enforceable |
| **3_information** | **No change** |
| **4_application** | A trigger on `club_membership`; `revoke_club_role` stops counting; `revocation()` raises the floor so the button explains itself rather than failing when pressed |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | The last administrator is protected, in one of the several ways the row can be written. A club can be reduced to one, and from there to none by deleting the row directly |
| **Target** | A club that still exists keeps two administrators, whichever way the row is written, and is told which of the two refusals it has hit |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | The trigger, covering delete and demotion, and standing aside for a cascade | **Delivered** |
| **WP2** | `revoke_club_role` without its own count | **Delivered** |
| **WP3** | `revocation()` raised to the floor of two, with the two refusals kept apart | **Delivered** |
| **WP4** | Behavioural suite (7 scenarios), **verified to fail**, and suites 22 and `access-view` corrected | **Delivered** |

## Verified to fail

| Mutation | Result |
| -------- | ------ |
| The floor back to one | Caught — by suite 22, whose revoked admin could no longer grant |
| The trigger on delete only, so demotion slips through | Caught |
| The cascade no longer stands aside | Caught — a club with one administrator became undeletable |

## What this initiative does not do

- **Nothing is granted automatically.** A club with one administrator today
  stays with one until somebody grants a second; the floor refuses a
  *removal*, it does not appoint anybody. Appointing an administrator on a
  club's behalf is exactly the act [decision 1](../decisions/1_ai-assistant-autonomy-level.md)
  says the platform never takes.
- **No prompt on the Access screen** telling a one-administrator club to
  find a second. The refusal only appears when somebody tries to remove
  somebody, which is late. A standing warning is worth having and is a
  separate, smaller piece of work.
- **The platform console does not override it.** A locked-out club is the
  platform owner's problem to solve by granting, not by deleting — and
  `revoke_club_role` was never their door anyway.
