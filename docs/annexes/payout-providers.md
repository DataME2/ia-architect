# Annex — Paying referees online: what each provider needs

_[← Annexes](./README.md) · realises [BR161, BR162](../ea/2_business/5_domain-context-and-rules.md) · [scope 76](../scope/76_a_referee_is_paid_online.md) · [decision 16](../decisions/16_the_platform_records_a_payout_a_provider_moves_it.md)_

**Status: nothing here is connected.** The platform records where each
official is paid (`payout_nomination`) and pays a closed batch through
`app_simulate_batch_payout()`. That function writes one `referee_payout` row
per claim with `provider = 'simulation'`, and **no money moves**. Connecting a
provider replaces that one step. The nomination, the payout record and the
screens stay as they are.

This annex says what each option needs before it can be switched on. It is
drafted, **not legally or commercially reviewed**.

## The four options, compared

| | **Bank file (ABA)** | **Stripe Connect** | **PayPal Payouts** | **PayID / NPP via a payments API** |
| - | - | - | - | - |
| What the official nominates | BSB, account number, account name | A Stripe connected account (`acct_…`), created through Stripe's own onboarding | A PayPal email | A PayID (email or mobile) |
| What the platform calls | Nothing: it generates a file the treasurer uploads to the club's bank | Stripe API: Transfers, then automatic Payouts to the official's bank | PayPal Payouts API (batch) | A provider such as Monoova or Zepto |
| Who holds bank details | **The platform** (sensitive, see below) | Stripe | PayPal | The provider |
| Speed | Next business day | 2 business days (AU standard) | Minutes | Seconds |
| Cost (indicative, check current pricing) | Free, or the club's bank fee | Connect fees per active account and per payout | Per-payout fee, capped | Per-transaction fee |
| Under 18 | The guardian's account (BR161: the guardian nominates) | Stripe requires an adult account holder: the guardian's | PayPal requires 18+: the guardian's | The guardian's PayID |
| Effort | **Smallest**: a file format, no credentials | Largest: onboarding, webhooks, KYC handled by Stripe | Medium | Medium, and contracts with a provider |

**Recommendation:** start with the **ABA bank file**. It needs no API, no
contract and no secret. It removes the treasurer's re-keying, which was the
actual complaint, and it works with every Australian bank's bulk payment
upload. Add Stripe or PayPal only if officials ask for them.

## What each one needs before it is switched on

### Bank file (ABA, Australian Direct Entry)

- **Club details:** the club's bank, its User ID (APCA number) from that
  bank, its BSB, account number and account title.
- **One file per closed batch:** a header record (type 0), one detail record
  per claim (type 1: BSB, account, amount in cents, name, lodgement reference
  such as the claim reference), and a trailer record (type 7: totals).
- **The platform writes `referee_payout`** with `provider = 'bank_file'`,
  status `sent` when the file is downloaded, and `succeeded` when the
  treasurer confirms the bank processed it.
- **New Zealand:** each bank's own bulk-payment CSV, not ABA.

### Stripe Connect (Express accounts)

- **Accounts and keys:** a Stripe account for the club (or the platform as a
  Connect platform), plus `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in
  Vercel's environment, never in the repository.
- **Onboarding:** an **Account Link** created for the official, or their
  guardian, who completes identity and bank details on Stripe's own pages.
  The platform stores only the resulting `acct_…` id, which is exactly what
  BR161 already holds.
- **Paying:** for each claim, a `Transfer` to the connected account with
  `metadata.claim_id` and an idempotency key equal to the claim id.
- **Confirming:** webhooks `transfer.created`, `payout.paid` and
  `payout.failed` move the payout row from `sent` to `succeeded` or `failed`.
- **Funding:** the club must hold an AUD balance in Stripe to transfer from.

### PayPal Payouts

- **Accounts and keys:** a PayPal Business account with **Payouts enabled**,
  which PayPal approves on request, plus `PAYPAL_CLIENT_ID` and
  `PAYPAL_CLIENT_SECRET`.
- **Paying:** one `POST /v1/payments/payouts` per batch, with
  `sender_batch_id` set to the batch id and one item per claim
  (`receiver` = email, `sender_item_id` = claim id).
- **Confirming:** webhooks `PAYMENT.PAYOUTSBATCH.SUCCESS` and
  `PAYMENT.PAYOUTS-ITEM.*` update each payout row.
- **Unclaimed:** an email with no PayPal account goes unclaimed and is
  returned after 30 days. The row records `failed`.

### PayID / NPP

- **Contract:** with a payments provider such as Monoova, Zepto or a bank
  API. API keys per the provider.
- **Nomination:** a PayID would become a fourth `method`. That needs a
  migration, deliberately not added until a provider is chosen.

## What changes in the platform when a provider is connected

1. A server-only adapter per provider, keyed by `provider`. It holds the
   secrets, so it runs in a server action or a Route Handler, never in the
   browser.
2. `app_simulate_batch_payout()` is joined by a real path:
   - payout rows are written as `sent`, with the provider's reference;
   - the batch is marked paid only when every row has `succeeded`.
3. A webhook route per provider:
   - verifies the signature;
   - updates `referee_payout.status`;
   - is idempotent on the provider's event id.
4. The simulation stays available in development and is refused in
   production. That needs a club or environment setting, added with the
   first real provider.

## Collecting from sponsors, and paying referral partners

[Scope 85](../scope/85_sponsor_invoices_and_club_referrals.md) adds money
moving in both directions. Both are **simulated** today, in the same way as
referee payouts: provider `simulation` and a `SIM-…` reference.

| Direction | Method | What the real version needs |
| - | - | - |
| Sponsor pays the club (BR171) | **PayPal** | PayPal Invoicing API: send the invoice from the club's PayPal Business account, and a webhook marks it paid |
| | **Google Pay** | Google Pay is not a merchant on its own. It needs a processor, such as Stripe Payment Links or Checkout with Google Pay enabled, and a Stripe webhook marks the invoice paid |
| | **Online bank transfer** | The invoice shows the club's BSB and account, or a PayID, with the invoice number as the reference. The treasurer reconciles it against the statement (no API needed) |
| Club pays a partner (BR172) | **PayPal** | PayPal Payouts, as for referees above |
| | **Bank transfer** | The ABA bank file, as for referees above |

A partner's bank details carry the same APP 11 obligations as a referee's
(below). They are shown masked and read only by the admin and treasurer.

## Personal information (APP 11)

- **Bank account numbers are held in the platform's database** for the bank
  file option. They are shown masked on every screen, readable only by the
  nominator, the treasurer and the admin, and never sent to the AI assistant.
- **Follow-up:** encrypt `bsb` and `account_number` at rest with Supabase
  Vault (pgsodium). Supabase already encrypts the disk; column encryption
  protects against a leaked database dump or an over-broad policy.
- **Stripe and PayPal keep the bank details on their side.** The platform
  holds only an account id or an email.
- **Retention:** a superseded nomination is kept as history, which BR161
  requires. Its retention period belongs in the
  [retention schedule](./retention-schedule.md), which does not yet list it.
