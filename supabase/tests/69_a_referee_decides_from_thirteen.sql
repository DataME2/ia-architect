-- 0069: a referee decides from thirteen (BR113 restated, BR150 and BR151 extended, #79).
--
--   * a fifteen-year-old answers their own designation, and their guardian
--     cannot overwrite it (the first answer stands), while they may change
--     their own,
--   * a fifteen-year-old with no guardian may now be designated, while a
--     twelve-year-old with none still may not (suite 46),
--   * from thirteen the official confirms their own match, only one they were
--     appointed to and accepted, and their guardian no longer may,
--   * under thirteen the guardian still confirms (suite 56),
--   * a thirteen-or-over official is invitable on a referee role alone, and a
--     twelve-year-old referee or a fifteen-year-old with neither is not.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990069-0000-0000-0000-000000000001', 'Teen Whistles FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a0069000-0000-0000-0000-000000000001', '99990069-0000-0000-0000-000000000001',
   '2026', current_date - interval '200 days', current_date + interval '60 days');

insert into auth.users (id, email) values
  ('e0069000-0000-0000-0000-000000000001', 'registrar@teenwhistles.test'),
  ('e0069000-0000-0000-0000-000000000002', 'mum@teenwhistles.test'),
  ('e0069000-0000-0000-0000-000000000003', 'teen@teenwhistles.test');

insert into club_membership (club_id, user_id, role) values
  ('99990069-0000-0000-0000-000000000001', 'e0069000-0000-0000-0000-000000000001', 'registrar');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b0069000-0000-0000-0000-000000000001', '99990069-0000-0000-0000-000000000001',
   'Fifteen', 'Ref', (current_date - interval '15 years')::date, 'teen@teenwhistles.test'),
  ('b0069000-0000-0000-0000-000000000002', '99990069-0000-0000-0000-000000000001',
   'Twelve', 'MiniRef', (current_date - interval '12 years')::date, 'twelve@teenwhistles.test'),
  ('b0069000-0000-0000-0000-000000000003', '99990069-0000-0000-0000-000000000001',
   'Unparented', 'Fifteen', (current_date - interval '15 years')::date, 'alone@teenwhistles.test'),
  ('b0069000-0000-0000-0000-000000000004', '99990069-0000-0000-0000-000000000001',
   'Authority', 'Mum', '1985-01-01', 'mum@teenwhistles.test'),
  ('b0069000-0000-0000-0000-000000000005', '99990069-0000-0000-0000-000000000001',
   'NoRole', 'Fifteen', (current_date - interval '15 years')::date, 'norole@teenwhistles.test');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99990069-0000-0000-0000-000000000001', 'b0069000-0000-0000-0000-000000000001',
   'b0069000-0000-0000-0000-000000000004', true, true),
  ('99990069-0000-0000-0000-000000000001', 'b0069000-0000-0000-0000-000000000002',
   'b0069000-0000-0000-0000-000000000004', true, true);

insert into account_person (club_id, user_id, person_id) values
  ('99990069-0000-0000-0000-000000000001', 'e0069000-0000-0000-0000-000000000002',
   'b0069000-0000-0000-0000-000000000004'),
  ('99990069-0000-0000-0000-000000000001', 'e0069000-0000-0000-0000-000000000003',
   'b0069000-0000-0000-0000-000000000001');

insert into person_role (club_id, person_id, season_id, role) values
  ('99990069-0000-0000-0000-000000000001', 'b0069000-0000-0000-0000-000000000001', 'a0069000-0000-0000-0000-000000000001', 'referee'),
  ('99990069-0000-0000-0000-000000000001', 'b0069000-0000-0000-0000-000000000002', 'a0069000-0000-0000-0000-000000000001', 'referee'),
  ('99990069-0000-0000-0000-000000000001', 'b0069000-0000-0000-0000-000000000003', 'a0069000-0000-0000-0000-000000000001', 'referee');

