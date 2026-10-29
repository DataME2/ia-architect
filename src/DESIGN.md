---
name: "PitchPeople — Tactics Board"
option: "C"
defaultTheme: "dark"  # prefers-color-scheme: light switches to colorsLight
colors:
  background: "#0d2b20"
  backgroundSunk: "#0a2219"
  surface: "#12382a"
  surfaceSubtle: "#184634"
  foreground: "#f2f0e6"
  muted:
    DEFAULT: "#b9c7bc"
    foreground: "#dbe3dc"
  border:
    DEFAULT: "#2b6049"
    strong: "#6f9f88"
  primary:
    DEFAULT: "#f2f0e6"
    hover: "#ffffff"
    soft: "#1d523d"
    foreground: "#12382a"
  secondary:
    DEFAULT: "#184634"
    foreground: "#f2f0e6"
  accent:  # the Assistant, and only the Assistant
    DEFAULT: "#dbe9ff"
    hover: "#c6dcff"
    foreground: "#14233a"
  signal:  # the style's highlight: live, now, this one
    DEFAULT: "#f5d547"
    foreground: "#12382a"
  success:
    DEFAULT: "#173f2c"
    foreground: "#9df0c0"
    indicator: "#7ee2a8"
  warning:
    DEFAULT: "#3a3a12"
    foreground: "#f5d547"
    indicator: "#f5d547"
  destructive:
    DEFAULT: "#4a1d1f"
    foreground: "#ffb0b2"
    indicator: "#ff8a8d"
  info:
    DEFAULT: "#173a4a"
    foreground: "#a8dcf5"
    indicator: "#6cc4ee"
  rail:
    DEFAULT: "#0a2219"
    line: "#1d523d"
    foreground: "#f2f0e6"
    muted: "#b9c7bc"
  magnet:
    home: "#c62828"
    away: "#2563eb"
    you: "#f5d547"
  frame: "#6b4b2e"
colorsLight:
  background: "#f6f7f4"
  backgroundSunk: "#eceee8"
  surface: "#ffffff"
  surfaceSubtle: "#f1f3ee"
  foreground: "#13211a"
  muted:
    DEFAULT: "#4f5f56"
    foreground: "#34433a"
  border:
    DEFAULT: "#d3d9d2"
    strong: "#7f8e85"
  primary:
    DEFAULT: "#12382a"
    hover: "#184634"
    soft: "#e1ece5"
    foreground: "#ffffff"
  secondary:
    DEFAULT: "#f1f3ee"
    foreground: "#13211a"
  accent:  # the Assistant, and only the Assistant
    DEFAULT: "#dbe9ff"
    hover: "#c6dcff"
    foreground: "#14233a"
  signal:  # the style's highlight: live, now, this one
    DEFAULT: "#8a6d00"
    foreground: "#ffffff"
  success:
    DEFAULT: "#dcf3e4"
    foreground: "#0f5132"
    indicator: "#12a150"
  warning:
    DEFAULT: "#fff3c4"
    foreground: "#6b4e00"
    indicator: "#a87f00"
  destructive:
    DEFAULT: "#fde2e2"
    foreground: "#8a1c1c"
    indicator: "#d32f2f"
  info:
    DEFAULT: "#dde9fb"
    foreground: "#1e3a6e"
    indicator: "#2563eb"
  rail:
    DEFAULT: "#12382a"
    line: "#1d523d"
    foreground: "#f2f0e6"
    muted: "#b9c7bc"
  magnet:
    home: "#c62828"
    away: "#1d4ed8"
    you: "#d4a800"
  frame: "#9aa4a0"
typography:
  fontFamily:
    sans: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
    mono: "'Space Mono', ui-monospace, SFMono-Regular, monospace"
    hand: "'Permanent Marker', 'Comic Sans MS', cursive"
  fontSize:
    xs: "0.75rem"
    sm: "0.875rem"
    base: "1rem"
    lg: "1.25rem"
    xl: "2.125rem"
    2xl: "3.5rem"
    hand: "clamp(2.5rem, 5vw, 4rem)"
  fontWeight:
    normal: "400"
    medium: "500"
    semibold: "600"
    bold: "700"
  lineHeight:
    hand: "1"
    tight: "1.2"
    normal: "1.5"
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
  lg: "14px"
  card: "4px"
  full: "999px"
shadows:
  xs: "0 2px 0 rgb(0 0 0 / 25%)"
  sm: "0 5px 0 -1px rgb(0 0 0 / 35%)"
  magnet: "inset 0 -5px 0 rgb(0 0 0 / 22%), 0 6px 10px rgb(0 0 0 / 35%)"
  card: "0 10px 18px -10px rgb(0 0 0 / 55%)"
borderWidth:
  DEFAULT: "2px"
  frame: "6px"
motion:
  duration:
    fast: "120ms"
    base: "260ms"
    magnet: "700ms"
    chalk: "1100ms"
  easing:
    magnet: "cubic-bezier(0.5, 1.6, 0.4, 1)"
    chalk: "ease-out"
    pin: "cubic-bezier(0.3, 1.4, 0.5, 1)"
  reducedMotion: "magnets jump, chalk lines appear drawn, cards appear pinned"
