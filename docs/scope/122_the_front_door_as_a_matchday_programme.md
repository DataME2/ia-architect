# Project Scope — The Front Door as a Matchday Programme

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/homepage-matchday-programme`, cut from
[scope 118](./118_the_front_door_speaks_to_a_club.md)'s branch. It is a
fourth homepage attempt, an alternative to scope 119 (branch
`claude/homepage-premium-pitch`) and scope 120 (branch
`claude/homepage-editorial`). The product owner chooses one.

On 29 October 2026 the product owner sent the *"Cinematic Editorial Website &
Motion Experience"* brief a second time, now with permission to push. They
asked for **a fresh attempt**, not a refinement of scope 120. This scope
answers the same brief with a different execution. The page is set as a
**matchday programme**, the publication a club hands out at the gate:

- **The masthead.** PITCH and PEOPLE sit on either side of a halfway line,
  with a coach on the centre spot, inside the centre circle, pointing up
  behind PITCH.
- **The draw.** One Person record branches into five roles, like a cup
  bracket run backwards.
- **The programme.** There is a page per role, and the scroll turns them
  beside a contents index.
- **The team sheet.** It lists the capabilities, grouped by area.

Scope 118's content is kept: the commercial headline, the two actions, the
eight roles, the registration walkthrough and the claim boundaries. Scope
120's tested building blocks are reused: the scroll arithmetic, the
`ScrollStage` component, the fonts, and the practice, boundary and
capability data.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** The headline, tagline and claim boundaries are scope 118's. The page claims nothing new: no statistic, testimonial, partner or certification |
| 2_business    | **No change.** No rule, service or role changes. The copy cites existing rules (BR1, BR3, BR5, BR13, BR15, BR43, BR60, BR61, BR78, BR109, BR121, BR142, BR162), and the test that each one exists covers them |
| 3_information | **No change.** The page still reads nothing. Its people, club and capability list are a fixed dataset in `src/web/home-story.ts`. Each capability is marked delivered, simulated (paying an official online, [scope 76](./76_a_referee_is_paid_online.md)) or advisory (the Assistant, which calls no model), and a test holds the marks to the screens that exist |
| 4_application | **Changed, presentation only.** The [front door's row](../ea/4_application/2_application-components.md) is rewritten. New client components: `TheDraw` and `ProgrammeStudy`. `ScrollStage` is reused from scope 120, with the motion arithmetic in `src/web/home-motion.ts` (`indexPosition`, `pageReveal`). `HeroPreview` and `RoleExplorer` are retired, and `RegistrationWalkthrough` and `ScrollReveal` are kept. The page stays prerendered, with no auth call. The bar's markup is unchanged; only its styles are scoped to this page |
| 5_technology  | **Changed.** Two self-hosted OFL faces are added to the [Styling row](../ea/5_technology/1_technology-services.md): Instrument Serif (roman and italic) and Azeret Mono (variable, 400 to 600). An original coach drawing is added as `public/figures/coach.svg`. No dependency is added: the motion is CSS transforms and clip-paths, SVG, and two small scroll handlers |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | Scope 118's front door: pitch-slate bands, a tabbed preview, a role explorer with a hub, a horizontal walkthrough, and connected operations and trust bands, in Saira and Public Sans |
| **Target** (delivered) | An editorial page on bone paper. The masthead's words part with the scroll around a halfway line, and the coach climbs out of the centre circle; it reverses on the way back. Next come the draw, which builds itself and traces a chosen role, and a pinned programme whose pages wipe in over each other while a marker runs down the contents, with readouts from the same position. Then the walkthrough down the side, ruled practice and boundary rows, the team sheet grouped by area, and the pilot closing on a cropped wordmark that draws its letters together |

## Work packages and deliverables

### WP1 — The editorial system

- **Deliverables:**
  - `public/fonts/instrumentserif-regular-latin.woff2` and
    `instrumentserif-italic-latin.woff2`;
  - `public/fonts/azeretmono-var-latin.woff2`;
  - the OFL licences;
  - in `src/app/globals.css`, the `@font-face` rules and the matchday
    programme block, which replaces scope 118's front door block and is
    scoped to `.ed` and to the chrome on that page;
  - in `src/DESIGN.md`, a section and a Gaps & Decisions entry.
- **Outcome:** a distinct public identity that cannot leak into a
  workspace, a status pill or a form.

### WP2 — The masthead

- **Deliverables:**
  - `public/figures/coach.svg`: an original engraving-style drawing of a
    grassroots coach, with clipboard, cap and pointing hand, and a paper
    keyline;
  - the masthead, the halfway line and the centre circle in
    `src/app/page.tsx`;
  - `src/app/_components/ScrollStage.tsx`.
- **Outcome:**
  - one progress value parts the words (20vh each) and lifts the coach
    (24vh, to 1.04 scale), reduced on tablets and phones and off with
    reduced motion;
  - the opening reveal starts on an animation frame after hydration, and
    never hides the actions;
  - the pitch lines fade in under it.

### WP3 — The draw and the programme

- **Deliverables:**
  - `src/app/_components/TheDraw.tsx`;
  - `src/app/_components/ProgrammeStudy.tsx`;
  - `indexPosition` and `pageReveal` in `src/web/home-motion.ts`, with
    tests;
  - `IDENTITY_ROLES[].tag` in `src/web/home-story.ts`, with a test.
- **Outcome:**
  - a visitor sees one record branch into several roles, and one person
    hold several of them, by choosing them or scrolling through them;
  - the page being read is always the one the readouts name, and only that
    page takes focus.

### WP4 — The rest of the programme

- **Deliverables:**
  - `workByArea` in `src/web/home-story.ts`, with a test;
  - in `src/app/page.tsx`: the numbered practice and boundary rows, the
    team sheet table grouped by area, the pilot, the colophon and the
    closing wordmark;
  - the walkthrough, restyled as a vertical stepper.
- **Outcome:** what the platform does, where it stops and what is built,
  in one continuous ruled structure.

## How the brief was read

| The brief asks | Delivered as | Why |
| -------------- | ------------ | --- |
| A fresh attempt at the same brief | A matchday programme: a halfway-line masthead, a coach, the draw, page-turning roles, a team sheet | Scope 120 already answers the brief as a magazine. This answers it as the other football publication |
| A cut-out adult grassroots figure | An original engraving-style coach, bundled locally | The repository holds no images. An engraving reads under ink type, and a coach is the volunteer the audience recognises |
| Pitch geometry | A halfway line along the seam and a centre circle round the coach, hairline and unmeasured | No dimensions are drawn or claimed, so no dimensional model is needed |
| Muted ink `#6E6A61` for secondary metadata | Used for lines only. Small text is set in secondary ink | Muted ink is 4.2:1 on bone, under AA. The brief also asks for adequate contrast |
| A marker on "a defined SVG arc or path" | A square marker on the contents rule, placed as a percentage of the index's height | The brief allows percentages of the stage. A percentage keeps the marker on its row at any size |
| Readouts including "the active illustrative workflow step" | Page, holder, roles held, and index position | The walkthrough has its own step count. A step readout in the programme would not match anything it shows |
| A fixed navigation bar | The existing sticky bar, restyled only on this page | The bar is shared by every screen. A second header would duplicate its links |
| A closing composition that finishes on the brand | The global footer is hidden on this page only, and the page closes on its colophon and the cropped wordmark | A link footer below the wordmark would end the page on links |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The front door's look, motion and copy, and the bar's look on that page only | The authenticated workspaces |
| A local, original coach figure | Photography or commissioned illustration |
| Light mode | A dark editorial variant (the page stays bone in both schemes) |

## Gap notes

- **Choosing between 119, 120 and 122.** All three change the front door
  block of `globals.css`, so only one should merge. The others are then
  closed.
- **Dark mode.** The page is light in both schemes, like a printed
  programme. A dark variant would need its own ink and paper values, and
  oxide checked against them.
- **The figure** can be replaced by a commissioned illustration at
  `public/figures/coach.svg`, keeping the same positioning, if the club
  wants one.

## Open questions

None. The readings above are recorded in the table, and the product owner
can overturn any of them.
