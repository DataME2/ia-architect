-- 0064: the club reads the player record, without the physique (BR156).
--
--   * a committee member reads the correction an admin just made, which is
--     the reported bug,
--   * the committee member still reads no `player_profile` row directly, so
--     height and weight stay as narrow as BR99 made them (BR122: a
--     narrowing is proved by a test that fails when it is widened),
--   * a member of another club, and an anonymous caller, read nothing.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99996464-0000-0000-0000-000000000001', 'Club Record Test FC', 'AU-QLD'),
  ('99996464-0000-0000-0000-000000000002', 'Other Club Record FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e6464000-0000-0000-0000-000000000001', 'admin@clubrecord.test'),
  ('e6464000-0000-0000-0000-000000000002', 'committee@clubrecord.test'),
  ('e6464000-0000-0000-0000-000000000003', 'admin@otherclub.test');

insert into club_membership (club_id, user_id, role) values
  ('99996464-0000-0000-0000-000000000001', 'e6464000-0000-0000-0000-000000000001', 'admin'),
  ('99996464-0000-0000-0000-000000000001', 'e6464000-0000-0000-0000-000000000002', 'committee'),
  ('99996464-0000-0000-0000-000000000002', 'e6464000-0000-0000-0000-000000000003', 'admin');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b6464000-0000-0000-0000-000000000001', '99996464-0000-0000-0000-000000000001', 'Sebastian', 'Record', current_date - interval '12 years');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a6464000-0000-0000-0000-000000000001', '99996464-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31');

insert into registration (id, club_id, person_id, season_id, status) values
  ('c6464000-0000-0000-0000-000000000001', '99996464-0000-0000-0000-000000000001', 'b6464000-0000-0000-0000-000000000001', 'a6464000-0000-0000-0000-000000000001', 'COMPLETE');

insert into player_profile (club_id, registration_id, height_cm, weight_kg, preferred_position, squad_number) values
  ('99996464-0000-0000-0000-000000000001', 'c6464000-0000-0000-0000-000000000001', 150, 40, 'defender', 4);

commit;

do $$
declare
  the_reg   uuid := 'c6464000-0000-0000-0000-000000000001';
  admin     uuid := 'e6464000-0000-0000-0000-000000000001';
  committee uuid := 'e6464000-0000-0000-0000-000000000002';
  outsider  uuid := 'e6464000-0000-0000-0000-000000000003';
  n         integer;
  num       integer;
  pos       text;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. A club officer corrects the record.
  perform set_config('request.jwt.claim.sub', admin::text, true);
  update player_profile set preferred_position = 'forward', squad_number = 8
   where registration_id = the_reg;
  get diagnostics n = row_count;
  if n <> 1 then
    failures := array_append(failures, 'the admin could not correct the record');
  end if;

  -- 2. A committee member reads exactly that correction.
  perform set_config('request.jwt.claim.sub', committee::text, true);
  select squad_number, preferred_position into num, pos from app_club_player_profile(the_reg);
  if num is distinct from 8 or pos is distinct from 'forward' then
    failures := array_append(failures, 'the committee member did not see the admin''s correction');
  end if;

  -- 3. BR99 stays narrow: no direct row, so no height or weight.
  select count(*) into n from player_profile;
  if n <> 0 then
    failures := array_append(failures, 'a committee member read player_profile directly; height and weight leaked (BR99)');
  end if;

  -- 4. A member of another club reads nothing.
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select count(*) into n from app_club_player_profile(the_reg);
  if n <> 0 then
    failures := array_append(failures, 'a member of another club read the record');
  end if;

  -- 5. An anonymous caller reads nothing.
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from app_club_player_profile(the_reg);
  if n <> 0 then
    failures := array_append(failures, 'an anonymous caller read the record');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'The club reads the player record FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'The club reads the player record OK — 5 scenarios';
end
$$;
