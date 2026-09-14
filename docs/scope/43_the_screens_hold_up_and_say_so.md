# Project Scope — The Screens Hold Up, and Say So

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

Three of this repository's non-functional requirements have read *not
defined*, *not verified* and *not asserted* since the day they were written.
They are the three where **the absence is invisible from inside the
product**: a screen that is slow at seven hundred registrations is fast at
twenty, an interface a screen reader cannot use looks correct to the person
building it, and a guardrail nobody tests is a comment.

This initiative closes what can be closed and **says plainly what cannot**,
which is the more valuable half. An audit that overstates its coverage is
worse than no audit, because it is the document somebody cites later.

## The finding this initiative is mostly about

**BR5's duplicate detection was quadratic, on three screens.**

It compares people against people, and it normalised both names and both
email addresses *inside* the comparison. At the twenty rows a test fixture
holds, that is four hundred comparisons and nobody notices. At the pilot
club's seven hundred registrations — which is about **1,400 `person` rows**,
because a registration is a child with at least one guardian — it is roughly
two million comparisons and several million string allocations.

Measured: **495 ms of pure CPU, per page load**, on the season queue, the
registration detail, and the submission pack. The season queue is the screen
a registrar opens at the start of every shift.

The fix is **not an approximation**, and that distinction is the whole
design. Both of BR5's bases — a shared email, or a shared legal name —
already require the dates of birth to agree. So two people born on different
days can never be candidates, and comparing them is work with a known
answer. Grouping by date of birth is therefore *the matching rule read as an
index*, not a cheap pre-filter that might drop a real match. After it: **4.8
ms**, and linear.

A test asserts that the pairs found do not depend on the order the people
arrive in — which is precisely what would break if the index ever became a
heuristic.

## Why the performance test measures a shape, not a number

The budget asserts that **doubling the club does not quadruple the work**,
and deliberately states no millisecond ceiling.

A wall-clock ceiling on a shared CI runner fails when a neighbouring job is
busy. The team re-runs it, the failure becomes noise, and within a month the
check is the one everybody knows to ignore — which is worse than not having
it, because it also reports green. A ratio measured between two runs in the
same process survives a runner four times slower: both halves slow down
together.

It is the **fastest of several runs rather than the average**, because noise
only ever adds time. The first version used the average, and passed on its
own while failing inside a full `npm test` — the worst behaviour a
performance gate can have, and caught here rather than by somebody else next
month.

## What was found in the accessibility pass

**One real defect**, and it is a good illustration of the class: the
carnival result form gave its two goal inputs an `aria-label` and left the
status `<select>` between them unnamed. Announced as "combo box", sitting
between two correctly named fields — invisible to everyone who can see it.

Everything else passed the mechanical criteria, which is what the design
system earns: native `<button>`, `<a>`, `<input>` and `<select>` throughout,
no `div` standing in for a control, no custom widget, no focus trap, one
`tabIndex` and it is `0`.

**Four criteria remain unverified and are named as such** in the
[audit](../annexes/accessibility-audit.md): contrast ratios, target size
(2.5.8, new in 2.2), focus visibility, and reflow at 320 pixels. The
automated check deliberately does not attempt any of them — half-checking
would convert *not verified* into *checked* while changing nothing about the
product.

## Why the Assistant check is written before there is an Assistant

R33.6 asks for decision 1's autonomy level to be asserted by a check rather
than by convention. Four of Requirement 33's five criteria are true today
because `AssistantNote` structurally cannot render a committing control, and
the fifth — *no minor's data to an uncontrolled model* — is **vacuously
true: nothing calls a model at all.**

The tempting reading is that the check should wait for the integration. It
is written now for the opposite reason: **the edit that adds a generative
client is exactly the edit that would quietly widen the surface.** The check
fails the moment such an import appears anywhere in `src/`, on purpose. That
failure is not an obstacle to route around; it is the prompt to re-read
decision 1 while adding one, rather than to discover afterwards that the
guardrail was a comment.

It also asserts there is **exactly one** Assistant surface. A second one is
how a send button arrives "just for the reminder case" — in a file nobody
is watching.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** No new goal, capability or principle; this makes existing ones verifiable |
| **2_business** | **No new rules.** BR5's *behaviour* is unchanged and a test asserts it — the initiative would be a defect if any rule read differently afterwards |
| **3_information** | **No change.** No table, column or data object |
| **4_application** | The duplicate index is a new pure component; the season queue, registration detail and pack loaders stop rebuilding it per row. Two new build gates |
| **5_technology** | **No change.** No dependency added — the accessibility and autonomy checks are Python in the existing `scripts/`, and the performance budget is `node --test` |

**No dependency was added, and that was a decision.** The obvious way to
audit accessibility is Playwright plus axe-core. It would check more than
this script does — and it would add a browser, a test runner and a large
transitive tree to a repository whose entire tooling is `node --test`, `tsc`
and three Python scripts. The right time to take that on is when somebody
is going to drive a real screen-reader session, and the audit says so.

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | NFR-16 undefined and unmeasured. NFR-15 unverified, with no audit and no check. R33.6 unasserted. One quadratic on three screens, undetected |
| **Target** (delivered) | Budgets stated and the dominant cost measured, fixed and gated. An audit naming what passes and what is not verified, with the mechanical half enforced. Decision 1 asserted in CI, before there is anything to assert it against |

## Work packages and deliverables

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | `buildDuplicateIndex` / `candidatesFromIndex`, and the three loaders that stop re-deriving the club per registration | **Delivered** |
| **WP2** | `duplicates.scale.test.ts` — the budget as a curve, best-of-N, stable across eight consecutive full runs | **Delivered** |
| **WP3** | [`performance-budgets.md`](../annexes/performance-budgets.md) — the numbers, the load they are measured at, and what is *not* measured | **Delivered** |
| **WP4** | [`accessibility-audit.md`](../annexes/accessibility-audit.md) — thirteen criteria assessed, four named unverified | **Delivered** |
| **WP5** | `scripts/check_a11y.py`, verified to fail on all four defect classes it claims to catch | **Delivered** |
| **WP6** | `scripts/check_assistant.py`, verified to fail on a committing control, a second surface and a model import | **Delivered** |
| **WP7** | Both checks in `npm run check` and in `code-check.yml` | **Delivered** |

## What this initiative does not do

- **No contrast, target-size, focus-visibility or reflow verification.** The
  four largest accessibility items are named, not closed.
- **No screen-reader session, and no keyboard pass by a person who depends
  on one.** No automated check substitutes for either.
- **Nothing is measured against a database.** The budgets cover the pure,
  in-memory half; the query half has no harness, and end-to-end pack
  generation still waits on task 0.4's production environment.
- **No restore rehearsal** (NFR-17). Still nothing, against a project
  holding the only copy of the data there is — unchanged and still the
  largest unaddressed operational risk in this repository.