---

# PitchPeople — Tactics Board

The Tactics Board is the coach's whiteboard turned into the club's interface: green felt, chalk lines, magnets you can move, index cards pinned to the board and arrows that draw themselves. Every role is a magnet, every task a card, every plan a drawing. It is hands-on and slightly scruffy on purpose, and it makes the platform feel like something the club does rather than something it fills in.

## Principles

1. **No state by hue alone.** Statuses are a dot and a word in mono caps; on index cards the word is dark ink.
2. **Magnets are things you can move.** Anything round and raised (roles, players) is interactive and answers with a springy move. Flat chalk is never interactive.
3. **Chalk yellow means "look here".** `signal` (#f5d547) draws arrows, circles the number that matters, rings the selected magnet and marks you ("you are here"). It is never a button fill on the board.
4. **The Assistant leaves a blue card.** `accent` (#dbe9ff), a pale blue index card labelled "Assistant · draft". It suggests; the coach decides.
5. **One person in the middle.** On the home board you are the yellow magnet at the centre spot; every role runs out from you.
6. **Fat fingers welcome.** Magnets are at least 52px, buttons 44px, and nothing needs precise dragging: a tap moves things.

## Color & Theming

Dark-first ("Felt", `colors`), with a light "Whiteboard" counterpart (`colorsLight`) for bright clubrooms and projectors.

- **Felt** (`background` #0d2b20, `surface` #12382a, `surfaceSubtle` #184634) with a faint brushed texture and chalk smudges (radial gradients at 4–5% white).
- **Chalk** (`foreground` #f2f0e6, `muted` #b9c7bc): text, pitch markings at 35–55% opacity, primary buttons (chalk pill with felt text).
- **Chalk yellow** (`signal`): arrows, rings, circles, the "you" magnet.
- **Magnets** (`magnet.home` #c62828, `magnet.away` #2563eb, `magnet.you` #f5d547): team colours with white numbers at 19px bold (large text).
- **Index cards** (#fbfaf4 with faint blue ruling): where work lands. Cards use dark ink text and the light status colours.
- **Frame** (`frame` #6b4b2e): the wooden ledge under the header.

## Typography

- **Permanent Marker** (`hand`): headings and annotations only, never controls, never under 20px. It is the coach's handwriting.
- **Space Grotesk** (`sans`): everything else.
- **Space Mono** (`mono`): numbers on magnets, clocks, money, step names and status words.

## Spacing & Density

The 7-step scale is unchanged. The board is the layout: a large 16:9 or 105:68 board on the left, a column of pinned cards on the right, wrapping under it on a phone.

## Shape & Elevation

- Magnets: circles with an inset bottom shade and a drop shadow (`shadows.magnet`).
- Strips (tabs, chips, buttons): full pills with a 2px border; the active strip is chalk yellow.
- Index cards: 4px corners, a red pin, a slight rotation (−1.5° to 1.2°), `shadows.card`.
- The board has a 3px chalk frame; the header sits on a wooden ledge (`borderWidth.frame`).

## Motion

| Moment | What moves | Timing |
| --- | --- | --- |
| Role pick | The magnet pops (scale 1.14, yellow ring), a chalk arrow draws from you to it, a ring pulses | 260ms + 1100ms chalk |
| Cards | Waiting cards drop in and settle at their tilt, staggered 90ms | 600ms `pin` |
| Formation | Switching 4-3-3 / 4-4-2 / 3-5-2 slides every magnet to its new spot with a springy overshoot; the runs redraw | 700ms `magnet` |
| Registration | A runner slides cone to cone along a dashed drill path | 800ms |
| Cleared | A big chalk tick draws itself | 900ms |
| Whiteboard | The number that needs attention gets a hand-drawn circle | 1400ms |
| Approve | A claim card moves from "To approve" into "Approved" | 500ms `pin` |

Under reduced motion, magnets jump to place, chalk appears already drawn and cards appear pinned.

## Imagery

- The board is the image: pitch markings drawn in SVG with non-scaling chalk strokes.
- Photos appear only on index cards (a polaroid with a pin) and on player profiles.
- Stock (when added): free-licence training and coaching photos (Unsplash or Pexels) with the coach's annotations drawn over them in chalk yellow.

## Interaction patterns (JavaScript)

- **Role magnets**: tapping one sets the acting role, redraws the chalk arrow (path computed from the two positions), pulses the ring and re-pins the cards.
- **Formation board**: positions per formation in percentages; magnets carry `left`/`top` transitions so a change animates for free; tapping a player shows their minutes on a pinned card.
- **Drill-path wizard**: five cones; the runner's position is the current step's cone; Next is gated on required consent.
- **Kanban approval**: approving moves a card between two columns, with counts updating.
- **Hand-drawn emphasis**: an SVG ellipse with `stroke-dasharray` circles the metric that needs attention.

## The four screens

- **Home**: "Today's plan, Sam" board with five role magnets around you, the cards for the selected role, the Assistant's blue card.
- **Matchday**: the score in marker, the clock in a chalk box, the formation switcher, the full board with home and away magnets and drawn runs, the selected player's card.
- **Register**: "Registration drill", the cone path and runner, a clipboard card with the fields, the chalk tick.
- **Committee**: "Committee whiteboard": four KPI frames (arrears circled), a two-column approval board, chalk-outlined weekly bars.

## Component Conventions

- Variants: `primary` (chalk pill), `outline` (2px chalk pill), on cards `primary` becomes a felt pill.
- Sizes: `md` 44px, magnets 52px (players) and 96px (roles).
- Status: mono caps word and a raised dot.

## Content Guidance

Coach's voice: imperative and brief. "Pick a magnet." "Tap a magnet. Switch the shape and watch them move." Annotations can be playful; labels and buttons stay plain.

## Accessibility

Contrast as specified (WCAG 2):

| Pair | Where | Dark | Light |
| --- | --- | --- | --- |
| `foreground` on `background` | Body text on the page | 13.3:1 | 15.5:1 |
| `foreground` on `surface` | Body text on cards | 11.3:1 | 16.7:1 |
| `muted` on `surface` | Secondary text on cards | 7.4:1 | 6.8:1 |
| `primaryFg` on `primary` | Label on the primary button | 11.3:1 | 12.9:1 |
| `accentFg` on `accent` | Text on an Assistant note | 12.9:1 | 12.9:1 |
| `signalFg` on `signal` | Text on a signal fill | 8.9:1 | 4.9:1 |
| `okFg` on `okBg` | Cleared pill | 8.8:1 | 8.0:1 |
| `warnFg` on `warnBg` | Waiting pill | 8.1:1 | 7.0:1 |
| `stopFg` on `stopBg` | Blocked pill | 8.1:1 | 7.6:1 |
| `infoFg` on `infoBg` | Info pill | 8.2:1 | 9.1:1 |
| `railMuted` on `rail` | Small labels on the rail | 9.5:1 | 7.4:1 |
| `borderStrong` on `surface` | Control borders (needs 3:1) | 4.3:1 | 3.4:1 |
| `stopInd` on `surface` | Blocked dot (needs 3:1) | 5.7:1 | 5.0:1 |

Magnet numbers are 19px bold (large text) at 5.6:1 on the home red. Focus is a 3px chalk-yellow outline offset 3px. Every magnet is a real `<button>` with an `aria-label` ("#9 Okafor, Striker").

## Do's and Don'ts

- **Do** make anything movable look like a magnet, and nothing else.
- **Do** keep Permanent Marker for headings and notes.
- **Do** keep pitch lines in chalk at 35–55%.
- **Don't** use red magnets for errors: blocked is the status word and dot.
- **Don't** require dragging; a tap must always do it.
- **Don't** use chalk yellow as a button fill.

## Gaps & Decisions

- Replaces Pitch Slate and Electric Volt; volt is retired and the Assistant becomes a blue index card.
- Dark-first (Felt); the Whiteboard theme is the light counterpart for projectors and sunlight.
- Token names match the existing Tailwind layer; `signal`, `magnet.*` and `frame` are additions.
- Space Grotesk, Space Mono and Permanent Marker are self-hosted as latin woff2 in `public/fonts/`, with their licences (scope 123).
- **Applied as tokens first (scope 123).** `globals.css` and the Tailwind layer carry these values, and every colour in `globals.css` is a token.
- **Then the shapes and the pieces (scope 124).**
  - 2px controls, pill strips with the active one in chalk yellow, and chalk pills that press 3px into their 5px drop.
  - One 3px focus ring offset 3px, and index-card corners and shadows.
  - `Magnet`, `ChalkLine` and `PinnedCard` in `src/components/ui`.
  - The bar and footer on the wooden ledge, and the Team Dugout drawn as a board.
  - The home board, the other three screens and the remaining motion patterns are not built yet.
- `--font-display` is Permanent Marker, so it stays on headings of 20px or more. Eyebrows, the brand name, small labels and initials fall back to Space Grotesk, and tallies to Space Mono.
- The Whiteboard is also the print scheme, so paper is never felt.
- A pressed chip is the active strip in chalk yellow, since a felt fill would vanish on felt.
- `shadows.md` and `shadows.lg` are not in this file. The black versions are kept for the panels and popovers that use them.
- Card and Panel take the index card's corners and shadow, but stay on `surface`, because body text on cards is chalk on felt. The paper (`--card`, #fbfaf4) is for task cards: `PinnedCard`, whose `.paper` scope restates the Whiteboard tokens so ink, the light statuses and the felt primary pill follow. Only task cards are pinned and tilted.
- The mark is a paper tile with a felt pitch drawn on it in chalk. Its net lights in `signal` with a felt edge, since chalk yellow is 1.4:1 on paper.
- On a phone narrower than about 400px, the dugout's magnets shrink to 44px, the touch-target floor, so five in a line do not touch.
- Tailwind's type scale is not remapped, because the components' `text-lg` and `text-2xl` would jump to 2.125rem and 3.5rem. Only `text-hand` is added.