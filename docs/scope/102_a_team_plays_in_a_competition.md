# Project Scope — A Team Plays in a Competition

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/season-calendar-2027`, after [scope 101](./101_the_season_calendar_by_region.md).

Scope 101 put the published season into the app, but a club still could not
say which of its teams plays in which competition. The product owner asked
(October 2026) for three things:

- every team linked to the competitions it plays in that season;
- an administrator, registrar or football program coordinator able to read and change those links;
- an audit that records who made which change.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves the same goal as scope 101 and turns a public calendar into the club's own season |
| 2_business    | **BR179 added.** A team's competitions are chosen from the published calendar by four roles: admin, registrar, coordinator and program coordinator. Every change is kept with who and when. The business object **Season Competition Entry**, named in the business model and never realised, is now realised. "Football program coordinator" is the `program_coordinator` role, which scope 62 created for all twelve program coordinator titles. The older `coordinator` role, which already writes teams, is included as well |
| 3_information | Two tables (0094). **`team_competition`** links a team to a calendar competition by the calendar's ids, which are checked for shape in the database and against the calendar in the server action. **`team_competition_change`** is append-only and written by a trigger. Neither holds personal data beyond the id of the account that made the change. The author's name is resolved on read: from their linked Person, otherwise from the account's email |
| 4_application | The teams screen shows a "Competitions this season" block on each team card. Each competition links to the season calendar with that competition followed (`?follow=`). The four editor roles get a picker grouped as the calendar groups competitions, a Withdraw button, and a "Competition changes" history. Decisions are in `src/web/team-competitions.ts` and reads and writes in `src/data/team-competitions.ts`. `EXPECTED_MIGRATION_VERSION` is now 0094 |
| 5_technology  | **One migration (0094), no dependency.** Under the deployment rule, 0094 must be applied to the connected Supabase project **before** the branch merges, and `supabase/tests/94_a_team_plays_in_a_competition.sql` must have run |

## Plateaus

| Plateau                | State |
| ----------------------- | ----- |
| **Baseline** (before)  | A team had a name, an age group and a roster. Its competitions existed only in someone's head or a spreadsheet |
| **Target** (delivered) | Every team lists its competitions, each picked from the published calendar and linked to that competition's season. Four roles change them, and the database keeps a line for every change with its author and time |

## Work packages and deliverables

### WP1 — The link and its history (database)

- **Deliverables:**
  - `supabase/migrations/0094_a_team_plays_in_a_competition.sql`;
  - `supabase/tests/94_a_team_plays_in_a_competition.sql`.
- **The RLS suite proves eight things:**
  - a registrar's entry is logged with who made it, and a program coordinator's move (enter one, withdraw another) is logged as two lines;
  - the history names its authors;
  - the same competition twice is refused, and so is a malformed id;
  - the log cannot be changed or shortened;
  - a coach reads where the team plays, but not the log, and changes nothing;
  - another club reads nothing and cannot enter this club's team, under either club's id.

### WP2 — The screen

- **Deliverables:**
  - `src/web/team-competitions.ts` and its tests, and `src/data/team-competitions.ts`;
  - `TeamCompetitions` in `src/app/registrar/teams/page.tsx`, `EnterCompetitionForm` in `TeamForms.tsx`, and the two actions in `actions.ts`;
  - the `?follow=` support in `SeasonPanel.tsx`.
- **What the screen does:**
  - It offers only the calendars that the team's season covers. A season from 1 October 2026 to 30 September 2027 is offered 2027's calendar.
  - A competition the calendar no longer lists still shows, by its id.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Entering and withdrawing a team; a team in several competitions | Moving a team in one step. A move is a withdrawal plus an entry, so it reads as two lines |
| A history written by the database, read by the four roles | A reason field on a withdrawal |
| Links from a team's competition to the calendar, following it | A coach's or player's own workspace saying "your team plays QPL 1 Women, round 7 this weekend" |
| | Linking fixtures to the competition their team is entered in |

## Gap notes

- **"Your round this weekend" in `/me`.** This needs only a read of `team_competition` for the person's teams, plus `slotsOn` (scope 101) for the current weekend. It is the most visible next step.
- **Fixtures.** `fixture.competition_id` points at the empty shared catalogue (0032). A fixture could instead carry its team's calendar competition. That needs a decision on whether the published calendar becomes the catalogue.
- **A reason on withdrawal.** The table has room for one, so it is one column and one form field away. It was left out because the request asked for who and what, not why.

## Open questions

None new. The calendar's own ambiguities stay with [#86–#90](./open-questions.md).
