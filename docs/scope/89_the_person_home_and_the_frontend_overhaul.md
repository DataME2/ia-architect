# Project Scope — The Person's Home, and the Frontend Overhaul

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/frontend-overhaul` (phase 1).
**Status: phase 1 built; phases 2 and 3 planned.**

The product owner brought an external prompt for a frontend overhaul: a
unified multi-role portal on `/me`, a registration wizard with a "Financial
Gate", and a referee lifecycle board, in Tailwind, mobile-first. It was
assessed against the project before any code (October 2026). It is
**compatible once adapted**, and this document records the adaptations,
because every later phase follows them.

## How the prompt is adapted

| The prompt says | What this project does instead, and why |
| - | - |
| Next.js 14+ | Next 16.3 and React 19, built to the version's own guide (`node_modules/next/dist/docs/`). 14-era patterns do not build |
| Presentation only in `src/app/`, mock data at the top of each file | **Real data stays.** Pages load through `src/data/`. Every decision goes in `src/web/`, which is pure and tested. Tailwind components go in `src/components/ui`, the only place `design-system.css` generates utilities from. Sample data lives only in development-only previews (`src/app/preview/`, 404 in production) and in tests |
| "Generate" the screens | They exist and work. Each phase **restyles a working screen**, never replaces it with a mock |
| Player and Referee blocks side by side on `/me` | **BR61**: one active role, no merged views. The side-by-side view is the **home**, shown only when none is chosen. It lists the person's own waiting items (the bell's, BR159) and role cards. Each is a link into one role. Workspace content is never mixed |
| Role toggles in `useState` | Switching stays a URL (BR61, "explicit"). `useState` is for filters, menus, modals and wizard steps |
| "Greens, ocean blues, dark mode" | The existing tokens in `globals.css`, with the dark mode they already carry. Volt stays the Assistant's alone (decision 1, `check_assistant.py`) |
| Mileage claims | **Not in the domain.** Claims are match fees from the dated schedule (BR115). Out until it passes the EA layers |
| Conflict "refereeing a club where they are a player" | The rules are **BR6** (a player **in the match**), BR7 (two at once), BR8 (classification) and BR9 (suspension), enforced by the database. A same-club rule would be a new BR |
| Free availability toggles | The model is a standing weekly window with dated exceptions. A grid may drive it, not replace it |
| Treasurer voucher "placeholder" | Voucher verification already works (BR78). It is restyled, not stubbed |
| Registration wizard | Allowed as layout. It still submits once, through the same action and validation |

Gates every phase passes: `check_a11y` (names, alt, svg, no positive
tabindex), `check_assistant`, 44px targets, and the no-DOM typecheck of
`src/web/`.

## Phase 1 — the person's home (built)

- **When:** several roles held and none chosen. That screen used to ask
  only "Which role?". It is now the home. One role still opens straight
  into its workspace.
- **"What is waiting for you"** lists the account's own open waiting items
  (BR159), most urgent first:
  1. An overdue AGM (BR86, red).
  2. An offered appointment.
  3. An unanswered Saturday.
  4. An incomplete family registration.
  5. A match to confirm.
  6. Where to pay a claim.
  7. A correction for the club.

  Each shows its role and club and an **Open** link into that role. A
  filter by role is local state; it hides rows and never switches role.
  Announcements stay in the bell.
- **"Your roles"** shows the roles side by side, each in its rail colour,
  with its count of waiting items, or "Up to date".
- **The rail** gains "Home · everything waiting" for anyone with several
  roles.
- **Code:**
  - `src/web/home-view.ts` (tested): `buildHome`, `whereAnswered` and
    `roleHref`.
  - `src/components/ui/WaitingList.tsx` and `RoleOverview.tsx`.
  - `src/app/me/_home/PersonHome.tsx`.
  - The development preview at `/preview/home`.

Why this is not a merged view: every line is something the account's own
bell already shows in every context. Open question 67's reading already
lets a role chip count items in a role that is not active. The home names
them, and keeps the content behind the switch.

## Phases 2 and 3 (planned)

2. **Referee board:** the availability grid over the weekly window, a
   conflict and card sidebar (BR6–BR9, BR84, red/amber/green), and the claims
   and payout ledger with its `SIM-…` references.
3. **Registration wizard and the Financial Gate:** the public form in steps,
   with one submit; fees, plan and arrears in one panel; the treasurer's
   voucher verification restyled.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | No change. BR61 and BR159 are honoured as written; the home is their combination |
| 3_information | No change |
| 4_application | The home on `/me`, the rail's home link, two library components, a development preview |
| 5_technology  | No change; no migration |

## Out of scope / gaps

- **New waiting kinds** that the prompt names: a Working with Children
  Check to upload, and fee arrears. They are not yet waiting items.
  Arrears show through "registration not complete". Adding a kind needs
  its loader and 0067's sync, so it comes with phase 2 or 3.
- **Phone-width review.** The components are mobile-first (stacked below
  `sm`), but the browser check covered desktop width only.
