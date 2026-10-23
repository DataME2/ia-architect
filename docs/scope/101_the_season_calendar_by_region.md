# Project Scope — The Season Calendar, by Region

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/season-calendar-2027`.

Football Queensland has confirmed its 2027 season calendars, NPL to FQPL 2
and Metro, as one unified schedule across the statewide pyramid. The product
owner asked (October 2026) for every competition in the published calendar
(`docs/annexes/2610003-General-2027-Season-Calendars-V1_AM.pdf`) to be read
and shown **month by month**, in a way that draws a reader into the app and
is easy to understand. The other Queensland regions follow if the
presentation works. The owner also asked how calendars should be organised
across Australia.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** This serves the existing goal of one place for a club's season. It brings a public, governing-body document into the app rather than adding a stakeholder |
| 2_business    | **BR178 added:** a published season calendar is shown as published, with its source and the publisher's "subject to change", and is never edited by a club or by us. **Season Calendar** and **Region** are added as business objects and glossary terms. The organising answer is **federation → region → calendar**. Football Australia's nine member federations each publish by region, so a calendar belongs to one governing body, one region and one season |
| 3_information | **Reference data, public, no personal data.** The calendar is transcribed into a typed module (`src/web/season-calendar-fq-2027.ts`), keyed by the Friday that opens each weekend, as the PDF has it. No table and no migration: nothing is stored per club, and the publisher's document is the source of truth |
| 4_application | Two static, public routes. `/seasons` lists every federation and region. `/seasons/[calendar]` shows one region's season: a "pulse" of the year (one bar per weekend, as tall as the number of competitions playing), filters by competition group, "follow a competition", and a month of weekend cards with midweek fixtures and key dates. Decisions are in `src/web/season-calendar.ts` and `src/web/season-calendars.ts`. A masthead link was added |
| 5_technology  | **No change.** No dependency and no migration. The pages are prerendered (`generateStaticParams`, `dynamicParams = false`) and the motion is CSS that respects reduced motion |

## Plateaus

| Plateau                | State |
| ----------------------- | ----- |
| **Baseline** (before)  | The Governing Body and Competition existed as business objects. A club's own Matches had a calendar (scope 99), but the governing body's season plan existed only as a PDF |
| **Target** (delivered) | The SEQ Conference — Advanced & Metro 2027 season is in the app: 38 competitions across 44 weekends, every round, catch-up, final, play-off, nomination date, carnival and registration window. Each region is a slot ready for its calendar |

## Work packages and deliverables

### WP1 — The transcription

- **Deliverables:** `src/web/season-calendar-fq-2027.ts`.
- **How it was read:** word positions and filled cells were extracted from the PDF and mapped onto the 44 weekend columns. Where the PDF merges a cell across two weekends, the fixture is midweek, and it sits on the first of the two weekends. Three things come from colour alone, because the PDF prints no words for them:
  - nominations opening (green) and closing (red);
  - the Q-League's two pre-season weekends;
  - the representative weekends.
- **Outcome:** a data file that a correction to the PDF changes by one line.

### WP2 — The decisions

- **Deliverables:** `src/web/season-calendar.ts`, `src/web/season-calendars.ts`, `src/web/season-calendar.test.ts`.
- **What they decide:**
  - how a printed cell reads: `'3 & 4 (MW)'` is round 3 at the weekend and round 4 midweek;
  - the weekends, and their months (a weekend belongs to its Friday's month);
  - the season's pulse, and a followed competition's journey;
  - the key dates in each month.
- **Outcome:**
  - The tests check the transcription against the PDF's own numbers. Every competition plays the rounds its notes promise, the NPL plays 22 and QPL 6 plays 18, and nothing is played at Easter.

### WP3 — The pages

- **Deliverables:**
  - `src/app/seasons/page.tsx` and `src/app/seasons/[calendar]/page.tsx`;
  - `src/app/seasons/[calendar]/SeasonPanel.tsx`;
  - the "Season calendars" section of `globals.css`;
  - the masthead link in `src/app/layout.tsx`.
- **Outcome:** a reader picks a month from the pulse and sees its weekends as cards. Each card lists the competitions by group, with a chip that says the round in words as well as colour. Following a competition shows its whole season as one strip and marks it on every card. The month view uses weekend cards rather than a day grid: football is planned by weekend, and a day grid would leave five empty days per row and hide the real midweek fixtures.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| SEQ Conference — Advanced & Metro, 2027: every competition row, the carnivals, the registration windows, the school holidays and Easter | The other nine Queensland regions (South Coast, Darling Downs, Sunshine Coast, Wide Bay, Central Coast, Whitsunday Coast, Northern, Far North & Gulf ×2). They are listed as "coming" |
| The federation → region → calendar registry, with all nine Australian federations | Calendars from other federations |
| Static, public, prerendered pages | Linking a club's own teams to their competition, so that a coach sees "your U14 Girls are in round 7" |
| | An iCalendar export of a season calendar |

## Gap notes

- **Other regions.** Each one is a data file shaped like the FQ 2027 one, plus one `calendar` id in `season-calendars.ts`. No page changes. The transcription can reuse the same extraction, if FQ publishes them in the same grid.
- **A club's teams in their competition.** This needs a link from Season Competition Entry ([business objects](../ea/2_business/4_business-objects.md#competitions--calendar)) to a calendar competition id. It is a migration, and it is the step that turns a public calendar into "your season".
- **Calendar export.** The scope-99 ICS work exports Matches. A season calendar has no kick-off times, so it would export all-day weekend events.

## Open questions

Raised by the transcription. Each is shown as printed until it is answered ([open questions #86–#90](./open-questions.md)):

- **#86** — two cells are shaded rose, a colour that is not in the legend: NPL Women round 13 (7 May) and the representative row (22 Oct). They are shown as a plain round and are left out, respectively.
- **#87** — "BOND" on the Q-League row (19 Mar). It is shown as "Bond", unexplained.
- **#88** — QPL 4 Women (9/10) has the play-off shading on 17 and 24 Sep but no "PO" text. Play-offs are shown only where the text says so.
- **#89** — the men's second professional registration window is "TBC" across the 18 Jun – 2 Jul weekends. It is shown as 18 Jun – 4 Jul, marked as to be confirmed.
- **#90** — which regions belong to which FQ conference. The PDF names the SEQ, Central and Northern Conferences. Regions are listed flat until this is confirmed.
