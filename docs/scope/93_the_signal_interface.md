# Project Scope — The Signal interface

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/the-signal-interface`.

Four interface concepts were compared on one working prototype
(`/preview/concepts`, branch `ux-pilot-concepts`), and in October 2026 the
product owner chose **Signal**. In Signal the Assistant is visibly separate
from everything a person does. Its notes are teal and appear on the screens
where they help. Every action is an ink button a person presses. A command
bar finds people and places.

This initiative brings that into the real app. Like
[scope 89](./89_the_person_home_and_the_frontend_overhaul.md), it
**adapts** the concept rather than transplanting the prototype. The
prototype ran on invented data and had shortcuts the real domain does not
allow. The adaptation table below says what changes and why.

## How the concept is adapted

| The prototype has | What this project does instead, and why |
| - | - |
| A seeded sample world in the browser | **Real data stays.** Pages load through `src/data/` under RLS. Each new decision goes in `src/web/` with tests. Sample data stays in `/preview` (development only) |
| An "Acting as" chip that *replaces* the identity rail | **The rail stays** (DESIGN.md Principle 3). On `/me` the chip mirrors the rail: it shows the active lens, and its menu holds the rail's own role links, so switching is still a URL (BR61). Club screens apply all of a person's club roles at once, as today, so there the chip names the roles and links to `/me` instead of switching |
| Teal for the Assistant | **Adopted, as the club's decision.** DESIGN.md Principle 2 reserved volt for the Assistant "until the club decides otherwise". The choice of Signal is that decision. **Teal replaces volt** and is reserved for the Assistant exactly as volt was. `check_assistant.py` is unchanged: there is still one surface, `AssistantNote` |
| Assistant notes on every screen, from rules over sample data | **Notes only where a working decision already exists.** On the registrar queue and the person's home, the notes restate what `src/web` already decides (what holds the queue, what waits on the person), through `AssistantNote`. Each note links to the screen where a person acts. **No note commits anything, and nothing calls a model** (decision 1) |
| A "Waiting for your decision" queue and one audit log for every approval | **The inbox already is the queue** (BR159). It is shown in Signal's column as it is. One audit log across features would be a new information object: **out of scope**, see the gaps |
| A command bar that answers questions | **Out of scope: no answering.** The command bar **finds**. It reaches the role's own destinations and searches people through the existing `/registrar/people?q=`, which RLS already scopes. Answering in sentences is the Assistant producing text; it waits for decision 1 to be revisited |
| Officials may not referee a club where they play or coach; a "declare interest" step | **Not adopted.** The real rules are BR6 (a player **in the match**), BR7, BR8 and BR9, enforced by the database. A same-club rule would be a new BR and goes through the EA layers first. The prototype's rule stays in the prototype |
| A Volunteer role | **Not adopted.** There is no such role in the domain (`RoleKey` in `src/web/role-context.ts`). Volunteering is out until it is modelled |
| An organisation tree over a federation, associations and clubs | **Not adopted.** Tenancy today is the club (P5). A governing-body hierarchy is [scope 9's](./9_staged-registration-and-governing-body-tier.md) tier, not built |

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** Serves G5 (less manual admin work, safely) and makes P1 visible. No new goal, driver or stakeholder |
| 2_business    | **No new or changed rule.** BR61 is honoured: switching stays explicit and stays a URL; club screens are unchanged in what they show. Decision 1 is honoured: one Assistant surface, advisory, nothing committed. The prototype's same-club referee conflict is **explicitly not adopted** |
| 3_information | **No change.** No new data object, flow or storage. The unified audit log is out of scope |
| 4_application | A Signal visual system in the shared tokens. A top bar with a command bar and an acting-as chip, used by `/me` and the club screens. Two new pure decision modules in `src/web/`: the command bar's destinations and the notes. Notes on the registrar queue and the person's home. DESIGN.md Principles 2 and 3 updated to name teal and the chip |
| 5_technology  | **No runtime change; no migration.** Two self-hosted OFL font families (Instrument Sans, Instrument Serif) in `public/fonts`, as Archivo and DM Mono already are |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | Pitch Slate and volt. A masthead with two links. The rail on `/me` and the club menu on club screens. Assistant notes on three `/me` workspaces |
| **Target** (delivered) | Signal's system: porcelain surfaces, ink for human actions, teal for the Assistant alone, and Instrument Sans with Instrument Serif. The top bar holds a command bar that finds people and places, and an acting-as chip that mirrors the rail. Assistant notes appear on the queue and the home, each pointing at the screen where a person acts |

## Work packages and deliverables

### WP1 — The Signal visual system

- **Deliverables:**
  - `src/app/globals.css`: Signal tokens for light and dark. `--highlight` becomes teal and is reserved for the Assistant.
  - `public/fonts/instrument-sans-var-latin.woff2` and `instrument-serif-400*.woff2`.
  - `src/DESIGN.md`: Principle 2 names teal; the colour list and typography sections are updated.
- **Outcome:** every page and every `src/components/ui` component takes Signal's look through the tokens they already read, with no component edits.
- **Also delivered:** both brand marks (`src/app/_components/BrandMark.tsx`, `src/components/ui/BrandMark.tsx`) drop their volt ring, since teal may not appear outside the Assistant. The design-system and `PlayerCard` comments that named volt now name teal. The old acting-as banner's CSS, and `.club-chip` (its only user), are removed.

### WP2 — The top bar: command bar and acting-as chip

- **Deliverables:**
  - `src/web/command.ts`, with tests: the destinations a person may jump to from where they stand, and how a typed query maps to one.
  - `src/components/ui/CommandBar.tsx`.
  - `src/components/ui/ActingAs.tsx`.
  - The root layout's masthead.
- **Outcome:** a person finds a screen, or (staff only) a person, from anywhere. The active lens is always named. On `/me` it can be switched through the same URLs the rail uses (BR61).

### WP3 — Notes where a decision already exists

- **Deliverables:**
  - `src/web/notes.ts`, with tests: notes derived from the queue's and the home's existing decisions.
  - `AssistantNote` uses on `/registrar` and the `/me` home, each linking to the screen that acts.
- **Outcome:** the Assistant flags and summarises where it helps, and never commits.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Signal's tokens, fonts and chrome, light and dark | A unified audit log across features |
| Command bar: destinations, and people search through `/registrar/people?q=` | The command bar answering questions in sentences |
| Acting-as chip mirroring the rail; switching by URL on `/me` | Replacing the rail; switching roles on club screens |
| Notes on `/registrar` and the `/me` home from existing decisions | Notes on every screen |
| The inbox shown as "waiting for you" | An approvals queue with its own workflow |
| DESIGN.md Principles 2 and 3 updated | A same-club referee conflict rule; a Volunteer role; a federation tree |

## Gap notes

- **A unified audit log.** Today each feature keeps its own history: validation history, arrears actions, invoice removals and resolutions. A single "recent decisions" view needs either a view over those tables or a new append-only table. Either way it means an information-layer change, an RLS policy and its behavioural test. It is the next candidate.
- **Answering questions.** The prototype answered from fixed rules. In the real app, answering in sentences is the Assistant producing text. Decision 1 allows drafts and summaries, but R33.5's rule about a minor's data needs re-reading first, so this waits for its own decision.
- **Notes elsewhere.** Each new screen's notes need a decision in `src/web` to restate. They are added screen by screen, not invented in the view.
- **The concepts not chosen.** Floodlight, Home Ground and Charter stay on `ux-pilot-concepts` as reference. Charter's dense tables arrive through the shared tokens. Its organisation tree waits for scope 9's tier.

## Open questions

- None new. The Assistant's colour moving from volt to teal is the product owner's choice of Signal (October 2026), recorded here and in DESIGN.md.
