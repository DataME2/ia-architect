# Project Scope — Every Claim Is Paid Out

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/every-claim-is-paid-out`.
**Status: built.**

BR152 let an official, or their guardian, take an approved referee claim
as **credit toward next season** instead of being paid. Nothing applied
that credit automatically. The club answered (a) in October 2026: **every
approved claim is paid out** to the account nominated under BR161. Credit
is retired.

## What changes

- **Migration 0076:**
  - `referee_payment_claim.settlement` can no longer say `credit`. Any row
    that did is converted to `pay`; development had none.
  - An unsettled claim was already paid by the payout (0072), so nothing has
    to be chosen before payment.
- **The pay-or-credit form is deleted** (`SettleClaimForm`,
  `chooseSettlementAction`, `parseSettlement`, `chooseSettlement`).
  - "Owed to you" and the guardian's Referee payment panel show where each
    claim stands next to the nomination form.
- **The bell** raises an approved claim only while its official has no
  nomination, and says "nominate the account it is paid to".

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR152 restated**: no credit; every approved claim paid to the BR161 nomination |
| 3_information | `settlement` narrowed to `pay` |
| 4_application | Pay-or-credit form and action removed. `claimStanding` no longer mentions credit. The bell is driven by a missing nomination |
| 5_technology  | No change. Migration 0076; suite 57 updated (credit refused) |

## In scope / out of scope

| In scope | Out of scope |
| -------- | ------------ |
| Retiring credit for referee claims | Refunding a family's *registration* credit (an overpaid fee) to their account. A different ledger, and not what was asked |
