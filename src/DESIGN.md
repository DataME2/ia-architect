---
colors:
  background: "#f4f0ff"
  backgroundSunk: "#ebe5fb"
  surface: "#ffffff"
  surfaceSubtle: "#faf8ff"
  foreground: "#1f1a3d"
  muted:
    DEFAULT: "#5a5478"
    foreground: "#3d3760"
  border:
    DEFAULT: "#e9e2fb"
    strong: "#d3c8f3"
    control: "#8a7bcc"
  primary:
    DEFAULT: "#6a35e8"
    hover: "#5521d4"
    soft: "#f3eeff"
    foreground: "#ffffff"
  secondary:
    DEFAULT: "#faf8ff"
    foreground: "#1f1a3d"
  accent:
    DEFAULT: "#84cc16"
    hover: "#65a30d"
    foreground: "#0f172a"
  success:
    DEFAULT: "#dcfce7"
    foreground: "#14532d"
    indicator: "#16a34a"
  warning:
    DEFAULT: "#fef3c7"
    foreground: "#78350f"
    indicator: "#d97706"
  destructive:
    DEFAULT: "#fee2e2"
    foreground: "#7f1d1d"
    indicator: "#dc2626"
  info:
    DEFAULT: "#ede7ff"
    foreground: "#4c1d95"
    indicator: "#8b5cf6"
  rail:
    DEFAULT: "#241a52"
    line: "#3b2c80"
    foreground: "#f6f3ff"
    muted: "#c3b9ec"
  clay:
    lilac: "#ede7ff"
    sky: "#dff1ff"
    pink: "#ffe4f1"
    aqua: "#d9f8fb"
    periwinkle: "#e3e8ff"
    pop: "#ec4899"
colorsDark:
  background: "#15112b"
  backgroundSunk: "#0f0c20"
  surface: "#221c42"
  surfaceSubtle: "#2a2350"
  foreground: "#f6f3ff"
  muted:
    DEFAULT: "#b9b2dd"
    foreground: "#dcd6f5"
  border:
    DEFAULT: "#362e63"
    strong: "#4a4080"
    control: "#7a6eb8"
  primary:
    DEFAULT: "#b9a2ff"
    hover: "#cfbfff"
    soft: "#332a5f"
    foreground: "#15112b"
  secondary:
    DEFAULT: "#2a2350"
    foreground: "#f6f3ff"
  accent:
    DEFAULT: "#a3e635"
    foreground: "#15112b"
  success:
    DEFAULT: "#064e3b"
    foreground: "#86efac"
    indicator: "#4ade80"
  warning:
    DEFAULT: "#451a03"
    foreground: "#fde047"
    indicator: "#facc15"
  destructive:
    DEFAULT: "#450a0a"
    foreground: "#fca5a5"
    indicator: "#f87171"
  info:
    DEFAULT: "#2b2352"
    foreground: "#c4b5fd"
    indicator: "#a78bfa"
  rail:
    DEFAULT: "#0f0c20"
    line: "#2a2350"
    foreground: "#f6f3ff"
    muted: "#c3b9ec"
  clay:
    lilac: "#2b2352"
    sky: "#1d2b4f"
    pink: "#3a2046"
    aqua: "#173646"
    periwinkle: "#252b5c"
    pop: "#f472b6"
typography:
  fontFamily:
    display: "'Fredoka Variable', 'Nunito Variable', ui-rounded, system-ui, sans-serif"
    sans: "'Nunito Variable', ui-rounded, ui-sans-serif, system-ui, -apple-system, sans-serif"
    mono: "'DM Mono', ui-monospace, SFMono-Regular, monospace"
  fontSize:
    xs: "0.72rem"
    sm: "0.85rem"
    base: "1rem"
    lg: "1.125rem"
    xl: "1.5rem"
    2xl: "2rem"
  fontWeight:
    normal: "400"
    medium: "500"
    semibold: "600"
    bold: "700"
  lineHeight:
    tight: "1.25"
    normal: "1.55"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.5rem"
  6: "2rem"
  7: "3rem"
rounded:
  sm: "12px"
  md: "18px"
  DEFAULT: "24px"
  lg: "32px"
  full: "999px"
shadows:
  xs: "0 1px 2px rgba(31, 26, 61, 0.06)"
  sm: "0 2px 4px rgba(31, 26, 61, 0.06), 0 6px 16px rgba(76, 29, 149, 0.07)"
  md: "0 8px 20px rgba(31, 26, 61, 0.09), 0 2px 6px rgba(76, 29, 149, 0.06)"
  lg: "0 20px 44px rgba(31, 26, 61, 0.14), 0 6px 14px rgba(76, 29, 149, 0.08)"
  clay: "0 14px 28px -10px rgba(76, 29, 149, 0.28), 0 2px 4px rgba(76, 29, 149, 0.06), inset 0 -6px 14px rgba(76, 29, 149, 0.09), inset 0 6px 12px rgba(255, 255, 255, 0.9)"
