# Project Scope — The Referee Board

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/the-referee-board`.
**Status: built.**

Phase 2 of the frontend overhaul ([scope 89](./89_the_person_home_and_the_frontend_overhaul.md),
whose adaptation table this follows). The prompt asked for a dense
board for match officials with three parts:

- an availability grid the official toggles;
- a conflict and card checker with red, amber and green badges;
- a ledger of fees showing pending, verified and simulated payouts.

## What the prompt needed changed first

**The official could not declare their own availability.** The process
has always begun "referee declares availability" (0024's own header), yet
only an admin, registrar or coordinator could read or write it, so the
official told the coordinator, who typed it in. A grid the official
toggles needed that rule changed, so it went through the EA layers:

- **BR174 (new):** a match official declares their own weekly windows for
  the season, saved as a whole, and their periods away. Their own only,
  never another official's, and only with a referee record at that club.
  The coordinator still manages everybody's.
- **Age:** an account exists only from 13 (0060), the age Q80 (C) set for
  an official deciding their own Saturdays, so the rule needs no age test.
- **Migration 0087:**
  - own-row read policies on both tables;
  - add and remove policies for away periods;
  - `app_set_my_availability()`, which replaces the week atomically so a
    half-saved grid is never visible. It writes an audit row.
- **Suite 87:** 7 scenarios.

**What the prompt named and the domain does not have:**

- **Mileage claims:** not built. A claim is the match fee from the dated
  schedule (BR115).
- **A same-club conflict rule:** not built. The conflicts are BR6 and
  BR109 (a player, coach, team official or guardian **in the match**),
  BR7 (two at once), BR8 (classification) and BR9 (suspension).

## Design

The official's Referee workspace on `/me` becomes **"Your match official
board"**. Every panel it had is kept: offered appointments, confirm the
match, accreditation, the payout nomination and the calendar. Three are
new:

- **Your week:**
  - A grid of days (Monday first) × Morning 06–12, Afternoon 12–17 and
    Evening 17–22. Each cell is a 44px toggle; "Weekends only" and "Clear"
    are quick-fills.
  - Saving merges adjacent blocks into windows; all three blocks are the
    whole day.
  - Times declared earlier that don't line up with the blocks are flagged
    before saving rounds them.
  - Below the grid, the official adds and removes their away periods.
- **Conflict and card check:** each live upcoming appointment (offered or
  accepted), worst reason first:
  - **Red:**
    - away that day (BR174);
    - an accreditation or Blue Card expiring before the match (BR111,
      measured at the fixture, not today);
    - the same kick-off as another appointment (BR7).
  - **Amber:**
    - another appointment within two hours, or with no kick-off set;
    - outside the declared week, or nothing declared;
    - a credential the club has not sighted (BR10).
  - **Green:** nothing found.
  - BR6 and BR109 conflicts are never offered at all, and the panel says
    so. BR8 needs the competition's minimum, which the coordinator checks.
- **Owed to you:** a ledger.
  - **Totals:** still owed and paid.
  - **One line per claim:** match, date, fee and status. Statuses are
    awaiting the treasurer, approved, in a payment run, paid (simulated)
    with its `SIM-…` reference, and not approved.

**Code:**

- **Decisions:** `src/web/referee-board.ts`, with 11 tests.
- **Components:** `AvailabilityGrid` (client, `useState` until saved),
  `AppointmentAlerts` and `ClaimsLedger`, in `src/components/ui`.
- **Data and actions:** `src/data/own-availability.ts`, plus three actions
  in `src/app/me/_officiating/actions.ts`. The official is resolved from
  the session, never from the form.
- **Preview:** a development-only page at `/preview/referee`.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR174 added**: the official declares their own availability |
| 3_information | No new table; own-row policies on `referee_availability` and `referee_unavailability` |
| 4_application | The board on `/me`; the preview |
| 5_technology  | Migration 0087, suite 87 |

## Out of scope / gaps

- **A guardian declaring an under-13 official's availability.** An
  official under 13 has no workspace (BR63). The coordinator records it,
  as before.
- **Kick-off length.** "Close" means within two hours. A competition's
  real match length is not recorded.
- **Mileage and a same-club conflict:** see above. Each would be a new
  business rule.
