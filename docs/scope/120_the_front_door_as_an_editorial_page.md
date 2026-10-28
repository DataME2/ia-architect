# Project Scope — The Front Door as an Editorial Page

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/homepage-editorial`, cut from
[scope 118](./118_the_front_door_speaks_to_a_club.md)'s branch. It is an
alternative to scope 119, the floodlit front door on branch
`claude/homepage-premium-pitch`; the product owner chooses between them.

On 29 October 2026 the product owner asked for a third attempt at the
homepage, with its own brief: *"PitchPeople — Cinematic Editorial Website &
Motion Experience"*. Scope 118's content stays: the commercial headline,
the two actions, the eight roles, the registration walkthrough and the claim
boundaries. What changes is everything about how the page looks and moves:

- the page is set like a football publication: warm bone paper, ink type,
  one oxide pigment, Instrument Serif and Azeret Mono;
- the hero is a split PITCH / PEOPLE wordmark with a referee rising
  between the lines as the page scrolls;
- an identity drawing and a pinned role study explain the one-Person idea
  by interaction;
- ruled rows and a work table set out the capabilities and their
  boundaries, instead of cards.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** The headline, tagline and claim boundaries are scope 118's. The page claims nothing new: no statistic, testimonial, partner or certification |
| 2_business    | **No change.** No rule, service or role changes. The new copy cites existing rules (BR1, BR3, BR5, BR13, BR15, BR43, BR60, BR61, BR78, BR109, BR121, BR142, BR162), and the test that each one exists covers them |
| 3_information | **No change.** The page still reads nothing. Its people, club and capability list are a fixed dataset in `src/web/home-story.ts`. Each capability is marked delivered, simulated (paying an official online, [scope 76](./76_a_referee_is_paid_online.md)) or advisory (the Assistant, which calls no model), and a test holds the marks to the screens that exist |
| 4_application | **Changed, presentation only.** The [front door's row](../ea/4_application/2_application-components.md) is rewritten. New client components: `ScrollStage`, `IdentityDrawing` and `RoleStudy`. Their motion is pure, in `src/web/home-motion.ts`. `HeroPreview` and `RoleExplorer` are retired, and `RegistrationWalkthrough` and `ScrollReveal` are kept. The page stays prerendered, with no auth call. The bar's markup is unchanged; only its styles are scoped to this page |
| 5_technology  | **Changed.** Two more self-hosted OFL faces join the [Styling row](../ea/5_technology/1_technology-services.md): Instrument Serif (roman and italic) and Azeret Mono (variable, 400 to 600). Each is a latin-subset woff2 in `public/fonts/`, with its licence. The original referee drawing is `public/figures/referee.svg`. No dependency is added: the motion is CSS transforms, SVG and two small scroll handlers |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | Scope 118's front door: pitch-slate bands, a tabbed preview, a role explorer with a hub, the walkthrough, and connected operations and trust bands, in Saira and Public Sans |
| **Target** (delivered) | An editorial page on bone paper. The split wordmark's lines part with the scroll while a referee climbs between them, and it reverses on the way back. Next come an identity drawing that constructs itself and traces a chosen role, and a pinned study whose marker crosses eight roles, with readouts computed from the same position. Then the walkthrough, ruled rows of practice and boundaries, a work table of capabilities as built, and the pilot closing on a cropped wordmark |

## Work packages and deliverables

### WP1 — The editorial system

- **Deliverables:**
  - `public/fonts/instrumentserif-regular-latin.woff2` and
    `instrumentserif-italic-latin.woff2`;
  - `public/fonts/azeretmono-var-latin.woff2`;
  - `public/fonts/licenses/OFL-instrumentserif.txt` and
    `OFL-azeretmono.txt`;
  - in `src/app/globals.css`, the `@font-face` rules and the editorial
    block. That block replaces scope 118's front door block and is
    scoped to `.ed` and to the chrome on that page;
  - `src/DESIGN.md`: a new section for the editorial front door, and a
    Gaps & Decisions entry.
- **Outcome:** a distinct public identity that cannot leak into a
  workspace, a status pill or a form.

### WP2 — The signature hero

- **Deliverables:**
  - `public/figures/referee.svg`: an original drawing of a grassroots
    referee signalling, with a paper keyline;
  - `src/app/_components/ScrollStage.tsx`;
  - the hero in `src/app/page.tsx`;
  - in `src/web/home-motion.ts`: `runwayProgress`, `passProgress` and
    `enterProgress`, with tests.
- **Outcome:** the wordmark parts and the referee climbs from one progress
  value. The movement is 20vh up, 20vh down and 24vh of climb, scaled to
  1.04, reduced on tablets and phones, and off with reduced motion. The
  opening reveal starts on an animation frame after hydration, and never
  hides the actions.

### WP3 — The interactive explanation

- **Deliverables:**
  - `src/app/_components/IdentityDrawing.tsx`;
  - `src/app/_components/RoleStudy.tsx`;
  - in `src/web/home-motion.ts`: `STUDY_ARC`, `arcPoint`, `arcPath`,
    `stationT`, `stationAt` and `percent`, with tests;
  - in `src/web/home-story.ts`: `IDENTITY_ROLES` and `DEFINITIONS`.
- **Outcome:** a visitor sees one Person hold several roles, by choosing
  them or scrolling through them. Every readout is derived from the same
  position as the drawing.

### WP4 — The editorial page

- **Deliverables:**
  - `PRACTICE`, `BOUNDARIES` and `WORK` in `src/web/home-story.ts`, with
    tests;
  - the practice rows, work table, pilot, colophon and closing wordmark
    in `src/app/page.tsx`;
  - the walkthrough, restyled.
- **Outcome:** what the platform does, where it stops and what is built,
  in one continuous ruled structure.

## How the brief was read

| The brief asks | Delivered as | Why |
| -------------- | ------------ | --- |
| A cut-out adult grassroots figure; "use an approved local image asset where one exists" | An original SVG line drawing of a referee, bundled locally | The repository holds no images. A drawing has no licence question and no runtime request |
| Muted ink `#6E6A61` for secondary metadata | Used for lines only. Small text is set in secondary ink | Muted ink is 4.2:1 on bone, under AA. The brief also asks for adequate contrast |
| Upper line 20vh up, lower line 20vh down, figure 24vh up, with the overlap kept | Those distances, with the figure sized by viewport height (about 74vh) so its legs still cover PEOPLE at the end of the split | At a fixed size the figure would leave the lower line entirely |
| Status in the demonstration previews | A mark and a word, the mark a shape (dot, ring, oxide square, diamond) | The palette allows one pigment. The workspaces keep their coloured pills |
| A fixed navigation bar | The existing sticky bar, restyled only while the editorial page is shown (60px, bone, 14px blur, hairline) | The bar is shared by every screen. A second header would duplicate its links |
| A closing composition that finishes on the brand | The global footer is hidden on this page only, and the page closes on its own colophon and the cropped wordmark | A link footer below the wordmark would end the page on links |
| A role study with "the active illustrative workflow step" readout | The readouts are role, holder, roles held and path | The walkthrough has its own step count. A second step readout in the study would not correspond to anything it draws |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The front door's look, motion and copy, and the bar's look on that page only | The authenticated workspaces |
| A local, original referee figure | Photography or commissioned illustration |
| Light mode | A dark editorial variant (the page stays bone in both schemes) |

## Gap notes

- **Dark mode.** The editorial page is light in both schemes, like a
  printed page. A dark variant would need its own ink and paper values,
  and oxide checked against them.
- **The figure.** It is a line drawing made for this page. A commissioned
  illustration or a licensed photograph would replace
  `public/figures/referee.svg` and keep the same positioning.
- **Choosing between 119 and 120.** Both branches change the front door
  block of `globals.css`, so only one should merge. The other branch is
  then closed.

## Open questions

None. The readings above are recorded in the table, and the product owner
can overturn any of them.
