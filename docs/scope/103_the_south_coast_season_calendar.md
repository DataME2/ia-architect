# Project Scope — The South Coast Season Calendar

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/season-calendar-south-coast`, after [scope 101](./101_the_season_calendar_by_region.md) and [scope 102](./102_a_team_plays_in_a_competition.md).

The product owner saw scope 101's SEQ Advanced & Metro calendar and asked
(October 2026) for the next region the same way: Football Queensland's 2027
**SEQ Conference — South Coast** calendar
(`docs/annexes/2610003-General-2027-Season-Calendars-V1_SOC.pdf`). Scope 101
built the registry so that a region is one data file. That mostly holds, but
South Coast prints three things the SEQ calendar does not:

- a community senior competition that plays **"commencing Wednesday"**;
- the **NSW school holidays**, beside Queensland's;
- a row of **themed rounds**.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves the same goal as scope 101, for the next region |
| 2_business    | **No new rule.** BR178 covers it: the calendar is shown as printed, with its source and its "subject to change". The PDF's own inconsistencies are shown as printed and raised as [open questions #91–#96](./open-questions.md). The South Coast PDF calls the region the "SEQ Conference — South Coast", which is the first evidence for open question #90 |
| 3_information | **Reference data, public, no personal data, no migration.** A second transcription, `src/web/season-calendar-fq-2027-south-coast.ts`. Football Queensland's carnival list and Queensland school holidays are the same statewide in both PDFs, so they are shared, not copied (`FQ_2027_EVENTS`, `FQ_2027_QLD_SCHOOL_HOLIDAYS`). Two optional fields join the calendar model: a competition's `playedOn` day, and a calendar's `otherHolidays` |
| 4_application | No new page: `/seasons/fq-2027-seq-south-coast` is prerendered from the registry. On a weekend card, a Wednesday competition's games sit in their own block, dated to the Wednesday. NSW school holidays get their own tag. The teams screen (scope 102) offers both 2027 calendars, each labelled by region |
| 5_technology  | **No change.** No dependency, no migration |

## Plateaus

| Plateau                | State |
| ----------------------- | ----- |
| **Baseline** (before)  | One region of ten had its calendar (SEQ Advanced & Metro). South Coast was listed as "coming" |
| **Target** (delivered) | South Coast's 2027 season is in the app, covering 15 rows across 44 weekends: <ul><li>every round, catch-up, final and play-off;</li><li>the nomination dates and the Foundation rounds;</li><li>the themed rounds and the representative weekends;</li><li>Queensland and NSW school holidays, and Easter.</li></ul>A club whose season is 2027 can enter its teams in South Coast competitions |

## Work packages and deliverables

### WP1 — The transcription

- **Deliverables:** `src/web/season-calendar-fq-2027-south-coast.ts`.
- **How it was read:** as in scope 101. Word positions were mapped onto the 44 weekend columns. A merged cell is a midweek fixture on the first of its two weekends. Some things are read from colour alone:
  - nominations, open (green) on 8 January and closed (red) on 29 January, for every community and MiniRoos row;
  - the themed rounds (magenta);
  - the NSW school holidays (cyan);
  - the representative weekends (green).
- **What is not there:** this PDF prints no professional registration windows, and its Girls United row is empty, so the calendar has neither.

### WP2 — Two things the model did not have

- **Deliverables:** `playedOn` and `playDate()`, `otherHolidays`, and `Foundation 1&2` in `readCell`, all in `src/web/season-calendar.ts`, and their tests in `season-calendar.test.ts`.
- **A Wednesday competition:** the four community senior competitions are printed under a second date row, "Commencing Wednesday: Monday Rounds are played prior". Each date in that row is the Wednesday before the column's Friday. The plan stays keyed by the Friday, so the grid, the pulse and the teams screen do not change. `playDate()` gives the day actually printed.
- **A second state's school holidays:** printed for NSW, shown as a tag of their own. Queensland's remain the calendar's school holidays.

### WP3 — The page

- **Deliverables:**
  - in `SeasonPanel.tsx`, the Wednesday block on a weekend card, the NSW tag, and the followed competition's first round dated by `playDate()`. The group filters now offer only the groups a calendar has, since South Coast has no Advanced Juniors;
  - the registry entry in `src/web/season-calendars.ts`.
- **Outcome:** a reader opens South Coast from `/seasons`. In March they see Seniors 5/6 round 1 under "Week commencing Wednesday 3 Mar", above the weekend's games.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| SEQ Conference — South Coast, 2027: every row the PDF prints | The other eight Queensland regions |
| A competition played on a weekday, and a second state's school holidays | Monday rounds, which the PDF mentions but does not date (#91) |
| The shared statewide carnival list and Queensland school holidays | Professional registration windows for South Coast, which this PDF does not print |

## Gap notes

- **Monday rounds.** If FQ dates them, a competition can carry two days. Until then, the PDF's sentence is shown beside the Wednesday.
- **The remaining regions.** Each is one file like this one, plus one id in the registry. A region that prints something new, as South Coast did, needs a field added to the model before the page can show it.

## Open questions

Raised by the transcription and shown as printed until answered ([#91–#96](./open-questions.md); the rose cell on 22 October is #86 again):

- **#91** — "Commencing Wednesday: Monday Rounds are played prior." On which Monday, and for which competitions? The games are shown on the printed Wednesday, with the sentence beside them.
- **#92** — Juniors 5/6 and 7/8: their names say 15 and 14 rounds, but the notes column says 20 and 21. The grid plays 15 and 14, so the names and the grid are trusted.
- **#93** — Seniors 11/12 goes from round 11 to a catch-up to round 13. There is no round 12, so 21 rounds are played of the 22 promised. The rounds are shown as numbered.
- **#94** — the NSW school holidays (9–23 Apr, 2–16 Jul, 24 Sep–8 Oct) are printed. Do they change any fixture, or are they information for clubs near the border? They are shown as a tag only.
- **#95** — the themed rounds (19 Mar, 7 and 14 May, 2 and 9 Jul): what is each theme? Each is shown as a "themed event round".
- **#96** — the Queensland Cup is statewide, but the two PDFs disagree on the men's finals. Advanced & Metro prints the quarter-final on the 11 Jun weekend and the semi-final on 23 Jul. South Coast prints both as midweek, after 11 Jun and 16 Jul. Each calendar is shown as its own PDF prints it.