insert into fixture (id, club_id, season_id, opponent, played_on, home_away, status) values
  ('f0069000-0000-0000-0000-000000000001', '99990069-0000-0000-0000-000000000001',
   'a0069000-0000-0000-0000-000000000001', 'Rivals', (current_date - interval '20 days')::date, 'home', 'scheduled'),
  ('f0069000-0000-0000-0000-000000000002', '99990069-0000-0000-0000-000000000001',
   'a0069000-0000-0000-0000-000000000001', 'Wanderers', (current_date - interval '10 days')::date, 'away', 'played'),
  ('f0069000-0000-0000-0000-000000000003', '99990069-0000-0000-0000-000000000001',
   'a0069000-0000-0000-0000-000000000001', 'Thistle', (current_date + interval '7 days')::date, 'home', 'scheduled');

-- Fifteen accepted f1 herself; Twelve's mother accepted f2 for him; Fifteen
-- is proposed for f3, not yet answered.
insert into match_official_appointment (club_id, fixture_id, person_id, role, state, responded_by_person_id, appointed_by) values
  ('99990069-0000-0000-0000-000000000001', 'f0069000-0000-0000-0000-000000000001',
   'b0069000-0000-0000-0000-000000000001', 'referee', 'accepted', 'b0069000-0000-0000-0000-000000000001', 'club'),
  ('99990069-0000-0000-0000-000000000001', 'f0069000-0000-0000-0000-000000000002',
   'b0069000-0000-0000-0000-000000000002', 'referee', 'accepted', 'b0069000-0000-0000-0000-000000000004', 'club');
insert into match_official_appointment (club_id, fixture_id, person_id, role, appointed_by) values
  ('99990069-0000-0000-0000-000000000001', 'f0069000-0000-0000-0000-000000000003',
   'b0069000-0000-0000-0000-000000000001', 'referee', 'club');

commit;

