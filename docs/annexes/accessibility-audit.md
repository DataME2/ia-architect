# Annex — Accessibility audit (WCAG 2.2 AA)

_[← Annexes](./README.md) · [Enterprise architecture](../ea/README.md)_

**Realises:** NFR-15 · [Scope 43](../scope/43_the_screens_hold_up_and_say_so.md)

NFR-15 read **"Not verified — a design system exists; no audit, no
automated check."** This is the audit. It is a **first pass by inspection**,
not a certification: no screen reader was driven, no keyboard-only session
was run by a person who depends on one, and nobody with a disability has
used this product.

That limit is the most important sentence here, and it is stated first
because an audit document is exactly the artifact that gets cited later as
though it were a clearance.

## Why this matters more than usual here

The people using these screens are **volunteers**, not trained operators —
a club registrar is a parent doing this on a Sunday evening. And the
club-facing screens are the ones that decide whether a child can take the
field. An interface a volunteer cannot operate is not an inconvenience; it
is a registration that does not get finished.

## What was checked, and what was found

| Criterion | Finding |
| --------- | ------- |
| **1.1.1 Non-text content** | **Pass.** No `<img>` in the product renders without `alt`. The only decorative graphic is the Assistant's mark, hidden from assistive technology by its wrapper |
| **1.3.1 Info and relationships** | **One defect, fixed.** The carnival result form gave its two goal inputs an `aria-label` and left the status `<select>` beside them unnamed — announced as "combo box", between two named fields. Everything else uses a wrapping `<label>` or a matching `htmlFor` |
| **1.4.3 Contrast (minimum)** | **Not verified.** The palette is defined in `globals.css` with a dark theme; no ratio has been computed. This is the largest unmeasured item |
| **2.1.1 Keyboard** | **Pass by construction, unverified by use.** Every control is a native `<button>`, `<a>`, `<input>` or `<select>`; there is no custom widget, no `div` with a click handler standing in for a button, and no focus trap |
| **2.4.3 Focus order** | **Pass.** One `tabIndex` exists in the codebase and it is `0`, on the photograph cropper — reading order is the DOM order everywhere |
| **2.4.7 / 2.4.11 Focus visible** | **Not verified.** No focus style is overridden, so the browser default applies. Whether it is visible enough against this palette is untested |
| **2.5.8 Target size (minimum)** — new in 2.2 | **Not verified.** The 24×24 CSS pixel minimum has not been measured against the button and inline-control styles |
| **3.3.1 / 3.3.3 Error identification and suggestion** | **Pass, and better than the criterion asks.** A refusal names the rule that refused and says what would satisfy it — that is a product rule (BR143's cousin), not an accessibility afterthought |
| **3.3.2 Labels or instructions** | **Pass** after the fix above |
| **3.3.7 Redundant entry** — new in 2.2 | **Pass, structurally.** "Registration, collected once" is the product's first sentence: a family enters a player's details one time |
| **3.3.8 Accessible authentication** — new in 2.2 | **Pass.** Sign-in is a magic link or a password with no puzzle, no cognitive test, and paste is not blocked |
| **4.1.2 Name, role, value** | **Pass.** Native elements throughout; no `role` attribute is used to make one element impersonate another |
| **1.4.10 Reflow / 1.4.4 Resize text** | **Not verified.** The layout uses relative units and wrapping flex rows, which is the right shape; nothing has been tested at 320 CSS pixels or at 200% zoom |

## What is now enforced automatically

`scripts/check_a11y.py`, in `npm run check` and in CI. It asserts the four
things above that are **mechanical, currently true, and invisible to a
sighted reviewer**: every control has an accessible name, every image
declares its `alt`, every icon is either hidden or named, and no positive
`tabIndex` reorders focus.

It deliberately does **not** attempt contrast, reflow, focus visibility or
target size. Those are the four largest open items, and a script that
half-checked them would convert "not verified" into "checked" without
changing anything about the product.

The script scans tags rather than matching them with a regular expression.
The first version used one and reported three false positives in a row —
all from the `>` inside an `onFocus={(event) => …}` arrow. **A checker that
cries wolf gets switched off**, which costs more than not having it.

## What would close the remaining items

In the order that buys the most:

1. **Contrast ratios** computed over the palette tokens, both themes. This
   is arithmetic on values already written down, and it is the item most
   likely to be failing right now.
2. **Target sizes** measured against 2.5.8, the criterion most often missed
   on a product whose inline controls sit in table rows.
3. **A keyboard-only pass** through the registration form and the queue by a
   person, not a script.
4. **A screen reader session** — the item no automated check substitutes for,
   and the one this document most conspicuously lacks.
