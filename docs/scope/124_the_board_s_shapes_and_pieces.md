# Project Scope — The Board's Shapes and Pieces

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/tactics-board-shapes`.

[Scope 123](./123_the_tactics_board_theme.md) applied the product owner's
Tactics Board `src/DESIGN.md` as tokens and left three gaps: colours still
stated inside five components, two team colours under 3:1 on felt, and the
board itself. On 29 October 2026 the product owner asked for those gaps to
be closed in four steps:

1. tokens in the five components, with the mark's net lit in chalk yellow,
   and lighter team colours;
2. the board's shape language: 2px controls, pill strips with the active one
   in chalk yellow, chalk pills that press down, one focus ring, index-card
   corners and shadows, and a pin only on task cards;
3. three pieces in `src/components/ui`: a magnet, a chalk line and a pinned
   card;
4. the top bar on the wooden ledge, with headings of 20px or more in the
   hand.

They also asked for the mark's background to be `#fbfaf4`, and for the Team
Dugout to look like their mock-up of the home board: magnets on a framed
board, a chalk line to the one you picked, and pinned cards beside it.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** No goal, driver or principle changes. The Assistant keeps its own colour and its one surface |
| 2_business    | **No change.** No rule, service or role changes. A status is still a dot and a word, and the dugout still starts only a player who may take the field (BR79) and shows no amount (BR78) |
| 3_information | **No change.** Nothing is read or stored differently. A formation is still a view |
| 4_application | **Changed, presentation only.** Three new pieces in `src/components/ui` (Magnet, ChalkLine, PinnedCard). The Team Dugout is drawn as a tactics board. *What is waiting for you* becomes pinned cards. The top bar marks the current page. No route, decision or data access changes. The [application components](../ea/4_application/2_application-components.md) gain a row for the pieces, and the Team Dugout row is updated |
| 5_technology  | **No change.** No dependency is added. The Tailwind layer's colours become `@theme inline`, so a card can restate a token and every utility inside follows (see the [Styling row](../ea/5_technology/1_technology-services.md)) |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | Tactics Board tokens on scope 105's shapes: 1px borders, 10px panels, a 2px focus ring with a halo, a segmented formation switcher, and a portrait pitch of shirts. Five components still state white or hex. `--team-2` reads 2.7:1 on felt |
| **Target** (delivered) | The board's shapes: 2px controls, pill strips with chalk yellow for the active one, chalk pills with a 5px drop that press 3px, a 3px chalk-yellow focus ring offset 3px everywhere, and 4px index-card corners. Task cards are pinned paper. The dugout is a framed board of magnets with a chalk line to the chosen player. No component states a colour |

## Work packages and deliverables

### WP1 — The components' colours

- **Deliverables:**
  - `src/components/ui/WizardSteps.tsx`: the done mark is felt on the success dot, and the current step is the chalk-yellow strip.
  - `src/components/ui/HeroBanner.tsx`: a felt ground with chalk text, the eyebrow in chalk yellow, the title in the hand, and a chalk circle without the orange glow.
  - `src/components/ui/IdentityRail.tsx` and `src/components/ui/RegistrarNav.tsx`: rail tints are mixed from `--rail-text`, and the current section is chalk.
  - `src/components/ui/BrandMark.tsx` and `src/app/_components/BrandMark.tsx`: the mark is an index card (`--card`, `#fbfaf4`) with a felt pitch and chalk lines on it. The ball is chalk and ink, and the net lights in `--signal`.
  - `src/app/globals.css`: `--team-0` becomes `#7b9cf0` (4.8:1 on a card) and `--team-2` becomes `#a985e0` (4.4:1) on felt. The Whiteboard keeps the old values, which pass on white.
  - `src/app/layout.tsx`: the theme colour is the bar's felt.
- **Outcome:** no component under `src/components/ui` states a colour.

### WP2 — The shape language

- **Deliverables:**
  - `src/app/globals.css`:
    - Controls (fields, buttons, chips, tabs) take `--border-width`.
    - Chips, the front door's tabs and the formation switcher are full pills, and the active one is chalk yellow.
    - A primary button is a chalk pill on `--shadow-sm` (a 5px drop) that presses down 3px onto `--shadow-xs`.
    - One focus rule: a 3px `--focus` outline offset 3px, with no halo and no change of shape.
    - `.card` and `.panel` take `--radius-card` and `--shadow-card`.
    - A new `.paper` scope restates the Whiteboard tokens, so anything on an index card reads in dark ink with the light status colours, and its primary button becomes a felt pill.
  - `src/components/ui`:
    - `Button`, `TextField`, `SelectField`, `WaitingList` and `WizardSteps` take the 2px border and the pill.
    - `Card` and `Panel` take the index card's corners and shadow.
    - Every component's own focus-ring utilities are removed, so the one rule applies everywhere. They are unlayered and had been beating it.
  - `src/app/design-system.css`: the colours move to `@theme inline`, and the motion keyframes for the pieces are added.
- **Outcome:** one shape language across the hand-written screens and the design system.

### WP3 — The pieces

