# Project Scope — Club Settings in Tabs

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** **planned**, not built. To be built on its own branch, after
[scope 125](./125_the_workspace_frame.md)'s frame.

On 30 October 2026 the product owner asked for the club profile to be better
laid out, with motion and with tabs or a menu. Their reference is the
Superdesign draft *Tactics Board Settings* (project `46a311a6`, draft
`32158f82`), already in the Tactics Board tokens. It shows:

- a column of tabs: Club Profile, League Settings, Notifications,
  Integrations and Data Export;
- an *Identity & Branding* form (club name, registration code, region and a
  Chalkboard/Whiteboard switch);
- feature switches, with *Save* and *Discard*;
- two cards: *Integrations Control* and *Data Safe Export*.

This document is the implementation plan.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** The draft's "AI assistant suggests subs" switch is not built: substitutions are a coach's decision, and the Assistant has no behaviour behind such a switch ([decision 1](../decisions/1_ai-assistant-autonomy-level.md)) |
| 2_business    | **No change.** No rule changes. Who may edit each section is the existing roles' |
| 3_information | **No change** for the first plateau. The club holds only `name` and `jurisdiction`, with its licence and contacts beside them. A registration code and a region would be new fields, held back until the club has one to enter |
| 4_application | **Changed.** `/registrar/club` becomes tabbed, its sections redistributed and its existing exports and settings gathered |
| 5_technology  | **No change.** No dependency is added |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (now)     | `/registrar/club` is one long page: the registration counts, *Teams this season*, *The committee*, *Licence* and *Contacts* |
| **Target** (planned)   | The draft's layout inside the frame: a column of tabs beside the work at 64rem and wider, and a row of pill tabs on a tablet or phone. Each tab is addressable (`?tab=…`), so a link, Back and a reload land on it |

## How the draft maps onto the club

| Draft tab | Becomes | Holds |
| --------- | ------- | ----- |
| Club Profile | **Profile** | The name and jurisdiction, the contacts (`club_contact`), and the registration counts as index cards |
| League Settings | **Teams and competitions** | *Teams this season* and the competitions each team is entered in (BR179), linking to Teams |
| *(none)* | **Committee** | *The committee* and its term, linking to Governance |
| Notifications | **Notifications** | What the club is told and when (the bell's kinds and the messaging subscribers), read-only until there is a setting to change |
| Integrations | **Integrations** | Calendar feeds (BR30, BR31) and the club's storage, linking to Committee Hub's explanation card |
| Data Export | **Data export** | The exports that already exist: the submission pack, reports, and the officials' CSV |
| *(none)* | **Licence** | The licence as it stands (`club_licence`) |

The draft's *Tactics Theme* switch becomes a per-viewer choice of Felt or
Whiteboard. It is stored in the browser, because a scheme is a preference of
whoever is looking, not of the club. It needs `:root[data-theme]` beside the
`prefers-color-scheme` block.

## Work packages and deliverables

### WP1 — Tabs

- **Deliverables:** `src/components/ui/Tabs.tsx`, a `role="tablist"` of pill
  strips:
  - the active tab in chalk yellow;
  - arrow keys between tabs;
  - links underneath, so each tab is a URL and works without script;
  - the panel fading in, with no motion under reduced motion.
- **Outcome:** a tab pattern for scopes 125's programme items 4 to 8, not just
  this page.

### WP2 — The club profile, redistributed

- **Deliverables:** `src/app/registrar/club/page.tsx` split into the tabs
  above, with `src/web/club-tabs.ts` deciding which tabs a role sees.
- **Outcome:** the draft's distribution, holding only what exists.

### WP3 — The scheme switch

- **Deliverables:**
  - `src/app/_components/SchemeSwitch.tsx`: Felt, Whiteboard or "as the
    device", stored in `localStorage`;
  - `globals.css`: `:root[data-theme='light']` and `[data-theme='dark']`
    restating the two blocks.
- **Outcome:** a projector at the clubhouse can be set to the Whiteboard
  whatever the laptop prefers.

### WP4 — Motion

- Tabs slide their yellow strip, and the save bar pins on when a form is
  changed. Off under reduced motion.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Tabs, the redistribution, the scheme switch | The draft's feature switches, which have no feature behind them |
| | A registration code and a region, until the club has values to enter |
| | API keys (*Manage API Keys*), until an integration needs one |

## Open questions

None. The draft's invented switches are left out and recorded above, and the
product owner can ask for any of them as its own scope.
