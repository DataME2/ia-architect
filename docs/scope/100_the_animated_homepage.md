# Project Scope — The Animated Homepage

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/animated-homepage`.

The product owner designed a new landing page on the Superdesign canvas
(project `46a311a6`, draft "PitchPeople — One Identity. Every Role.", v5,
October 2026) and asked for it to be built into the app. It tells the
product's single idea, one Person in every role, through motion. A person
card stays still while the role lens turns around it. One registration
travels from the family's form to a complete submission. Five roles each
see their own workspace. A squad takes the field, with the referee
appointed. The page also had to work on tablets and phones.

The design arrived as a standalone page: Tailwind from a CDN, its own nav
and footer, and fonts from a font host. It is **adapted, not pasted**, in
the same way scope 89 adapted the frontend overhaul.

| The design had | The app keeps |
| -------------- | ------------- |
| Its own fixed nav, with Sign in and Register | The app's masthead. `/` is prerendered and makes no auth call, so a Sign in link would also be offered to people already signed in ([application components](../ea/4_application/2_application-components.md)). The hero's two actions carry both audiences |
| Tailwind utilities from a CDN | Plain CSS in `globals.css`, on the existing tokens. `design-system.css` generates utilities only from `src/components/ui`, and the page uses none of them |
| Fonts from a font host, and weight 900 | The self-hosted Archivo and DM Mono, never fetched (scope 32). Archivo's variable range stops at 800, so the headings use 800 |
| DM Mono status chips | The app's own `.pill`: a dot and a word, as on every other screen. A status looks the same on the front door as it does in the queue |
| A fixed palette, dark and light sections | The theme's variables, so the page follows the reader's dark mode like every other screen. The hero, Matchday and For clubs panels use the rail colour in both themes |
| `#` placeholder links | The real routes: `/sign-in?next=/me`, `/register`, `/interest`, `/demo` |
| Full-bleed sections | Panels inside the shell, as the old hero was. Breaking out of the shell's width needs `100vw`, which includes the scrollbar and makes the page scroll sideways |

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** The page restates the value proposition from scope 95 (one identity, every role); it adds no goal or driver |
| 2_business    | **No rule changed.** The page states existing rules and invents none. BR78: the bench says "not clear to play", never an amount. Decision 1 holds: the Assistant is not shown, so the volt colour does not appear. There is no free trial, as before |
| 3_information | **No change.** The page reads no data. Its people (Tané Walker, the committee initials) are fictional and labelled as an illustration, so nobody reads them as a real club's records ([which club am I in?](../ea/4_application/2_application-components.md)) |
| 4_application | The front door's landing page becomes the animated story. Two client components, `PersonLens` and `RoleWorkspaces`; the rest is server-rendered markup. The lens list and the roles' previews are in `src/web/home-story.ts`, tested. The page stays prerendered |
| 5_technology  | **No new dependency.** The scroll-linked registration timeline, the reveals and the line-up use CSS scroll-driven animations (`animation-timeline: view()`) as progressive enhancement. A browser without them, or a reader who asks for reduced motion, sees every section in its final state. No script runs on scroll |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A static hero panel and five link cards |
| **Target** | The hero draws its pitch markings; the person card stays while the lens turns through Player, Coach, Referee, Guardian and Committee. On a phone, the ring becomes a row of role chips you can tap. The registration timeline fills as it scrolls past, horizontally from 768px and vertically below that, ending on a complete submission pack. The roles section is a sticky split from 768px, and a swipeable strip above the phone preview below it. Matchday: a 4-3-3 pops in, the bench is "not clear to play" and the referee is appointed, beside a month of fixtures. For clubs closes the page |

## Work packages and deliverables

### WP1 — The story's decisions

- **Deliverables:** `src/web/home-story.ts` holds `LENSES` (each role's line on the card and its status tone), `nextLens()` and `ROLE_PREVIEWS` (what each role's workspace shows). Tested by `src/web/home-story.test.ts`.
- **Outcome:** what the page says lives in one place, typechecked without the DOM.

### WP2 — The page

- **Deliverables:**
  - `src/app/page.tsx`: the hero, How it works, Roles, Matchday and For clubs, on the existing routes.
  - `src/app/_components/PersonLens.tsx`: the still card, the orbiting ring and the phone's role chips. The lens turns every 2.5 seconds unless motion is reduced, and a tapped chip chooses the role.
  - `src/app/_components/RoleWorkspaces.tsx`: the role list and the phone preview. From 768px the list follows scroll; hover, tap and keyboard choose a role at any width.
  - A "The front door" section in `src/app/globals.css`, plus `.pill-info`, which the status set lacked.
- **Outcome:** the designed page on the real tokens, at every width from 360px.

### WP3 — Docs

- **Deliverables:** the front door's row in [application components](../ea/4_application/2_application-components.md); this document and its index row.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The landing page at `/`, at every width | Any other screen's look. Rethemes are still being chosen ([scope 95](./95_pitchpeople.md)) |
| Reduced motion and no-support fallbacks | Sign in in the masthead: it would need an auth call on a prerendered page |
| Fictional, labelled people | Real figures (clubs, registrations): the page makes no query, by design |
| The design's sections and copy | Separate Sign in and For clubs page designs, which were offered as a separate step |

## Gap notes

- **Firefox does not yet run scroll-driven animations** by default. There,
  the timeline shows complete, and sections appear without the rise. Nothing
  is hidden or unreadable; only the motion is missing. A script fallback
  would bring back the scroll handler this page avoids, for polish only.
- **The design's own nav, with section links, is not built.** If the front
  door should link to its own sections, that is a change to the shared
  masthead, which every screen carries.
