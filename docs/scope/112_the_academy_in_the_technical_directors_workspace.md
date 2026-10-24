# Project Scope — The Academy in the Technical Director's Workspace

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/academy-plan`. **Status: training and game
time built** (WP1–WP3, and those panels of WP6), with migration 0095
**applied to the development project on 2026-10-25**, after suite 95 passed
against it in a rolled-back transaction; WP4, WP5 and WP7–WP10 **planned**. The rules built are BR181–
BR183; every other rule below is a proposal. Each adopted answer stands
until the product owner and the pilot club answer open questions
[#104–#114](./open-questions.md).

North Star FC's technical director sent the club's **Proposed Athlete
Management System** (October 2026). It names four page roles (players,
coaches, managers and technical leads) and eleven modules: training
attendance, game time, wellbeing, RPE, game reflections, the compliance of
those entries, player reports, a document portal, a full calendar, team
chats and a news page. The product owner asked what the Technical Director
needs in their workspace, and how to build it.

[Scope 98](./98_the_technical_directors_workspace.md) gave the Technical
Director a workspace: every squad, the corrections waiting on them, and 30
days of player activity. This scope plans the academy around it. The
Superdesign draft *Technical Director · Academy* (project `46a311a6`, draft
`cada6eb6`) draws the workspace's new **Academy** tab on sample data, and *Player Daily
Check-in* (draft `bc4a31f0`) draws WP4's phone screen.

## Who is who

| The club's page role | In the platform | Today |
| -------------------- | --------------- | ----- |
| Players | A Person with a player registration this season. From 13 they act for themselves; under 13 the guardian holding authority answers availability (BR62, [scope 78](./78_thirteen_decides_money_and_saturdays.md)) | Yes |
| Coach | `team_member` as `coach` or `assistant-coach` on that team, BR158's definition. Sees **their own teams** | Yes |
| Manager | `team_member` as `manager` on that team. Attendance and game time only: **never** wellbeing, RPE, reflections or reports, as the club asked | The role exists; it has no rights yet ([#112](./open-questions.md)) |
| Technical Leads | Club access `technical_director`, and, if [#104](./open-questions.md) says so, `director_of_football` and `head_of_performance`. Sees **every academy team** | TD: yes (scope 98) |
| "All academy" and "U13+" | A team a Technical Lead marks as academy. U13+ means the team's age group is U13 or older ([#105](./open-questions.md)) | New |

## The request against the app

| The club asked for | Already built | The plan adds | WP |
| ------------------ | ------------- | ------------- | -- |
| **Training attendance.** The player says available or not, with a reason. The coach and manager record who trained and why not. Technical Leads see all teams. Training nights from a calendar, or entered by Technical Leads | Nothing for training; BR62 covers matches only | **Training nights** per team, the player's answer and the coach's attendance mark, per player per night | WP2 |
| **Game time.** The player says available or not for games and sees their own minutes. Coaches track minutes **and positions**, live if possible, otherwise after the game. Technical Leads update any team and enter game days | Game availability with a reason (BR62, 0054). The player's own minutes (player workspace). Post-game entry by coaches (BR158). Technical Director corrections with a source (BR177) | **Positions played**, with minutes in each. A **live match tracker**. Managers record (#112). Technical Leads enter game days | WP3 |
| **Wellbeing (U13+).** Daily: motivation, mood, sleep quality, stress, soreness, each 1–10. Coach (not manager) and Technical Leads see a player by day, week or month, and the team's average. Technical Leads comment and tag coaches | Nothing | The **daily check-in**, under a new consent (see below). Staff **notes with tags**, which reach the tagged coach's bell (BR159) | WP4, WP5 |
| **RPE (U13+).** Daily: date, type (gym, team training, individual training, other sport) and RPE 1–10 with a descriptor for each step | Nothing | RPE in the same check-in ([#109](./open-questions.md)) | WP4 |
| **Game reflections (U13+).** After each game: rate your performance 1–10, what went well, what to do better, progress with your **WISH** and why. Coaches and Technical Leads comment | Nothing | The reflection, offered after a fixture the player appeared in, and **comments** on it ([#110](./open-questions.md)) | WP5 |
| **Compliance** of those three: how many entries per player and per team, daily, weekly, monthly | Nothing | **Entries made**: counted, never stored. "Compliance" already means registration compliance here, so screens say *entries made* | WP6 |
| **Player reports.** Coaches complete reports from set fields. Technical Leads amend them, release them to players (held until then; coaches cannot release) and change the fields | Nothing | **Report fields** kept as versions, **reports** written by coaches, **released** only by a Technical Lead | WP7 |
| **Document portal**, choosing who sees each document by individual or page role | Committee documents only (0080) | **Club documents** with an audience: people, roles or teams | WP8 |
| **Full calendar**: amend it, filter events by age group, view it on desktop or mobile. Otherwise a link to an outside calendar | Fixtures by year, team and month (scope 99). FQ season calendars (scope 101). A personal calendar feed (0035, BR32) | Training nights and **club events** in the same calendar, an **age-group filter**, and both in the feed | WP9 |
| **Team chats** | Members do not message each other (scope 106) | **Not planned.** See the gap notes ([#111](./open-questions.md)) | — |
| **News page**, choosing teams | Nothing | **Team notices**: a post addressed to chosen teams, shown in the workspaces of their players, guardians and staff | WP10 |

## Where it lives

- **Technical Director:** a new **Academy** tab on `/me?role=technical`,
  beside *Squads*, *Corrections* and *Player activity*. It has a team
  filter, a *day / week / month* switch, and one panel per module
  (attendance, game time, wellbeing, RPE, reflections, entries made,
  reports waiting for release, this week's calendar).
- **Coach:** the same panels on the coach workspace, for their own teams.
- **Manager:** attendance and game time for their own teams.
- **Player (and guardian):** *Training this week* to answer; from U13,
  **Today's check-in** (wellbeing and RPE in one short form);
  **After the match** for a reflection; **Your reports** once released.

## What is built

| Asked for | Built | Where |
| --------- | ----- | ----- |
| Technical Leads enter training nights and game days | BR181: `app_is_technical_lead` (Technical Director, Director of Football, Head of Performance); `fixture_manage` and `training_session` admit them | 0095 |
| A player says available or not for training, with a reason | BR182: a training night is answered exactly as a fixture is (BR62), through `participation_response.training_session_id` rather than a second table, so who may answer for an under-18, the reason rule and the readers apply unchanged | 0095, *Training this week* on the player's and guardian's workspaces |
| Coaches and managers record who trained, and why not | BR182: `training_attendance`, marked *trained*, *late* or *did not train* with an optional reason, by the team's coach, assistant coach or manager, a Technical Lead, the admin or the coordinator | 0095, each night's sheet on the coach's workspace |
| Minutes **and positions**, live if possible, otherwise after the game | BR183: `appearance_position`, never more minutes than the appearance. The live tracker keeps the match in the browser (a reload or a lost signal loses nothing) and saves at full time; the same page takes the minutes after the match | 0095, `/me/game-time/[fixtureId]` |
| Managers record game time | BR158 extended (#112): `app_coaches_registration` admits `manager` | 0095 |
| Players review their own game time and attendance | *Your minutes by position* and the season's trained count. **Found while building:** `appearance` had no family policy, so a player always read zero minutes; 0095 adds it (BR183) | 0095, the player's workspace |
| Technical Leads review every team | The Technical Director's **Academy** section: this week's training by team (answers and marks, counted per player per night), *Add a training night*, game time by position per team | `TechnicalDirectorWorkspace.tsx` |
| Team chats | Shown as **Coming soon** on the coach's and the Technical Director's workspaces, at the product owner's request, waiting on question #111 | `ComingSoon` panels |

**Deliberately not yet:** the academy flag on a team (#105) arrives with WP4,
when U13+ starts to matter; until then training and game time apply to every
team. The Director of Football and the Head of Performance get BR181's
rights but no workspace lens yet: the lens is still the Technical
Director's alone. A Technical Lead corrects minutes through BR177, with a
source, and does not write positions, which stay with BR158's people.

Also fixed on the way: time fields were unstyled across the app (fixtures,
carnivals, referee availability), and are now 44px like date fields.

## Privacy and safeguarding (decided before anything is built)

Wellbeing, soreness, RPE and a child's own words about a game are **health
and wellbeing information about children**. They belong to the **Regulated
— children** class in the [data architecture](../ea/3_information/3_data-architecture.md),
and health information is sensitive information under Australian privacy
law, which generally needs consent to collect. So, as **proposals**:

1. **Consent first.** A new consent purpose for the check-in and
   reflections. It is granted by the guardian holding authority for a
   player under 18 (BR48, P7), and by the player from 18. Without it the
   check-in is not offered and nothing is collected. Withdrawing it stops
   new entries ([#106](./open-questions.md)). The wording goes in the
   [consent annex](../annexes/consent-wording.md).
2. **Narrow reading.** The player; the coaches of their teams (not
   managers); the Technical Leads; and, if [#107](./open-questions.md)
   says so, the guardian. Never teammates, other parents, the committee,
   or the AI assistant (P4).
3. **A count, never a diagnosis.** The screens show what players entered,
   averaged and counted. Nothing labels a child *at risk*. An answer at the
   far end of a scale is listed as *asked to follow up*, and the follow-up
   is a conversation a person decides to have and records as a note. A
   safeguarding concern goes to the Player Welfare Officer under the club's
   child-safe policy ([#108](./open-questions.md)).
4. **Retention** gets its own rows in the
   [retention schedule](../annexes/retention-schedule.md), still subject
   to question #30's legal review.
5. **Training and game time carry no health data.** WP2 and WP3 can ship
   before the consent exists.

## EA alignment (assessed top-down; applied for WP1–WP3)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **Proposed new capability C21, athlete development and wellbeing**, serving the pilot club's academy as a new driver. P1 (a coach who is also a parent is one Person), P4 (no child's wellbeing or words to an uncontrolled AI service), P5 (all of it tenant-isolated) and P7 (consent before collection) govern it. Scope 100's rule against invented figures governs every number on the Academy tab. This layer must be validated first |
| 2_business    | **Proposed rules**, numbered when approved: **(a)** Technical Leads and academy teams (#104, #105); **(b)** a team manager records attendance and game time for their own team, extending BR158 (#112); **(c)** a player answers each training night like a fixture, BR62's reason rules applied (#114); **(d)** a coach or manager marks attendance; **(e)** positions played are recorded with their minutes; **(f)** the check-in and reflections need their own consent and are read narrowly (#106, #107); **(g)** a far-end answer is listed for follow-up, never labelled (#108); **(h)** a player report reaches the player and guardian only when a Technical Lead releases it (#113); **(i)** a club document is read only by its audience; **(j)** a team notice reaches only the chosen teams' members and their guardians. Glossary: *Training Night*, *Check-in*, *RPE*, *Game Reflection*, *Entries Made*, *Player Report*, *Report Fields*, *Technical Lead*, *Academy Team*, *Team Notice*. Actors: the Team Manager's decision rights |
| 3_information | **New data objects:** `training_session`, `training_attendance`, `appearance_position`, `wellbeing_entry`, `rpe_entry`, `game_reflection`, `reflection_comment`, `player_note` and `player_note_tag`, `report_template`, `player_report`, `club_document` and `club_document_audience`, `club_event`, `team_notice`. A flag on `team` for the academy. A consent purpose. Classification: everything from WP4, WP5 and WP7 about a minor is **Regulated — children**. Retention rows |
| 4_application | **New:** the Academy tab and its panels; the player's check-in, reflection, report and training answers; a live match tracker; documents and notices screens; the calendar's new event kinds and age-group filter. Decisions in `src/web/academy.ts`, `src/web/check-in.ts`, `src/web/match-tracker.ts` and `src/web/player-report.ts`, with tests; loaders in `src/data/academy.ts`. Rows in [application components](../ea/4_application/2_application-components.md) |
| 5_technology  | **No new runtime and no new dependency.** Charts are drawn as SVG, like the Team Dugout. The live tracker's clock runs in the browser. One new storage bucket for club documents, its policies mirroring the rows. About nine migrations, each **applied by hand with approval** before its PR merges, each with its RLS test in `supabase/tests/` |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | The Technical Director sees squads, corrections and player activity. Players answer availability for matches; coaches record minutes, goals and assists after a game. Nothing about training, positions played, wellbeing, load, reflections or reports exists, and documents, calendar and news live elsewhere |
| **Target** | Each academy team's week in one place. Who trained and why not; minutes and positions, tracked live or after the game; from U13, consented daily check-ins and post-game reflections, read only by the people the club named; how many entries each player made; reports written by coaches and released by a Technical Lead; documents, events and notices addressed to the right people |

## Work packages and deliverables

Ordered so each ships on its own. **WP2, WP3 and WP6's attendance and game
time panels carry no health data** and come first; WP4 and WP5 wait for the
consent wording.

### WP1 — Technical Leads, managers and academy teams

- **Deliverables:**
  - Migration: `team.academy` (boolean, set by a Technical Lead);
    `app_is_technical_lead(club)` reading #104's roles; the manager's
    rights (#112); `fixture_manage` gains the Technical Leads, so they can
    enter game days.
  - `src/web/academy.ts`: `isAcademyTeam`, `isU13Plus(ageGroup)`, tested.
  - A check of how a `manager` team member reaches the coach workspace
    today, and the lens if they do not.
- **Outcome:** every later package asks one function who may do what.

### WP2 — Training nights and attendance

- **Deliverables:**
  - Migration: `training_session` (team, starts, ends, venue, cancelled)
    and `training_attendance`, one row per player per night holding
    **the player's answer** (available or not, with a reason) and **the
    coach's mark** (present, absent or late, with a reason). Each half is
    written through its own `security definer` function, so neither side
    can write the other's.
  - *Add a training night* (one date, or a weekly night for the season)
    for Technical Leads.
  - *Training this week* on the player and guardian workspaces, and a
    mark sheet for the coach and manager.
- **Outcome:** who trained, who said why not, and who did not answer.

### WP3 — Game time with positions, and a live tracker

- **Deliverables:**
  - Migration: `appearance_position` (appearance, position, minutes), with
    the positions `player_profile` already uses. The minutes add up to the
    appearance's minutes.
  - `src/web/match-tracker.ts` (tested): a clock, kick-off, half time,
    substitutions and position changes, turned into appearances and
    positions at full time. The clock runs in the browser, so a lost
    signal at the ground loses nothing. Saving needs a connection (BR66).
  - The post-game form gains positions.
- **Outcome:** minutes **and** positions, live or afterwards, by the
  people BR158 (and #112) name.

### WP4 — The daily check-in: wellbeing and RPE (U13+)

- **Deliverables:**
  - The consent purpose and its wording (#106).
  - Migration: `wellbeing_entry` (one per player per day, five scores
    1–10) and `rpe_entry` (date, type, RPE, optionally the training night).
    The player writes their own. Reading follows the privacy section.
  - `src/web/check-in.ts` (tested): the scales with their end labels, as
    the club wrote them; RPE descriptors (#109); day, week and month
    averages; follow-up listing (#108).
  - *Today's check-in* on the player workspace, one screen that works on a
    phone.
- **Outcome:** the club's five measures and RPE, entered once a day,
  collected only with consent.

### WP5 — Game reflections, comments and staff notes

- **Deliverables:**
  - Migration: `game_reflection` (fixture, rating, two answers, WISH
    progress and why) and `reflection_comment`, plus `player_note` and
    `player_note_tag`. A tag writes a `notification` to the tagged coach
    (BR159's inbox).
  - *After the match* on the player workspace, offered for fixtures the
    player appeared in.
- **Outcome:** the player's own view of the game, and the staff's reply.

### WP6 — The Academy tab

- **Deliverables:**
  - `TechnicalDirectorWorkspace.tsx` gains tabs; `AcademyView.tsx` holds
    the panels, also used on the coach workspace for their own teams.
  - `src/web/academy.ts`: attendance by team, minutes by position, team
    averages, **entries made** by player and team, all tested. A figure
    over rows the viewer may not read is not shown as a figure (BR142).
- **Outcome:** the Superdesign draft, on real data.

### WP7 — Player reports

- **Deliverables:**
  - Migration: `report_template` (the fields, versioned; a Technical Lead
    edits) and `player_report` (player, season, template version, answers,
    state *draft*, *submitted* or *released*, who wrote, who released).
    The player and guardian read a report only once released (#113).
  - Write and submit for coaches; amend and **release** for Technical Leads.
- **Outcome:** reports held until a Technical Lead releases them.

### WP8 — The document portal

- **Deliverables:**
  - Migration: `club_document` and `club_document_audience` (a person, a
    role or a team), and a storage bucket whose policies mirror the rows.
    Committee documents (0080) stay where they are.
  - Documents on every workspace, filtered to what the viewer may read.
- **Outcome:** a document reaches exactly the people chosen.

### WP9 — The full calendar

- **Deliverables:**
  - Migration: `club_event` (title, starts, ends, venue, age groups).
  - `CompetitionCalendar` shows training nights and club events beside
    fixtures, with an **age-group** filter and a phone layout. The feed
    (0035) carries them, still with no other person's data (BR32).
- **Outcome:** one calendar instead of a link to another system.

### WP10 — Team notices (the news page)

- **Deliverables:**
  - Migration: `team_notice` (title, body, the chosen teams, author,
    published). Read by those teams' players, their guardians and staff.
  - A notices panel on the workspaces; writing for Technical Leads,
    coaches and the admin. Text only: a photo needs BR57's publicity
    consent for every child in it.
- **Outcome:** news to the teams it concerns, one way, with guardians
  reading what their child reads.

### WP11 — Docs

- **Deliverables:** C21 and the approved rules, the data objects, the
  consent wording, the retention rows, the component rows, the open
  questions resolved, and this document's status updated.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Training nights and attendance | **Team chats** |
| Minutes and positions, live or afterwards | Match events with a minute (goal at 63'), the advanced tier (BR102, BR104) |
| Wellbeing, RPE and reflections, with consent | Injury and medical records; GPS and wearables |
| Entries made, averages and follow-up lists | Scores, rankings or an *at risk* label |
| Reports released by a Technical Lead | Email or push for any of it (a C7 communication, BR127–BR131) |
| Documents, calendar events and team notices | Importing training nights from an outside calendar ([#114](./open-questions.md)) |

## Gap notes

- **Team chats.** Members do not message each other on the platform (scope
  106), and a chat that includes children is a safeguarding decision before
  it is a feature. It needs the club's child-safe policy on electronic
  communication with children: whether guardians are always in the group,
  who moderates, what is kept and for how long. That needs a decision
  record. Team notices (WP10) cover the one-way half now.
- **Load.** RPE becomes training load (RPE × minutes) only with the
  session's length. The club asked for RPE alone; adding minutes is one
  column and a question ([#109](./open-questions.md)).
- **The WISH.** The reflection asks about it as written. Where a player's
  WISH is set and kept is not in the document ([#110](./open-questions.md)).
- **The coach's own view** is WP6's panels scoped to their teams, so it
  costs little once the Academy tab exists.

## Open questions

Mirrored in [the open-questions log](./open-questions.md).

- **#104** Who are the **Technical Leads**? Adopted: the Technical Director,
  the Director of Football and the Head of Performance.
- **#105** Which teams are the **academy**, and what is **U13+**? Adopted: the
  teams a Technical Lead marks as academy; U13+ by the team's age group.
- **#106** Who **consents** to the check-in and reflections? Adopted: the
  guardian holding authority under 18, the player from 18; nothing is
  collected without it.
- **#107** Does a **guardian** read their child's check-ins and reflections?
  Adopted: yes, read only. A child may write less freely for it.
- **#108** What happens after a **worrying answer**? Adopted: an answer at
  the far end of a scale is listed as *asked to follow up* for the
  coaches and Technical Leads; a concern goes to the Player Welfare Officer.
- **#109** **RPE**: which descriptors, and is the session's length recorded
  too? Adopted: the modified Borg CR-10 wording, and no length.
- **#110** What is a **WISH**, and where is it kept? Adopted: not stored;
  the reflection asks the question as the club wrote it.
- **#111** **Team chats**: will the club accept team notices instead, until
  its safeguarding policy decides chats? Adopted: yes.
- **#112** May a **team manager** record attendance and game time? Adopted:
  yes, for their own teams, extending BR158.
- **#113** Who reads a **released report**? Adopted: the player from 13 and
  the guardian holding authority.
- **#114** Are **training nights** kept in an outside calendar today?
  Adopted: no; Technical Leads enter them as weekly nights per team.
