# Decision 16 — The platform records a payout; a provider moves it

_[← Decisions](./README.md) · [scope 76](../scope/76_a_referee_is_paid_online.md) · [payout providers annex](../annexes/payout-providers.md)_

**Status:** Accepted (October 2026). Built as a **simulation**: no provider
is connected.

## Context

BR118 kept money movement outside the platform: the treasurer paid
referees in their bank, then recorded the batch as paid. In October 2026
the club asked for officials to nominate a bank account, PayPal or Stripe,
so the treasurer's job is easier, with PayPal included because it is
popular.

## Decision

The platform now does three things:

1. **Records where each official is paid** (BR161). The nominator is whoever
   already chooses pay or credit under BR152, so the two rules can never
   name different people.
2. **Records every online payout, one row per claim** (BR162). Only a
   database function writes those rows, so no client can type in a
   provider reference.
3. **Never moves money itself.** A provider does that: a bank, through a
   file the treasurer uploads, or Stripe, or PayPal. Until one is
   connected, the function **simulates** the payout and says so on every
   row and screen.

## Rejected

- **Card or bank credentials entered on the platform for Stripe or PayPal.**
  Stripe and PayPal collect those details on their own pages. The platform
  holds only the account id or the email. Holding more would put PCI and
  identity checks on a club volunteer's platform for no gain.
- **Marking a batch paid on a "pay" button with no record per claim.** That
  is what BR118 already did. The point is that each official can see their
  own payment.
- **Waiting for a provider before building anything.** The nomination and
  the record are the same whichever provider wins, so the simulation lets
  the club try the flow now.

## Consequences

- Bank account numbers are held, masked on screen. Encrypting them at rest
  is a named follow-up in the annex.
- A simulated payout marks the batch paid with a `SIMULATED` reference. In
  development that is the point. Before production, the simulation must be
  refused there, and the annex lists that change.
