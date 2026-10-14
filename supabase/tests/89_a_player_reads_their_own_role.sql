-- Can a player — or any family member, holding no club_membership row at
-- all — read their own person_role row?
--
-- Reported during QA: an adult player's workspace named both clubs they
-- belonged to, but never showed them as a player at either one. The role
-- grant, the season, and the account_person link were all correct —
-- `person_role_select` was the gap. It has read `club_id in (select
-- app_member_club_ids())` and nothing else since 0002, and
-- `app_member_club_ids()` is `club_membership` only. Eleven other tables
-- gained this same additive read in 0028/0029 through
-- `app_my_family_person_ids()`; `person_role` was the one left out, and
-- stayed out through every later rewrite of its policy.
--
-- So the questions worth asking:
--
--   * does a self-registered adult player, with no club_membership row,
--     read their own person_role row,
--   * do they read nothing of another person's at the same club,
--   * do they read nothing at a club they hold no link at, even one with
--     an identically-shaped role,
--   * does a club officer's existing club-wide read stay unchanged,
--   * does a stranger with no link read nothing,
--   * and did the new read buy no write — a player still cannot grant or
--     revoke their own role.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('d8900000-0000-0000-0000-000000000001', 'adult.player@ownrole.test'),
  ('d8900000-0000-0000-0000-000000000002', 'officer.ownrole@ownrole.test'),
  ('d8900000-0000-0000-0000-0000000000ee', 'stranger.ownrole@elsewhere.test');

insert into club (id, name, jurisdiction) values
  ('c8900000-0000-0000-0000-000000000001', 'Own Role FC', 'QLD'),
  ('c8900000-0000-0000-0000-000000000002', 'Own Role Rival FC', 'QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a8900000-0000-0000-0000-000000000001', 'c8900000-0000-0000-0000-000000000001',
   '2026', '2026-01-01', '2026-12-31'),
  ('a8900000-0000-0000-0000-000000000002', 'c8900000-0000-0000-0000-000000000002',
   '2026', '2026-01-01', '2026-12-31');

insert into club_membership (club_id, user_id, role) values
  ('c8900000-0000-0000-0000-000000000001', 'd8900000-0000-0000-0000-000000000002', 'admin');

-- The adult player themself, an unrelated second player at the same club,
-- and a rival-club player who happens to hold the identical role shape.
insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b8900000-0000-0000-0000-000000000001', 'c8900000-0000-0000-0000-000000000001',
   'Adult', 'Player', '1995-05-05', 'adult.player@ownrole.test'),
  ('b8900000-0000-0000-0000-000000000002', 'c8900000-0000-0000-0000-000000000001',
   'Other', 'Player', '1996-06-06', null),
  ('b8900000-0000-0000-0000-000000000003', 'c8900000-0000-0000-0000-000000000002',
   'Rival', 'Player', '1997-07-07', null);

insert into person_role (club_id, person_id, season_id, role) values
  ('c8900000-0000-0000-0000-000000000001', 'b8900000-0000-0000-0000-000000000001',
   'a8900000-0000-0000-0000-000000000001', 'player'),
  ('c8900000-0000-0000-0000-000000000001', 'b8900000-0000-0000-0000-000000000002',
   'a8900000-0000-0000-0000-000000000001', 'player'),
  ('c8900000-0000-0000-0000-000000000002', 'b8900000-0000-0000-0000-000000000003',
   'a8900000-0000-0000-0000-000000000002', 'player');

-- The player's own account, linked the way a self-registered adult's is:
-- account_person alone, never a club_membership row (decision 11).
insert into account_person (club_id, user_id, person_id) values
  ('c8900000-0000-0000-0000-000000000001', 'd8900000-0000-0000-0000-000000000001',
   'b8900000-0000-0000-0000-000000000001');

commit;

do $$
declare
  own_role_fc  uuid := 'c8900000-0000-0000-0000-000000000001';
  rival_fc     uuid := 'c8900000-0000-0000-0000-000000000002';
  player_user  uuid := 'd8900000-0000-0000-0000-000000000001';
  officer_user uuid := 'd8900000-0000-0000-0000-000000000002';
  stranger     uuid := 'd8900000-0000-0000-0000-0000000000ee';
  self_person  uuid := 'b8900000-0000-0000-0000-000000000001';
  other_person uuid := 'b8900000-0000-0000-0000-000000000002';
  own_season   uuid := 'a8900000-0000-0000-0000-000000000001';
  n            integer;
  failures     text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', player_user::text, true);

  -- 1. **A self-registered adult player reads their own role** — no
  --    club_membership row exists for this account anywhere.
  select count(*) into n from person_role
   where club_id = own_role_fc and person_id = self_person;
  if n <> 1 then
    failures := array_append(failures, 'a player with no club_membership could not read their own person_role row');
  end if;

  -- 2. **And nothing of another player's**, at the very same club.
  select count(*) into n from person_role
   where club_id = own_role_fc and person_id = other_person;
  if n <> 0 then
    failures := array_append(failures, 'a player read another person''s person_role row at their own club');
  end if;

  -- 3. **And nothing at a club they hold no link at**, even one with an
  --    identically-shaped player role.
  select count(*) into n from person_role where club_id = rival_fc;
  if n <> 0 then
    failures := array_append(failures, 'a player read person_role rows at a club they hold no link at');
  end if;

  -- 4. **A club officer's existing club-wide read is unchanged** — the new
  --    policy is additive, so it must not have replaced the old one.
  perform set_config('request.jwt.claim.sub', officer_user::text, true);
  select count(*) into n from person_role where club_id = own_role_fc;
  if n <> 2 then
    failures := array_append(failures, 'an admin no longer reads every person_role row at their own club');
  end if;

  -- 5. **A stranger with no link reads nothing.**
  perform set_config('request.jwt.claim.sub', stranger::text, true);
  select count(*) into n from person_role where club_id = own_role_fc;
  if n <> 0 then
    failures := array_append(failures, 'an unrelated account read person_role rows at a club it holds no link at');
  end if;

  -- 6. **The new read bought no write.** `person_role_manage` is untouched
  --    — still admin/registrar only — so a player cannot grant themself a
  --    second role, or anybody else's.
  perform set_config('request.jwt.claim.sub', player_user::text, true);
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (own_role_fc, self_person, own_season, 'coach');
    failures := array_append(failures, 'a player granted themself a second role');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'A player reads their own role FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A player reads their own role OK — 6 scenarios; a self-registered adult with no club_membership row reads their own person_role and nobody else''s, an officer''s club-wide read is unchanged, and the new read bought no write';
end
$$;