do $$
declare
  the_club  uuid := '99990069-0000-0000-0000-000000000001';
  registrar uuid := 'e0069000-0000-0000-0000-000000000001';
  mum_user  uuid := 'e0069000-0000-0000-0000-000000000002';
  teen_user uuid := 'e0069000-0000-0000-0000-000000000003';
  fifteen   uuid := 'b0069000-0000-0000-0000-000000000001';
  twelve    uuid := 'b0069000-0000-0000-0000-000000000002';
  alone     uuid := 'b0069000-0000-0000-0000-000000000003';
  mum       uuid := 'b0069000-0000-0000-0000-000000000004';
  norole    uuid := 'b0069000-0000-0000-0000-000000000005';
  f1 uuid := 'f0069000-0000-0000-0000-000000000001';
  f2 uuid := 'f0069000-0000-0000-0000-000000000002';
  f3 uuid := 'f0069000-0000-0000-0000-000000000003';
  v_state  text;
  v_by     uuid;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The fifteen-year-old accepts her own designation.
  perform set_config('request.jwt.claim.sub', teen_user::text, true);
  begin
    update match_official_appointment set state = 'accepted', responded_by_person_id = fifteen
     where fixture_id = f3 and person_id = fifteen;
  exception when others then
    failures := array_append(failures, 'a fifteen-year-old could not answer her own designation: ' || sqlerrm);
  end;

  -- 2. Her mother cannot overwrite it: the first answer stands.
  perform set_config('request.jwt.claim.sub', mum_user::text, true);
  begin
    update match_official_appointment
       set state = 'declined', responded_by_person_id = mum, reason = 'Family holiday.'
     where fixture_id = f3 and person_id = fifteen;
    failures := array_append(failures, 'a guardian overwrote a fifteen-year-old''s own answer (BR113)');
  exception when others then
    if sqlerrm not like '%first answer stands%' then
      failures := array_append(failures, 'the overwrite was refused for the wrong reason: ' || sqlerrm);
    end if;
  end;

  -- 3. She may change her own answer.
  perform set_config('request.jwt.claim.sub', teen_user::text, true);
  begin
    update match_official_appointment
       set state = 'declined', responded_by_person_id = fifteen, reason = 'School camp.'
     where fixture_id = f3 and person_id = fifteen;
  exception when others then
    failures := array_append(failures, 'a fifteen-year-old could not change her own answer: ' || sqlerrm);
  end;

  -- 4. She confirms her own past, accepted match, and it is marked played.
  begin
    insert into referee_match_confirmation (club_id, fixture_id, person_id, confirmed_by_person_id)
    values (the_club, f1, fifteen, fifteen);
  exception when others then
    failures := array_append(failures, 'a fifteen-year-old could not confirm her own match: ' || sqlerrm);
  end;
  perform set_config('role', 'postgres', true);
  select status into v_state from fixture where id = f1;
  if v_state is distinct from 'played' then
    failures := array_append(failures, 'her confirmation did not mark the fixture played');
  end if;
  perform set_config('role', 'authenticated', true);

  -- 5. Not a match she was not appointed to.
  begin
    insert into referee_match_confirmation (club_id, fixture_id, person_id, confirmed_by_person_id)
    values (the_club, f2, fifteen, fifteen);
    failures := array_append(failures, 'an official confirmed a match she was never appointed to (BR151)');
  exception when others then
    if sqlerrm not like '%appointed to and accepted%' then
      failures := array_append(failures, 'the unappointed confirmation was refused for the wrong reason: ' || sqlerrm);
    end if;
  end;

  -- 6. Her mother no longer confirms for her.
  perform set_config('role', 'postgres', true);
  delete from referee_match_confirmation where fixture_id = f1 and person_id = fifteen;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', mum_user::text, true);
  begin
    insert into referee_match_confirmation (club_id, fixture_id, person_id, confirmed_by_person_id)
    values (the_club, f1, fifteen, mum);
    failures := array_append(failures, 'a guardian confirmed for an official of fifteen (BR151)');
  exception when others then
    if sqlerrm not like '%under thirteen%' then
      failures := array_append(failures, 'the guardian refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 7. Under thirteen, the guardian still confirms.
  begin
    insert into referee_match_confirmation (club_id, fixture_id, person_id, confirmed_by_person_id)
    values (the_club, f2, twelve, mum);
  exception when others then
    failures := array_append(failures, 'the guardian could no longer confirm a MiniRef''s match: ' || sqlerrm);
  end;

  -- 8. A fifteen-year-old with no guardian can now be designated: she answers herself.
  perform set_config('role', 'postgres', true);
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role, appointed_by)
    values (the_club, f3, alone, 'assistant_referee', 'club');
  exception when others then
    failures := array_append(failures, 'an unparented fifteen-year-old could not be designated: ' || sqlerrm);
  end;

  -- 9. The own-workspace invitation: a referee role alone, from thirteen.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  begin
    insert into player_invitation (club_id, person_id, email, invited_by_user_id)
    values (the_club, alone, 'alone@teenwhistles.test', registrar);
  exception when others then
    failures := array_append(failures, 'a thirteen-plus official could not be invited on a referee role: ' || sqlerrm);
  end;
  begin
    insert into player_invitation (club_id, person_id, email, invited_by_user_id)
    values (the_club, twelve, 'twelve@teenwhistles.test', registrar);
    failures := array_append(failures, 'a twelve-year-old referee was invited to a workspace (BR63)');
  exception when others then
    null;
  end;
  begin
    insert into player_invitation (club_id, person_id, email, invited_by_user_id)
    values (the_club, norole, 'norole@teenwhistles.test', registrar);
    failures := array_append(failures, 'a fifteen-year-old with no role and no COMPLETE registration was invited (BR150)');
  exception when others then
    null;
  end;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'A referee decides from thirteen FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A referee decides from thirteen OK — 9 scenarios';
end
$$;
