# Project Scope — The Public Event Calculator

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/funny-thompson-ncu476`, restarted from
`main` after [scope 134](./134_pitchpeople_financial_intelligence.md)
merged (#146). **Built.** No migration, no table, no environment variable.

Scope 134 designed Financial Intelligence and made its first deliverable a
public calculator (WP2a, BR222). On 4 November 2026 the product owner set
it as the objective: an account-free calculator, on the data model
PitchPeople's event budgets use, that estimates the financial impact of
organising a carnival or a football holiday clinic. This scope builds it,
as scope 134 designed it. It implements 134's WP2a; it does not change
134's design.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change** beyond scope 134: C22's first deliverable, in the Event Economics domain, now marked built |
| 2_business    | **Changed — status only.** BR209 and BR222 built; BR200 partly built (the calculator's currency, not yet the ledger's). The Public event calculator service delivered; the Prospective Event Organiser no longer pending. #137's presets and #138's no-capture rule applied as adopted |
| 3_information | **No change.** No data object: the visitor's figures are never held by the platform (BR222) |
| 4_application | **Changed.** Three components delivered: money with its currency, the event economics calculator, and the public page. The `eventEconomics()` contract brought in line with the code |
| 5_technology  | **No change.** A prerendered Next.js page whose one client component computes in the browser |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | Event Economics designed (scope 134); no code. Every amount in the codebase an unlabelled AUD cents count |
| **Target** (delivered) | `/event-calculator`: a carnival, holiday clinic, tournament or other event, its size and its lines, and the income, costs, surplus or deficit, per-participant figures, break-even and three scenarios, in AUD or NZD — worked out in the visitor's browser by the function a club's budget will use, with nothing sent or kept |

## Work packages and deliverables

### WP1 — The model, pure (BR200, BR208, BR209)

- **Deliverables:**
  - `src/domain/finance/currency.ts` — `Money` with its currency, `A$` and
    `NZ$` written out, and addition that **throws** across currencies.
  - `src/domain/events/economics.ts` — lines with a direction, a category,
    a basis and a unit (once, per day, per team, per participant, per
    participant per day, juniors or seniors only); `eventEconomics()`;
    `breakEven()` solved exactly in integers over participants or teams,
    returning *reached*, *not reachable* or *needs* what is missing;
    `scaleShape()` for scenarios. Validates its inputs and throws on a
    fraction of a cent or a negative count.
  - Tests: `currency.test.ts` (4), `economics.test.ts` (14), each
    break-even worked by hand and checked one count either side — a
    three-day clinic at 20 participants, a carnival that cannot break even
    at A$250 a team and does at exactly 30 teams at A$300, a junior and
    senior mix at 27.
- **Outcome:** one calculation, ready for scope 134's WP2 to reuse
  unchanged.

### WP2 — What the page decides (BR211, BR222)

- **Deliverables:** `src/web/event-calculator.ts` — presets per event type
  with **every amount blank**, a governing-body line on each and none
  filled in; parsing of amounts (`A$`, `NZ$`, `$`, commas; negatives and
  fractions of a cent refused) and counts; the view, with each line's
  working in words ("× 30 participants × 3 days"), the break-even sentence,
  costs by category, and three scenarios (20% fewer, as entered, 20% more).
  **A mistyped figure hides the estimate** rather than counting as zero.
  `event-calculator.test.ts` (11).
- **Outcome:** everything the page says is decided and tested without a
  browser.

### WP3 — The page

- **Deliverables:**
  - `src/app/event-calculator/page.tsx` (prerendered) and
    `EventCalculator.tsx` (the one client component), with no form, no
    server action, no request and no storage.
  - `src/app/event-calculator/boundary.test.ts` — fails if the page's
    modules import anything but React, `next/link`, `src/domain/` and
    `src/web/`, or use `fetch`, browser storage, a `<form>` or
    `'use server'` (BR222).
  - `src/app/globals.css` — `.calc*`, from tokens only.
  - A link in the footer (`FOOTER_NAV`) and on `/season-paths`.
- **Outcome:** an organiser sees what an event would cost and earn before
  deciding to hold it.

## Verification

- `npm run check`: passes, 1,267 tests (31 new), all gates.
- `npm run build`: `/event-calculator` is prerendered static.
- Rendered and driven in Chromium against the production build at 360,
  768 and 1280 px:
  - a holiday clinic entered by hand shows A$4,050.00 income, A$2,849.00
    costs, A$1,201.00 surplus and a break-even of 20 participants;
  - a carnival shows A$2,600.00 surplus and 12 teams;
  - **no request is made after the page loads**, there is no page error,
    and nothing scrolls sideways at any of the three widths.

  The first render found two defects, fixed before commit:
  - a sixth link in the top bar pushed *Register* off it at 1280 px on
    **every** page, so the link moved to the footer;
  - the scenario table and a figure tile overflowed the estimate panel.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| An estimate from the visitor's own figures, in AUD or NZD | A governing body's charge filled in from a published policy (needs scope 134's WP5 and [#123](./open-questions.md)) |
| Presets per event type with blank amounts (#137) | Saving, emailing or sharing an estimate, or capturing the visitor's details (#138) |
| Break-even over participants or teams; three scenarios | Actual figures beside expected ones — a club budget's job (134's WP2) |
| A footer link and one on `/season-paths` | A link in the top bar, which is full; a place on the front door's homepage |

## Gap notes

- **A governing body's charge is always the visitor's assumption.** The
  sanctioning calculator and the policy register are scope 134's WP2 and
  WP5. Until a verified policy is held, the page says so beside the charge.
- **The top bar has no room.** Six links overflow it at 1280 px. Giving the
  calculator a place there means removing or folding another link, which is
  the front door's decision rather than this page's.
- **GST is as entered.** The page says amounts are as the visitor enters
  them; BR219's GST treatment belongs to a club's settings, which a public
  page does not have.
- **Break-even assumes the mix stays as entered** — the same proportion of
  juniors to seniors, and the same players per team — and the page says so
  in the sentence itself.

## Open questions

- None new. **#137** (presets and units) and **#138** (no capture) are
  applied as scope 134 adopted them, and remain open for the product owner
  to confirm.
