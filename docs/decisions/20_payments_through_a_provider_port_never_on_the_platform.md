# Decision 20 — Payments go through a provider port, and money never moves on the platform

_[← Decisions index](./README.md) · [scope 134](../scope/134_pitchpeople_financial_intelligence.md) · extends [decision 16](./16_the_platform_records_a_payout_a_provider_moves_it.md)_

**Status:** Accepted (4 November 2026, by the product owner, as scope 134's
*Decision C*). Built: nothing.
**Date:** 2026-11-04
**Touches:** [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md)
(C24, the Square resource), [2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)
(BR204–BR207), [4_application/5_interface-contracts.md](../ea/4_application/5_interface-contracts.md#paymentprovideradapter)

## Context

[Decision 16](./16_the_platform_records_a_payout_a_provider_moves_it.md)
settled payouts: the platform records where an official is paid and every
payout, and a provider moves the money — today a simulation. Collections
were never decided. The pilot club confirmed Square as its provider in
July 2026, but nothing integrates with it, and clubs also use Stripe and
their banks. A treasurer still types in every receipt.

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| **Integrate Square directly**, as the earlier course of action assumed | Fastest for one club, and couples every screen to one vendor. The next club on Stripe, or paying by bank transfer, is a rewrite |
| **A payment aggregator** in front of every provider | Adds a counterparty, a fee and a contract to every transaction, and a club's existing provider account is not reused |
| **Card fields hosted on the platform's own pages** | Puts a volunteer-run club's platform inside PCI DSS scope for no gain, and contradicts decision 16's rejection of holding credentials |
| **One port, one adapter per provider**, each declaring what it supports | **Chosen.** Collections and payouts are separate capabilities; an adapter lacks what its provider lacks; the simulation is one more adapter |

## Decision

Every money movement goes through `PaymentProviderAdapter`. Square and
Stripe are **candidate** adapters, alongside Australian and New Zealand bank
files and statement imports; none is promised for the first release, and the
first is chosen by [open question #126](../scope/open-questions.md). The
platform records obligations and transactions; the provider executes the
movement. No card number, CVV or bank login is held, and provider secrets
live only in server-side configuration (BR207). Provider events are verified
and processed once (BR206), and provider transactions are kept apart from
the club's records and reconciled against them (BR205). The existing
simulated payouts stay, behind the same port, until a real provider is
approved and tested.

## Consequences

- Adding a provider is a recipe ([solution design §4](../ea/4_application/4_solution-design.md#adding-a-payment-provider-adapter)),
  not a redesign.
- A screen offers only what the club's adapter declares, so "refund through
  Stripe" cannot appear for a club whose provider cannot refund.
- Webhooks arrive with no signed-in user, so the codebase gains one
  `createAdminClient` reason, `provider-webhook`, used to call one definer
  function and nothing else.
- Production must refuse the simulation once a real adapter is enabled
  there — the environment setting decision 16 already asked for.
- Each adapter needs a capability assessment against the provider's
  *current* documentation before it is built; the
  [payout annex](../annexes/payout-providers.md) covers payouts only.
