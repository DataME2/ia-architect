-- Do the thirteen roles scope 62 added actually work — grantable, refused
-- when they should be, and does the Technical Director really gain what
-- BR125 says they should?
--
--   * a newly-named role (`technical_director`, `program_coordinator`) can
--     be granted through `grant_club_role`, the only door a role reaches
--     an account through,
--   * an unknown role string is still refused,
--   * BR106's admin-link gate is untouched by the wider list,
--   * BR125: the coach and the Technical Director may now record a
--     player's physique, and a role outside that set still may not.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into club (id, name, jurisdiction) values
  ('99996262-0000-0000-0000-000000000001', 'Named Roles Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e62a0000-0000-0000-0000-000000000001', 'roles.admin@named.test'),
  ('e62a0000-0000-0000-0000-000000000002', 'future.techdirector@named.test'),
  ('e62a0000-0000-0000-0000-000000000003', 'future.coordinator@named.test'),
  ('e62a0000-0000-0000-0000-000000000004', 'future.treasurer@named.test');

insert into club_membership (club_id, user_id, role) values
  ('99996262-0000-0000-0000-000000000001', 'e62a0000-0000-0000-0000-000000000001', 'admin');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b62a0000-0000-0000-0000-000000000001', '99996262-0000-0000-0000-000000000001',
   'Nia', 'Fetuli', '2014-03-03');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a62a0000-0000-0000-0000-000000000001', '99996262-0000-0000-0000-000000000001',
   '2027', '2027-01-01', '2027-12-01');

insert into registration (id, club_id, person_id, season_id) values
  ('c62a0000-0000-0000-0000-000000000001', '99996262-0000-0000-0000-000000000001',
   'b62a0000-0000-0000-0000-000000000001', 'a62a0000-0000-0000-0000-000000000001');

commit;

do $$
declare
  the_club      uuid := '99996262-0000-0000-0000-000000000001';
  admin_user    uuid := 'e62a0000-0000-0000-0000-000000000001';
  tech_director uuid := 'e62a0000-0000-0000-0000-000000000002';
  coordinator   uuid := 'e62a0000-0000-0000-0000-000000000003';
  a_treasurer   uuid := 'e62a0000-0000-0000-0000-000000000004';
  the_reg       uuid := 'c62a0000-0000-0000-0000-000000000001';
  n             integer;
  failures      text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_user::text, true);

  -- 1. A role scope 62 added is grantable through the only door a role
  --    reaches an account through.
  perform grant_club_role('future.techdirector@named.test', 'technical_director');
  select count(*) into n from club_membership
   where club_id = the_club and user_id = tech_director and role = 'technical_director';
  if n <> 1 then
    failures := array_append(failures, 'technical_director could not be granted');
  end if;

  -- 2. The twelve program-coordinator titles collapsed to one role —
  --    grantable the same way.
  perform grant_club_role('future.coordinator@named.test', 'program_coordinator');
  select count(*) into n from club_membership
   where club_id = the_club and user_id = coordinator and role = 'program_coordinator';
  if n <> 1 then
    failures := array_append(failures, 'program_coordinator could not be granted');
  end if;

  perform grant_club_role('future.treasurer@named.test', 'treasurer');

  -- 3. An unknown role string is still refused -- the wider list is not an
  --    open door.
  begin
    perform grant_club_role('future.treasurer@named.test', 'head_groundskeeper');
    failures := array_append(failures, 'an unrecognised role string was granted');
  exception when others then
    if sqlerrm not like '%Not a club role%' then
      failures := array_append(failures, 'the refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 4. BR125: the Technical Director may record a player's physique.
  perform set_config('request.jwt.claim.sub', tech_director::text, true);
  begin
    insert into player_profile (club_id, registration_id, height_cm)
    values (the_club, the_reg, 150);
  exception when others then
    failures := array_append(failures, 'the Technical Director could not record physique: ' || sqlerrm);
  end;
  select count(*) into n from player_profile where registration_id = the_reg;
  if n <> 1 then
    failures := array_append(failures, 'the Technical Director''s physique record did not save');
  end if;

  -- 5. BR125's other half: a role outside {admin, registrar, coordinator,
  --    coach, technical_director} still may not.
  perform set_config('request.jwt.claim.sub', a_treasurer::text, true);
  begin
    update player_profile set height_cm = 999 where registration_id = the_reg;
  exception when others then null;
  end;
  select height_cm into n from player_profile where registration_id = the_reg;
  if n = 999 then
    failures := array_append(failures, 'a treasurer was able to write a player''s physique (BR125)');
  end if;

  -- 6. BR106 is unaffected by the wider list: admin still requires a link.
  perform set_config('request.jwt.claim.sub', admin_user::text, true);
  begin
    perform grant_club_role('future.coordinator@named.test', 'admin');
    failures := array_append(failures, 'admin was granted to an unlinked account despite the wider role list');
  exception when others then
    if sqlerrm not like '%BR106%' then
      failures := array_append(failures, 'the admin refusal did not cite BR106: ' || sqlerrm);
    end if;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'Named roles FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Named roles OK — 6 scenarios; the new roles are grantable, an unknown role is still refused, the Technical Director records physique and a treasurer cannot, and BR106 still gates admin';
end
$$;