borderWidth:
  DEFAULT: "1px"
---

# LTD - Football

LTD - Football is a high-density, mission-critical administration design system built for Australian grassroots football. Its academy palette—Pitch Slate, Stadium Green, Trophy Gold, Card Red, and Electric Volt—gives a modern, athletic look while the visual language still prioritizes instant scanning, multi-role identity clarity, high operational speed under matchday pressure, and unequivocal accessibility.

## Principles

1. **No State by Hue Alone:** Every status indicator pairs a visual dot with an explicit textual state label. Never rely solely on color to communicate eligibility, approval, or arrears.
2. **Electric Volt Belongs to the Assistant:** The high-visibility electric volt palette is reserved strictly for AI assistant suggestions, drafts, and guidance. It is never used for primary actions, warnings, or statuses.
3. **Identity Rail is Immutable Across Lenses:** A user's core identity remain anchored in the persistent rail while switching operational context lenses across player, guardian, referee, coach, and administrator roles.
4. **Speed Over Decor:** Controls are tuned for touch targets at the ground (minimum 44px) and high-contrast focus rings for fast keyboard traversal on club laptops.

## Color & Theming

The system uses the **Clay** theme (scope 100): playful, soft and toy-like, in two modes (lilac day, and plum night), following `prefers-color-scheme`. Surface layers stack in order: the page background (`background`, under a faint, static wash of pink and sky), sunken containers (`backgroundSunk`), default cards (`surface`, in clay: `shadows.clay`), and elevated panels (`surfaceSubtle`).

- **Grape (`primary`):** Structure, primary navigation, brand identity, and primary calls to action. A page's own primary button is a Fredoka pill running grape into purple (`--gradient-action`), sitting on a 4px lip of its own colour that it sinks into when pressed. The component library's `Button` stays solid.
- **Clay pastels (`clay.lilac`, `sky`, `pink`, `aqua`, `periwinkle`):** Decoration only: the landing page's cards, one each, in order. They sit between the status families, so a tinted card never reads as ready, waiting or blocked. Text on every tint holds 5.8:1 or better.
- **Bubblegum (`clay.pop`, `--live`):** "You are here" (the current page and the current role) and the hero's clay toys, never a status.
- **The hero slab (`--hero-bg`, `--hero-text`, `--hero-muted`, `--hero-accent`):** Pastel clay in light mode, plum in dark, shared by the landing hero and the sign-in panel.
- **Stadium Green (`success`):** Cleared, ready, available, and verified statuses.
- **Trophy Gold (`warning`):** Pending approvals, outstanding tasks, and demo tenant markers.
- **Card Red (`destructive`):** Blocked clearances, expired compliance (WWCC), lapsed clearances, or irreversible actions.
- **Electric Volt (`accent`):** Assistant notes, draft suggestions, and advisory guidance only.
- **Identity Rail (`rail`):** A persistent deep grape ground, dark in both modes.

## Typography

Type roles are strictly assigned across two self-hosted font families:

- **Page Titles, Headlines, Card Titles & Buttons (`typography.fontFamily.display`):** Fredoka Variable semibold, rounded and friendly.
- **Body & Running Text (`typography.fontSize.base` / `sm`):** Nunito Variable regular/medium (`typography.fontWeight.normal` / `medium`).
- Both are OFL-1.1, from @fontsource-variable 5.x, latin subset, and self-hosted in `public/fonts/` (69 KB together), so nothing is fetched at build or run time.
- **Data, Rules & Identifiers (`typography.fontFamily.mono`):** DM Mono for business rule tags (e.g. BR1, BR61), timestamps, squad numbers, and financial figures.

## Spacing, Sizing & Density

Layout rhythm stays strictly on a 7-step scale:
- `spacing.1` (0.25rem) & `spacing.2` (0.5rem): Micro gaps, badge padding, dot-label offsets.
- `spacing.3` (0.75rem) & `spacing.4` (1rem): Standard input padding, list item gap, card inner padding.
- `spacing.5` (1.5rem) & `spacing.6` (2rem): Grid gap, section spacing, page block margins.
- `spacing.7` (3rem): Shell outer margins and major layout breaks.
Interactive controls maintain a minimum height of `2.75rem` (44px) for field accessibility.

## Shape & Elevation

Surfaces rely on structured borders (`border.DEFAULT`) paired with purposeful elevation:
- `rounded.sm` (12px): Inputs, status pills, and small badges. Page buttons are full pills.
- `rounded.md` (18px): List rows, such as the home page's waiting list.
- `rounded.DEFAULT` (24px): Cards, table wrappers, panels, and forms.
- `rounded.lg` (32px): Hero section, modal shells, and the identity rail.
- `rounded.full` (999px): Avatar, filter chips, and pill badges.

