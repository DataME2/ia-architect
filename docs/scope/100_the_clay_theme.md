# Project Scope — The Clay theme

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/playful-clay-theme`.

The product owner asked for PitchPeople to look like a **playful platform**, with a
landing page built from **claymorphism** cards. Claymorphism means soft, toy-like
surfaces: pastel tints, big rounded corners, and a shadow in three parts (a
soft drop outside, a highlight and a shade inside) where paper would have a
hard border. Fredoka names things and Nunito carries the reading. This replaces the Broadcast theme
that [scope 95](./95_pitchpeople.md) kept ("the Broadcast theme stays").
An Aurora UI retheme was tried first, on the unmerged branch
`claude/aurora-retheme`, and rejected. This branch keeps that branch's
palette-independent work (hard-coded colours become tokens, two dark-mode
contrast fixes, buttons that cannot leak into the component library) and
replaces its look. Only the look changes. Every route, rule and loader is
unchanged, and the theme works by updating the semantic tokens the screens
already read. It is not a second theme system.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** A look serves no new goal or driver. The accessibility commitment (WCAG 2.2 AA, NFR-15) is what the palette was checked against |
| 2_business    | **No change.** No rule, process or glossary term moves. The status meanings (green ready, gold waiting, red blocked, always a dot plus a word) and volt reserved for the Assistant ([decision 1](../decisions/1_ai-assistant-autonomy-level.md)) are kept exactly. The pastels and the bubblegum pop sit between those families |
| 3_information | **No change** |
| 4_application | **Presentation only.** `src/app/globals.css` gets new token values, the missing tokens, and the Clay chrome block. `src/app/design-system.css` exposes them to the component library. Components lose their hard-coded colours, and the landing page gains one modifier class. No props, data or behaviour change |
| 5_technology  | **No change; no migration; no new dependency.** Two OFL-1.1 variable fonts (Fredoka and Nunito, from @fontsource-variable 5.x, latin, 69 KB together) are self-hosted in `public/fonts/`, so nothing is fetched at build or run time, as for Archivo and DM Mono before them |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | The Broadcast theme: floodlit navy, a red "on air" slab and markers, 2–4px corners, slanted uppercase buttons, Saira Condensed headings. It was a second `:root` token block layered over the scope-32 base. Hard-coded colours sat in the hero, sign-in, identity rail, Dugout shirts, `HeroBanner` (an orange eyebrow, and white text on the near-white primary in dark mode), `Panel`, `IdentityRail`, `WizardSteps` (a done step at 1.7:1 in dark mode) and both `BrandMark`s. Form-field edges were about 1.5:1, under WCAG 1.4.11's 3:1. A page button's focus halo never showed, because its own shadow outranked the focus rule |
| **Target** | One `:root` token block, rethemed:<br>• Lilac cream in light mode and plum in dark, with Fredoka headings and Nunito text.<br>• Cards, panels, stats and the library's Card, Panel, StatCard and WaitingList in clay.<br>• A floating clay masthead.<br>• Page buttons as Fredoka pills on a lip that they sink into when pressed (200ms soft bounce).<br>• The landing hero as a pastel slab with two bobbing clay toys, and its five cards in five pastels.<br>• Form fields pressed into the clay, with edges at 3.6:1.<br>• The double focus ring on every control |

## Work packages and deliverables

### WP1 — Tokens

- **Deliverables:** in `src/app/globals.css`:
  - The `:root` and dark `:root` values change: the reef ramp becomes grape, the sand ramp becomes lilac cream, and the surfaces, text, accent, link, focus, info, rail, radii (12/18/24/32px) and shadows all move with them.
  - Tokens added:
    - Pastels and pop: `--clay-lilac`, `-sky`, `-pink`, `-aqua`, `-periwinkle`, `--clay-pop`.
    - Clay shadows: `--shadow-clay`, `--shadow-clay-hover`, `--shadow-clay-inset`.
    - Button lips: `--button-lip`, `--button-lip-pressed`, `--button-lip-soft`.
    - Gradients and washes: `--gradient-action`, `--hero-bg`, `--page-wash`.
    - Hero text: `--hero-text`, `--hero-muted`, `--hero-accent`.
    - The ground that stays dark, and the text on it: `--night*`, `--flood`, `--gold`, `--on-night*`, `--night-fill*`, `--night-line`.
    - Markers and edges: `--live`, `--live-text`, `--border-control`, `--radius-md`.
    - Type and motion: `--font-display`, `--dur-press`, `--ease-bounce`.
  - In `src/app/design-system.css`: `--color-night*`, `--color-on-night*`, `--color-live`, `--color-hero-*`, `--shadow-clay` and `--shadow-clay-hover`.
- **Outcome:** a screen that reads a semantic token is rethemed without being edited.

### WP2 — Chrome

- **Deliverables:** the Broadcast block is replaced by a shorter Clay chrome block (type, masthead, surfaces, landing pastels, the "you are here" marker, the club menu's headings, focus). The base button rules now read `--btn-*` variables with their old values as fallbacks. Only `.button`, a class-less `<button>` and `button.secondary` set those variables, so a component's own button rules and the Tailwind library's buttons cannot pick up the clay shape. The hero's toys are CSS pseudo-elements, shown only at 64rem and wider, hidden in print, and still under reduced motion.
- **Outcome:** the masthead, cards, buttons, fields and landing page take the playful clay look. The role hues on `/me`, the status families and tabular figures are kept.

### WP3 — Hard-coded styles, one component at a time

- **Deliverables:**
  - `globals.css`: the hero, sign-in panel, identity rail (avatar, role items, sign-out, ledger), squad number, pressed filter chip, and the Dugout shirts' hex fallbacks.
  - `src/app/page.tsx`: its ten inline `style` margins move to `.landing-cards`.
  - `HeroBanner.tsx`, which also fixes the dark-mode white-on-white.
  - `Panel.tsx` and `IdentityRail.tsx`.
  - `WizardSteps.tsx`: a done step is now the success pill's own pair, 8.3:1 light and 6.9:1 dark.
  - `Card.tsx`, `StatCard.tsx` and `WaitingList.tsx`: clay shadows.
  - Both `BrandMark.tsx`: recoloured from tokens, with the ring moved off volt.
  - `layout.tsx`: `themeColor` equals `--bg`.
- **Outcome:** what is left hard-coded is listed under the gap notes, each with its reason.

### WP4 — Verification and docs

- **Deliverables:**
  - Contrast was computed for every text and background pair in both modes. All pass AA. The lowest is 5.2:1 (the hero eyebrow), and text on every pastel holds 5.8:1 or better. Form-field edges are 3.6:1.
  - Screenshots in light, dark and at 390px of the landing page, sign-in, home, Dugout and registration.
  - A keyboard walk of the landing page: focus moves in order, and every stop shows the outline and the halo.
  - `src/DESIGN.md`, this document, and the index row.
- **Outcome:** the style is documented where the next designer will look.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Tokens, Clay chrome, hard-coded colours in the listed components, the landing page | A user-selectable theme toggle (the app follows `prefers-color-scheme` only) |
| Light and dark modes, reduced motion, print, keyboard focus | The roughly 740 other inline `style={{}}` attributes across about 105 files. They are one-off margins and gaps, and the colour ones already read tokens |
| | The library `Button` keeps its solid fill and 12px corners |
| | A new brand mark (it is recoloured, not redrawn), and icons on the landing cards |
| | Deleting the now-unused Saira and Archivo font files |

## Gap notes

- **Still hard-coded, on purpose:**
  - The Dugout's grass and pitch lines. It is a pitch, as scope 99 says.
  - The calendar's six team hues. They are local tokens, and lenses rather than statuses.
  - `PhotoCropper`'s white canvas. That is image output.
  - The print background.
  - The two `themeColor` literals, because a meta tag cannot read CSS.
  - The white highlight on the hero's clay ball. It is a specular highlight, white in both modes.
- **Inline styles.** Moving the remaining spacing into classes is a mechanical sweep with no visual change. It is worth doing screen by screen, when each screen is next touched.
- **The library `Button`** could take the clay lip through `shadow-[var(--button-lip)]` and `rounded-full`. It was left alone because its ghost and icon variants share the base classes.
- **Unused fonts.** Saira (Broadcast, no longer declared) and Archivo (scope 32, declared in an `@font-face` nothing uses) remain in `public/fonts/`. They cost nothing at runtime. Delete them once the product owner confirms that neither look is coming back.

## Open questions

- None. The look is the product owner's request, and they can reverse it without touching anything else.
