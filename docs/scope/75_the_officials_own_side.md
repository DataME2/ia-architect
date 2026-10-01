# Project Scope — The Official's Own Side

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/the-officials-own-side`.
**Status: built.**

The Referee workspace had two placeholders. "Accreditation" said it was
waiting on a read policy, and "Owed to you" said it was waiting on a claims
view for the official. After [scope 73](./73_a_referee_decides_from_thirteen.md),
officials from 13 have that workspace of their own, so both are filled
here.

- **Owed to you.** Every claim raised for the official's matches, and where
  it stands: waiting for the treasurer, not approved, approved and waiting
  for a choice, to be paid, in a payment batch, or credited.
  - An adult official chooses pay or credit right there (BR152).
  - For an official of 13 to 17, the panel says their Parent/Guardian
    chooses. Scope 73 left BR152 at eighteen.
  - No migration was needed: the claims were already readable through the
    family policy (0057), which includes the official's own Person.
- **Accreditation.** The latest classification (BR110), every accreditation
  and the Blue Card, each with its expiry and whether the club has sighted
  it. An expired one, or one expiring within 30 days, is flagged.
  - These three tables were readable only by officers. Migration 0071 adds
    an own-row read policy to each.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR160 added** ([5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)): an official reads their own standing |
| 3_information | No new table |
| 4_application | Three additive `_select_own` policies, `loadOwnCredentials`, `loadSettleableClaims` widened to every state, `officials-own-view.ts`, and the two panels |
| 5_technology  | No change. One migration (0071) and one behavioural RLS suite (71) |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The official's own claims, classification, accreditations and Blue Card | Whether a batch has been paid: `referee_payment_batch` stays the treasurer's, so the panel says "in a payment batch", not "paid" |
| | The guardian of an official under 13 seeing that official's standing |
| | Uploading or renewing a credential from the workspace |

## Gap notes

- **"Paid" is not shown, only "in a payment batch".** Showing it would mean
  a read on `referee_payment_batch`, or a paid date copied onto the claim.
  Either is small, but neither was asked for.
