# Project Scope — The Season Paths Page

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/season-paths-page`.

[Scope 114](./114_a_public_test_site_and_a_production_project.md) WP3
produced *PitchPeople Season Paths*: an interactive guide to four paths
through a club's season. Switching a condition shows which business rule
allows a step, warns, or stops it. It was published as a separate page,
private to the product owner.

On 28 October 2026 the product owner asked for the guide inside the
platform, under its own entry in the top navigation bar. They also asked
that its first step explain that, **on request, a visitor can get a QA Test
Pass covering every role and function**.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** It serves the go-to-market goal's *explain* third ([scope 28](./28_onboarding-a-club-and-its-history.md) §3). P5 and P7 hold: a QA Test Pass is on synthetic data only |
| 2_business    | **Changed.** The glossary gains **QA Test Pass**. **BR190**: a QA Test Pass is granted by the platform owner, on request. It is test-site sign-ins for every role, on synthetic data, and never on production. Asking for one grants nothing by itself (BR145). The guide's rules are described, not changed |
| 3_information | **No change.** The page reads nothing and stores nothing. Its conditions live in the visitor's browser only |
| 4_application | **Changed.** `/season-paths`: a public page that is prerendered and has no session. `src/web/season-paths.ts` is the guide's data and its pure evaluation: which steps show, where a path stops, and the outcome. `SeasonPaths.tsx` renders it. `SITE_NAV` and the footer gain **Season paths** |
| 5_technology  | **No change.** |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | The guide is a separate page outside the platform. Its links point at the test site's absolute address. It says nothing about getting access to walk the paths |
| **Target** (delivered) | The guide is `/season-paths`, linked from the top bar and the footer. Its screen links are relative, so they open on whichever site serves the page. Path 1's first step explains the QA Test Pass and links to the enquiry form |

## Work packages and deliverables

### WP1 — The guide as a platform page

- **Deliverables:**
  - `src/web/season-paths.ts`: the four paths, their conditions and steps,
    and `walkPath`, which returns the visible steps. Each step carries its
    stop, warning and status, whether it comes after a stop, and the path's
    outcome. This is the guide's script as typed data, pure, so it is
    tested.
  - `src/web/season-paths.test.ts`.
  - `src/app/season-paths/page.tsx` and `SeasonPaths.tsx`: tabs for the
    four paths, the conditions as switches, and the path with each step's
    rules. A status is a dot and a word.
  - `src/app/globals.css`: a `paths-` section on the app's own tokens.
  - `src/web/nav.ts`: **Season paths** in `SITE_NAV` and in the footer's
    Product column.
- **Outcome:** the guide is part of the product, and is shown wherever the
  product is shown.

### WP2 — The QA Test Pass, explained at step 1

- **Deliverables:**
  - In Path 1, step 1, a note: on request you get a QA Test Pass, which
    gives sign-ins on the test site covering every role and function, so
    you can walk each path yourself. It links to `/interest`.
  - **QA Test Pass** in the glossary, and BR190.
- **Outcome:** a visitor knows how to go from reading a path to walking it.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The guide's four paths, conditions and rules, unchanged in substance | Issuing passes automatically. The platform owner sets them up by hand (BR190) |
| The QA Test Pass explained, with a way to ask | A "QA Test Pass" choice on the enquiry form. Today it is asked for in the note |
| | Retiring the separate published guide. The product owner may keep or delete it |

## Gap notes

- **Passes are issued by hand.** The platform owner creates the test-site
  sign-ins for each role on the development project. A self-service pass
  would contradict BR145 and decision 7's reasoning, so it isn't a goal.
- **Asking for a pass.** `/interest` has no QA choice, so the step tells the
  visitor to say so in the note. A third choice beside BR188's question and
  demo would need a migration like 0098's.
- **The guide describes rules; it doesn't enforce them.** If a rule
  changes, the guide's text needs the same change. `season-paths.test.ts`
  pins each path's outcomes, so a change to the guide's logic is a
  deliberate one.

## Open questions

- None.
