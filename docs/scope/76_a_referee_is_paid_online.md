# Project Scope — A Referee Is Paid Online

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/a-referee-is-paid-online`.
**Status: built, simulated.** No payment provider is connected and no
money moves.

The club asked, October 2026, for officials to nominate a bank account,
PayPal or Stripe, so that paying referees is easier for the treasurer.
Until a provider is chosen, a simulation should stand in for the payment.
That **restates BR118**: until now the platform only recorded that a batch
had been paid elsewhere.

## What it does

1. **Nominate where to be paid (BR161).**
   - Who nominates: the official from 18, or the Parent/Guardian holding
     authority before then. That is the same person who chooses pay or
     credit under BR152.
   - Where: in "Owed to you" on the Referee workspace, or in the Referee
     payment panel of the guardian's workspace.
   - Options: a bank account (BSB, account number, account name), a PayPal
     email, or a Stripe account id.
   - Every screen shows it masked. Only the nominator, the treasurer and
     the admin can read it.
   - A new nomination replaces the old one, and the history is kept.
2. **Pay online, simulated (BR162).**
   - On a closed payment run, the treasurer gets **Pay online (simulated)**.
   - It writes one payout row per claim that is to be paid (credited claims
     are skipped), with `provider = simulation`.
   - It marks the run paid with a `SIMULATED SIM-…` reference.
   - It is all or nothing: if any official in the run has no nomination,
     nothing is paid and the error names who is missing.
3. **The official sees it.** "Owed to you" reads "Paid online (simulated) ·
   SIM-…".

What a real provider needs (APIs, keys, webhooks and personal information)
is in [payout-providers.md](../annexes/payout-providers.md). The choice
behind the design is [decision 16](../decisions/16_the_platform_records_a_payout_a_provider_moves_it.md).

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No new capability: C3/C4 referee payment, extended to the movement of money. G3 (finance under control) served more directly |
| 2_business    | **BR118 restated; BR161 and BR162 added** ([5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)). Question 80 raised: should a 13–17 official nominate for themself? |
| 3_information | Two new tables: `payout_nomination` and `referee_payout` |
| 4_application | `app_simulate_batch_payout()`, `PayoutNominationForm`, the treasurer's "Pay online (simulated)" button, and the payout shown in "Owed to you" |
| 5_technology  | No provider yet. The annex lists the secrets and webhooks each provider needs |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Nominating where to be paid; a simulated payout per claim; the official seeing it | A real provider: the ABA bank file is recommended first, then Stripe or PayPal ([annex](../annexes/payout-providers.md)) |
| | Encrypting `bsb` and `account_number` at rest (Supabase Vault) |
| | Refusing the simulation in production (needed before any production use) |
| | PayID as a fourth method |
| | A 13–17 official nominating for themself (question 80) |

## Gap notes

- **A simulated run is marked paid.** That is what lets the flow be tried
  end to end in development. It must be refused in production before the
  club relies on it, or a run will read "paid" when nobody was.
- **Bank numbers are now held.** They are masked on screen and readable by
  only three roles, but stored in plain text in the database, behind
  Supabase's disk encryption. Column encryption is the next step.
