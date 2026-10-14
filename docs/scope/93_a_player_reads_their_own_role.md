# Project Scope — A Player Reads Their Own Role

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/a-player-reads-their-own-role`.

Reported during QA against `qa.adultplayer@northstarfc.test`: the account's
`/me` workspace correctly named both clubs it belongs to, but never showed
it as a player at either one. This is a **pure bug fix** under
[CLAUDE.md](../../CLAUDE.md)'s rule: no documented behaviour changes, it
makes `src/data/me.ts`'s own description of itself — *"derives the role
list from `account_person`, `person_role`, `guardianship`, `team_member`
and `club_membership`"* — actually true for one of those five tables.

## What the data ruled out, and what was left

The account's `account_person` link, the season, and the `person_role` row
itself (`role = 'player'`, the right `club_id`, the right `season_id`) were
all confirmed correct by direct query. That left exactly one explanation:
the signed-in account's own read of that row, through Row-Level Security,
rather than anything about the data.

## The gap, and how long it has existed

`person_role_select` has read `club_id in (select app_member_club_ids())`
and nothing else since **migration 0002**, the very first RLS pass —
`app_member_club_ids()` is `club_membership` only. A self-registered adult
player or a guardian holds no `club_membership` row **by design**
([decision 11](../decisions/11_a_family_reads_through_functions_not_membership.md)):
they are linked by `account_person` alone. So nobody outside a club
officer has ever been able to read their own `person_role` row — not a
regression, a gap present since the table's RLS was first written.

**0028 already built the fix for every sibling table and missed this one.**
That migration's whole point was exactly this class of gap: *"a club
officer's read is unchanged, and a family's read is a second, narrower
door into the same tables"* — delivered as an additive `_select_family`
(or `_select_own`) policy on `account_person`, `club`, `season`, `person`,
`guardianship`, `registration`, `consent`, `payment_plan`, `payment`,
`payment_installment`, `team_member`, `team`, and `fixture`, with
`registration_document` and `registration_voucher` following in 0029.
Fifteen tables gained this door. `person_role` — the table `src/data/me.ts`
reads to decide whether to show a "Player" or "Referee" workspace at all —
was the one left out, and stayed out through every later rewrite of its
policy (0011, 0031, 0058, 0070): each rewrote the officer-reach clause
without anyone adding the missing family one.

## Why nobody saw it sooner

Every account that is also a club officer reads `person_role` club-wide
through `app_reads_club_wide`, so the gap is invisible to anyone testing as
an admin, registrar, or coach checking a player's record from the
registrar side. It surfaces only for an account that is **purely** a
player, referee, or committee member with no officer role at that
club — exactly the shape a dedicated QA cast account tests and an
officer's own account never does.

## Fix

`person_role_select_family` (migration 0089), additive like every
`_family` policy before it, using the same `app_my_family_person_ids()`
built for this in 0028 — no new function, no change to any existing
policy:

```sql
create policy person_role_select_family on person_role
  for select using (person_id in (select app_my_family_person_ids(club_id)));
```

Postgres combines permissive policies with `or`, so a club officer's
existing club-wide read is unchanged; this is strictly a second, narrower
door into the same table, open to the account's own Person and the
children they hold authority over — exactly what `app_my_family_person_ids`
already computes for the fourteen other tables that use it.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change** |
| **2_business** | **No new rule and no changed rule.** P1/BR61's claim — a Person's roles are visible to that Person — was always the intent; this closes the one table where RLS never let it be true |
| **3_information** | **No change.** No table, column or new function — `app_my_family_person_ids()` already existed |
| **4_application** | One new, additive RLS policy: `person_role_select_family` (migration 0089) |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A player, referee, or guardian with no `club_membership` row could never read their own `person_role` entry — `/me` could derive every role but that one, silently, since migration 0002 |
| **Target** | The same account reads its own `person_role` rows and nobody else's, at every club it holds an `account_person` link at. A club officer's existing club-wide read is unchanged |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | Migration 0089 — `person_role_select_family`, additive | **Delivered** |
| **WP2** | `supabase/tests/89_a_player_reads_their_own_role.sql` — a self-registered adult player with no `club_membership` row reads their own role and nobody else's, nothing at a club they hold no link at, a club officer's read is unchanged, a stranger reads nothing, and the new read bought no write | **Delivered** |
| **WP3** | Full `scripts/test_rls.sh` clean (76 suites) and `npm run check` clean | **Delivered** |

## What this initiative does not do

- **Does not re-audit every other table for the same gap.** 0028/0029's
  fifteen tables were checked by name against `person_role`'s absence from
  that list; this initiative does not claim to have found every table
  that might be missing a family-read door, only the one the QA report
  named and the investigation confirmed.
- **No new business rule.** The behaviour this restores was already the
  documented intent of `src/data/me.ts`'s own header and of decision 11 —
  there was nothing to newly decide.
- **No change to `person_role_manage`.** Granting or revoking a role stays
  admin/registrar only, exactly as before — this is a read, not a write.
