# Project Scope — No Pay, No Play

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/identity-and-registration`.

A club policy that was never written down: **a Player with anything
outstanding does not take the field.** Stakeholder-confirmed August 2026,
and confirmed as *absolute* — a payment plan schedules a debt, it does not
buy a game.

Recorded here rather than as a commit because it reverses a decision made
one initiative ago, and because implementing it found a case that neither
the rule it reverses nor the registration status can reach.

## What this reverses

[Scope 21](./21_payment-plans-and-the-registration-status.md) restated BR3
from *balance* to *arrears*, reasoning that a family honouring an agreed
plan should not be held out of the season. That reasoning was sound and the
premise was wrong: the pilot club's policy does not distinguish between
owing money and owing money on a schedule.

So BR3 goes back to blocking on any outstanding amount. The plan-awareness
built in scope 21 is **not** discarded — it moves from deciding the verdict
to writing the message. "$80.32 outstanding" and "$80.32 outstanding, and 1
April was missed" send a registrar to two different places, and only the
second is a call today.

## What implementing it found

**A registered player can owe money and look finished on every screen.**

BR3 keeps an unpaid registration out of a submission pack, which handles
the ordinary case: a family that has not paid never reaches the federation.
But it only works in one direction. Once a registration is `COMPLETE` its
status is deliberately frozen — `statusFromValidation` refuses to move it
back, because the club must never appear to revoke an eligibility the
federation conferred (BR60).

Now consider a Player confirmed in round 1 who is charged a mid-season fee
in round 5. Or one whose payment is reversed under BR77 because the cash was
never banked. BR3 fails. The status stays `COMPLETE`. The queue files them
under *Registered*. **A coach picking a team from that list fields them**,
which is exactly what the policy exists to prevent.

Neither input answers this alone. The status cannot fall back out of
`COMPLETE`, and the balance says nothing about the federation. So eligibility
to play becomes its own question, asked fresh from **both**, every time —
and never stored, because a cached eligibility is how a team sheet ends up
true on Tuesday and wrong on Saturday.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No change. Serves **G3**; no new or excepted Principle |
| 2_business | **BR79** added (no pay, no play; eligibility evaluated fresh from status and balance; visible to Registrar and Treasurer). **BR3 restated back** to blocking on any outstanding amount. The payment plan process gains the distinction between scheduling a debt and conferring eligibility |
| 3_information | **No change** — and worth stating. Eligibility is derived at read time from two columns that already exist; storing it would create a third fact that can disagree with the two it came from |
| 4_application | `src/domain/finance/eligibility.ts`, and the queue and detail screens that surface it. In [2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology | No change |

No decision record. The reversal's reasoning lives in BR3's own rationale,
where a future reader will actually look for it.

## Plateaus

| Plateau | State |
| ------- | ------ |
| **Baseline** (before) | A family on a plan and up to date passed BR3, so their balance was invisible on the queue entirely. A registered player who was later charged looked finished on every screen |
| **Target** (delivered) | Every queue card shows what is owed whether or not it blocks. Registered players who cannot play are pulled into their own section with the total. The detail screen answers "may this player take the field?" directly |

## Work packages and deliverables

### WP1 — BR3 back to balance *(done)*

- **Deliverables:** `br3-outstanding-payment.ts` restated; its tests
  rewritten to the confirmed policy; `formatMoney` moved into
  `src/domain/finance/money.ts` so the rules and the screens quote amounts
  through one implementation.
- **Outcome:** owing money blocks completion again, and the message still
  distinguishes *behind* from *merely owing*.

### WP2 — Eligibility as its own question *(done)*

- **Deliverables:** `src/domain/finance/eligibility.ts` —
  `playEligibility(status, outstandingCents)`, `blockedByMoney`,
  `totalOwed`. 12 unit tests.
- **Outcome:** the frozen-`COMPLETE`-but-owing case is catchable, and both
  gates are named separately in the reason a human reads.

### WP3 — Visible to registrar and treasurer *(done)*

- **Deliverables:** a money pill on every queue card; a *Registered, but
  cannot play* section with the total owed; a season stat for what the club
  is owed and by how many families; a *May this player take the field?*
  panel on the detail screen.
- **Outcome:** the queue is reachable by any club member, so the Treasurer
  sees the same thing the Registrar does — no separate screen, no second
  version of the number.

## In scope / out of scope

**In scope:** the eligibility rule, and its visibility on the registrar's
queue and the registration detail.

**Out of scope:** team sheets and match-day selection, which do not exist
yet — when they do, they must ask `playEligibility` rather than filtering on
status, and that is the point of building it as a function rather than a
screen. Also out: notifying a family that their child is ineligible, and any
grace period or committee override.

## Gap notes

**No override, deliberately.** A club will eventually want to let a child
play while a hardship case is resolved. That is a Committee decision with
a recorded rationale — the BR21 shape — and inventing it now as a boolean
on a registration would produce exactly the silent, unattributable
exception the policy exists to prevent. Raised as a question rather than
built.

**Eligibility is not persisted.** It has no column and no cache. A stored
eligibility is a third fact that can disagree with the two it was derived
from, and the disagreement surfaces on a Saturday.

**BR3 and BR79 overlap and both stay.** BR3 stops an unpaid registration
reaching the federation; BR79 stops an unpaid *registered* player taking
the field. Collapsing them into one rule would lose the second, which is
the one that catches the dangerous case.

## Open questions

**#50 — Is there a hardship or committee override for BR79, and who may
grant it?** A volunteer club will not keep a ten-year-old off the field
over $20 their family cannot pay this week, so in practice an override will
happen — the question is whether it happens in the platform with a recorded
approver, or by someone quietly zeroing a balance. Deferred rather than
guessed.

**#51 — Does BR79 apply to a Player whose fee is covered by a pending
voucher claim?** Under BR23/BR24 a Voucher Claim moves `NOT_CLAIMED →
SUBMITTED → PAID`, so between application and reimbursement the club is owed
money by a government, not by the family. Nothing here distinguishes the
two, and applying BR79 literally would bench a child for a government's
processing time.
