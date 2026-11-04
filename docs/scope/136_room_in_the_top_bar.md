# Project Scope — Room in the Top Bar

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/funny-thompson-ncu476`, restarted from
`main` after [scope 135](./135_the_public_event_calculator.md) merged (#147).
**Built.** No migration, no table, no environment variable.

Scope 135 put the public event calculator in the footer and on
`/season-paths`, because the top bar had no room: a sixth link pushed
*Register* off it on every page. Its gap note left the bar to the front
door's owner. On 4 November 2026 the product owner asked for a space in the
top menu. This scope makes that space and puts **Event calculator** in it.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change** |
| 2_business    | **No change.** The Public event calculator service is the same service; it is now one click from every page instead of from the footer |
| 3_information | **No change** |
| 4_application | **Changed, presentation only.** The application shell's bar gains a destination, two of its labels are shortened, its pills are 8px narrower, and its links fold into the menu below 1,248px instead of 1,200px |
| 5_technology  | **No change** |

## What was measured

The bar stops growing at `--shell-width` (78rem, 1,248px). Inside its
padding it has 1,200px for the mark, the destinations, *Your workspace* and
*Register*. Measured in Chromium against the production build:

| Bar | Room left at 1,248px and wider | At 1,200px |
| --- | --- | --- |
| Before: five destinations | 3px | **−22px**: Register already clipped |
| Event calculator added, nothing else changed | −155px | −203px |
| Club admin and Demo club shortened | −32px | −80px |
| …and pills at 0.75rem a side instead of 1rem | **24px** | −24px |

The last row is what this scope delivers. Room at 1,200px was still short,
so the links now appear from 1,248px, the width at which the bar stops
growing. Below that they fold into the menu, as they already did on smaller
screens. The figures were the same with the web font blocked, so the
fallback typeface fits too.

**A defect is fixed along the way.** From 1,200px to about 1,220px,
*Register* had been partly off the bar with the old five links. No test or
render had covered that width.

## Work package and deliverables

### WP1 — The bar

- **Deliverables:**
  - `src/web/nav.ts` — `SITE_NAV` gains **Event calculator** after Season
    paths. *Club administration* becomes **Club admin** and *Demonstration
    club* becomes **Demo club**, in the bar and its menu only. The footer
    keeps the full names, as do the club screens' own eyebrow and the demo
    banner.
  - `src/app/globals.css` — the bar's pills and *Your workspace* are padded
    `var(--space-3)` a side instead of `var(--space-4)`; the links show from
    `78rem` instead of `75rem`.
  - `src/app/layout.tsx` — the menu's comment states the new width.
  - `src/web/nav.test.ts` — **a tripwire** that fails if the bar holds more
    than six destinations, or if its labels (with *Your workspace* and
    *Register*) exceed the 94 characters that were measured. Twice a link
    added to the bar pushed Register off it, and no other test can see
    that. Counting characters only stands in for measuring width, so the
    test says to render and measure before raising either number.
- **Outcome:** an organiser finds the calculator from any page, and the bar
  fits at every width.

## Verification

- `npm run check`: passes, 1,268 tests (1 new), all gates.
- Rendered and driven in Chromium against the production build, on `/`,
  `/event-calculator` and `/seasons`, at 360, 768, 1,200, 1,247, 1,248,
  1,280, 1,440 and 1,920px, with the web font and with it blocked:
  - *Register* is inside the bar at every width;
  - the destinations are in the bar from 1,248px and in the menu below it,
    never both and never neither;
  - the page you are on is lit: *Event calculator* on `/event-calculator`,
    *Season calendars* on `/seasons`;
  - no page error, and `/event-calculator` and `/seasons` never scroll
    sideways. The front door's scroll width grows as its hero photograph
    drifts (scope 128), but `html:has(.home)` has hidden sideways scrolling
    there since scope 104, so a visitor cannot scroll it.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Event calculator in the bar and its menu | A seventh destination, which needs another fold or a menu of its own |
| Shorter labels for two destinations, in the bar only | Renaming the pages themselves, or the footer's links |
| The links folding below 1,248px | A different bar layout between 1,200px and 1,248px |

## Gap notes

- **The bar has 24px to spare.** That is about three characters. Any
  further destination means folding two together (for example *Season
  calendars* and *Season paths* under one *Seasons* menu) or moving one to
  the footer. Both are the product owner's decision; the tripwire test fails
  first.
- **Two names for two destinations.** The bar says *Club admin* and *Demo
  club*; the footer, the club screens and the front door say *Club
  administration* and *demonstration club*. The short forms are the same
  words cut down, so the link and the place it opens still read as one.

## Open questions

- None.
