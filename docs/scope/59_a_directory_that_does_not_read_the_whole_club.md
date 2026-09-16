# Project Scope — A Directory That Does Not Read the Whole Club

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/people-filtering-at-scale`.

The question this initiative answers was asked directly: **what happens to
the People directory when a club reaches eight hundred registered people?**
`loadPeople` fetched every `person`, every `person_role` and every
`guardianship` row for the whole club on every visit to
`/registrar/people` — unfiltered and unpaginated — then built the entire
directory in memory and searched it there. [Scope 43](./43_the_screens_hold_up_and_say_so.md)
named this exact gap and did not close it: *"Nothing is measured against a
database... the query half has no harness."* This initiative is that
missing half, for the one screen a registrar is most likely to open with a
search box already in mind.

## What was actually wrong

At the pilot club's size the pattern is invisible — twenty rows, one round
trip, done before anyone notices. It does not fail gracefully as the roster
grows; it fails by degree. Every keystroke in the search box is a fresh
request for the whole club's `person` table, the whole season's
`person_role` table, and every `guardianship` row the club has ever
recorded, discarding all but the handful of rows that matched. At 800
people the directory-builder is running substring comparisons across the
full roster on the server, on every request, before a registrar sees a
single row.

## The fix: push the decision into the query

`ilikePattern`, `parseRoleFilter`/`UNROSTERED`, and the pagination helpers
(`PAGE_SIZE`, `parsePage`, `pageCount`, `clampPage`, `rangeFor`) in
`src/web/people-view.ts` are pure — they decide *what to ask for*, not how
to ask for it, so they are tested the same way as everything else in that
file: without a browser or a database.

`loadPeople` now takes an optional `{ query, role, page, pageSize }` and:

- Filters by name or email with a safe, escaped `ILIKE` pattern, in the
  database.
- Filters by season role — including **"no role this season,"** the one
  filter that cannot be a column check and needs a `person_role` lookup
  first — before the `person` query runs, not after.
- Fetches one page of `person` rows (`.range()`, `{ count: 'exact' }`), then
  scopes `person_role` and `guardianship` to *that page's* person ids rather
  than the whole club.
- Still resolves guardian and dependant names correctly when the other end
  of the relationship falls on a different page — a second, ids-only
  `person` fetch for whichever referenced ids are not already on the page,
  used only to name them, never returned as rows of the directory.

`loadPeopleRoleSummary` answers the "how many of each role" line without
ever fetching a `person` row: a `head: true` count for the total, and a
`person_id, role` fetch for the season, fed through the same `summariseRoles`
the pure layer already had reason to have.

## Why the role summary is a second query rather than a side effect of the page

The counts shown at the top of the screen are club-wide — "12 players, 3
referees" — regardless of which page or filter is currently applied. Deriving
them from one page's worth of rows would make the numbers change depending
on what a registrar happened to be searching for, which is a worse defect
than an extra query: a registrar trusting a wrong total is worse than one
who has to wait a moment longer for a right one.

## Why a stale page number re-fetches instead of clamping in advance

A page number arrives from a URL a registrar might have bookmarked, emailed,
or hand-edited — it is a request, not a fact. `loadPeople` is called with
whatever page was asked for; if the result's own `totalCount` shows that
page does not exist under the current filter, the page is clamped and the
query re-run once. Clamping *before* the first query would need the
filtered total ahead of time, which is the same query being run to find out
whether it needs to be run — the one extra round trip only happens on the
edge case, not on every visit.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** No new goal, capability or principle |
| **2_business** | **No new rule.** The directory's contents and P1's one-row-per-Person guarantee are unchanged; only how much of it is fetched and when |
| **3_information** | **No change.** No table, column or migration |
| **4_application** | `src/web/people-view.ts` gains `ilikePattern`, `RoleSummary`/`summariseRoles`, `UNROSTERED`/`parseRoleFilter`, and the pagination helpers; `loadPeople` in `src/data/queries.ts` is rewritten to filter and paginate in the query, and `loadPeopleRoleSummary` is new; `src/app/registrar/people/page.tsx` gains a role filter and pagination controls |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | Every visit to `/registrar/people` fetched every person, role and guardianship row the club had, built the full directory, then searched and counted it in memory. Cost grew with the whole roster, not with what was shown |
| **Target** | Search, role filtering (including "no role this season"), and pagination run in the query. One page's worth of `person` rows is fetched at a time; `person_role` and `guardianship` are scoped to that page (plus whichever referenced ids resolve a name across a page boundary). The role-count summary is a separate, lightweight, club-wide query that does not depend on what is currently filtered |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | `src/web/people-view.ts` — `ilikePattern`, `RoleSummary`/`summariseRoles`, `UNROSTERED`/`parseRoleFilter`, `PAGE_SIZE`/`parsePage`/`pageCount`/`clampPage`/`rangeFor`; `searchDirectory`/`roleCounts`/`withoutRole` removed as no longer the right shape | **Delivered** |
| **WP2** | `src/web/people-view.test.ts` — 15 new tests covering escaping, wildcard safety, role-filter parsing, and every pagination edge (zero rows, exact page boundary, out-of-range, non-integer) | **Delivered** |
| **WP3** | `loadPeople` rewritten in `src/data/queries.ts` to filter, search and paginate in the query, resolving guardian/dependant names across page boundaries; `loadPeopleRoleSummary` added | **Delivered** |
| **WP4** | `src/app/registrar/people/page.tsx` — role-filter dropdown (including "No role this season"), Previous/Next pagination, and a result count that reflects the current filter | **Delivered** |
| **WP5** | `npm run check` clean (typecheck, 857 unit tests, links, RLS coverage, server-action, accessibility, assistant-autonomy gates) | **Delivered** |
| **WP6** | EA docs and this scope document; [performance-budgets.md](../annexes/performance-budgets.md) and NFR-16 in [requirements.md](../spec/requirements.md) updated to name what changed and what is still not measured | **Delivered** |

## What this initiative does not do

- **No load test against a real database.** The query pattern is bounded by
  code review — one page of `person` rows, roles and guardianships scoped
  to it — not by a benchmark run at 800 rows against Postgres under RLS.
  [Scope 43](./43_the_screens_hold_up_and_say_so.md)'s gap stands for this
  screen too: the *shape* of the query changed, its *cost* was never
  measured either before or after.
- **No index added.** `person.club_id`, `person_role.(club_id, season_id)`
  and `guardianship.club_id` already carry the tenant filter every query in
  this file relies on; nothing here asserts whether an index exists to
  serve the added `.ilike()` or `.in()` clauses efficiently at 800+ rows —
  that is a database-administration question this initiative did not
  investigate.
- **No change to any other screen.** The season queue, registration detail
  and submission pack already had their quadratic fixed in scope 43 and are
  untouched here; this initiative is the People directory specifically,
  because that is the screen the question named.
- **No new business rule and no schema change**, so no RLS behaviour to
  re-verify — `scripts/test_rls.sh` was not re-run for this change, only
  `npm run check`.
