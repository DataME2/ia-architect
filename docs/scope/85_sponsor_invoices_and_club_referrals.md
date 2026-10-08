# Project Scope — Sponsor Invoices and Club Referrals

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/sponsor-invoices-and-club-referrals`,
stacked on [scope 84](./84_sponsors_in_the_workspace.md).
**Status: built.**

The product owner asked for three things after scope 84:

1. **Invoices in the treasurer's workspace.** The sponsor pays by PayPal,
   Google Pay or online bank transfer, and the amount is split. The split is
   read as the **club's share and Let'sDataTalk's share** (BR170's revenue
   share). The payment is simulated, as referee payouts already are.
2. **The club advertising in someone else's business**, paid per
   acquisition (CPA).
3. **UTM tracking links**, in the format Google's free Campaign URL Builder
   writes.

## Design

- **Invoices (BR171), migration 0083:**
  - `sponsor_invoice`: one campaign, one period.
    - The counts and amount are frozen from `sponsor_tally`, so a later
      tally cannot change an issued invoice.
    - The club and platform shares always add up to the amount.
    - Numbered `INV-YYYY-0001` per club.
  - `app_issue_sponsor_invoice()`: admin or treasurer for a club campaign;
    the platform for its own.
    - The period must already have happened.
    - Overlapping periods are refused.
  - `app_simulate_sponsor_payment()`: records the method (PayPal, Google
    Pay or bank transfer), returns a `SIM-…` reference and writes an audit
    row.
    - An invoice is paid once.
- **The club as advertiser (BR172):**
  - `referral_partner`: the business, its UTM pair, the fee per completed
    registration, its dates, and where it is paid (a PayPal email or a bank
    account). Admin and treasurer only.
  - `/join/{token}` reads `utm_source` and `utm_campaign` and carries them
    through the form.
  - After a successful registration, `app_attribute_registration()` credits
    the partner. It runs only for a registration under 15 minutes old and
    an active partner of that club, and only once.
  - `app_simulate_partner_payout()` counts only **COMPLETE** registrations
    in a period, so a fake or abandoned sign-up earns nothing. A period is
    paid once.
- **UTM (`src/web/utm.ts`, tested):**
  - `withUtm()` adds `utm_source`, `utm_medium` and `utm_campaign` to a
    link, as Google's builder does.
  - `/registrar/sponsors` builds each partner's link from a pasted
    registration link.
  - The sponsor click redirect now adds the campaign's own UTM
    (`letsdatatalk` / `sponsor` / `sponsor-…`), so the sponsor's analytics
    can measure CPA. That amends
    [decision 17](../decisions/17_sponsors_are_counted_never_tracked.md).
    The tags are identical for every viewer.
- **Screens:** two new cards on `/registrar/sponsors`:
  - **Invoices**: issue, then record the payment with a method, plus a
    split column for each side and the total awaiting payment.
  - **Advertise the club**: partners with their counts, their link, and
    payment.

## Follow-up: sponsor money in the treasurer's workspace

QA found that a treasurer working from `/me` saw none of this; it lived only on
`/registrar/sponsors`. The Committee workspace now carries a **Sponsor
money** panel for the treasurer or an admin. It is itemised by model:

- **CPC**: `40 clicks × $0.50 = $20.00`.
- **CPM**: `2,500 impressions ÷ 1,000 × $5.00 = $12.50`.
- **CPA (sponsor)**: `3 acquisitions × $10.00 = $30.00`, as the sponsor
  reports them.
- **Platform campaigns** add the club's share.
- **Partners (the club pays, CPA)**: `completed × fee = earned`, then what
  is paid and what is owed. Registrations not yet complete are counted
  separately, because they earn nothing yet.

The panel also shows the invoices awaiting payment. The Sponsors screen's
statement and partner lines show the same breakdown. `chargeBasis()` and
`partnerBalance()` in `src/web/sponsor-billing.ts` are tested.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change. It extends scope 84's revenue stream and adds a growth channel, inside P4 and P5 |
| 2_business    | **BR171 and BR172 added**; decision 17 amended for the campaign UTM |
| 3_information | Four tables: `sponsor_invoice`, `referral_partner`, `referral_attribution`, `referral_payout` |
| 4_application | Two cards on the Sponsors page, the UTM passthrough on `/join`, the redirect's UTM, four functions |
| 5_technology  | Migration 0083 and suite 83. No provider is connected; see the [annex](../annexes/payout-providers.md#collecting-from-sponsors-and-paying-referral-partners) |

## Out of scope / gaps

- **Real collection and payouts.** PayPal Invoicing, Google Pay through
  Stripe, and PayID are described in the annex but not connected.
- **An invoice PDF or email to the sponsor.** The invoice is on the screen
  only.
- **Late completion.** A registration that completes after its period was
  paid is not paid later. If a club needs that, pay by completion date
  instead.
- **Attribution beyond the first visit.** The UTM is read on the link that
  opens the form. A family that leaves and comes back without the link is
  not credited, so no cookie is needed.
- **Partner bank details** are unencrypted, like referees' (the annex's
  Vault follow-up).
