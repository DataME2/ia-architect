# Project Scope — The Tactics Board Theme

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/tactics-board-theme`.

On 29 October 2026 the product owner supplied a new `src/DESIGN.md`,
*PitchPeople — Tactics Board*: the coach's whiteboard turned into the
club's interface, with green felt, chalk, chalk yellow, magnets and index
cards. They asked for it to be applied in four steps:

1. take the token values in both schemes, with dark as the default;
2. self-host its fonts;
3. map the new tokens into the Tailwind layer;
4. turn every hard-coded colour in `globals.css` into a token.

This scope does those four steps and no more. The screens keep their
layouts, so the board's magnets, cards and motion are not built yet.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** No goal, driver or principle changes. P5 and the Assistant's autonomy are untouched, and the Assistant keeps a colour of its own |
| 2_business    | **No change.** No rule, service or role changes. A status is still a dot and a word |
| 3_information | **No change.** Nothing is read or stored differently |
| 4_application | **Changed, presentation only.** Every screen takes the new palette and type through the tokens. Two rules change meaning with the default scheme. A pressed chip becomes the active strip in chalk yellow. The front door's walkthrough, its boundary note and its preview tabs, the dashboard bars and the checklist marks now use theme tokens instead of fixed dark ramps, which would vanish on felt. No component, route or decision changes |
| 5_technology  | **Changed.** The [Styling row](../ea/5_technology/1_technology-services.md) records the new faces: Space Grotesk, Space Mono and Permanent Marker. The Permanent Marker licence is Apache 2.0, not OFL. It also records the palette and its default scheme. No dependency is added |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | The academy palette (pitch slate, electric volt for the Assistant), light by default with a dark preference, in Saira, Public Sans and IBM Plex Mono. About 196 lines of `globals.css` stated a colour directly |
| **Target** (delivered) | The Tactics Board palette. Felt is the default. The Whiteboard serves a light preference and print. The Assistant's colour is a pale blue. The type is Permanent Marker for headings, Space Grotesk for everything else and Space Mono for figures. `globals.css` states colours only in its two token blocks |

## Work packages and deliverables

### WP1 — Tokens

- **Deliverables:**
  - In `src/app/globals.css`:
    - `:root` holds Felt (DESIGN.md `colors`), and `@media (prefers-color-scheme: light), print` holds the Whiteboard (`colorsLight`).
    - The existing names are kept: `--bg` to `--rail-text-2`, the status families, radius, shadows and motion.
    - New tokens: `--highlight-text`, `--signal`, `--signal-text`, `--magnet-*`, `--frame`, `--radius-card`, `--shadow-magnet`, `--shadow-card`, `--border-width*`, `--dur-magnet`, `--dur-chalk`, `--ease-magnet`, `--ease-chalk`, `--ease-pin` and `--shade`.
    - Categorical tokens move into the token block: the calendar's team colours, the season bars, the season pills and the menu's sections.
  - The ramps keep scope 119's names, take Tactics Board values, and keep only the steps that are used. The volt ramp is removed.
- **Outcome:** one palette, read from DESIGN.md, in both schemes.

### WP2 — Type

- **Deliverables:**
  - `public/fonts/spacegrotesk-var-latin.woff2`, `spacemono-400-latin.woff2`, `spacemono-700-latin.woff2` and `permanentmarker-400-latin.woff2`, from Fontsource 5.3.0, 85 KB in all.
  - `public/fonts/licenses/OFL-spacegrotesk.txt`, `OFL-spacemono.txt` and `Apache-2.0-permanentmarker.txt`.
  - The Saira, Public Sans and Plex Mono files and their licences are removed.
  - The `@font-face` rules and `--font-sans`, `--font-display` and `--font-mono`.
- **Outcome:**
  - Headings of 20px or more are set in the hand at weight 400, so there is no synthesised bold.
  - Smaller text that used the display face falls back to the interface face: eyebrows, the brand name, labels and initials. Tallies move to the mono.
  - The Saira-only `font-stretch` declarations are removed.

### WP3 — The Tailwind layer

- **Deliverables:** in `src/app/design-system.css`:
  - `accent-foreground` now points at `--highlight-text`, because white on the Assistant's blue fails;
  - new: `signal`, `magnet-*`, `frame`, `rounded-card`, `font-hand`, `text-hand`, `ease-magnet`, `ease-chalk` and `ease-pin`;
  - DESIGN.md's shadows.
- **Outcome:** the components in `src/components/ui` can use the new tokens.

### WP4 — No colour outside the tokens

- **Deliverables:** in `src/app/globals.css`:
  - White text and lines on the dark grounds become `--chalk-50`, or `--rail-text` on the rail.
  - Translucent whites, navies and blacks become `color-mix()` of a token at the same percentage.
  - The dark-only blocks for the hero and the season pills are folded into the tokens.
- **Outcome:** a later palette change is a change to the token blocks only.

### WP5 — Documentation

- **Deliverables:**
  - `src/DESIGN.md`: the product owner's file, with its Gaps section brought up to date;
  - the [Styling row](../ea/5_technology/1_technology-services.md);
  - this document and its index row.

## How DESIGN.md was read

| DESIGN.md says | Delivered as | Why |
| -------------- | ------------ | --- |
| `defaultTheme: dark` | Felt in `:root`. The Whiteboard under `prefers-color-scheme: light` and also under `print` | Printing felt would waste ink, and the text would vanish on paper with no backgrounds |
| Permanent Marker for headings, never under 20px | `--font-display`, kept only where the size is 20px or more | The brand name and eyebrows used the display face at 12 to 17px |
| Focus is chalk yellow | `--focus: var(--signal)`. The dark grounds (bar, footer, front-door bands) keep full-strength chalk yellow in both schemes | The light scheme's darker gold would vanish on felt |
| `primary.foreground` and `accent.foreground` | `--accent-text` for primary, and a new `--highlight-text` for the Assistant | The Tailwind layer gave both the same foreground, and white on `#dbe9ff` fails |
| No `shadows.md` or `shadows.lg` | Kept, in black | Popovers and panels use them |
| A font-size scale | Not mapped into Tailwind, except `text-hand` | The components' `text-lg` and `text-2xl` would jump to 2.125rem and 3.5rem |
| `borderWidth.DEFAULT: 2px` | Added as `--border-width`, not applied to every border | Applying it restyles every card, field and table. That is the board pass, not tokens |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Token values in both schemes, and the new tokens | The magnets, pinned index cards, chalk arrows and their motion |
| The three faces, self-hosted | DESIGN.md's four screens (Home, Matchday, Register, Committee) as designed |
| Every colour in `globals.css` | Colours stated in `src/components/ui` (BrandMark, HeroBanner, IdentityRail, RegistrarNav, WizardSteps) |
| The Tailwind mapping | 2px borders and the 3px offset focus ring |

## Gap notes

- **The components' own colours.** Some components still state white or
  hex directly:
  - `WizardSteps`' done step is white on the success dot, 1.5:1 on felt;
  - `HeroBanner` sets white on a chalk gradient;
  - `IdentityRail` and `RegistrarNav` use white tints;
  - `BrandMark` has pitch-slate gradients.

  Each needs a token, a one-line change per class. With felt now the
  default, `WizardSteps` is the most visible.
- **One team colour reads under 3:1 on felt.** `--team-2` is 2.7:1, and
  `--team-0` is just 3.0:1. A lighter dark-scheme value for each would give
  them room.
- **The board itself.** Magnets, cards and the four screens are a
  per-screen pass on top of these tokens, as scope 105 was for the last
  palette.

## Open questions

None. The readings above are recorded in the table, and the product owner
can overturn any of them.
