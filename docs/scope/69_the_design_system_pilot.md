# Project Scope — The Design System Pilot

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `ux-pilot`.
**Status: foundation in place — components compile, style and pass every
gate; no screen uses them yet.**

## Why this exists

The club is piloting a design system, *LTD - Football*
([`src/DESIGN.md`](../../src/DESIGN.md)), whose tokens were derived from this
app's own `globals.css` palette and whose components were generated as
Tailwind React components under `src/components/ui`. Asked to review those
files (September 2026), the review found they could not run in this project
at all, and one of them broke a standing decision.

## What the review found, and what was done

| Found | Done |
| ----- | ---- |
| **No Tailwind in the project** — every component is styled with Tailwind utilities, so all 28 would have rendered unstyled | Tailwind v4 added (a stack change, chosen by the club) — scoped as below |
| **`@/lib/utils` did not exist**, and there was no `@/` path alias, so every component failed to compile | `src/lib/utils.ts` — a five-line `cn`, no `clsx`/`tailwind-merge` since every call passes strings or conditionals; `@/*` alias in `tsconfig.json` |
| `IdentityRail` imported `@/components/RoleSwitcher` — the file is beside it in `ui/`; and imported the type `RoleHolding` as a value under `verbatimModuleSyntax` | Relative, type-only import |
| `HeroBanner`, `Panel`, `RuleList` declared `title` as any node while extending HTML attributes whose `title` is a tooltip string | `title` omitted from the inherited HTML attributes |
| `StatusPill`'s size map was typed as `{container, dot}` pairs but held strings; and it cited **BR1** — which is *a minor's registration needs a guardian* — for its dot-plus-label rule | Type corrected; the comment now cites DESIGN.md's own Principle 1 |
| `ProcessDetail` used the pre-React-19 event type for `onToggle`; `IdentityRail`'s initials indexed arrays unchecked; `RoleSwitcher`'s optional props rejected `undefined` under `exactOptionalPropertyTypes` | Types corrected |
| `IdentityRail` documented the legal name as *verbatim* (BR55) then upper-cased the string itself, so screen readers read it in capitals; its admin link was 36px, under DESIGN.md's own 44px touch target | The `uppercase` class does the styling, the text stays verbatim; link raised to 44px |
| **`DataTable`'s sortable headers were mouse-only** — the click handler sat on the `<th>`, with no button, focus or key handler — the sort state was never announced, and its loading spinner was not hidden from assistive technology (the accessibility gate failed) | A real `<button>` inside each sortable header, `aria-sort`, decorative glyphs and spinner hidden |
| **A second `AssistantNote`** whose `onUse` accepted any callback — a committing control on the Assistant, which [decision 1](../decisions/1_ai-assistant-autonomy-level.md) forbids, and a second Assistant surface (the autonomy gate failed) | Removed, at the club's direction. Its look was already the guarded component's; that one gains DESIGN.md's 44px touch target |

## How Tailwind is scoped

`src/app/design-system.css`, loaded after `globals.css`:

- **No preflight** — `globals.css` stays the base; the reset would restyle
  every existing screen.
- **Utilities only from `src/components/ui`** (`source(none)` plus one
  `@source`), so an existing class name never gains Tailwind CSS by accident.
- **Every colour is a `globals.css` variable** (`surface` → `var(--surface)`,
  `rail` → `var(--rail-bg)`, …). DESIGN.md's light and dark values are those
  variables' values, so there is one source of truth and the app's own
  `prefers-color-scheme` dark mode applies to the components unchanged.
- **The theme sits in a cascade layer; the utilities do not.** Where Tailwind's
  variable names coincide with the app's (`--radius-sm`, `--font-sans`), the
  app's win — they are the same values. An unlayered utility beats
  `globals.css`'s element rules (`h2`, `button`) by specificity; a layered one
  would lose to all of them.

Verified by compiling it through `@tailwindcss/postcss`: every token class the
components use is generated, including the half steps `ds-1.5`/`ds-2.5` and
opacity modifiers, with no preflight in the output.

## EA alignment

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No change |
| 2_business | No change — BR citations in the components corrected to what the rules say |
| 3_information | No change |
| 4_application | A component library exists alongside the screens; **no screen uses it yet** |
| 5_technology | **Tailwind CSS v4** added as a scoped styling layer — recorded in [1_technology-services.md](../ea/5_technology/1_technology-services.md) |

## In scope / out of scope

| In scope | Out of scope (next) |
| -------- | ------------------- |
| Making the design system compile, style and pass every gate | Moving a screen onto the components — one at a time, starting where the reference prototype was screenshotted |
| Tailwind wired in without changing any existing screen | Replacing `globals.css` |
| | `src/index.css` and `src/tokens.json` — generator output, **superseded** by `design-system.css`; `index.css` must never be imported, because its variables (`--surface`, `--border`, `--accent`, `--muted`) reuse `globals.css` names with HSL triplets and would break every existing screen |
