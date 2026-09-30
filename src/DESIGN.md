---
colors:
  background: "#f2ebe1"
  backgroundSunk: "#e6dccd"
  surface: "#ffffff"
  surfaceSubtle: "#fbf7f1"
  foreground: "#191411"
  muted:
    DEFAULT: "#6b6157"
    foreground: "#7d7266"
  border:
    DEFAULT: "#e6dccd"
    strong: "#d5c8b4"
  primary:
    DEFAULT: "#0d5a72"
    hover: "#0a465a"
    soft: "#e7f1f5"
    foreground: "#ffffff"
  secondary:
    DEFAULT: "#fbf7f1"
    foreground: "#062a36"
  accent:
    DEFAULT: "#f2761b"
    foreground: "#ffffff"
  success:
    DEFAULT: "#dfe9e0"
    foreground: "#1e3226"
    indicator: "#4c6b54"
  warning:
    DEFAULT: "#f7e5d3"
    foreground: "#6d3610"
    indicator: "#a8571f"
  destructive:
    DEFAULT: "#f8dfda"
    foreground: "#6e1d13"
    indicator: "#9b2c1e"
  info:
    DEFAULT: "#cfe4ec"
    foreground: "#0a465a"
    indicator: "#14708e"
  rail:
    DEFAULT: "#062a36"
    line: "#12414f"
    foreground: "#e8f1f4"
    muted: "#8fb2bd"
colorsDark:
  background: "#0c1418"
  backgroundSunk: "#060e11"
  surface: "#121d22"
  surfaceSubtle: "#16242a"
  foreground: "#e9eef0"
  muted:
    DEFAULT: "#9fb2b9"
    foreground: "#7f9199"
  border:
    DEFAULT: "#21343b"
    strong: "#2f4750"
  primary:
    DEFAULT: "#4fa8c7"
    hover: "#6fbcd7"
    soft: "#0d2c38"
    foreground: "#04202a"
  secondary:
    DEFAULT: "#16242a"
    foreground: "#e9eef0"
  accent:
    DEFAULT: "#ff9145"
    foreground: "#0c1418"
  success:
    DEFAULT: "#1a2c20"
    foreground: "#a8d4b3"
    indicator: "#7fb08c"
  warning:
    DEFAULT: "#33200c"
    foreground: "#e7b483"
    indicator: "#c98a4a"
  destructive:
    DEFAULT: "#341410"
    foreground: "#f0a79c"
    indicator: "#cf6154"
  info:
    DEFAULT: "#0d2c38"
    foreground: "#9ed4e6"
    indicator: "#4fa8c7"
  rail:
    DEFAULT: "#04161d"
    line: "#103340"
    foreground: "#e8f1f4"
    muted: "#7fa4b0"
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
  sm: "8px"
  DEFAULT: "12px"
  lg: "18px"
  full: "999px"
shadows:
  xs: "0 1px 2px rgba(25, 20, 17, 0.06)"
  sm: "0 1px 2px rgba(25, 20, 17, 0.05), 0 2px 8px rgba(25, 20, 17, 0.06)"
  md: "0 2px 6px rgba(25, 20, 17, 0.07), 0 12px 28px rgba(25, 20, 17, 0.09)"
  lg: "0 4px 10px rgba(25, 20, 17, 0.08), 0 22px 46px rgba(25, 20, 17, 0.13)"
borderWidth:
  DEFAULT: "1px"
---

# LTD - Football

LTD - Football is a high-density, mission-critical administration design system built for Australian grassroots football. Rooted in the Australian landscape palette—Deep Reef, Eucalyptus, Warm Ochre, and Oxide Red—the visual language prioritizes instant scanning, multi-role identity clarity, high operational speed under matchday pressure, and unequivocal accessibility.

## Principles

1. **No State by Hue Alone:** Every status indicator pairs a visual dot with an explicit textual state label. Never rely solely on color to communicate eligibility, approval, or arrears.
2. **Desert Orange Belongs to the Assistant:** The vibrant desert orange palette is reserved strictly for AI assistant suggestions, drafts, and guidance. It is never used for primary actions, warnings, or statuses.
3. **Identity Rail is Immutable Across Lenses:** A user's core identity remain anchored in the persistent rail while switching operational context lenses across player, guardian, referee, coach, and administrator roles.
4. **Speed Over Decor:** Controls are tuned for touch targets at the ground (minimum 44px) and high-contrast focus rings for fast keyboard traversal on club laptops.

## Color & Theming

The system employs a dual-theme architecture (Light Sand & Dark Pitch). Surface layers stack systematically: page background (`background`), sunken containers (`backgroundSunk`), default cards (`surface`), and elevated panels (`surfaceSubtle`).

- **Deep Reef (`primary`):** Structure, primary navigation, brand identity, and primary call-to-actions.
- **Eucalyptus (`success`):** Cleared, ready, available, and verified statuses.
- **Warm Ochre (`warning`):** Pending approvals, outstanding tasks, and demo tenant markers.
- **Oxide Red (`destructive`):** Blocked clearances, expired compliance (WWCC), lapsed clearances, or irreversible actions.
- **Desert Orange (`accent`):** Assistant notes, draft suggestions, and advisory guidance only.
- **Identity Rail (`rail`):** Persistent deep reef dark ground anchored across both light and dark operational modes.

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
- `rounded.sm` (8px): Inputs, buttons, status pills, and small badges.
- `rounded.DEFAULT` (12px): Cards, table wrappers, panels, and forms.
- `rounded.lg` (18px): Hero section, modal shells, and the identity rail.
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
- **High Contrast:** Text and background pairs maintain WCAG AAA compliance across both Light Sand and Dark Pitch modes.

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
- **Do** reserve `accent` (Desert Orange) exclusively for Assistant advice and draft notes.
- **Do** use `font-mono` for all business rule citations (`BR1`, `BR2`) and financial quantities.
- **Do** ensure interactive controls have minimum 44px touch target height.
- **Don't** use hue alone to convey status or eligibility.
- **Don't** use Desert Orange for primary buttons or warning alerts.
- **Don't** omit ARIA roles and keyboard event handlers on custom interactive components.
- **Don't** use raw hex colors or hardcoded pixel spacing when token classes exist.

## Composition

The system uses a split layout architecture: a fixed identity rail on the left (or collapsing rail in administration views) and a fluid content workspace on the right. Key flows structure data in high-density summary grids, data tables with scroll wrappers, and clear action button bars.

Operational views prioritize key status chips at the top right of cards, clear section headers with eyebrows, and stacked form fields with hint texts and inline error notices.

## Gaps & Decisions

- **Source Alignment:** Tokens and styles directly derived from the Australian landscape palette defined in the repository's `globals.css`.
- **Font Fallbacks:** System UI fallbacks are configured alongside Archivo Variable and DM Mono for self-hosted font safety.