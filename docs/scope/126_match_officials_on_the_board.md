# Project Scope — Match Officials on the Board

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** **planned**, not built. To be built on its own branch.

The product owner asked for three things on 30 October 2026:

- the match official screens in the Tactics Board style;
- designations that are interactive and synchronised with the calendar and
  the teams by competition;
- an official's reliability, cancellation rate, total hours and average per
  season, computed by the system, and direct messages.

Their references are two Superdesign drafts in project `46a311a6`. *Your
Official Profile* (`2f0a4ebf`) is the official's own view, unchanged since
[scope 111](./111_the_officials_own_profile.md) built it. *Referee Profile
Detail* (`7d7bec9a`) is the coordinator's view of one official: a profile
card, four figures, a history table, messages, what is coming up, and quick
actions. This document is the implementation plan.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves the officiating goals already set. The Assistant does not appear: nothing here drafts or decides |
| 2_business    | **Changed.** New rules: what reliability and the cancellation rate count (proposed BR192), where hours come from (BR193), and who may message whom (BR194, with a decision record). BR12, BR42 and BR112 are kept: only declines and withdrawals with a reason count, and a decline rate is still shown only against a configured maximum. The draft's "Top 5% volunteer" is not built, because ranking officials against each other is a league table of volunteers |
| 3_information | **Changed.** New: a match length per age group (the source of hours), and a message thread per official and club, holding messages |
| 4_application | **Changed.** A coordinator's page for one official. The designations board. A thread on both sides. Figures computed in `src/web/official-figures.ts` |
| 5_technology  | **No change.** Supabase tables with RLS. No dependency is added |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (now)     | The official sees their own matches, credentials and what is coming up (scope 111). The coordinator proposes from a form on `/registrar/designations` and sees officials as a list on `/registrar/referees`. There are no hours, no reliability figure and no messages |
| **Target** (planned)   | The coordinator opens an official and sees the draft's page in chalk and felt, with figures computed from recorded appointments. Designations are a week board of fixtures by competition, with officials as magnets: tap one, tap a fixture, confirm. A thread runs between the coordinator and the official. The official's own page gains the same figures about themselves |

## Work packages and deliverables

### WP1 — The figures (pure, tested)

- **Deliverables:** `src/web/official-figures.ts` and its tests, computing one
  official's season from `match_official_appointment`, `fixture` and the match
  verification:
  - **Reliability:** matches officiated ÷ appointments accepted.
  - **Cancellation rate:** withdrawals after acceptance, with a reason ÷
    appointments accepted (BR42, BR112).
  - **Total hours:** the sum of each officiated match's length by age group
    (WP2).
  - **Average per season:** total hours ÷ seasons with at least one match.
- **Outcome:** one set of numbers that both views read, never stored, so
  they cannot drift from the appointments.

### WP2 — Match lengths

- **Deliverables:** a migration adding `match_length` (club, age group,
  minutes) with RLS, seeded from the governing body's published durations,
  and editable by the coordinator.
- **Outcome:** hours come from something written down rather than a
  guessed ninety minutes.

### WP3 — The coordinator's official page

- **Deliverables:** `src/app/registrar/referees/[personId]/page.tsx`. It has:
  - the profile card (classification, credentials sighted, this weekend's
    availability) and the four figures;
  - the history table, with a CSV export like scope 111's;
  - what is coming up, with the pinned-card offers;
  - quick actions: propose for a fixture, record a swap, open documents.
- **Outcome:** the draft's page, in the Tactics Board style.

### WP4 — The designations board

- **Deliverables:** `/registrar/designations` redrawn:
  - The week's fixtures by competition, from the teams entered in each
    (BR179) and their calendars, are cards on the board.
  - The officials available that weekend (BR62) are Magnets. Tapping an
    official, then a fixture, draws a ChalkLine and proposes the appointment
    after a confirmation. Nothing is dragged.
  - A clash (one official at two kick-offs) is a status with a dot and a
    word.
  - Pure decisions go in `src/web/designation-board.ts`.
- **Outcome:** designations are done on the board, synchronised with the
  calendars, and the form remains for keyboard-heavy work.

### WP5 — Direct messages

- **Deliverables:**
  - A migration for `official_thread` and `official_message`, with RLS: only
    the official, the club's coordinators and the club's admin.
  - `src/data/official-messages.ts`.
  - A thread on WP3's page and on the official's own page.
  - [Decision 18](../decisions/18_a_minor_officials_messages_are_between_adults.md),
    the product owner's answer of 30 October 2026: messages are between
    adults. An adult official is messaged directly. For an official under 18
    the thread is between the coordinators and the official's guardians, and
    the official is not a party to it. RLS enforces this, checking age on the
    day each message is sent.
- **Outcome:** the draft's *Recent communications*, with a safeguarding rule
  written down before the first message is sent.

### WP6 — Motion

- Magnets glide on `--ease-magnet`, a proposal draws its chalk line, and an
  offer pins in on `--ease-pin`. All of it is off under reduced motion.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The four figures, the coordinator's page, the board, threads | Ranking officials ("Top 5%") |
| Match lengths per age group | Football Queensland's own appointments, which arrive as recorded (BR114) |
| | Messages between officials, or to players |

## Gap notes

- **Order.** WP1 and WP3 need no migration and can ship first. WP2 and WP5
  each need a migration, applied to DEV and then to PROD by hand with
  approval.

## Open questions

- **Q120.** Which source sets the match length per age group: Football
  Queensland's published durations, the competition's rules, or the club?
  WP2 seeds from the first until answered.
