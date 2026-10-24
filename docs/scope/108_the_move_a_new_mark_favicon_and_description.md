# Project Scope — The Move: a New Mark, a Favicon and a Description

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/the-move-logo`, cut from
`claude/workspace-join-link` ([scope 107](./107_a_join_page_to_share_when_a_workspace_link_goes_astray.md)).

The product owner asked (October 2026) for a new logo: **a pitch with a
small football running around it**. Three animated studies were drawn for
comparison (*the lap*, *the move* and *the circle*). They chose **the
move**, and asked for the ball to be **a real football**. They also asked
for a favicon like the logo, and for the site's description to read **"One
Person, Five Possible Roles, No Second Account"**.

The mark was a football on pitch blue, with a volt ring and a single
pentagon (scope 95, recoloured in [scope 105](./105_the_pitchpeople_style_everywhere.md)).
The site had no favicon, so browsers showed their own blank one. The
description repeated the tagline.

## The mark

- **The pitch:** a pitch-blue tile with white markings: the touchline, the
  halfway line, the centre circle and both penalty boxes.
- **The ball:** a 32-panel football with a pentagon at its centre, five
  at the rim and the seams between. It is lit from the top left. It is a
  third of the pitch's height, so at 30px its panels are still dark patches
  on white.
- **The move:** three passes and a shot into the right-hand goal, whose
  net lights in volt. The mark is not a status, so it may borrow the
  Assistant's colour, as its ring did. Then the ball is back on the centre
  spot for the restart.
  - The ball spins with the distance it travels, the other way when it
    rolls left.
  - It always stops upright, so **the still mark is a ball at kick-off**.

**When it moves**, which is decided once in `BrandMark`:

| Where | Behaviour |
| ----- | --------- |
| The front door's top bar | Plays once when the page opens |
| Everywhere else (top bar, footer, sign-in) | Still. Plays on hover, or when its link takes keyboard focus. A logo that moved on every page would pull the eye from the work |
| Motion turned off (`prefers-reduced-motion`) | Never moves |
| Every run | 2.9 seconds, inside WCAG 2.2.2's five seconds for movement that starts on its own |

**The favicon** (`src/app/icon.svg`) is drawn for 16 pixels, not shrunk
from 32. It has the tile, the touchline, the halfway line and the football
on the spot, big enough to show its middle pentagon. It is still, because a
browser tab does not reliably play animation.

**The description** is `DESCRIPTION` in `src/web/brand.ts`, used as the
site's meta description. The five are the roles P1 names: player, referee,
coach, guardian and committee member. The claim is true (P1), so scope
100's rule against invented claims is kept.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** The description restates Principle P1 in the product owner's words |
| 2_business    | **No change.** No rule, process or role changes |
| 3_information | **No change** |
| 4_application | **Changed.** <ul><li>A new mark in `src/components/ui/BrandMark.tsx`, which keeps the one drawing.</li><li>`src/app/_components/BrandMark.tsx` now animates that drawing.</li><li>A favicon, `src/app/icon.svg`.</li><li>The meta description.</li></ul> Row updated in [application components](../ea/4_application/2_application-components.md) |
| 5_technology  | **No change.** SVG and SMIL in the browser; no dependency. Next serves `icon.svg` through its file convention |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A still football in a volt ring on pitch blue; no favicon; the tagline as the description |
| **Target** | A pitch whose football makes three passes and scores on the front door, and on hover anywhere. A matching 16px favicon. "One Person, Five Possible Roles, No Second Account" as the description |

## Work packages and deliverables

### WP1 — The mark

- **Deliverables:**
  - `src/web/brand-mark.ts`, the move's timing, its path and the ball's
    spin, with a test that the animation's lists agree. SMIL ignores a
    mismatched animation without an error, so the test is the only thing
    that would notice.
  - `src/components/ui/BrandMark.tsx`: the tile, the pitch and the football,
    as parts the app's mark composes, and the still mark itself.
  - `src/app/_components/BrandMark.tsx`: the animated mark, a client
    component, with `intro` set in the top bar.
- **Outcome:** one drawing, still everywhere it should be, moving only
  where it was asked to.

### WP2 — The favicon and the description

- **Deliverables:** `src/app/icon.svg`; `DESCRIPTION` in `src/web/brand.ts`,
  read by `src/app/layout.tsx`.
- **Outcome:** a PitchPeople tab icon, and a search result that says what
  the product is.

### WP3 — Docs

- **Deliverables:** this document and its index row; the shell row in
  application components.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The mark in the top bar, the footer and on sign-in | A wordmark or new lettering for the name |
| An SVG favicon | `favicon.ico`, PNG icons and an Apple touch icon |
| The meta description | Open Graph and social-card images and text |

## Gap notes

- **Older browsers and home screens.** An SVG favicon covers current
  Chrome, Edge, Firefox and Safari. A `favicon.ico` for older browsers and
  an `apple-icon.png` for an iPhone home screen are both raster files.
  Producing them needs an export step, or Next's generated-icon route,
  whose renderer does not draw clip paths, which the ball's panels use.
- **A shared link shows no picture.** Social cards (`opengraph-image`) would
  need the mark and the description laid out at 1200×630. That is a small
  page of its own.
