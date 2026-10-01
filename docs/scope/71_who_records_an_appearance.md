# Project Scope — Who Records an Appearance

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/only-the-players-coach-records-appearances`.
**Status: built.**

Raised by the club (October 2026) while checking
[scope 70](./70_a_family_reads_the_player_record.md)'s fix. A committee
member was offered "Record an appearance" on a player record. The club's
answer has three parts:

1. Only the admin, registrar or coordinator, or **the player's own coach**,
   may record an appearance.
2. Everyone else may still *read* appearances, minutes, goals and assists.
3. Every record must show **who took it and when**, for audit.

Before this, `appearance_manage` admitted the admin, registrar, coordinator,
**any** coach at the club, the digital technology manager and the program
coordinator. A role without the right still saw the form; the database
refused its save. BR101 already said every statistic records who entered it
and when, but the app supplied `recorded_by`, so a direct call could leave it
blank or name somebody else. Nothing reached the audit log.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change. P5's spirit: permission is decided by the database, never by the screen alone |
| 2_business    | **New BR158** in [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md). Enforces BR101, which was documented but unchecked. The roles matrix ([scope 29](./29_actors-access-and-permissions.md)) narrows coach to "own players" |
| 3_information | No new data object. `appearance.recorded_by` and `recorded_at` become database-set facts. `audit_event` gains `appearance.recorded`, `appearance.changed` and `appearance.removed` |
| 4_application | `app_coaches_registration()`, `canRecordAppearance` in `src/web/player-profile-access.ts`, and the registrar player page |
| 5_technology  | No change. One migration (0066) and one behavioural RLS suite (66) |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | Six roles, including any coach at the club, may record any player's appearance. Every role sees the form. "Who and when" is whatever the app sends, and nothing is audited |
| **Target** (delivered) | The admin, registrar and coordinator, and a coach or assistant coach on the player's team that season, record appearances. Only they see the form. The database stamps who and when, and logs every change |

## Work packages and deliverables

### WP1 — The rule, in the database

- **Deliverables:**
  - `supabase/migrations/0066_only_the_players_coach_records_appearances.sql`, containing:
    - `app_coaches_registration(p_registration_id)`, `security definer`. It derives the season and the player from the registration, and the coach from `auth.uid()` through `app_my_person_ids()`. It then asks whether a non-withdrawn coach or assistant-coach row shares a team that season with the player's non-withdrawn player row.
    - `appearance_manage`, recreated as admin/registrar/coordinator or that function.
    - An audit trigger. It stamps `recorded_by` and `recorded_at` on insert, refuses to let an update rewrite them, and writes an `audit_event` for every insert, update and delete. A change carries the before and after.
  - `supabase/tests/66_only_the_players_coach_records_appearances.sql`.
- **Outcome:** the right is enforced where it cannot be bypassed, and every change can be traced to a person and a time.

### WP2 — The screen

- **Deliverables:**
  - `canRecordAppearance` (with tests).
  - The player page shows "Record an appearance" only to someone who can save it.
  - The appearances table shows who recorded each row and when.
- **Outcome:** a committee member reads the season's record and is offered nothing they cannot do.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Recording, changing and removing appearances | Who may manage fixtures (`fixture_manage` is unchanged) |
| Coach and assistant coach of the player's team that season | Manager and team official (not coaches, BR158) |
| Audit of every appearance change | A screen for reading the audit log (admin reads `audit_event` today) |

## Gap notes

- **The digital technology manager and program coordinator lose the right**
  that scope 62 and migration 0058 gave them. That is the club's choice
  (BR158), not an oversight.
- **Scope 29's WP5 transcription** (section 2c) still shows the club's
  original document, so it is left as transcribed.
