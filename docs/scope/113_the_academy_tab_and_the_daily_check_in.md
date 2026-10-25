# Project Scope — The Academy Tab and the Daily Check-in

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/academy-tab-and-check-in`, after the fix
branch `claude/fix-coach-teams-and-night-answers`.

[Scope 112](./112_the_academy_in_the_technical_directors_workspace.md)
planned the academy and built its training nights and game time. The
product owner tested it as `qa.coach` and as the Technical Director
(October 2026) and asked for four things:

1. The Technical Director's workspace **looks like the Superdesign draft**
   *Technical Director · Academy* (project `46a311a6`, draft `cada6eb6`),
   not the long page it had become.
2. **The audit material in its own tab**: the corrections waiting and the
   player activity.
3. **An option to collapse every team dugout** at once.
4. **The player's daily check-in, built for a phone**, as drawn in draft
   `bc4a31f0`.

Items 1 and 4 are scope 112's WP6 and WP4, so this scope delivers them as
112 planned, under the same privacy position. 112 is merged and stays as
it was; this document records what was built.

The two defects found in the same test (a coach of two teams saw only the
first, and a night already held read *No answer yet*) are fixed on their
own branch, `claude/fix-coach-teams-and-night-answers`. They need no scope
document, because they change no documented behaviour.

## What the draft asks for, against the app

| In the draft | Built as | Why |
| ------------ | -------- | --- |
| Tabs: Academy, Squads, Corrections, Player activity | The same four, as links (`?tab=`), so each is a page that can be bookmarked and needs no script | The audit material moves to *Corrections* and *Player activity*; what the role may and may not do moves to *Corrections*, beside what it corrects |
| *All academy teams* and one team at a time | A team filter, and **academy teams** (BR184): a Technical Lead marks a team academy on *Squads*. Until any team is marked, every team is shown, with a note saying so | #105's adopted answer |
| Day, Week, Month | A range switch over every panel on the tab | — |
| Training attendances, matches with game time, check-ins | Counted from the rows: marks of *trained* or *late* against the player-nights held; played fixtures with positions recorded; days with a check-in against days asked of players who consented | No invented figures (scope 100) |
| Reports waiting for release | **Not shown**: reports are WP7, not built | A tile counting nothing would be an invented figure |
| Training attendance table, reasons this week | Team, nights, attended, away, still to answer, not marked; the reasons **as players and coaches wrote them**, counted | Grouping free text into "Injury" or "School" would be inventing a category nobody chose |
| Game time | The panel scope 112 built, for the chosen team, with links to track the next match live or enter the last one | — |
| Wellbeing, U13 and older: team averages with a line per measure | Averages of what players entered, by day across the range | BR187 |
| Asked to follow up | Answers at the far end of a scale, listed with the day and the run of days (BR187). **Without** *Add a note* or *Tag a coach*: notes are WP5 | #108 |
| RPE this week | Sessions entered each day, by type, with the day's average RPE above each bar. Bars count sessions, which add up; averages do not, so they are printed, not stacked | — |
| Game reflections, player reports | *Coming soon* panels: WP5 and WP7 | — |
| Entries made | Each player's days with a check-in, of the days asked, and their sessions entered | — |
| Assistant note | `AssistantNote`: counts and averages, never a diagnosis | P4; the Assistant does not read these rows |
| This week's calendar | The range's training nights and fixtures, from the rows | — |
| The player's check-in on a phone | `/me/check-in`: the five scales, *Training and sport today*, who sees it and when the consent was given, *Save today's check-in*, and the *Done for today* summary | BR185, BR186 |

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **Changed.** Capability C21, *athlete development*, gains the check-in. P1, P4 (no wellbeing row reaches the Assistant), P5 and P7 (consent before collection) govern it |
| 2_business    | **New rules:** BR184 (academy teams and U13+), BR185 (the check-in's consent), BR186 (the check-in: who writes it, who reads it), BR187 (asked to follow up). **Glossary:** *Academy Team*, *Check-in*, *RPE*, *Entries Made*, *Asked to Follow Up* |
| 3_information | **New data objects:** `wellbeing_entry`, `rpe_entry`; `team.academy`; the consent purpose `ATHLETE_WELLBEING`. Classification: **Regulated — children** for a minor's entries, and health information for everyone's. A retention row; consent wording section 5 |
| 4_application | **New:** `src/web/check-in.ts` (tested), `src/data/check-in.ts`, `/me/check-in`, the check-in card on the player's and guardian's workspaces, and the Technical Director's tabs. `src/web/academy.ts` gains the range, the attendance table and its reasons. `CollapseAll` for team dugouts |
| 5_technology  | **No change.** No new runtime or dependency. One migration, **0096**, applied by hand with approval, with its RLS suite `supabase/tests/96_*.sql` |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | The Technical Director's workspace is one long page: academy panels, every dugout, corrections, activity and permissions. No check-in; no academy teams |
| **Target** (delivered) | Four tabs, the Academy tab as drawn, on real rows. A player on an academy team of U13 or older checks in each day from a phone, once consent is given, and only the people BR186 names read it |

## Work packages and deliverables

### WP1 — Academy teams (BR184)

- **Deliverables:** `team.academy` and `app_set_team_academy`, which only a
  Technical Lead may call; the *Academy team* switch on each team in the
  *Squads* tab. `app_check_in_applies(person)`: on a current academy team as
  a player, in an age group of U13 or older. Age groups are free text, so
  `U<n>` counts from 13, an open-age group (*Senior Men*) counts, and an
  unknown one does not.
- **Outcome:** the check-in reaches the players the club means, and no one
  else.

### WP2 — Consent (BR185)

- **Deliverables:** the purpose `ATHLETE_WELLBEING` on `consent`;
  `app_may_consent_to_check_in`: the person from 18, a guardian holding
  authority until then; `app_grant_check_in_consent` and
  `app_withdraw_check_in_consent`. The guardian's workspace shows the
  agreement and the way to withdraw it for each child it applies to, and an
  adult player gives it on the check-in page. Wording in
  [consent wording §5](../annexes/consent-wording.md#5-daily-check-in--athlete-wellbeing).
- **Outcome:** nothing is collected until the right person has agreed, and
  withdrawing stops new entries at once.

### WP3 — The check-in (BR186, BR187)

- **Deliverables:**
  - Migration 0096: `wellbeing_entry` (one per player per day, five scores
    from 1 to 10) and `rpe_entry` (date, type, RPE 1 to 10). A trigger
    refuses an entry without consent, outside WP1's players, or outside its
    window: a day's wellbeing only on that day, sessions up to seven days
    back. Both allow one day either side for the club's time zone.
  - RLS: the player writes their own. The player, their guardian, the
    coaches and assistant coaches of their current teams, and the Technical
    Leads read. Managers, the committee, the admin and teammates do not.
  - `src/web/check-in.ts`: the scales and their end labels as the club wrote
    them, the RPE wording (#109), form parsing, averages, entries made and
    follow-ups. All of it is tested.
  - `/me/check-in`: one screen for a phone. Every choice is a 44px radio
    button and works without script. Saving fills the *Done for today*
    summary.
- **Outcome:** the club's five measures and RPE, entered once a day.

### WP4 — The Technical Director's tabs and the Academy tab (WP6 of 112)

- **Deliverables:** `TechnicalDirectorWorkspace.tsx` split into four tabs;
  `src/app/me/_academy/AcademyTab.tsx` with the panels in the table above;
  `periodOf`, `attendanceByTeam` and `reasonsGiven` in `src/web/academy.ts`,
  and `teamAverages`, `entriesMade`, `followUps` and `rpeByDay` in
  `src/web/check-in.ts`, all tested.
- **Outcome:** the draft, on real data.

### WP5 — Collapse every dugout

- **Deliverables:** `src/app/_components/CollapseAll.tsx`, used on *Squads*
  and on a coach's workspace when they coach more than one team.
- **Outcome:** a long list of teams folds away in one tap.

### WP6 — Docs

- **Deliverables:** this document; rules BR184 to BR187 and the glossary;
  data objects; the retention row; consent wording §5; application
  components; capability C21; READMEs.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Academy teams, consent, the check-in, its reading | Game reflections, comments and staff notes (112's WP5) |
| The four tabs and the Academy tab | Player reports (112's WP7), and their tile |
| Collapse every dugout | The coach's own Academy view (the same panels for their teams) |
| Follow-ups listed | *Add a note*, *Tag a coach* |
| | Including the check-in tables in `export_club_data` |
| | A check-in for a player under 13 on an U13 team |

## Gap notes

- **The club export.** `export_club_data` (0031) stops at appearances. It
  leaves out the check-in tables, and also every table added since,
  including 0095's. One migration that recreates the function closes the
  gap for all of them.
- **Under thirteen on an U13 team.** #105 lets a twelve-year-old in an U13
  team take part, but a child under 13 has no account (0060), and a
  guardian entering a child's mood would not be the child's own answer. So
  they do not check in until 13 ([#116](./open-questions.md)).
- **The coach's view.** The coaches of a player's teams may read the
  check-in (BR186). The panels are written to take any set of teams, so the
  coach's workspace can show them for their own teams next.
- **Notes.** A follow-up is a conversation a person decides to have. The
  note that records it is 112's WP5.

## Open questions

Mirrored in [the open-questions log](./open-questions.md).

- **#115** How long are check-in entries kept? Adopted: **the current and
  the previous season**, as operational ephemera, subject to #30's legal
  review.
- **#116** Does a player under 13 on an U13 academy team check in? Adopted:
  **not until they are 13** and have their own account.
