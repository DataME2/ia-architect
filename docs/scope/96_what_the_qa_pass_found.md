# Project Scope — What the QA Pass Found

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/pitchpeople`.

Three QA accounts failed in the October 2026 pass. Each was traced to its
cause in the development project's own logs before anything was changed:

| Account | What the tester saw | Cause |
| ------- | ------------------- | ----- |
| `qa.bluecard` | The card was verified, but its scan could not be stored | `new row violates row-level security policy for table "objects"`. 0012 created the `clearances` bucket for admin and registrar, "matching the `clearance` table's own policy". 0051 widened the table to the Blue Card Administrator and the IT Manager and left the bucket behind, so the role named for this work could write the record but not the file |
| `qa.committee` | "Add a committee member" failed | `new row violates row-level security policy for table "committee_position"`. Positions are admin-only (0011), but the governance screen offered the form to every member. Separately, the login had never been linked to its QA Committee person, so `/me` had nobody to show |
| `qa.techdirector` | The correction confirm worked; the role had nowhere to work and no way to know what changed | No Technical Director workspace exists. That is a missing capability, not a defect, and is [scope 98](./98_the_technical_directors_workspace.md) |

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change** |
| 2_business    | **No rule changed.** BR168's sibling for clearances already said who works with a card; the bucket now agrees. The governance screen now offers only what BR85 and BR123 already allow each role |
| 3_information | **No change** to data objects. The `clearances` storage policies name `clearance_manage`'s four roles (0091) |
| 4_application | `governanceAbilities` in `src/web/governance-view.ts` gates the governance forms |
| 5_technology  | Migration 0091 |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A Blue Card administrator cannot store or open a scan. A committee member is offered forms the database refuses, and learns that only from an error |
| **Target** | The file and the record share one rule. The governance screen offers each role exactly what its policies permit, and says who records what instead |

## Work packages and deliverables

### WP1 — The scan follows the record (0091)

- **Deliverables:** `supabase/migrations/0091_the_blue_card_administrator_stores_the_scan.sql` recreates `clearance_files_read` and `clearance_files_write` for admin, registrar, IT Manager and Blue Card Administrator. It is guarded like 0012, because the throwaway Postgres has no `storage` schema, so it is checked live on the development project.
- **Outcome:** `qa.bluecard` stores and opens scans.

### WP2 — The screen offers what the database allows

- **Deliverables:**
  - `governanceAbilities(roles)` (tested): positions and terms for an admin (0011); resolutions for an admin, committee member, Secretary or Treasurer (0084); a Voucher Program for an admin or committee member (BR21).
  - `src/app/registrar/governance/page.tsx` and `GovernanceForms.tsx` (`MemberRow`'s Edit and Resigned) read it.
- **Outcome:** no form leads to a policy error.

### WP3 — The QA committee login (data, development project)

- **Deliverables:** `qa.committee@northstarfc.test` linked to the QA Committee person (`account_person`), the link the QA pass assumed. No role was granted.
- **Outcome:** `/me` shows the committee workspace.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The three failures above | The menu still lists pages a role cannot open (QA pass "named gaps") |
| | Linking `qa.parent`, `qa.player15`, `qa.referee` and `qa.referee15`, whose logins exist but are unlinked |

## Gap notes

- **A role-aware menu** remains the visible half of "the screen offers what
  the database allows". It needs the same per-page role list that
  `governanceAbilities` keeps for one screen, kept for every page.

## Open questions

- None.
