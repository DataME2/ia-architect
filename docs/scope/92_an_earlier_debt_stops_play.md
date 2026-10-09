# Project Scope — An Earlier Debt Stops Play

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/an-earlier-debt-stops-play`, stacked on
the phase 3 re-land (#105).
**Status: built.**

[Open question 81](./open-questions.md) asked whether a debt from an
earlier season stops a player taking the field. BR79 said "any amount
outstanding" stops play, but eligibility as built read only the
registration's own season. The product owner answered in October 2026:

> If the player is registered with the same club, they can't play. If the
> player is registered with another club, show amber to chase rather than
> red, so the other club knows they owe money at another club.

The first half is built here. The second half needs a decision first; see
[Q82](./open-questions.md) and the last section below.

## The rule (BR79 amended)

An earlier season's debt **at the same club** stops play, exactly as this
season's does, while all of these hold:

- **Earlier:** the season ended before this one began.
- **In the window:** it ended within the last two years. Older debts stay
  the treasurer's to resolve, not the team sheet's.
- **Unpaid:** money is still outstanding.
- **Not amended:** the treasurer has not recorded an amendment, the
  documented, reasoned decision BR79 asks for (a waiver, a plan, a
  correction). A payment request alone is the chase, and does not lift it.
- **Hardship:** a committee hardship (BR164) still lets the player take the
  field until its date.

## Design

- **Migration 0088:** `app_registration_money()` gains `owes_earlier`. Every
  reader gets it, as they get `owes`, so a coach learns "not clear" and
  never an amount (BR78). Because it lives in the function every screen
  already asks, the queue, the coach's roster, the family's view and the
  registration page all agree without each restating the rule.
- **Eligibility:** `playEligibility()` takes `owesEarlier` and gives it its
  own reason: "this season is paid, but a debt from an earlier season at
  this club is unpaid". It counts in the "registered but blocked by money"
  pile.
- **The registration page** now uses the entry's full verdict
  (`eligibilityOf`), which also brings in the hardship date it was not
  passing before.
- **The Financial Gate:** "Earlier seasons" is **red** while an unamended
  debt stops play, and **amber** once the treasurer has amended it (still
  owed, no longer a block). Each season is listed, with "(amended)" where it
  applies.
- **Tests:**
  - 4 new eligibility tests and an extra gate case.
  - **Suite 88** (7 scenarios): an unpaid 2025 debt blocks; a 2023 one
    (outside the window) does not; an amended one does not; a chased-only
    one does; this season's debt still answers `owes`; another club's
    registration stays unreadable.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR79 amended**; Q81 resolved; **Q82 raised** |
| 3_information | `app_registration_money()` gains `owes_earlier`; no new table |
| 4_application | Eligibility, the registration page and the Financial Gate |
| 5_technology  | Migration 0088, suite 88 |

## The other half: a debt at another club (Q82, not built)

Showing a club that a player owes money **at another club** is one club's
financial information about a person disclosed to another club. Three
things stand in the way, and none is a screen:

1. **P5, tenant isolation.** Every record belongs to one club, and the
   database refuses any query that crosses clubs. That is the platform's
   central promise to each club.
2. **Decision 10, identity is asserted, never inferred.** The same child at
   two clubs is two `Person` records. Matching them by name and birth date
   is the guess decision 10 forbids, and a wrong match would put a debt on
   the wrong child.
3. **The Privacy Act, APP 6.** The first club collected the debt for its
   own purposes. Passing it to another club needs the person's (or
   guardian's) consent, or a purpose they would reasonably expect.

Options for the product owner, recorded in Q82:

- **(A) Leave it to the governing body.** Transfers between clubs already
  go through its clearance, where a club may object over unpaid fees.
- **(B) Build it on consent.** Three parts:
  - a clause in the collection notice;
  - a link between the person's records at two clubs, which the person or
    guardian asserts;
  - the new club sees only a flag ("owes a club"), with no club name or
    amount.
- **(C) Tell the club that is owed, not the new one.** When a debtor
  registers elsewhere, the owing club is told so it can chase, and the new
  club learns nothing.

## Out of scope / gaps

- Q82, above.
- **An amended debt stays owed.** It shows amber in the gate. Clearing the
  balance itself is a payment or a correction, as before.
