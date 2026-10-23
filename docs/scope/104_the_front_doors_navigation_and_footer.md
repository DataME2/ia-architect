# Project Scope — The Front Door's Navigation and Footer

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/homepage-nav-footer`, together with [scope 100](./100_the_animated_homepage.md), which it builds on.

The product owner kept working on the Superdesign homepage (project
`46a311a6`, draft "PitchPeople — One Identity. Every Role.") after scope 100
built it. Version 6 changed the primary dark to `#1A3A52`. Version 7 made the
pitch markings brighter and wider. They then asked for the page to be built
in that style, **with the design's footer**, and for the navigation bar to
follow it, linking to the screens that already exist.

Scope 100 had left both out on purpose. The masthead is shared by every
screen, and the design's links pointed at sections of one page. This scope
builds them for the whole app: the design's bar and footer, linking to the
real routes.

| The design had | The app keeps |
| -------------- | ------------- |
| Section links: How it works, Roles, Matchday, For clubs | Links to the screens that exist: Season calendars, Club administration, Demonstration club, For clubs. The bar is on every screen, and a section link means nothing off `/`. A test fails if a link names a route with no page |
| Sign in, and a Register pill | **Your workspace** and **Register**. The layout is still prerendered and makes no auth call, so a Sign in link would be offered to people already signed in. `/me` sends a signed-out reader to sign-in and a signed-in one to their roles |
| The pitch-line mark | The PitchPeople football mark, which the sign-in panel also carries. Changing the mark is a brand decision, not part of this request |
| A Legal column: Privacy, Terms | Left out. Neither page exists yet (gap note below) |
| `© 2026` | The year the page was built, so it does not need editing every January |
| Full-bleed bands | Full-bleed bands, painted by a spread shadow clipped to each band's height, the way the Broadcast masthead was. `100vw` counts the scrollbar and scrolls the page sideways |

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It is the same value proposition (scope 95), framed by its own navigation |
| 2_business    | **No rule changed.** The bar and footer only link to screens that exist. There is still no Sign in link, and still no free trial |
| 3_information | **No change.** The chrome reads no data. The footer's hosting line is the one the old footer carried |
| 4_application | The application shell's masthead becomes a full-width top bar: the mark and name, four destinations, Your workspace and Register. Below 1,200px the destinations fold into a native `<details>` menu. A three-part footer: brand, Product and Clubs links, and a base line. Both link lists live in `src/web/nav.ts` beside the club menu, and are tested against `src/app`. The front door turns into full-bleed bands in the v7 colours |
| 5_technology  | **No new dependency.** The bar shrinks as the page scrolls through a CSS scroll-driven animation. Without one, or with reduced motion, it stays full height. The phone menu needs no script |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | The Broadcast masthead: a red brand slab and three links (Your workspace, Club administration, New registration). A one-line footer. The front door's sections are rounded panels inside the page column |
| **Target** | A pitch-slate top bar (`#112636`) on every screen. It holds the mark and name, Season calendars, Club administration, Demonstration club and For clubs, plus Your workspace and a white Register pill. It shrinks as you scroll. Below 1,200px the four links fold into a menu. A pitch-slate footer: name, tagline and maker, Product and Clubs links, and the year and hosting line. The front door runs edge to edge: rail-coloured hero and Matchday, white How it works, grey Roles, a `#1A3A52` For clubs band, and pitch markings in white at 35% and 3px wide. The chrome and front door are set in Archivo and DM Mono, as designed |

## Work packages and deliverables

### WP1 — The links

- **Deliverables:**
  - In `src/web/nav.ts`:
    - `SITE_NAV`: the bar's four destinations;
    - `WORKSPACE_LINK` and `REGISTER_LINK`;
    - `FOOTER_NAV`: Product and Clubs.
  - In `src/web/nav.test.ts`: every link in those lists, and in the club menu, must name a route that has a `page.tsx` under `src/app`.
- **Outcome:** a link to a screen that was never built fails the tests.

### WP2 — The chrome

- **Deliverables:**
  - `src/app/layout.tsx`:
    - the top bar, outside the page column, so it runs full width;
    - the phone menu;
    - the footer;
    - the theme colour, now the bar's `#112636` in both schemes.
  - `src/web/brand.ts`: `COMPANY`, so the copyright line and the maker line share one spelling.
  - In `src/app/globals.css`:
    - the old masthead's rules are replaced, including the Broadcast overrides;
    - print hides the new bar.
- **Outcome:** every screen opens under the designed bar and closes on the designed footer.

### WP3 — The front door in the v7 style

- **Deliverables:** in `src/app/globals.css`, scope 100's section is reworked:
  - **Bands:** full-bleed, meeting the bar and the footer.
  - **Colours:** rail `#112636`, pitch `#1A3A52` and line `#234A66`.
  - **Pitch markings:** white at 35%, 3px wide, on the hero and Matchday. The hero's pitch spans the window, as the design draws it, so its penalty boxes sit beside the headline rather than through it. The front door alone clips sideways overflow at the viewport, because the pitch and the turning lens ring are decoration.
  - **Type and shape:** Archivo headings in sentence case, DM Mono eyebrows, round buttons and 16px corners. These are scoped to the front door, the bar and the footer, so the Broadcast overlay's condensed capitals and slanted buttons stop there.
  - **Focus ring:** a green ring that shows on the dark bands.
- **Outcome:** `/` matches draft v7 at every width from 360px.

### WP4 — Docs

- **Deliverables:** the shell's row in [application components](../ea/4_application/2_application-components.md); this document and its index row.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The top bar and footer on every screen | The other screens' own look. Their headings, panels and buttons keep the Broadcast overlay ([scope 95](./95_pitchpeople.md)). Rethemes have been rejected twice, so the rest of the app moves only when the product owner asks |
| Links to built routes only, guarded by a test | Privacy and Terms pages, and the footer links to them |
| The front door in the v7 colours and pitch markings | A new brand mark |
| A bar that shrinks on scroll, without a script | An active-page marker in the bar. The layout is shared and server-rendered, and does not know the path |

## Gap notes

- **The rest of the app is in two styles.** The bar and footer are in the
  design's style on every screen, but each screen's content keeps the
  Broadcast overlay. Moving them all means deleting that overlay, about 430
  lines of `globals.css`, and checking each screen. It is one change, but a
  visible one, and it waits for the product owner.
- **There is no privacy notice or terms page.** A public footer normally
  carries both. The collection notice exists as consent wording in
  `docs/annexes`, but not as a page. Building one is its own scope, with the
  wording reviewed rather than invented.
- **Firefox does not run scroll-driven animations** by default. There, the
  bar keeps its full height, as scope 100's timeline shows complete. Nothing
  is lost but the motion.
