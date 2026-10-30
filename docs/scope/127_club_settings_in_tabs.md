# Project Scope — Club Settings in Tabs

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/club-settings-tabs`, stacked on
[scope 125](./125_the_workspace_frame.md)'s frame (#135), which merges first.

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

This document began as the implementation plan and records what was
built. On the same day the product owner asked for the Superdesign cards to
be used, for motion and script throughout, and withdrew scope 32's *never
machine-generated* rule (open question 119).

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
| **Target** (delivered) | The draft's layout inside the frame. The club's head stays on top and a row of pill tabs runs under it, with the current one in chalk yellow and the yellow strip sliding between tabs. Each tab is addressable (`?tab=…`), so a link, Back and a reload land on it. The panel fades up as it changes, and the figures count up |

## How the draft maps onto the club

| Draft tab | Becomes | Holds |
| --------- | ------- | ----- |
| Club Profile | **Profile** | The name and jurisdiction, the contacts (`club_contact`), and the registration counts as index cards |
| League Settings | **Teams and competitions** | *Teams this season* and the competitions each team is entered in (BR179), linking to Teams |
| *(none)* | **Committee** | *The committee* and its term, linking to Governance |
| Notifications | *Not built* | Read-only, with nothing to set yet, so it waits for a setting to exist |
| Integrations | **Integrations** | Two pinned cards from the draft: the committee's files (linking to Committee Hub) and calendars (each person's own feed, BR30) |
| Data Export | **Data export** | Two pinned cards from the draft: the submission pack and the reports |
| *(none)* | **Licence** | The licence as it stands (`club_licence`) |

The draft's *Tactics Theme* switch becomes a per-viewer choice of Felt or
Whiteboard. It is stored in the browser, because a scheme is a preference of
whoever is looking, not of the club. It needs `:root[data-theme]` beside the
`prefers-color-scheme` block.

## Work packages and deliverables

### WP1 — Tabs

- **Deliverables:**
  - `src/components/ui/Tabs.tsx`: a labelled navigation of pill links.
    - The current tab is marked `aria-current` and drawn in chalk yellow.
    - With script, the yellow strip is one element that slides to the chosen tab on `--ease-magnet`, measured from the link and re-measured on resize. Without script, the link itself is yellow.
    - Navigation is Next's client navigation, so only the panel changes.
  - `src/components/ui/CountUp.tsx`: a figure counting up to its real value. The server renders the value, so without script it is simply there.
  - `src/web/club-tabs.ts` and its test: the tabs, the tab a URL asks for, and each tab's URL.
  - Motion is off under reduced motion throughout.
- **Outcome:** a tab pattern for scope 125's programme items 3, 5, 6 and 8,
  not just this page. Links, not ARIA tabs, because each tab is a page the
  server renders.

### WP2 — The club profile, redistributed

- **Deliverables:**
  - `src/app/registrar/club/page.tsx` is split into the tabs above. The season picker keeps the tab, and the panel is keyed on it so it fades up.
  - `src/app/globals.css`: `.club-tabs`, `.tab-panel` and `.club-cards`.
  - Every role that sees the page sees every tab: the page is already read-only and its own.
- **Outcome:** the draft's distribution, holding only what exists.

### WP3 — The scheme switch (not built)

- **Deliverables:**
  - `src/app/_components/SchemeSwitch.tsx`: Felt, Whiteboard or "as the
    device", stored in `localStorage`;
  - `globals.css`: `:root[data-theme='light']` and `[data-theme='dark']`
    restating the two blocks.
- **Outcome:** a projector at the clubhouse can be set to the Whiteboard
  whatever the laptop prefers.
- **Not built.** It would restate the Felt and Whiteboard token blocks a
  third time, beside `.paper`, for a preference the device already
  expresses. It waits for a clubhouse that asks.

### WP4 — Motion

- Tabs slide their yellow strip, and the save bar pins on when a form is
  changed. Off under reduced motion.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Tabs, the redistribution, the counting figures, the draft's pinned cards | The draft's feature switches, which have no feature behind them |
| | The scheme switch and a Notifications tab, until there is something to set |
| | A registration code and a region, until the club has values to enter |
| | API keys (*Manage API Keys*), until an integration needs one |

## Open questions

None. The draft's invented switches are left out and recorded above, and the
product owner can ask for any of them as its own scope.
