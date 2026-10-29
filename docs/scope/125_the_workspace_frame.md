# Project Scope — The Workspace Frame

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/workspace-frame`.

On 30 October 2026 the product owner found the club screens and the
workspaces cramped and messy, with cards squeezed until they overlapped. They
asked for the side menu to sit at the left edge, as their dashboard reference
does, so the work gets the room, and for it to hold on a phone and a tablet.
The same message asked for two small moves in the club menu and for a dozen
larger changes to individual screens (listed under [the programme](#the-programme)).

This scope builds the frame the rest stands on: the side at the window's
left edge and the content full width. It also makes the two menu moves:
Working with Children Checks get their own place below Reports, and
Carnivals is marked as work in progress.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** No goal, driver or principle changes |
| 2_business    | **No change.** No rule, service or role changes. Recording a Working with Children Check keeps its rules (BR54, BR84) and its form. Only where it is reached changes |
| 3_information | **No change.** Nothing is read or stored differently |
| 4_application | **Changed, presentation and navigation.** The club screens and /me share one frame: the side pinned to the left edge from 64rem, and the content full width. The club menu gains *Working with Children Checks* (`/registrar/clearances`) under Reports, and Teams links to it instead of holding the form. Carnivals carries a work-in-progress watermark |
| 5_technology  | **No change.** No dependency is added |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | Every screen sat in the 78rem centred shell. On a club screen the menu was a 260px column inside it from 768px, which on a tablet left about 440px for the work. On /me the rail was a 280px card. A two-column grid split by the window's width, not by the room it had, so cards were squeezed side by side |
| **Target** (delivered) | From 64rem the club menu and the identity rail are the window's height, flush with its left edge, and scroll on their own. The content uses the rest of the width. Below 64rem the menu folds into a Menu button above the page, and the rail is a card above the work. Two-column grids collapse by the width of the content |

## Work packages and deliverables

### WP1 — The frame

- **Deliverables:**
  - `src/app/globals.css`, the *workspace frame* block:
    - `.shell:has(.ws-frame)` drops the centred width;
    - `.ws-side` sticks under the bar at the window's height from 64rem;
    - `.ws-content` is a size container, so `.cols` collapses below 56rem of content rather than of window;
    - the side is flush, with no corners or shadow and a rule on its right.
  - `src/components/ui/RegistrarShell.tsx` uses the frame, and its columns start at `lg` instead of `md`. `src/components/ui/RegistrarNav.tsx` folds at `lg`, so a tablet gets the full width.
  - `src/app/registrar/layout.tsx`: the demo banner, the session strip and the bell head the content column.
  - `src/app/preview/frame/page.tsx` (development only): the frame on sample cards. `?me=1` shows /me's version.
  - `src/app/me/page.tsx`: /me uses the frame. The rail's column now collapses at 64rem, the design system's `lg`, rather than 62rem.
- **Outcome:** more room for every club screen and workspace, and no card squeezed into overlap.

### WP2 — Working with Children Checks

- **Deliverables:**
  - `src/app/registrar/clearances/page.tsx`: the form, as it was on Teams, with its explanation.
  - `src/web/nav.ts`: *Working with Children Checks* just below *Reports*.
  - `src/app/registrar/teams/page.tsx`: the form is replaced by a link to it.
  - `src/app/registrar/teams/actions.ts` also revalidates the new page.
- **Outcome:** a check is recorded for a person from its own place, before they join a team.

### WP3 — Carnivals in progress

- **Deliverables:**
  - `src/app/registrar/carnivals/page.tsx` is wrapped in `.wip-page`, and its first element is a *Work in progress* note.
  - `src/app/globals.css` draws that note as a diagonal chalk stamp across the screen. It is real text, so a screen reader meets it first, and it never takes a click.
- **Outcome:** nobody mistakes the carnival screens for finished.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The frame for the club screens and /me | Each screen's own redesign ([the programme](#the-programme)) |
| The two club-menu moves | Carnivals finished |

## The programme

The rest of the product owner's message, in the order recommended. Each is
its own scope, written before it is built.

| # | Initiative | What it needs first |
| - | ---------- | ------------------- |
| 1 | **Club fees, set by the admin and the treasurer.** A fee schedule: club registration lines by programme and age group, governing-body fees, levies, fixed deposits and discounts. The discounts include 2nd, 3rd and subsequent siblings. The club writes the registration terms from a template with placeholders (`{club}`, `{club_email}`, dates and links) | A business rule replacing BR3's one season fee, a migration with RLS (admin and treasurer write), and answers on how a player is matched to a line and who counts as a sibling (see the gap notes) |
| 2 | **Match officials.** *Your Official Profile* (Superdesign `2f0a4ebf`) and *Referee Profile Detail* (`7d7bec9a`) in the Tactics Board style. Designations synchronised with the calendar and the teams by competition. Reliability, cancellation rate, total hours and average per season, computed in `src/web` | Planned in [scope 126](./126_match_officials_on_the_board.md). A direct message needs a decision record: adults only, and the safeguarding policy (question 111) |
| 3 | **Match official payments and fees** in one screen, tabbed and synchronised with the calendar, the teams and the game dates | Initiative 2's synchronisation |
| 4 | **Club profile** in tabs, from *Tactics Board Settings* (`32158f82`) | Planned in [scope 127](./127_club_settings_in_tabs.md) |
| 5 | **Sponsors**: logos, a card per campaign, and motion | Logo storage, and a sponsor's consent to show their logo |
| 6 | **Governance** in tabs, with a card per committee member and a photo | A photo is personal data. Answered 30 October 2026: the member consents with a checkbox before a photo is kept, as for players' photos |
| 7 | **Committee Hub, Privacy and Access** with motion, and a card explaining how to set up the club's own storage | Nothing new |
| 8 | **Workspaces (/me) in tabs** | This frame |
| 9 | **Football photo or video behind every HeroBanner and on sign-in** | Answered 30 October 2026: the supplied videos may be used, as an exception to scope 32's rule. Photos come from Unsplash or Pexels. The videos need compressing first (see the gap notes) |

## Gap notes

- **Fees.** Today a season has one fee (BR3, `season.registration_fee_cents`).
  The reference has 14 registration lines, four governing-body fees, a levy
  and sibling discounts. Three answers are needed before the rule can be
  written:
  - Is a player's line decided by their age group, by a programme the
    family chooses, or both?
  - Who is a sibling: the same guardian, the same family email, or a linked
    Person?
  - Does a discount apply to the club fee only, or to the governing body's
    fee too?
- **The hero media.**
  - `src/app/globals.css` and scope 32 (WP6, open question 66) say the
    motif layer is for licensed artwork and *never machine-generated*. Two of
    the supplied videos are named as Higgsfield generations (`hf_…`).
  - DESIGN.md asks for free-licence stock (Unsplash or Pexels).
  - The supplied photo is 736px wide, which is typical of an image saved
    from a pin board, and it shows Nike's marks. Its licence is unknown.
  - The product owner can overturn the first rule. The photo needs a source.
  - **Answered 30 October 2026.** The hero backgrounds and sign-in are an
    exception to the first rule, which still governs the motif layer. Photos
    come from Unsplash or Pexels under their free licences.
  - The three videos are 7 to 9 MB each. A background should be about 2 MB
    or less, muted, with a still poster for reduced motion and slow
    connections. No video tool is installed here, so compressing them is the
    first step of that initiative.

## Open questions

- **Q118.** How is a player matched to a fee line, who counts as a sibling,
  and which fees does a discount reduce? Asked here, applied by initiative 1.
- **Q119.** May the hero backgrounds use the supplied machine-generated
  videos, overturning scope 32's rule for this use? What is the supplied
  photo's source and licence? **Answered 30 October 2026:** yes to the
  videos, and photos from Unsplash or Pexels.
