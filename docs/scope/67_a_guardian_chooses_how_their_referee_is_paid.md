# Project Scope — A Guardian Chooses How Their Referee Is Paid

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/claim-settlement-choice`.
**Status: built.**

## Why this exists

Asked directly, immediately after BR151 shipped: once a match is confirmed,
the guardian of the official who worked it should be told there is money
owed and given a say in how it is settled — paid, or put toward next
season's fee.

## The boundary that shaped the design

**BR118 — "the platform never initiates a transfer" — governs this
entirely.** The request as first asked ("setup a payment method") could
have meant collecting bank details; that would cross a line this project
draws deliberately and consistently (the same line that keeps `remittance`
a record of a payment the club made elsewhere, never a payment the
platform makes). Confirmed directly rather than assumed: this adds a
*choice*, not a payment rail. A guardian picks "pay me" (the club acts
exactly as it already does for anyone, outside the platform) or "credit
toward next season" — no account number, no card, nothing financial
collected anywhere.

**Confirmed directly, not invented:** no MiniRef fee schedule actually has
rate rows yet for this club — three schedule headers exist
(`referee_fee_schedule`), none has a single `referee_fee_rate` row. This
feature is built and correct regardless, but nothing will appear for a
guardian to act on until a real rate is entered through the existing fee
schedule screen. No dollar figure is invented here.

## Deliberately stops at recording the choice

Applying a chosen "credit" automatically to a **future** season's
registration needs a notion of "next season" the schema does not have —
`season` rows are dated, with no successor pointer, and resolving one
requires either guessing (the club's next season might not exist yet when
the choice is made) or building season-sequencing machinery nobody asked
for. A registrar or treasurer applies a chosen credit by hand, through the
arrears/outstanding-amount tools already built (scope 40, 60), once the
next season's registration exists to apply it to. The choice being
**visibly recorded at all** — which nothing did before — is the actual gap
reported; automating its application is separate, larger work.

## Who may choose

`app_may_answer_designation` (migration 0045) already answers "who may
decide for this official" — themselves once adult, otherwise a
Parent/Guardian holding authority — reused rather than redefined, for the
same reason 0055 and 0056 both reuse it. **Not narrowed to thirteen the way
BR151 is**: a settlement choice follows BR113's ordinary eighteen
threshold, since paying an official is not specific to the MiniRef half of
the pathway the way match confirmation was asked to be.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No new goal. Extends BR118's existing boundary and BR113's existing routing to a new decision point. |
| 2_business    | **BR152 added.** New object, **Claim Settlement Choice**. |
| 3_information | No new table — three nullable columns on `referee_payment_claim` (`settlement`, `settlement_chosen_by`, `settlement_chosen_at`), guarded by two triggers reusing 0045's existing function. |
| 4_application | New panel on the guardian workspace listing approved, unsettled claims for their under-18 officials. The existing `/registrar/referee-payments` screen shows the chosen settlement alongside each approved claim. |
| 5_technology  | No change. |

## Deliverables

- **Migration:** `supabase/migrations/0057_a_guardian_chooses_how_their_referee_is_paid.sql` — the three columns, `assert_claim_settlement_is_chosen_by_the_official()` (BR152's gate, reusing `app_may_answer_designation`), `assert_family_only_chooses_settlement()` (a family changes only the settlement, mirroring 0045's shape), RLS (`referee_payment_claim_select_family`, `referee_payment_claim_settle_family`).
- **Domain:** `src/web/claim-view.ts` — `parseSettlement`.
- **Data:** `src/data/claims.ts` — `loadSettleableClaims`, `chooseSettlement`; `settlement` threaded through `loadClaims`/`RaisedClaim`.
- **Screens:** a panel in `GuardianWorkspace.tsx`, `chooseSettlementAction`; the settlement shown on `/registrar/referee-payments`.
- **Tests:** `supabase/tests/57_a_guardian_chooses_how_their_referee_is_paid.sql`.
- **Rule:** BR152.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| A family choosing pay/credit on an approved claim | Automatically applying a chosen credit to a future season's registration fee — needs a "next season" concept the schema does not have |
| The choice visible to admin/registrar/coordinator/treasurer alongside the claim | A dedicated "apply this credit" action on the registrar side — today it is the existing arrears/outstanding-amount tools, used by hand, informed by the choice |
| Any official's family (BR113's eighteen threshold) | A MiniRef-specific rate — none exists yet for this club; entering one is a registrar's own act through the existing fee schedule screen |

## Gap notes

- **No notification when a claim becomes approved and settleable.** The
  guardian's panel is read-time, the same choice scope 65 and 66 both made
  for their own workspace panels — nothing pushes, nothing is dismissible.
- **A credit chosen today has nowhere automated to land next season.**
  Recorded and visible; applying it is still a person's job, named directly
  above rather than silently left undone.
