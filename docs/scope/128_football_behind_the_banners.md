# Project Scope — Football Behind the Banners

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/hero-media`, stacked on
[scope 126](./126_match_officials_on_the_board.md).

On 30 October 2026 the product owner asked for a football photograph or video
behind every banner, and on sign-in. They answered
[open question 119](./open-questions.md) the same day:

- the banners may use generated media, and later the rule against it was
  withdrawn altogether;
- photographs come from Unsplash or Pexels, under their free licences.

This scope puts two such photographs behind the banners. The supplied videos
wait to be compressed.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** No goal, driver or principle changes |
| 2_business    | **No change.** No rule, service or role changes |
| 3_information | **No change.** Nothing about a person is read or stored. The photographs show no one |
| 4_application | **Changed, presentation only.** A page's banner (`.hero`), the front door's hero band and sign-in's side panel each stand on a photograph under a felt veil, drifting slowly closer |
| 5_technology  | **Changed.** Two images are served from `public/media/`, 554 KB together, with their sources and licences in `public/media/README.md`. No dependency is added |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | The banners were felt gradients with a chalk centre circle. Scope 32's rule kept every artwork slot empty until licensed artwork arrived, and it was never to be machine-generated |
| **Target** (delivered) | Each banner shows a photograph of a pitch: floodlit at night on the front door and sign-in, a ball on the grass on a page's banner. The felt veil is densest where the words are, so chalk text keeps its contrast. The photograph drifts closer over 26 seconds and back, holds still under reduced motion, and is dropped in print |

## Work packages and deliverables

### WP1 — The photographs

- **Deliverables:**
  - `public/media/floodlit-pitch.webp`: Jonathan Petersson on Unsplash, 2400×1596, 321 KB.
  - `public/media/ball-on-grass.webp`: Pixabay on Pexels, 2400×1600, 233 KB.
  - `public/media/README.md`: the source and licence of each, and the note that the ball shows a small adidas logo, so it must not suggest an endorsement.
- **Outcome:** licensed photographs, with no identifiable person, kept with
  their provenance.

### WP2 — The banners

- **Deliverables:** in `src/app/globals.css`, the *football behind the
  banners* block:
  - `--photo-night` and `--photo-day` in the token block;
  - a `::before` layer on `.hero`, `.home-hero` and `.auth-aside` with a
    100° felt veil over the photograph;
  - the `photo-drift` animation, off under reduced motion and hidden in
    print;
  - the front door's layer runs the window's width, like its other bands.

  `src/app/globals.css`'s note on the motif layer records that scope 32's
  rule is withdrawn.
- **Outcome:** the banners look like football, and every heading on them
  still reads.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Two photographs behind the three kinds of banner | The supplied videos |
| | The `HeroBanner` component, which no page uses |

## Gap notes

- **The videos.**
  - The three supplied videos are 7 to 9 MB each. A background should be
    about 2 MB or less, muted, with a still poster for reduced motion and
    slow connections.
  - No video encoder is installed here. Either the product owner exports
    smaller files, or `ffmpeg-static` is added as a development tool to
    make them.
  - Once compressed, a video replaces the photograph on the front door,
    where it is largest, and the photograph stays as its poster.
