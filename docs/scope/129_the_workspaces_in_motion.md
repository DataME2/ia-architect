# Project Scope — The Workspaces in Motion

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/workspaces-in-motion`, stacked on
[scope 128](./128_football_behind_the_banners.md).

On 30 October 2026 the product owner asked for animation and script on every
screen of their earlier request: Committee Hub, Privacy, Access, Governance,
Sponsors and the workspaces. They also asked the Committee Hub to explain how
a club that prefers its own storage sets it up, and asked for Sponsors to be
more interactive, with room for logos and each campaign explained.

This scope does three things:

- gives every club screen and /me one motion;
- adds the storage set-up card to the Committee Hub;
- opens Sponsors on a showcase of its campaigns, with its sections in tabs.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** No goal, driver or principle changes |
| 2_business    | **No change.** No rule, service or role changes. Sponsors stays admin and treasurer only (BR169, BR170), and the set-up card is shown only to the person who can switch storage (BR168) |
| 3_information | **No change.** Nothing is stored. The set-up card's ticks are kept in the viewer's browser only, as a convenience, never a record |
| 4_application | **Changed, presentation only.** `WorkspaceMotion` on every club screen and /me. The Committee Hub's set-up card. Sponsors in tabs, opening on a showcase |
| 5_technology  | **No change.** No dependency is added |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | The club screens and /me drew all at once. The Committee Hub said in one sentence that a club on Microsoft 365 could use SharePoint. Sponsors was one long page that started with a statement table |
| **Target** (delivered) | Cards below the fold rise into place as they scroll in, a few at a time. The IT Manager gets five steps to set up SharePoint, ticking each off in chalk. Sponsors opens on a wall of campaign cards that count up their views and clicks and lean toward the pointer, with the statement, invoices and campaign forms in their own tabs |

## Work packages and deliverables

### WP1 — One motion for the workspaces

- **Deliverables:**
  - `src/app/_components/WorkspaceMotion.tsx`:
    - mounted in `src/app/registrar/layout.tsx` and `src/app/me/page.tsx`;
    - on each page and tab, the outermost cards still below the fold are marked and rise as they scroll in, staggered 70ms;
    - a passive, frame-throttled scroll check rather than an IntersectionObserver, because a jump (End, an anchor) can carry a card past the window without it ever intersecting, and it must still be shown;
    - a card left waiting by an earlier run of the effect is picked up again;
    - reuses the front door's `[data-reveal]` rules (scope 118).
  - The design system's `Panel` and `Card` carry `ds-panel` and `ds-card`, so the motion finds them.
  - Under reduced motion or without script, nothing is marked, so nothing is hidden.
- **Outcome:** Committee Hub, Privacy, Access, Governance, Sponsors and every
  workspace move the same way, with no change per screen.

### WP2 — Setting up the club's own storage

- **Deliverables:**
  - `src/app/registrar/committee-hub/StorageSetup.tsx`: five steps for SharePoint link mode (scope 81 and the SharePoint integration annex):
    1. open the committee's site;
    2. give the committee access there;
    3. copy the two addresses;
    4. switch the hub to SharePoint;
    5. file each document as a link.
    - Each step has a 44px button that draws a chalk tick.
  - The card sits on a PinnedCard under Hub settings while the hub still uses the platform's storage, for the IT Manager only.
- **Outcome:** a club that prefers its own storage knows how to set it up
  correctly.

### WP3 — Sponsors in tabs, opening on a showcase

- **Deliverables:**
  - `src/app/registrar/sponsors/page.tsx` in tabs: Showcase, Statement, Invoices and Campaigns.
  - The **showcase** has a card per campaign:
    - its creative, or the sponsor's monogram in flat chalk;
    - whether it is a club or a platform campaign, and its model;
    - its headline and body;
    - how it is paid, and what the club keeps;
    - views and clicks counting up, and the club's share;
    - whether it is live, with its share of today's views.
  - `src/components/ui/TiltCard.tsx`: a card leaning toward a mouse, still for touch, pen and reduced motion.
- **Outcome:** the sponsors' logos and campaigns have room, and each says what
  it is and how it pays.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| One motion for every club screen and /me | Governance in tabs, with a photo per member and its consent (a migration) |
| The storage set-up card | /me's workspaces in tabs |
| Sponsors' tabs and showcase | A logo kept apart from a campaign's creative (a field the campaign does not have) |

## Gap notes

- **Governance.**
  - The cards of committee members with photos need a place to keep each
    photo and its consent. The product owner asked for a checkbox, as for
    players' photos.
  - That is a migration, applied by hand with approval, and its own scope.
- **A sponsor's logo.**
  - The showcase shows the campaign's creative, or a monogram.
  - A logo separate from the creative needs a field on the sponsor or the
    partner. Today a creative usually carries the logo, so it waits for a
    club to ask.
