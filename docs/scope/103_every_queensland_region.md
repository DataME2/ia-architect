# Project Scope — Every Queensland Region's Season Calendar

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/season-calendar-south-coast`, after [scope 101](./101_the_season_calendar_by_region.md) and [scope 102](./102_a_team_plays_in_a_competition.md).

The product owner saw scope 101's SEQ Advanced & Metro calendar and asked
(October 2026) for the other nine Queensland regions the same way, one
published PDF each (`docs/annexes/2610003-General-2027-Season-Calendars-V1_*.pdf`):

- South Coast;
- Darling Downs;
- Sunshine Coast;
- Wide Bay;
- Central Coast;
- Whitsunday Coast;
- Northern;
- Far North & Gulf, as two calendars: Far North and Gulf.

Scope 101 built the registry so that a region is one data file. That mostly
held. But every PDF has its own rows and its own quirks, and five things
were new to the model:

- a community senior league that plays **"commencing Wednesday"** (South Coast);
- the **NSW school holidays**, beside Queensland's (South Coast);
- a year of **52 weekends**, running to Christmas (Gulf);
- a region's own **local events** (Whitsunday Coast, Central Coast, Far North, Gulf);
- labels printed **across several weeks**, such as a Girls United term league.

Every PDF also names its conference in its title. That answers [open question #90](./open-questions.md).

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves the same goal as scope 101, for every region in the state |
| 2_business    | **No new rule.** BR178 covers it: each calendar is shown as printed, with its source and its "subject to change". **Conference** joins the organising structure, which is now federation → conference → region → calendar, as Football Queensland titles its own PDFs. Each PDF's inconsistencies are shown as printed and raised as [open questions #91–#98](./open-questions.md). #90 is answered by the publisher |
| 3_information | **Reference data, public, no personal data, no migration.** There are nine transcriptions, `src/web/season-calendar-fq-2027-<region>.ts`. FQ's statewide carnival list and Queensland school holidays are the same in every PDF, so they are shared, not copied (`FQ_2027_EVENTS`, `FQ_2027_QLD_SCHOOL_HOLIDAYS`). New optional fields: a competition's `playedOn` day, a calendar's `otherHolidays`, a region's `conference`, and the `Local` event level |
| 4_application | No new page: each `/seasons/<id>` is prerendered from the registry. `/seasons` groups Queensland's regions by conference. On a weekend card, a Wednesday league's games sit in their own block, dated to the Wednesday. NSW school holidays get their own tag, and local events their own key-date label. The teams screen (scope 102) offers all ten 2027 calendars, each labelled by region |
| 5_technology  | **No change.** No dependency, no migration |

## Plateaus

| Plateau                | State |
| ----------------------- | ----- |
| **Baseline** (before)  | One region of ten had its calendar (SEQ Advanced & Metro). The other nine were listed flat as "coming" |
| **Target** (delivered) | All ten Queensland regions are in the app, grouped by conference:<ul><li>**SEQ:** Advanced & Metro, South Coast, Darling Downs, Sunshine Coast;</li><li>**Central:** Wide Bay, Central Coast;</li><li>**Northern:** Whitsunday Coast, Northern, Far North, Gulf.</li></ul>The ten calendars hold 189 competition rows between them. A club whose season is 2027 can enter its teams in any of them |

## Work packages and deliverables

### WP1 — The transcriptions

- **Deliverables:** nine files, `src/web/season-calendar-fq-2027-{south-coast, darling-downs, sunshine-coast, wide-bay, central-coast, whitsunday-coast, northern, far-north, gulf}.ts`, and their registry entries in `src/web/season-calendars.ts`.
- **How they were read:** as in scope 101. Word positions were mapped onto each PDF's own weekend columns. The scope also kept to a few reading rules:
  - **Colour alone:** nominations (green opens, red closes), themed rounds (magenta) and representative weekends (green) are read from colour.
  - **Midweek:** a fixture is midweek only where the PDF prints "(MW)".
  - **Spans:** a label printed across a merged box fills every week of the box, up to the next printed cell.
- **What was left out, on purpose:**
  - text painted in the colour of its own cell, which is invisible on the page (a black "CU" on a black cell in Darling Downs);
  - letters stacked down a column ("E-A-S-T-E-R").
- **By hand, from the rendered page:** Northern's themed-rounds row, whose label is printed white on white, and its club-carnival row, whose cells wrap over several lines. Each hand correction is in the region's file, with its reason in the file's comment.

### WP2 — What the model did not have

- **Deliverables:** in `src/web/season-calendar.ts`:
  - `playedOn` and `playDate()`;
  - `otherHolidays`;
  - `Foundation 1&2` in `readCell`;
  - the `Local` event level.

  In `src/web/season-calendars.ts`: `Region.conference` and `byConference()`. The tests for all of it are in `season-calendar.test.ts`.
- **A Wednesday league:** South Coast's community seniors are printed under a second date row: "Commencing Wednesday: Monday Rounds are played prior". The plan stays keyed by the Friday, so the grid, the pulse and the teams screen do not change. `playDate()` gives the day actually printed.
- **A 52-week year:** the Gulf runs Girls United and futsal to December, so its calendar has 52 weekends. Nothing else needed to change: weekends and months are computed, not listed.
- **Local events:** a region's own key dates, such as the Mount Isa Rodeo, the Mackay Show and Leichhardt Junior Football's carnivals. They show beside FQ's statewide carnivals, labelled "Local".

### WP3 — The pages

- **Deliverables:**
  - `src/app/seasons/page.tsx`, grouped by conference;
  - in `SeasonPanel.tsx`:
    - the Wednesday block on a weekend card;
    - the NSW tag;
    - the followed competition's dates, from `playDate()`;
    - group filters limited to the groups a calendar has;
    - a no-games weekend that names its reason ("Mount Isa Rodeo"), where it used to say the whole state rests.
  - the conference headings and the `Local` key-date label in `globals.css`.
- **Outcome:** a reader opens `/seasons`, finds their region under its conference, and walks its season month by month.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Every row of all nine regional PDFs, as printed | Correcting the PDFs. Their contradictions are open questions, not edits |
| A weekday league, a second state's school holidays, a 52-week year, local events, labels across several weeks | Monday rounds, which South Coast mentions but does not date (#91) |
| FQ's shared statewide carnival list and Queensland school holidays | Professional registration windows, which only the Advanced & Metro PDF prints |
| Local events that have dates | Tables without dates: Whitsunday Coast's club carnivals and sponsor days, and Townsville's local events, all "TBC" |

## Gap notes

- **Monday rounds.** If FQ dates them, a competition can carry two days. Until then, the PDF's sentence is shown beside the Wednesday.
- **Undated tables.** Several PDFs list club carnivals or sponsor days with no dates. Each becomes one `Local` event once a date is printed.
- **Version 2.** FQ will republish ("subject to change"). The extraction is repeatable, so a new version means regenerating each region's file and diffing it, not retyping.

## Open questions

Raised by the transcriptions and shown as printed until answered ([#91–#98](./open-questions.md); the rose cell on 22 October recurs in several regions and is #86):

- **#91** — "Commencing Wednesday: Monday Rounds are played prior." On which Monday, and for which competitions? The games are shown on the printed Wednesday, with the sentence beside them.
- **#92** — South Coast Juniors 5/6 and 7/8: their names say 15 and 14 rounds, but the notes column says 20 and 21. The grid plays 15 and 14.
- **#93** — South Coast Seniors 11/12 has no round 12, so 21 rounds are played of the 22 promised.
- **#94** — the NSW school holidays printed by South Coast: do they change any fixture? They are shown as a tag only.
- **#95** — what is each themed round's theme? Only Northern and Whitsunday Coast name theirs, for example Harmony Round and Magic Round.
- **#96** — the Queensland Cup is one statewide competition, but its dates differ from PDF to PDF. Wide Bay's cup rows even skip a round each. Each calendar shows its own PDF.
- **#97** — rows whose notes disagree with their grid, kept as printed:
  - **Darling Downs:** Seniors 11/12 prints round 13 twice and has no round 12. MiniRoos plays 18 rounds, not 19.
  - **Sunshine Coast:** both MiniRoos rows promise 21 rounds and play 18.
  - **Wide Bay:** Community Juniors 9/10 skips round 12, 7/8 skips round 10, and 5/6 prints round 10 twice.
  - **Central Coast:** JPL 9/10 has no rounds 4 and 5. JPL 5/6 and 7/8 have their round counts swapped.
  - **Northern:** both MiniRoos rows promise 20 rounds and play 21.
  - **Far North:** MiniRoos Tablelands and Johnstone River have no dates yet.
- **#98** — misprints and labels nobody has explained:
  - **Header misprints:** Far North prints "0" for 3 September. Gulf's November–December header is 2026's Fridays, so the columns are read as 2027's weeks.
  - **Unexplained labels:** Far North "SHOW" on 16 July (every row rests). Central Coast "No Norbridge 1–12 July". Sunshine Coast and Wide Bay "IC" (play-off colour). Darling Downs "FOF" and "PRES". Wide Bay "MM". Whitsunday Coast "Rnd Rb". Gulf "Mele". Sunshine Coast "Muster".
  - **Contradictory dates:** Far North's Great Barrier Reef Masters is labelled 29 May – 1 June, but its cell says 25–27 June.
