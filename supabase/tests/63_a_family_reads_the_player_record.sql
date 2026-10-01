-- 0063: a family reads the player record it holds authority over (BR155).
--
--   * a guardian with authority reads the child's record, and reads the
--     correction a club officer just made to it — the reported bug,
--   * an adult player reads their own,
--   * a contact-only guardian, another family, and an anonymous caller
--     read nothing,
--   * the guardian still reads no `player_profile` row directly, so height
--     and weight stay as narrow as BR99 made them (BR122: a narrowing is
--     proved by a test that fails when it is widened).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99996363-0000-0000-0000-000000000001', 'Family Record Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e6363000-0000-0000-0000-000000000001', 'admin@record.test'),
  ('e6363000-0000-0000-0000-000000000002', 'mum@record.test'),
  ('e6363000-0000-0000-0000-000000000003', 'contact@record.test'),
  ('e6363000-0000-0000-0000-000000000004', 'other@record.test'),
  ('e6363000-0000-0000-0000-000000000005', 'adult@record.test');

insert into club_membership (club_id, user_id, role) values
  ('99996363-0000-0000-0000-000000000001', 'e6363000-0000-0000-0000-000000000001', 'admin');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b6363000-0000-0000-0000-000000000001', '99996363-0000-0000-0000-000000000001', 'Karen', 'Alfonso', '1987-01-01'),
  ('b6363000-0000-0000-0000-000000000002', '99996363-0000-0000-0000-000000000001', 'Sebastian', 'Alfonso', current_date - interval '12 years'),
  ('b6363000-0000-0000-0000-000000000003', '99996363-0000-0000-0000-000000000001', 'Carla', 'Contact', '1980-01-01'),
  ('b6363000-0000-0000-0000-000000000004', '99996363-0000-0000-0000-000000000001', 'Oscar', 'Other', '1982-01-01'),
  ('b6363000-0000-0000-0000-000000000005', '99996363-0000-0000-0000-000000000001', 'Olivia', 'Other', current_date - interval '11 years'),
  ('b6363000-0000-0000-0000-000000000006', '99996363-0000-0000-0000-000000000001', 'Adam', 'Adult', '1995-01-01');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99996363-0000-0000-0000-000000000001', 'b6363000-0000-0000-0000-000000000002', 'b6363000-0000-0000-0000-000000000001', true, true),
  ('99996363-0000-0000-0000-000000000001', 'b6363000-0000-0000-0000-000000000002', 'b6363000-0000-0000-0000-000000000003', false, true),
  ('99996363-0000-0000-0000-000000000001', 'b6363000-0000-0000-0000-000000000005', 'b6363000-0000-0000-0000-000000000004', true, true);

insert into account_person (club_id, user_id, person_id) values
  ('99996363-0000-0000-0000-000000000001', 'e6363000-0000-0000-0000-000000000002', 'b6363000-0000-0000-0000-000000000001'),
  ('99996363-0000-0000-0000-000000000001', 'e6363000-0000-0000-0000-000000000003', 'b6363000-0000-0000-0000-000000000003'),
  ('99996363-0000-0000-0000-000000000001', 'e6363000-0000-0000-0000-000000000004', 'b6363000-0000-0000-0000-000000000004'),
  ('99996363-0000-0000-0000-000000000001', 'e6363000-0000-0000-0000-000000000005', 'b6363000-0000-0000-0000-000000000006');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a6363000-0000-0000-0000-000000000001', '99996363-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31');

insert into registration (id, club_id, person_id, season_id, status) values
  ('c6363000-0000-0000-0000-000000000002', '99996363-0000-0000-0000-000000000001', 'b6363000-0000-0000-0000-000000000002', 'a6363000-0000-0000-0000-000000000001', 'COMPLETE'),
  ('c6363000-0000-0000-0000-000000000005', '99996363-0000-0000-0000-000000000001', 'b6363000-0000-0000-0000-000000000005', 'a6363000-0000-0000-0000-000000000001', 'COMPLETE'),
  ('c6363000-0000-0000-0000-000000000006', '99996363-0000-0000-0000-000000000001', 'b6363000-0000-0000-0000-000000000006', 'a6363000-0000-0000-0000-000000000001', 'COMPLETE');

insert into player_profile (club_id, registration_id, height_cm, weight_kg, preferred_position, squad_number) values
  ('99996363-0000-0000-0000-000000000001', 'c6363000-0000-0000-0000-000000000002', 150, 40, 'defender', 4),
  ('99996363-0000-0000-0000-000000000001', 'c6363000-0000-0000-0000-000000000005', 140, 35, 'forward', 9),
  ('99996363-0000-0000-0000-000000000001', 'c6363000-0000-0000-0000-000000000006', 180, 75, 'goalkeeper', 1);

commit;

do $$
declare
  the_club  uuid := '99996363-0000-0000-0000-000000000001';
  admin     uuid := 'e6363000-0000-0000-0000-000000000001';
  mum       uuid := 'e6363000-0000-0000-0000-000000000002';
  contact   uuid := 'e6363000-0000-0000-0000-000000000003';
  other     uuid := 'e6363000-0000-0000-0000-000000000004';
  adult     uuid := 'e6363000-0000-0000-0000-000000000005';
  child     uuid := 'b6363000-0000-0000-0000-000000000002';
  n         integer;
  num       integer;
  pos       text;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. A club officer corrects the child's record.
  perform set_config('request.jwt.claim.sub', admin::text, true);
  update player_profile set preferred_position = 'midfielder', squad_number = 8
   where registration_id = 'c6363000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 1 then
    failures := array_append(failures, 'the admin could not correct the child''s record');
  end if;

  -- 2. The guardian with authority reads exactly that child, corrected.
  perform set_config('request.jwt.claim.sub', mum::text, true);
  select count(*) into n from app_family_player_profiles(the_club);
  if n <> 1 then
    failures := array_append(failures, format('the guardian read %s records, expected her one child', n));
  end if;
  select squad_number, preferred_position into num, pos
    from app_family_player_profiles(the_club) where person_id = child;
  if num is distinct from 8 or pos is distinct from 'midfielder' then
    failures := array_append(failures, 'the guardian did not see the admin''s correction');
  end if;

  -- 3. BR99 stays narrow: no direct row, so no height or weight.
  select count(*) into n from player_profile;
  if n <> 0 then
    failures := array_append(failures, 'a guardian read player_profile directly — height and weight leaked (BR99)');
  end if;

  -- 4. A contact-only guardian holds no authority, so reads nothing.
  perform set_config('request.jwt.claim.sub', contact::text, true);
  select count(*) into n from app_family_player_profiles(the_club);
  if n <> 0 then
    failures := array_append(failures, 'a contact-only guardian read a record');
  end if;

  -- 5. Another family reads only their own child.
  perform set_config('request.jwt.claim.sub', other::text, true);
  select count(*) into n from app_family_player_profiles(the_club) where person_id = child;
  if n <> 0 then
    failures := array_append(failures, 'another family read this child''s record');
  end if;

  -- 6. An adult player reads their own.
  perform set_config('request.jwt.claim.sub', adult::text, true);
  select count(*) into n from app_family_player_profiles(the_club);
  if n <> 1 then
    failures := array_append(failures, format('the adult player read %s records, expected their own', n));
  end if;

  -- 7. An anonymous caller reads nothing.
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from app_family_player_profiles(the_club);
  if n <> 0 then
    failures := array_append(failures, 'an anonymous caller read a record');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'A family reads the player record FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A family reads the player record OK — 7 scenarios';
end
$$;
