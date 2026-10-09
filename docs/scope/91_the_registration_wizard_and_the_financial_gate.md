# Project Scope — The Registration Wizard and the Financial Gate

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/the-registration-wizard`, stacked on
[scope 90](./90_the_referee_board.md).
**Status: built.**

Phase 3 of the frontend overhaul ([scope 89](./89_the_person_home_and_the_frontend_overhaul.md),
whose adaptation table this follows). The prompt asked for three things:

- a wizard-based registration under one `Person`, with dedicated areas for
  verification documents;
- a "Financial Gate" panel breaking down fees, payment plans and
  historical arrears;
- a place for the treasurer to verify vouchers or cash receipts.

## The registration wizard

The public link (`/join/{token}`) and the registrar's form (`/register`)
share one component, and now both show it in five steps:

1. The player.
2. Parent or guardian.
3. Permissions.
4. Officiating and season.
5. Review and documents.

**It is still one form.** Every field stays in the one `<form>`: a step
that is not shown is hidden with `display: none`, and its fields still
submit. The same action receives them, so nothing about what is collected
or how it is saved changed.

- **Next** runs the server's own `parseRegistrationForm` on everything typed
  so far, and shows only the errors that belong to the step on screen. A
  child's missing guardian (BR1) stops step 2; the collection notice (BR48)
  stops step 3. The rules are not restated anywhere.
- **Errors the server sends back** open the first step that holds one. The
  step bar marks every step with an error "needs attention", in words.
- **Enter** in a field moves to the next step; only the last step submits.
- **Review** reads back exactly what was typed, legal name untidied (BR55),
  for checking against the passport or birth certificate.
- **Documents:** the public link runs without an account, so it cannot
  take an upload. The step names what the club will ask for (proof of the
  legal name and date of birth, any voucher, anything else the season
  requires) and says documents are uploaded from the family workspace once
  it exists (scope 77). It does not promise an upload it cannot take.
- **Accessibility:** a step change moves focus to a hidden heading that
  names the step, and the step bar is a labelled navigation with 44px
  targets.

**Code:**

- **Decisions:** `src/web/registration-wizard.ts`, with 4 tests. One test
  proves every field the parser can complain about belongs to a step.
- **Components:** `WizardSteps` in `src/components/ui`.
- **The form:** `RegistrationForm.tsx` restructured.

**Two bugs the browser check found, both fixed before commit:**

- `hidden` was overridden by the app's own `fieldset` and `.stack`
  display, so every step showed at once.
- React reused the Next button's node as the Submit button mid-click,
  submitting from step 4. The two buttons now carry separate keys.

## The Financial Gate

On a registration's page (`/registrar/{id}`), the card "May this player
take the field?" becomes the **Financial Gate**:

- **The verdict:** clear or not clear to play, with its reason, from
  `playEligibility` (BR79), unchanged.
- **The figures**, for roles that read money (BR78):
  - **Paid so far.**
  - **Vouchers:** verified, and how many are waiting for the treasurer.
  - **Outstanding this season:** a credit is shown as a credit, never an
    obstacle (BR3).
  - **The payment plan:** on track, or the amount in arrears, with
    instalments paid and the next due.
  - **Earlier seasons:** what is still owed from the last two years, from
    BR79's arrears function. "Not shown" for a role that function refuses
    (BR142).
- A role that reads no money sees the verdict only.
- **For the treasurer**, "Verify a voucher" and "Record a payment or cash
  receipt" jump to the real controls below. The voucher verify and reject
  buttons and the payment form already worked (BR78, BR22). They are
  reached from the gate, not stubbed.

**Code:**

- **Decisions:** `src/web/financial-gate.ts`, with 5 tests.
- **Component:** `FinancialGatePanel` in `src/components/ui`.
- **Page:** the registration page computes the gate from what it already
  loads, plus the arrears report.

**Earlier seasons show amber, not red.** Eligibility as built reads this
season's balance. If an old debt were red, a player could show "clear to
play" with a red reason beside it. Whether an old debt should stop play is
[open question 81](./open-questions.md). **Superseded by [scope 92](./92_an_earlier_debt_stops_play.md):** Q81 was answered, an earlier debt at the same club now stops play, and the tile is red (amber once amended).

## Preview

`/preview/registration` (development only) shows the real wizard with a
preview action that runs the real parser and saves nothing, and three
sample gates: paid up; behind on a plan with a voucher waiting and a 2025
debt; and as a coach sees it.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | No rule changed. Open question 81 raised: does an earlier season's debt stop play? |
| 3_information | No change |
| 4_application | The wizard on `/join/{token}` and `/register`; the Financial Gate on a registration; a preview |
| 5_technology  | No change; no migration |

## Out of scope / gaps

- **Uploading documents on the public link.** It needs an account or a
  scoped, signed upload, which is a decision about anonymous writes to
  storage, not a layout.
- **The season's own document list on the public link.** The anonymous
  caller cannot read the season's required documents today, so the step
  lists them generally.
- **The arrears read.** The gate reads the club-wide report and keeps this
  person's rows. A per-person function can replace it when a club has
  hundreds of debtors.