- **Deliverables:**
  - `src/components/ui/Magnet.tsx`:
    - a real `<button>` with a required `aria-label`, at least 52px (96px for a role);
    - in the home, away or "you" colour, with the selected one popped and ringed in chalk yellow;
    - placed by `at` in per cent, and moving with `--ease-magnet` over `--dur-magnet` whenever its position changes.
  - `src/components/ui/ChalkLine.tsx`: an SVG `<path>` that draws itself over `--dur-chalk`. The caller keys it on its target so that it redraws.
  - `src/components/ui/PinnedCard.tsx`: the paper index card with a red pin and a tilt between −1.5° and 1.2°. It drops in on `--ease-pin`.
  - Every motion is off under `prefers-reduced-motion`: magnets jump, chalk appears drawn and cards appear pinned. Nothing needs dragging, and a tap always does it.
- **Outcome:** the board can be drawn from the library rather than per screen.

### WP4 — The chrome

- **Deliverables:**
  - `src/app/layout.tsx` and `src/app/globals.css`:
    - The bar sits on the wooden ledge, a `--border-width-frame` rule in `--frame`, and the footer stands on the same ledge.
    - The bar's destinations are 2px chalk pills, and Register is the chalk pill that presses.
    - `h1` joins `h2` in the hand at weight 400. The brand name stays in Space Grotesk.
  - `src/app/_components/TopbarLinks.tsx`: the destinations, with the current page marked `aria-current` and drawn as the chalk-yellow strip.
- **Outcome:** every screen's frame is the board's frame.

### WP5 — The Team Dugout as a tactics board

- **Deliverables:**
  - `src/app/_components/TeamDugout.tsx` and its rules in `src/app/globals.css`:
    - The team name is in the hand, with the coach's line from DESIGN.md: *Tap a magnet. Switch the shape and watch them move.*
    - The formation switcher is pills.
    - The board has a 3px chalk frame and pitch markings in chalk at 35%. It is landscape from 64rem and portrait on a phone, where five midfielders need the width.
    - Each player is a Magnet. A chalk line draws from the technical area on the touchline to the player you pick.
    - The chosen player's card is a PinnedCard. The bench and the technical area are straight index cards, because they are records.
  - `src/web/dugout.ts` is unchanged.
- **Outcome:** the dugout reads as the product owner's mock-up and still decides nothing.

### WP6 — Task cards

- **Deliverables:** `src/components/ui/WaitingList.tsx`. Each item waiting for you is a PinnedCard, with a felt pill to open it.
- **Outcome:** work lands on pinned cards, and records stay straight.

### WP7 — Documentation

- **Deliverables:**
  - `src/DESIGN.md`'s Gaps section;
  - the [application components](../ea/4_application/2_application-components.md);
  - the [Styling row](../ea/5_technology/1_technology-services.md);
  - this document and its index row.

## How the request was read

| Asked | Delivered as | Why |
| ----- | ------------ | --- |
| BrandMark: a felt tile with chalk lines, and its background `#fbfaf4` | A paper tile (`--card`) with a felt pitch drawn on it, chalk lines on the pitch, and the net in `--signal` with a felt edge | Both asks hold: the background is the index card's paper and the board on it is felt and chalk. The edge is there because chalk yellow is 1.4:1 on paper |
| Card and Panel become index cards | `--radius-card` and `--shadow-card` on `--surface` | DESIGN.md's "body text on cards" pair is chalk on `surface`. Paper on every panel would turn every screen's records white. Paper is for work, which is the PinnedCard |
| Only task cards get the pin | *What is waiting for you*, and the dugout's chosen player | DESIGN.md's formation board shows the tapped player on a pinned card. The bench, the technical area, Card and Panel are records and stay straight |
| Magnets at least 52px | 52px, except on a phone narrower than about 400px, where the dugout's magnets shrink to 44px | Five midfielders across a 326px board are 54px apart. At 52px they would touch, and 44px is the touch-target floor |
| Focus everywhere | One rule in `globals.css`. The components' ring utilities are removed | They are unlayered utilities, so they had been overriding the rule on every design-system control |
| Headings 20px+ in the hand | `h1` and `h2`, and the HeroBanner's title. *What is waiting for you* and the role overview's headings grow from 18px to 20px | `h3` is 16px and stays in Space Grotesk, and so does the bar's brand name, which is an `h1`. The two 18px `h2`s had been in the hand since scope 123, under DESIGN.md's 20px floor |
| The dugout like the mock-up | Magnets, a frame, a chalk line from the technical area, and pinned cards | The mock-up's chalk line runs from you to your pick. On a team sheet the coach stands in the technical area, so the line starts there. A "you are here" magnet is not drawn, because the dugout does not know who is looking |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The five components' colours and the two team colours | DESIGN.md's other three screens (Matchday, Register, Committee) as designed |
| The shape language in `globals.css` and `src/components/ui` | The home board of role magnets around you (the mock-up's own screen) |
| Magnet, ChalkLine and PinnedCard | Drawn runs, the drill path, the chalk tick and the hand-drawn circle |
| The bar, the footer and the dugout | Away magnets for an opponent's line-up, which no screen records |

## Gap notes

- **The home board.** The mock-up is DESIGN.md's Home: role magnets around a
  "you" magnet, with a chalk line to the role you pick and that role's
  cards. The pieces now exist. The work is a per-screen pass on
  `/me` that keeps BR61, where switching role is a link.
- **The other motion patterns.** The drill path, the chalk tick, the circled
  number and the approval board each need a screen to live on. ChalkLine
  draws any of their paths.
- **Opponents.** Away magnets need an opponent's line-up, which nothing
  stores. The `away` tone exists for when something does.

## Open questions

None. The readings above are recorded in the table, and the product owner
can overturn any of them.
