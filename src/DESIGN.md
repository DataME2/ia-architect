---
colors:
  background: "#f8fafc"
  backgroundSunk: "#f1f5f9"
  surface: "#ffffff"
  surfaceSubtle: "#f8fafc"
  foreground: "#0f172a"
  muted:
    DEFAULT: "#64748b"
    foreground: "#475569"
  border:
    DEFAULT: "#e2e8f0"
    strong: "#cbd5e1"
  primary:
    DEFAULT: "#0f172a"
    hover: "#1e293b"
    soft: "#f1f5f9"
    foreground: "#ffffff"
  secondary:
    DEFAULT: "#f1f5f9"
    foreground: "#0f172a"
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
    DEFAULT: "#e0f2fe"
    foreground: "#0c4a6e"
    indicator: "#0284c7"
  rail:
    DEFAULT: "#090d16"
    line: "#1e293b"
    foreground: "#f8fafc"
    muted: "#94a3b8"
colorsDark:
  background: "#070b14"
  backgroundSunk: "#02040a"
  surface: "#0f172a"
  surfaceSubtle: "#1e293b"
  foreground: "#f8fafc"
  muted:
    DEFAULT: "#94a3b8"
    foreground: "#cbd5e1"
  border:
    DEFAULT: "#1e293b"
    strong: "#334155"
  primary:
    DEFAULT: "#38bdf8"
    hover: "#7dd3fc"
    soft: "#0c4a6e"
    foreground: "#070b14"
  secondary:
    DEFAULT: "#1e293b"
    foreground: "#f8fafc"
  accent:
    DEFAULT: "#a3e635"
    foreground: "#070b14"
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
    DEFAULT: "#0c4a6e"
    foreground: "#7dd3fc"
    indicator: "#38bdf8"
  rail:
    DEFAULT: "#02040a"
    line: "#0f172a"
    foreground: "#f8fafc"
    muted: "#94a3b8"
typography:
  fontFamily:
    sans: "'Archivo Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
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
  sm: "6px"
  DEFAULT: "10px"
  lg: "16px"
  full: "999px"
shadows:
  xs: "0 1px 2px rgba(15, 23, 42, 0.05)"
  sm: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)"
  md: "0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)"
  lg: "0 12px 32px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.06)"
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

The system employs a dual-theme architecture (Light Slate & Pitch Night). Surface layers stack systematically: page background (`background`), sunken containers (`backgroundSunk`), default cards (`surface`), and elevated panels (`surfaceSubtle`).

- **Pitch Slate (`primary`):** Structure, primary navigation, brand identity, and primary call-to-actions.
- **Stadium Green (`success`):** Cleared, ready, available, and verified statuses.
- **Trophy Gold (`warning`):** Pending approvals, outstanding tasks, and demo tenant markers.
- **Card Red (`destructive`):** Blocked clearances, expired compliance (WWCC), lapsed clearances, or irreversible actions.
- **Electric Volt (`accent`):** Assistant notes, draft suggestions, and advisory guidance only.
- **Identity Rail (`rail`):** Persistent pitch-black ground anchored across both light and dark operational modes.

## Typography

Type roles are strictly assigned across two self-hosted font families:

- **Page Titles & Headlines (`typography.fontSize.2xl` / `xl`):** Archivo Variable bold/expanded weights (`typography.fontWeight.bold`).
- **Section Headers & Card Titles (`typography.fontSize.lg` / `base`):** Archivo Variable semibold (`typography.fontWeight.semibold`).
- **Body & Running Text (`typography.fontSize.base` / `sm`):** Archivo Variable regular/medium (`typography.fontWeight.normal` / `medium`).
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
- `rounded.sm` (6px): Inputs, buttons, status pills, and small badges.
- `rounded.DEFAULT` (10px): Cards, table wrappers, panels, and forms.
- `rounded.lg` (16px): Hero section, modal shells, and the identity rail.
- `rounded.full` (999px): Avatar, filter chips, and pill badges.

Shadows range from `shadows.xs` for quiet inline elements to `shadows.lg` for floating overlays and hero cards.

## States & Interaction

- **Hover:** Surface controls shift to `surfaceSubtle` or primary hover tones with smooth transition (`120ms` ease).
- **Focus Visible:** Loud double focus treatment—2px solid primary outline with a 5px soft halo for immediate keyboard navigation visibility.
- **Disabled:** Muted background (`backgroundSunk`) and subdued text (`muted.foreground`) with `cursor-not-allowed`.
- **Selected / Active:** Active navigation links receive left accent border accents (`border-primary`) and soft primary background (`primary.soft`).

## Motion

All transitions use standard duration `180ms` (fast `120ms`) with cubic-bezier `cubic-bezier(0.2, 0.6, 0.3, 1)`. All motion strictly respects `prefers-reduced-motion: reduce` by setting durations to `0.01ms`.

## Responsive & Accessibility

- **Breakpoints:** Mobile layout collapses at `40rem` (640px) and `55rem` (880px) for navigation rails into toggle panels.
- **Touch Targets:** All clickable areas maintain a minimum target of 44x44px.
- **High Contrast:** Text and background pairs meet at least WCAG AA (4.5:1) in both Light Slate and Pitch Night modes; most reach AAA.

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
- **Font Fallbacks:** System UI fallbacks are configured alongside Archivo Variable and DM Mono for self-hosted font safety.