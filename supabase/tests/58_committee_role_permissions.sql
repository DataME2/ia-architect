-- Does scope 29 WP5's migration actually grant what it claims, and refuse
-- what it does not?
--
--   * `secretary` and `blue_card_administrator` are grantable through
--     `grant_club_role`, the only door a role reaches an account through,
--   * a Blue Card Administrator can record a Working with Children Check
--     without holding `registrar` — the row this initiative exists for,
--   * an IT Manager (`digital_technology_manager`) can write a team roster,
--     which nobody outside admin/registrar/coordinator could before,
--   * a role this migration did NOT touch (`treasurer`) still cannot write
--     a player's physique — the one matrix cell deliberately excluded,
--   * a role with no grant on a table it was never given (`secretary` on
--     `clearance`) is still refused.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into club (id, name, jurisdiction) values
  ('99995800-0000-0000-0000-000000000001', 'Committee Roles Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e5800000-0000-0000-0000-000000000001', 'admin@wp5.test'),
  ('e5800000-0000-0000-0000-000000000002', 'future.secretary@wp5.test'),
  ('e5800000-0000-0000-0000-000000000003', 'future.bluecard@wp5.test'),
  ('e5800000-0000-0000-0000-000000000004', 'future.itmanager@wp5.test'),
  ('e5800000-0000-0000-0000-000000000005', 'future.treasurer@wp5.test');

insert into club_membership (club_id, user_id, role) values
  ('99995800-0000-0000-0000-000000000001', 'e5800000-0000-0000-0000-000000000001', 'admin');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b5800000-0000-0000-0000-000000000001', '99995800-0000-0000-0000-000000000001',
   'Mele', 'Tupou', '2013-05-05');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a5800000-0000-0000-0000-000000000001', '99995800-0000-0000-0000-000000000001',
   '2027', '2027-01-01', '2027-12-01');

insert into registration (id, club_id, person_id, season_id) values
  ('c5800000-0000-0000-0000-000000000001', '99995800-0000-0000-0000-000000000001',
   'b5800000-0000-0000-0000-000000000001', 'a5800000-0000-0000-0000-000000000001');

insert into team (id, club_id, name, season_id) values
  ('d5800000-0000-0000-0000-000000000001', '99995800-0000-0000-0000-000000000001',
   'Wolves U13', 'a5800000-0000-0000-0000-000000000001');

commit;

do $$
declare
  the_club    uuid := '99995800-0000-0000-0000-000000000001';
  admin_user  uuid := 'e5800000-0000-0000-0000-000000000001';
  secretary   uuid := 'e5800000-0000-0000-0000-000000000002';
  blue_card   uuid := 'e5800000-0000-0000-0000-000000000003';
  it_manager  uuid := 'e5800000-0000-0000-0000-000000000004';
  a_treasurer uuid := 'e5800000-0000-0000-0000-000000000005';
  the_person  uuid := 'b5800000-0000-0000-0000-000000000001';
  the_reg     uuid := 'c5800000-0000-0000-0000-000000000001';
  the_team    uuid := 'd5800000-0000-0000-0000-000000000001';
  n           integer;
  failures    text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_user::text, true);

  -- 1. Both new roles are grantable through the only door a role reaches
  --    an account through.
  perform grant_club_role('future.secretary@wp5.test', 'secretary');
  perform grant_club_role('future.bluecard@wp5.test', 'blue_card_administrator');
  perform grant_club_role('future.itmanager@wp5.test', 'digital_technology_manager');
  perform grant_club_role('future.treasurer@wp5.test', 'treasurer');

  select count(*) into n from club_membership
   where club_id = the_club and user_id = secretary and role = 'secretary';
  if n <> 1 then
    failures := array_append(failures, 'secretary could not be granted');
  end if;

  select count(*) into n from club_membership
   where club_id = the_club and user_id = blue_card and role = 'blue_card_administrator';
  if n <> 1 then
    failures := array_append(failures, 'blue_card_administrator could not be granted');
  end if;

  -- 2. The row this initiative exists for: a Blue Card Administrator can
  --    record a Working with Children Check without holding `registrar`.
  perform set_config('request.jwt.claim.sub', blue_card::text, true);
  begin
    insert into clearance (club_id, person_id, kind, identifier, expires_on, verified_at)
    values (the_club, the_person, 'WWCC', 'BC-0001', date '2033-01-01', now());
  exception when others then
    failures := array_append(failures, 'a Blue Card Administrator could not record a clearance: ' || sqlerrm);
  end;
  select count(*) into n from clearance where person_id = the_person;
  if n <> 1 then
    failures := array_append(failures, 'the clearance did not save for the Blue Card Administrator');
  end if;

  -- 3. Secretary is refused on a table this migration did not grant it —
  --    the new role is not a back-door admin.
  perform set_config('request.jwt.claim.sub', secretary::text, true);
  begin
    insert into clearance (club_id, person_id, kind, identifier, expires_on, verified_at)
    values (the_club, the_person, 'WWCC', 'BC-SECRETARY', date '2033-01-01', now());
    failures := array_append(failures, 'a Secretary was able to write a clearance (not in the matrix for this row)');
  exception when others then null;
  end;

  -- 4. An IT Manager can write a team roster — nobody outside
  --    admin/registrar/coordinator could before this migration.
  perform set_config('request.jwt.claim.sub', it_manager::text, true);
  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (the_club, the_team, the_person, 'player');
  exception when others then
    failures := array_append(failures, 'an IT Manager could not write a team roster: ' || sqlerrm);
  end;
  select count(*) into n from team_member where team_id = the_team and person_id = the_person;
  if n <> 1 then
    failures := array_append(failures, 'the IT Manager''s roster entry did not save');
  end if;

  -- 5. The one matrix cell this migration deliberately excluded: a
  --    Treasurer still may not write a player's physique.
  perform set_config('request.jwt.claim.sub', a_treasurer::text, true);
  begin
    insert into player_profile (club_id, registration_id, height_cm)
    values (the_club, the_reg, 140);
    failures := array_append(failures, 'a Treasurer was able to write player physique — the excluded matrix cell leaked in');
  exception when others then null;
  end;
  select count(*) into n from player_profile where registration_id = the_reg;
  if n <> 0 then
    failures := array_append(failures, 'a Treasurer''s physique write saved despite being refused');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Committee role permissions (WP5) FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Committee role permissions (WP5) OK — 5 scenarios; secretary and blue_card_administrator are grantable, a Blue Card Administrator records a clearance and a Secretary cannot, an IT Manager writes a team roster, and a Treasurer still cannot write physique';
end
$$;
