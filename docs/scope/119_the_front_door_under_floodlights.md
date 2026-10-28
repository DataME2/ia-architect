# Project Scope — The Front Door Under Floodlights

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/homepage-premium-pitch`, cut from
[scope 118](./118_the_front_door_speaks_to_a_club.md)'s branch, which is
not yet merged.

On 29 October 2026 the product owner sent the redesign brief again for the
next round of homepage work, with three changes:

- a request for a "premium and immersive" design system;
- light-green, pitch-inspired sections;
- premium dashboards, gradients and graphics, where the first brief asked
  for restraint.

Scope 118 already delivered the brief's structure and content: the
headline, the two actions, the role explorer, the walkthrough and the new
type. This scope changes **how the front door looks**:

- the hero becomes a pitch at night under floodlights;
- the role explorer and the connections sit on light turf;
- the product preview becomes a framed club dashboard with a summary of
  what it shows;
- the identity hub is drawn on a dark tactics board;
- the pilot closes on a deep-green pitch.

The colour ramps in `globals.css` take the football names that
[DESIGN.md](../../src/DESIGN.md) has used since the academy palette.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** The headline, the tagline and the claim boundaries are scope 118's, unchanged |
| 2_business    | **No change.** No rule, service or role changes. The page cites the same rules as scope 118, and the test that each one exists still runs |
| 3_information | **No change.** The page still reads nothing. The preview's summary is counted from the fictional rows it shows, by `toneTally` in `src/web/home-story.ts`. It is not a figure about any club |
| 4_application | **Changed, presentation only.** The [front door's row](../ea/4_application/2_application-components.md) names the new parts. `HeroPreview` gains a summary strip, and the hero frames it with a floating identity card. The sections and their order are scope 118's. The page stays prerendered, with no auth call |
| 5_technology  | **Changed, tokens only.** In `globals.css` the ramps are renamed from the landscape names (reef, euc, ochre, oxide, desert, sand) to the football ones (slate, stadium, trophy, redcard, volt, chalk), with **no value changed**. A **turf** ramp is added for grass, with light and dark aliases. The [Styling row](../ea/5_technology/1_technology-services.md) records both. No dependency is added: perspective, gradients and masks are CSS, and the pitch is SVG |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | Scope 118's front door: flat pitch-slate bands, a faint full-width pitch outline behind the hero, a plain white preview card, and the hub on a pale panel. The ramps carry landscape names that no longer match their colours |
| **Target** (delivered) | A night-match hero: floodlight glows, a mown pitch in perspective, and the preview in a glass frame, tilted until it is used. Light-turf bands with mown stripes under the explorer and the connections. A dark tactics board for the hub. A deep-turf close with the centre circle behind the pilot. The ramps carry the names DESIGN.md uses |

## Work packages and deliverables

### WP1 — Tokens

- **Deliverables:**
  - `src/app/globals.css`:
    - the ramps renamed, with the header comment updated;
    - `--turf-50` to `--turf-900`;
    - `--turf-ground`, `--turf-stripe` and `--turf-line`, which are redefined for dark mode.
  - `src/DESIGN.md`: Color & Theming names turf as ground, and a Gaps &
    Decisions entry records this scope.
- **Outcome:** a reader of the CSS sees the same five meanings DESIGN.md
  names, and grass has a ramp of its own that no status can borrow.

### WP2 — The front door's look

- **Deliverables:**
  - `src/app/globals.css`, the front door block:
    - the floodlit hero and the perspective pitch;
    - the glass preview frame;
    - the turf bands (`.home-turf`);
    - the tactics-board hub;
    - the deep-turf close (`.home-close`).
  - `src/app/page.tsx`: the band classes, the hero's floating identity
    card, and the close's centre circle.
- **Outcome:** the page looks like football at the level of a product a
  committee would pay for, and every state still has a word.

### WP3 — A dashboard, honestly counted

- **Deliverables:**
  - `toneTally` in `src/web/home-story.ts`, with tests in
    `home-story.test.ts`.
  - The summary strip in `src/app/_components/HeroPreview.tsx`.
- **Outcome:** the preview reads as a dashboard. Its numbers are only a
  count of the fictional rows below them, each with a dot and a word.

## How the brief was read

| The brief asks | Delivered as | Why |
| -------------- | ------------ | --- |
| "Create new premium and immersive design system" | A new visual layer for the front door (floodlights, turf, glass frame, tactics board), with the system's tokens renamed and extended | §5 limits this iteration to the homepage. The authenticated workspaces keep their look until this direction is validated |
| Semantic colours: Pitch Slate, Stadium Green, Trophy Gold, Card Red, Electric Volt | Already the system's five meanings since the academy palette. The ramps now carry those names, and **values are unchanged** | Changing a status hue would restyle every pill in the product, which §11 rules out for this iteration |
| "purposeful light-green pitch-inspired sections" | Two light-turf bands with mown stripes (the explorer, the connections), and a deep-turf close | Turf is a separate ramp, so a green section never reads as "ready" |
| "Use premium AI-generated dashboards, gradients, ubiquitous glassmorphism, decorative artwork, cartoon footballs, stock imagery and repetitive feature-card grids" | Gradients (floodlights, turf), glass on the preview frame only, SVG pitch artwork, and a dashboard summary strip | **Not adopted:** cartoon footballs, stock imagery and feature-card grids. The same brief asks to "Prefer clean surfaces, disciplined spacing" (§4) and to "demonstrate rather than merely describe" (final principle). The repository also holds no licensed photography |
| "Use complex and premium graphics or additional dependencies for decorative effects" | SVG and CSS (3D perspective, gradients, masks) | They achieve the effect with no package to install or audit. No dependency is added |
| Typography | Unchanged from scope 118: Saira, Public Sans, IBM Plex Mono | Already a new, self-hosted system |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The front door's visual layer, tokens, the preview's summary strip | The authenticated workspaces' look |
| Ramp renaming and the turf ramp, no value changed | Changing any status hue (for example a truer gold) |
| Dark mode for every new surface | Photography, illustration or 3D assets |

## Gap notes

- **Carrying the look into the workspaces** is the next step once this
  direction is approved. The tokens are ready. The work is per screen, and
  the rail, tables and forms would each need a pass.
- **A truer Trophy Gold.** The pending hue is amber (`#d97706`). Moving it
  towards gold changes every pending pill in the product, and its contrast
  needs checking against white and the warn background. It belongs to the
  workspace pass, not the homepage.

## Open questions

None. The brief's "use" list was read as asking for richness, not for
cartoon footballs or stock imagery. The table above records that reading.
The product owner can overturn it.