Surfaces are clay rather than paper: `shadows.clay` is a soft drop outside plus a highlight and a shade inside, and `--shadow-clay-hover` lifts a card that links somewhere. Form fields are pressed into the clay (`--shadow-clay-inset`) and edged with `border.control`, which holds 3:1 as a control boundary (WCAG 1.4.11). The other shadows range from `shadows.xs` for quiet inline elements to `shadows.lg` for floating overlays.

## States & Interaction

- **Hover:** Surface controls shift to `surfaceSubtle` or primary hover tones with smooth transition (`120ms` ease).
- **Focus Visible:** Loud double focus treatment: a 2px solid grape outline with a 5px bubblegum halo (pink-300 in dark mode). It shows on every control, page buttons included, whose clay lip it sits beside rather than replaces.
- **Disabled:** Muted background (`backgroundSunk`) and subdued text (`muted.foreground`) with `cursor-not-allowed`.
- **Selected / Active:** Active navigation links receive left accent border accents (`border-primary`) and soft primary background (`primary.soft`).

## Motion

All transitions use the standard duration `180ms` (fast `120ms`) with `cubic-bezier(0.2, 0.6, 0.3, 1)`. A press or a card's lift uses the soft bounce, `200ms` with `cubic-bezier(0.34, 1.56, 0.64, 1)`. The hero's two clay toys bob on a `6s` float that only appears at 64rem and wider. All motion respects `prefers-reduced-motion: reduce`, which sets durations to `0.01ms`.

## Responsive & Accessibility

- **Breakpoints:** Mobile layout collapses at `40rem` (640px) and `55rem` (880px) for navigation rails into toggle panels.
- **Touch Targets:** All clickable areas maintain a minimum target of 44x44px.
- **High Contrast:** Text and background pairs meet at least WCAG AA (4.5:1) in both modes, and most reach AAA (scope 100 has the computed table).

## Component Conventions

- **Variant Naming:** `primary`, `secondary`, `ghost`, `destructive`, `outline`.
- **Size Naming:** `sm`, `md`, `lg`.
- **Status Pills:** Standardized status states: `cleared` (`success`), `pending` (`warning`), `blocked` (`destructive`), `info` (`info`), `neutral`.
- **Composition Style:** Slot-based React functional components using clean tailwind utility classes, explicit ARIA roles, and keyboard navigation.

## Content Guidance

- **Labels:** Sentence casing for action buttons and labels ("Record result", "Withdraw clearance", "Submit registration").
- **Rule Annotations:** Always format business rule citations using mono chips (e.g. `BR1`, `BR61`).
- **Numeric Figures:** Use tabular numbers (`font-variant-numeric: tabular-nums`) for currency, squad numbers, and match scores.

## Do's and Don'ts

- **Do** always pair status color pills with an explicit status label and dot indicator.
- **Do** reserve `accent` (Electric Volt) exclusively for Assistant advice and draft notes.
- **Do** use `font-mono` for all business rule citations (`BR1`, `BR2`) and financial quantities.
- **Do** ensure interactive controls have minimum 44px touch target height.
- **Don't** use hue alone to convey status or eligibility.
- **Don't** use Electric Volt for primary buttons or warning alerts.
- **Don't** omit ARIA roles and keyboard event handlers on custom interactive components.
- **Don't** use raw hex colors or hardcoded pixel spacing when token classes exist.

## Composition

The system uses a split layout architecture: a fixed identity rail on the left (or collapsing rail in administration views) and a fluid content workspace on the right. Key flows structure data in high-density summary grids, data tables with scroll wrappers, and clear action button bars.

Operational views prioritize key status chips at the top right of cards, clear section headers with eyebrows, and stacked form fields with hint texts and inline error notices.

## Gaps & Decisions

- **Academy palette (October 2026):** Replaced the Australian landscape palette (sand, reef, eucalyptus, ochre, oxide, desert orange) with Pitch Slate & Electric Volt. `globals.css` carries the same values, so every screen changes with it.
- **Volt stays the Assistant's only.** The academy brief also proposed volt for calls to action, KPIs and active navigation; that would make the Assistant's colour an ordinary highlight, so Principle 2 is kept until the club decides otherwise.
- **Dark rail muted text is `#94a3b8`, not the brief's `#64748b`:** that one is 4.3:1 on the dark rail, under WCAG AA for its small labels.
- **Font Fallbacks:** System UI fallbacks (`ui-rounded` first) are configured alongside Fredoka, Nunito and DM Mono for self-hosted font safety.