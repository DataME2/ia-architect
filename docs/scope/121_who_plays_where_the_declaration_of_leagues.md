# Project Scope — Who Plays Where: the Declaration of Leagues

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/fq-2027-league-ladder`.

On 29 October 2026 the product owner shared Football Queensland's **2027
Provisional Declaration of Leagues** for the SEQ Conference's Metro Men. It
is the proposed composition of the NPL, QPL 1 and 2, and QPL 3 to 6 Metro
leagues, which FQ says is determined by the rules of competition and
sporting merit. The owner asked for it on the Season calendars, beside the
region's 2027 calendar (scope 101).

A season calendar says when each competition plays and names no teams
(BR178). The declaration answers the next question a club asks: **which
league is our team in?** This scope shows it under the SEQ Advanced & Metro
calendar, as published and marked provisional.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves the same goal as scope 101: a club finds its season in one place |
| 2_business    | **Changed.** New [BR191](../ea/2_business/5_domain-context-and-rules.md): a declaration of leagues is shown as published, like a calendar (BR178). Its printed order is not a ladder position, nothing it does not print is filled in, and a declared name is not a Club or a Team in PitchPeople. The [glossary](../ea/2_business/5_domain-context-and-rules.md) and the [business objects](../ea/2_business/4_business-objects.md) gain **Declaration of Leagues** |
| 3_information | **No change to stored data.** The declaration is static reference data in `src/web/league-declarations.ts`, transcribed from the graphic kept as `docs/annexes/fq-2027-provisional-declaration-of-leagues-seq-metro-men.webp`. Nothing is written to the database, and no club's records are read |
| 4_application | **Changed.** The [season calendar's row](../ea/4_application/2_application-components.md) gains `LeagueLadder.tsx` and `src/web/league-declarations.ts`. A calendar page shows the declarations that sit beside it, and the SEQ Advanced & Metro page links to its declaration from the hero. It stays prerendered and public |
| 5_technology  | **No change** |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | The SEQ Advanced & Metro calendar shows when NPL Men, QPL 1 to 2 Men and QPL 3 to 6 Metro Men play, and no teams |
| **Target** (delivered) | Under the calendar, "Who plays where": seven leagues, top league first, with each league's teams as printed (84 team places). Between each pair of leagues it says how they meet: promotion and relegation, or play-offs between QPL 2 and QPL 3 Metro. It names the regional ladders the key lists for play-offs, and the names printed in two leagues. It is marked Provisional, with FQ as the source |

## Work packages and deliverables

### WP1 — The rule and the source

- **Deliverables:**
  - BR191, the glossary entry and the business object;
  - the annex
    `docs/annexes/fq-2027-provisional-declaration-of-leagues-seq-metro-men.webp`;
  - open question 117.
- **Outcome:** a declaration has the same standing as a calendar: the
  publisher's, shown as published, its doubts logged rather than guessed.

### WP2 — The data

- **Deliverables:**
  - `src/web/league-declarations.ts`: `LeagueDeclaration`,
    `FQ_2027_SEQ_METRO_MEN`, `declarationsFor`, `teamCount` and
    `namesInSeveralLeagues`;
  - `src/web/league-declarations.test.ts`. It checks:
    - each declaration sits beside a calendar we hold and cites a file we
      keep;
    - the seven leagues and their counts (12, 12, 12, 14, 12, 12, 10);
    - no league lists a team twice;
    - play-offs join only QPL 2 and QPL 3 Metro;
    - the five names printed in two leagues.
- **Outcome:** a correction to the published declaration is a one-line
  edit, and a transcription slip fails a test.

### WP3 — The page

- **Deliverables:**
  - `src/app/seasons/[calendar]/LeagueLadder.tsx`;
  - the hero link and the ladder in `src/app/seasons/[calendar]/page.tsx`;
  - the `.league-*` styles in `src/app/globals.css`.
- **Outcome:** a club on the SEQ calendar finds its league, and how that
  league meets the ones around it, without leaving the page.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| FQ's 2027 provisional declaration for SEQ Metro Men, as published | Women's, junior and other regions' declarations: each is another entry in `DECLARATIONS` once published |
| How each league meets the next, in words | How many teams are promoted, relegated or play off: not printed |
| Names printed in two leagues, noted as such | Linking a declared name to a Club or Team in PitchPeople |
| The provisional status | Replacing the declaration when FQ publishes the final one (a data edit) |

## Gap notes

- **The final declaration.** When Football Queensland publishes it, the
  teams and `status` in `src/web/league-declarations.ts` change, and so
  does the annex. The test's counts will fail until they are updated
  deliberately.
- **Linking to clubs.** A club's own team could show "Declared: QPL 4 Metro"
  beside its competition entry (scope 102). That needs a name-to-club
  match, which only a club can confirm. It is left out, because a
  wrong match would put a team in someone else's league.
- **Other declarations.** Each is a new entry beside its calendar: SEQ
  Women, the regions' QPL ladders, and the following season.

## Open questions

- [Question 117](./open-questions.md): the key's footnote under
  "Play-offs" is too small to read in the graphic held. Adopted: **not
  transcribed** (BR191). It is settled by the published PDF or by FQ.
