# Project Scope — The Finance Report

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/finance-report` (local, not pushed), built on
[scope 132](./132_the_pilot_clubs_history_masked_and_imported.md)'s branch,
whose tables it reads.

- Migration 0102 was dry-run on DEV inside a rolled-back transaction, and all
  6 scenarios of its test passed.
- It was applied by hand to DEV (`sxsloxdtpcjpdobwpwsm`) on 2 November 2026,
  with the product owner's approval. PROD is untouched.

On 2 November 2026 the product owner asked for two things:

- move Reports under **Money**;
- make it an interactive, engaging finance report that can be read down to
  the detail.

They had already chosen, the day before, multi-season trends like their
Power BI model's pages. Its *Fee Breakdown*, *Team Debtor* and *Financials*
pages are the model for this one; *Season Overview*'s players by gender
belongs to a registration report, not this one.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves C8, and the value stream's *Validate* stage, which compares the pilot with the club's past seasons |
| 2_business    | **Changed.** **BR199** is new: a team's share of a family's bill is split by the bill's lines, and its payments and balance follow in the same proportion. BR142 and BR143 apply unchanged. The season figures are read by the admin, treasurer and committee, as the existing finance summary is (#84); a family's bills by the admin and treasurer only (BR78) |
| 3_information | **No change.** No table. Two read-only functions put an imported season (`historical_invoice`, 0101) and a live one (`registration`, `registration_price`, `payment`) into one shape |
| 4_application | **Changed.** `/registrar/reports` moves under Money and opens on **Finance**; scope 42's three summaries move to a **Season summary** tab. C8 gains trends, season comparison and drill-down in the [application services](../ea/4_application/1_application-services.md) |
| 5_technology  | **Changed.** Migration 0102 with its test `supabase/tests/82_*`. No dependency: the charts are HTML and CSS, with one small client component for tooltips |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | Reports sat under Season: one season, three summaries, no trend. An imported season showed $0 outstanding, because history is not a debt |
| **Target** (delivered) | Reports sits under Money and opens on every season the club holds, imported or live, read the same way. Inside a season: its figures against the season before, what its bills were made of, when they went out, each team's share, and each family's bill with its lines |

## Work packages and deliverables

### WP1 — One reading of every season (0102)

- **Deliverables:** `supabase/migrations/0102_the_finance_report.sql`:
  - `finance_bills`, `finance_bill_lines` and `finance_registration_team`,
    internal, with execute revoked from every API role. Together they give
    an imported invoice and a live registration the same shape;
  - `app_finance_report(club)`: each season's billed, collected,
    outstanding, credits, bills and how many still owe, its components, its
    months and its teams. For the admin, treasurer and committee;
  - `app_finance_bills(club, season, team, owing, search, limit, offset)`:
    one page of bills, the largest balance first, each with its family,
    players, teams and lines. For the admin and treasurer.
- **Tests:** `supabase/tests/82_the_finance_report.sql`, 6 scenarios.
- **Outcome:** the report and the list of bills cannot disagree about what a
  season billed.

### WP2 — The report

- **Deliverables:**
  - `src/web/nav.ts`: Reports moves to the Money group, first in it.
  - `src/app/registrar/reports/page.tsx`: two tabs, *Finance* and *Season
    summary*. One `season` choice scopes everything below it, and every
    filter is a link or a GET form, so a view can be bookmarked.
  - `src/app/registrar/reports/FinanceReport.tsx`:
    - stat tiles, each with its change on the season before, said in
      words;
    - **Every season:** a bar per season, collected then outstanding,
      clickable to choose it;
    - **What the bills were made of:** ranked bars, with the sibling
      discount the one reduction;
    - **When the bills went out:** monthly columns on one axis, with the
      count in the tooltip and a table view;
    - **Teams:** sortable, each team linking to its bills;
    - **Bills:** filtered by team, by balance or by name, paged, each
      opening to its lines.
  - `src/app/registrar/reports/ChartTips.tsx`: one tooltip, on hover and
    keyboard focus, inserted as text.
  - `src/data/finance-report.ts` and `src/web/finance-report.ts` (22
    tests): choosing the season, the changes, the axes, the sorting and
    the paging.
  - `src/app/globals.css`: three series colours from the data-viz reference
    palette, validated on this board's dark and light surfaces.
- **Outcome:** a treasurer sees three seasons at a glance and can follow any
  figure down to one family's bill.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Every season's billing, collection and balance; components; months; teams; bills | Players by gender and by age group, and who came back: a registration report |
| Imported and live seasons read the same way | Export to a spreadsheet or PDF |
| The committee reads the figures; the admin and treasurer the bills | A committee view of bills with families' names hidden |
| Light and dark schemes from validated colours | Texture for printing in black and white |

## Gap notes

- **A registration report.** The Power BI model's *Season Overview* counts
  players by gender, by playing group and by Academy. All of it is now in
  the database (0101), and it belongs on a third tab with its own
  function.
- **Export.** A treasurer will want the bills in a spreadsheet. The function
  already returns rows; an export needs a route that streams them, and a
  decision about who may download a file of families' debts.
- **"No team" carries the largest balance in every season.** It is the
  invoice lines that name nobody in the registrations export (scope 132's
  gap note) and senior players in no team list. Asking the club for 2024 and
  2025 team lists would shrink it.
- **Checked at desktop width only.** The page was rendered and read in a
  browser on sample data built from Light Horse FC's real totals. A phone
  width could not be set in that browser; the CSS has a narrow layout,
  unchecked by eye.

## Open questions

- None. The reading rights follow #84 and BR78, already answered.
