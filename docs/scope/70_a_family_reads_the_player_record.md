# Project Scope — A Family Reads the Player Record

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/wp1-login-identity-to-person` (reverted in #73, because migration 0063 never reached the database), reapplied on `claude/family-reads-the-player-record` (#74); WP3 on `claude/the-club-reads-the-player-record`.
**Status: built.**

Reported as a bug (October 2026): a club administrator corrected a
twelve-year-old player's record, and the guardian holding authority over him,
signed in to her own workspace, saw nothing change. It was not a cache —
`/me` is rendered on every request. Two things were missing:

1. **The guardian workspace never showed the record.** Only the child's
   display name (the preferred name where there is one) and age. A corrected
   legal name sitting behind a preferred name, a corrected email, a
   position or a squad number — none of it reached the screen.
2. **`player_profile` had no family read.** Its only select policy names the
   roles that pick teams (BR99, migration 0051), so even a screen that tried
   would have read nothing — and so would the adult player, despite
   BR149 promising their workspace "keeps showing the last confirmed value".

BR65 and BR131 already drew the line this needed: a Person sees their own
information and that of the Persons they hold authority over. **BR155**
states it for the player record.

The same report had a second half (WP3): a **committee** member opening the
registrar's player page saw "Position not recorded" and an empty edit form,
because BR99 narrowed the whole row to the roles that pick teams. **BR156**
lets every club member read the four ordinary columns, and keeps height and
weight as narrow as before.

Its photograph showed "No photo" to the same committee member, because the
photo bucket's read policy also stopped at the roles that identify players
(migration 0021). **BR157** names the committee among BR100's "club staff" (WP4).

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change. Serves P1 (one `Person`, one record everyone reads) and P5 (the household is derived, never supplied). No principle is bent: BR99's narrowing is kept, not traded |
| 2_business    | **New BR155, BR156 and BR157** in [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md). No new term — "player record" and "authority" are already in the glossary's sense (BR1, BR63, BR149) |
| 3_information | No new data object. One new **read path** to `player_profile`, returning six of its columns; height and weight are never in it. A second read path for club members (BR156), with the same columns. Classification unchanged |
| 4_application | New component row in [2_application-components.md](../ea/4_application/2_application-components.md): `app_family_player_profiles()`, `src/data/family-player-record.ts`, `src/web/player-record-view.ts`, and a record panel in both `GuardianWorkspace` and `PlayerWorkspace` |
| 5_technology  | No change. Three migrations (0063, 0064, 0065) and two behavioural RLS suites (63, 64). 0065 changes a storage policy, which the local test Postgres cannot run (no `storage` schema), the same as 0021 |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | A guardian sees a child's display name and age. Neither a guardian nor an adult player can read `player_profile`. An officer's correction is invisible to the family it is about |
| **Target** (delivered) | A guardian with authority, and the player themselves, see the record as last confirmed — legal name (and whether it was checked), preferred name, date of birth, email, positions, foot, squad number. Height and weight remain readable only by the roles that pick teams |

## Work packages and deliverables

### WP1 — The read

- **Deliverables:** `supabase/migrations/0063_a_family_reads_the_player_record.sql`
  (`app_family_player_profiles(p_club_id)`, `security definer`, household
  from `auth.uid()` via `app_my_family_person_ids()`);
  `supabase/tests/63_a_family_reads_the_player_record.sql` — seven
  scenarios: the guardian reads the admin's correction, an adult player
  reads their own, a contact-only guardian, another family and an
  anonymous caller read nothing, and the guardian still reads no
  `player_profile` row directly (BR99, BR122).
- **Outcome:** the family can read what the club confirmed, and nothing
  more.

### WP2 — The screens

- **Deliverables:** `src/data/family-player-record.ts`;
  `src/web/player-record-view.ts` (+ tests) deciding the lines, with
  absence reading "Not recorded" rather than vanishing;
  `RecordLines` in `src/app/me/_workspaces/shared.tsx`; a
  "<child>'s record" panel in `GuardianWorkspace.tsx`; a "Your record"
  panel in `PlayerWorkspace.tsx` for every player, with BR149's proposal
  form moved to its own "Propose a correction" panel.
- **Outcome:** a correction made on People or the player page is visible to
  the family on their next page load.

### Incidental — suite 53 was red on `main`

`supabase/tests/53_player_record_self_correction.sql` fixed its minor's birth
date at `2015-01-01`. Since migration 0060 (BR63: no account for a child
under thirteen) that child, now eleven, could not be linked to a login, and
the whole RLS run stopped there. The fixture now computes a fifteen-year-old
— still under eighteen, which is all BR149's refusal needs.

### WP3: The club reads it too (BR156)

- **Deliverables:**
  - `supabase/migrations/0064_the_club_reads_the_player_record.sql`: `app_club_player_profile(p_registration_id)`, `security definer`. It returns the non-physique columns to any member of the player's club, via `app_member_club_ids()`.
  - `supabase/tests/64_the_club_reads_the_player_record.sql`. A committee member reads the admin's correction, but still reads no `player_profile` row directly (BR99, BR122). A member of another club and an anonymous caller read nothing.
  - `src/web/player-profile-access.ts` (with tests) decides which roles may write the profile.
  - `loadPlayerProfile` falls back to the function and marks the physique hidden.
  - The player page says when height and weight are not visible to the viewer's role, and shows the profile form only to roles that can save it.
- **Outcome:** an officer's correction reads the same on the registrar's page to every member of the club. Height and weight are still seen only by the roles that pick teams.

### WP4: The committee sees the photograph (BR157)

- **Deliverables:**
  - `supabase/migrations/0065_the_committee_sees_the_photograph.sql` recreates `photo_files_read` with the committee added. It is guarded like 0021, since the test Postgres has no `storage` schema.
  - `canUploadPhotograph` in `src/web/player-profile-access.ts` (with tests).
  - The player page shows "Add a photograph" only to the admin and registrar. Where a photograph is on file but the viewer may not see it, the page says so instead of "No photo".
- **Outcome:** a committee member sees the photograph an officer attached. A treasurer or viewer is told it is not shown to their role.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Reading the confirmed record: person details and non-physique profile | Height and weight for the family (BR99 keeps them narrow) |
| Guardian with authority, and the player themselves | A contact-only guardian (BR1: contact is not authority) |
| Every club member reads positions, foot and squad number (BR156) | Height and weight for roles that do not pick teams (BR99) |
| The committee sees the photograph on the player record (BR157) | The photograph for a treasurer or viewer, or anywhere but the player record (BR100) |
| | A guardian *proposing* a correction for a minor (BR149 is self-only) |
| | The identification photograph (BR56, its own consent) |
| | Notifying the family that a correction was made |

## Gap notes

- **A guardian cannot propose a correction.** BR149 is deliberately
  self-only; the panel tells the guardian to ask the registrar. Extending it
  would be a change to BR149 itself, for the club to decide.
- **No notification of a change.** The family sees the correction when they
  next look. A message would be a C7 Communication (BR127–BR131) and is not
  asked for.
