# Project Scope — The Team Dugout and the Competition Calendar

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/pitchpeople`.

Two requests from the product owner (October 2026):

- **The Team Dugout, organised better.** Players, coaches and technical
  directors brought into the app with animation and JavaScript, on a
  football pitch where it helps.
- **The competition by calendar year, per team.** It should be interactive,
  and exportable to Excel or PDF.

The *Team Dugout* is the pilot club's own name for the Team Officials'
interface ([actors and roles](../ea/2_business/1_business-actors-and-roles.md)).
Until now it was a list of names in the coach's workspace.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change** |
| 2_business    | **No rule changed.** BR78 and BR79 hold on the pitch: a coach sees "not clear to play", never an amount. BR62 holds: a decline's reason is visible to the responsible coach and the TD only |
| 3_information | **No change.** The pitch reads `player_profile` (position, squad number), `team_member` and the next fixture's answers. The calendar reads `fixture`. An export is a file the browser builds from what is on the screen; nothing new is stored |
| 4_application | `TeamDugout`, a client component: an animated pitch in three formations, the bench, and the technical area with coaches and the TD. `CompetitionCalendar`: a year, team and month grid with a list view, and Excel and PDF exports. Decisions in `src/web/dugout.ts` and `src/web/competition-calendar.ts` |
| 5_technology  | **No new dependency and no migration.** Excel is written as SpreadsheetML (`.xls`, which Excel opens natively) and as CSV. PDF is the browser's own print-to-PDF of a print stylesheet |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | The coach's squad is a list. Fixtures are a single table per season, with no year view and no export |
| **Target** | The squad runs out onto a pitch in a 4-3-3, 4-4-2 or 3-5-2, by preferred position and squad number. The rest sit on the bench, and the coaches and the TD stand in the technical area. A player's card shows registration, clear-to-play and Saturday's answer. The calendar shows a calendar year across every team, or one team, by month or as a list, and exports either |

## Work packages and deliverables

### WP1 — The Team Dugout

- **Deliverables:**
  - `src/web/dugout.ts` (tested): `FORMATIONS`, and `lineUp()`, which places players by preferred position, fills gaps from utility and secondary positions, and benches the rest. Also `playerStatus()`, which gives the clear-to-play wording and never an amount.
  - `src/components/ui/TeamDugout.tsx`, a client component:
    - an SVG pitch, with players animating in on the first draw and on a formation change;
    - each player a button that opens their card;
    - keyboard reachable, with no motion under `prefers-reduced-motion`.
  - Used in `CoachWorkspace.tsx` and the TD workspace.
  - `src/data/me.ts`'s roster read gains position and squad number.
- **Outcome:** a coach sees the team as a team, and who cannot take the field stands out on the pitch.

### WP2 — The competition calendar

- **Deliverables:**
  - `src/web/competition-calendar.ts` (tested): fixtures grouped by calendar year, then team, then month; a month grid; and the export rows. Also `toSpreadsheetXml()` and `toCsv()`, escaped.
  - `src/components/ui/CompetitionCalendar.tsx`, a client component: year and team filters, month and list views, with **Excel**, **CSV** and **PDF** buttons.
  - `src/data/fixtures.ts`: fixtures across seasons for a club.
  - `/registrar/fixtures` gains the calendar above its table, and the Team Dugout shows the team's own year.
- **Outcome:** "what are we playing this year" is one screen, and it leaves the platform as a spreadsheet or a printed page.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Pitch, bench and technical area; three formations | Saving a chosen line-up for a fixture (a team-sheet record) |
| Year, team and month calendar; Excel, CSV and PDF | A real `.xlsx` file (would need a zip library) |
| | Importing a fixture feed (question 19) |

## Gap notes

- **A line-up is not saved.** Picking a formation is a view; it records
  nothing. A saved team sheet per fixture would be a new data object, with
  a rule about who may set it (BR158's coach), and is the natural next
  step.
- **`.xls` rather than `.xlsx`.** SpreadsheetML opens in Excel, Numbers and
  LibreOffice without a dependency. Excel shows a one-line format notice on
  opening; a true `.xlsx` needs a zip writer.

## Open questions

- None.
