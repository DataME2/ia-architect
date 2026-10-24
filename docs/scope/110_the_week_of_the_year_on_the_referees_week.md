# Project Scope — The Week of the Year on the Referee's Week

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/week-of-the-year`.

A referee coordinator talks in week numbers: "can you do week 43?". The
referee's *Your week* panel on `/me` showed only the season. The product
owner asked (October 2026) for it to show which week of the year it is now.
It now reads, for example, **2026 · WEEK 43 · 19–25 OCT**.

The week is the ISO 8601 one, as Australian calendars and fixture lists
number it: Monday to Sunday, and week 1 is the one holding the year's first
Thursday. "Now" is the club's today (`todayIn`), not the server's.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change** |
| 2_business    | **No change.** No rule changes; availability is still declared per season (BR174) |
| 3_information | **No change.** Derived from today's date; nothing stored |
| 4_application | **Changed.** `isoWeek` and `weekLabel` in `src/web/today.ts`, shown in the *Your week* panel of `src/app/me/_workspaces/RefereeWorkspace.tsx` and its design preview. Row updated in [application components](../ea/4_application/2_application-components.md) |
| 5_technology  | **No change** |

## Work packages and deliverables

### WP1 — The week label

- **Deliverables:** `isoWeek` and `weekLabel` in `src/web/today.ts`, with
  tests in `today.test.ts`, covering a week across two months, week 1
  starting in December, and 2026's week 53. They are used in
  `RefereeWorkspace.tsx` and `src/app/preview/referee/page.tsx`.
- **Outcome:** the referee and their coordinator name the same week.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The current week on the referee's *Your week* panel | Week numbers on the coordinator's designation screens and the season calendar |
