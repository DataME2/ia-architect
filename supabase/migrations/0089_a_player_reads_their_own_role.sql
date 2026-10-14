-- 0089 — A player reads their own role (scope 93).
--
-- Reported during QA: an adult player's workspace correctly showed both
-- clubs they belong to, but did not show them as a player at either one.
-- The season, the role grant, and the account_person link were all correct
-- — `person_role_select` was the gap. It has read `club_id in (select
-- app_member_club_ids())` and nothing else since 0002, the very first RLS
-- migration, and `app_member_club_ids()` is `club_membership` only. A
-- guardian or an adult player holds no `club_membership` row by design
-- (decision 11) — they are linked by `account_person` alone — so nobody
-- outside a club officer has ever been able to read their own `person_role`
-- row. `src/data/me.ts`'s own role derivation depends on exactly this read.
--
-- 0028 gave eleven other tables this same additive read — `person`,
-- `guardianship`, `registration`, `consent`, the payment trio, the team
-- pair, `fixture` — through `app_my_family_person_ids()`, built for exactly
-- this. `registration_document` and `registration_voucher` followed in
-- 0029. `person_role` was the one left out of both passes, and has stayed
-- out through every later revision of its policy (0011, 0031, 0058, 0070)
-- because each of those rewrote the officer-reach clause without anyone
-- touching the missing family one.
--
-- Additive, like every `_family` policy before it: Postgres combines
-- permissive policies with `or`, so a club officer's read is unchanged and
-- this is strictly a second, narrower door into the same table.

create policy person_role_select_family on person_role
  for select using (person_id in (select app_my_family_person_ids(club_id)));
