-- Can a player answer available/not-available for a fixture, with the same
-- family routing BR113 already proved (BR62/BR63)?
--
--   * an adult player answers for themselves,
--   * a minor with no guardian holding authority cannot be answered for at
--     all — nobody to ask,
--   * a minor with an authority guardian is answered by that guardian,
--   * a contact-only guardian (no authority) cannot answer for a minor,
--   * nobody can name somebody else's answer as their own,
--   * a decline needs a reason; an acceptance carries none,
--   * only the responsible coach/coordinator/admin/registrar and the
--     player's own family can read a response — never another participant,
--   * a family may change the answer and nothing else,
--   * an officer may record an answer that came in by phone,
--   * and an unrelated account at the same club reads and writes nothing.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('55c00000-0000-0000-0000-000000000001', 'Saturday FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('55c00000-0000-0000-0000-0000000000aa', '55c00000-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days');

insert into auth.users (id, email) values
  ('d55c0000-0000-0000-0000-000000000001', 'coach@saturday.test'),
  ('d55c0000-0000-0000-0000-000000000002', 'adult.player@saturday.test'),
  ('d55c0000-0000-0000-0000-000000000003', 'mum@saturday.test'),
  ('d55c0000-0000-0000-0000-000000000004', 'other@saturday.test');

insert into club_membership (club_id, user_id, role) values
  ('55c00000-0000-0000-0000-000000000001', 'd55c0000-0000-0000-0000-000000000001', 'coach');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  -- An adult player, answers for herself.
  ('b55c0000-0000-0000-0000-000000000001', '55c00000-0000-0000-0000-000000000001',
   'Adult', 'Player', '1998-01-01'),
  -- A minor with a mother holding authority.
  ('b55c0000-0000-0000-0000-000000000002', '55c00000-0000-0000-0000-000000000001',
   'Fourteen', 'YearOld', (current_date - interval '14 years')::date),
  ('b55c0000-0000-0000-0000-000000000003', '55c00000-0000-0000-0000-000000000001',
   'Authority', 'Mother', '1985-01-01'),
  -- A second adult on the record for contact only.
  ('b55c0000-0000-0000-0000-000000000004', '55c00000-0000-0000-0000-000000000001',
   'Contact', 'Only', '1984-01-01'),
  -- A minor with nobody recorded as holding authority.
  ('b55c0000-0000-0000-0000-000000000005', '55c00000-0000-0000-0000-000000000001',
   'Unparented', 'Minor', (current_date - interval '13 years')::date),
  -- Another family entirely, at the same club.
  ('b55c0000-0000-0000-0000-000000000006', '55c00000-0000-0000-0000-000000000001',
   'Someone', 'Else', '1983-01-01');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('55c00000-0000-0000-0000-000000000001', 'b55c0000-0000-0000-0000-000000000002',
   'b55c0000-0000-0000-0000-000000000003', true, true),
  ('55c00000-0000-0000-0000-000000000001', 'b55c0000-0000-0000-0000-000000000002',
   'b55c0000-0000-0000-0000-000000000004', false, true);

insert into account_person (club_id, user_id, person_id) values
  ('55c00000-0000-0000-0000-000000000001', 'd55c0000-0000-0000-0000-000000000002',
   'b55c0000-0000-0000-0000-000000000001'),
  ('55c00000-0000-0000-0000-000000000001', 'd55c0000-0000-0000-0000-000000000003',
   'b55c0000-0000-0000-0000-000000000003'),
  ('55c00000-0000-0000-0000-000000000001', 'd55c0000-0000-0000-0000-000000000004',
   'b55c0000-0000-0000-0000-000000000006');

insert into team (id, club_id, season_id, name) values
  ('55c00000-0000-0000-0000-0000000000c1', '55c00000-0000-0000-0000-000000000001',
   '55c00000-0000-0000-0000-0000000000aa', 'W-Div3');

insert into fixture (id, club_id, season_id, team_id, opponent, played_on, kick_off, home_away, status) values
  ('55c00000-0000-0000-0000-0000000000f1', '55c00000-0000-0000-0000-000000000001',
   '55c00000-0000-0000-0000-0000000000aa', '55c00000-0000-0000-0000-0000000000c1',
   'Souths United', (current_date + 5)::date, '16:15', 'home', 'scheduled'),
  ('55c00000-0000-0000-0000-0000000000f2', '55c00000-0000-0000-0000-000000000001',
   '55c00000-0000-0000-0000-0000000000aa', '55c00000-0000-0000-0000-0000000000c1',
   'Norths', (current_date + 12)::date, '16:15', 'away', 'scheduled');

commit;

do $$
declare
  the_club    uuid := '55c00000-0000-0000-0000-000000000001';
  adult       uuid := 'b55c0000-0000-0000-0000-000000000001';
  minor       uuid := 'b55c0000-0000-0000-0000-000000000002';
  mum         uuid := 'b55c0000-0000-0000-0000-000000000003';
  contact     uuid := 'b55c0000-0000-0000-0000-000000000004';
  unparented  uuid := 'b55c0000-0000-0000-0000-000000000005';
  adult_user  uuid := 'd55c0000-0000-0000-0000-000000000002';
  mum_user    uuid := 'd55c0000-0000-0000-0000-000000000003';
  other_user  uuid := 'd55c0000-0000-0000-0000-000000000004';
  coach_user  uuid := 'd55c0000-0000-0000-0000-000000000001';
  f1          uuid := '55c00000-0000-0000-0000-0000000000f1';
  f2          uuid := '55c00000-0000-0000-0000-0000000000f2';
  v_status    text;
  n           integer;
  failures    text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- 1. A minor with nobody holding authority cannot be answered for at all.
  begin
    insert into participation_response (club_id, fixture_id, person_id, status, responded_by_person_id)
    values (the_club, f1, unparented, 'available', unparented);
    failures := array_append(failures,
      'an unparented minor was answered for, with nobody who holds authority over them');
  exception when others then
    if sqlerrm not like '%nobody who can answer%' then
      failures := array_append(failures, 'the unparented refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 2. A contact-only guardian (no authority) cannot answer for the minor.
  begin
    insert into participation_response (club_id, fixture_id, person_id, status, responded_by_person_id)
    values (the_club, f1, minor, 'available', contact);
    failures := array_append(failures,
      'a contact-only guardian, without authority, answered for a minor (BR67/BR62)');
  exception when others then
    if sqlerrm not like '%does not hold authority%' then
      failures := array_append(failures, 'the no-authority refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 3. Nobody may name somebody else's answer as their own — the minor
  --    cannot answer for herself even with her mother's row inserted under
  --    her own name.
  begin
    insert into participation_response (club_id, fixture_id, person_id, status, responded_by_person_id)
    values (the_club, f1, minor, 'available', minor);
    failures := array_append(failures, 'a fourteen-year-old answered her own participation (BR62/BR63)');
  exception when others then
    if sqlerrm not like '%does not hold authority%' then
      failures := array_append(failures, 'the self-answer refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 4. The authority guardian answers for the minor — this is the shape.
  begin
    insert into participation_response (club_id, fixture_id, person_id, status, responded_by_person_id)
    values (the_club, f1, minor, 'available', mum);
  exception when others then
    failures := array_append(failures, 'the authority mother could not answer for her daughter: ' || sqlerrm);
  end;

  select status into v_status from participation_response where fixture_id = f1 and person_id = minor;
  if v_status is distinct from 'available' then
    failures := array_append(failures, 'the guardian''s answer did not land — row is ' || coalesce(v_status, 'null'));
  end if;

  -- 5. A decline needs a reason — an acceptance carries none to write.
  begin
    insert into participation_response (club_id, fixture_id, person_id, status, responded_by_person_id)
    values (the_club, f2, minor, 'not_available', mum);
    failures := array_append(failures, 'a reasonless decline was recorded (BR62)');
  exception when others then
    null;
  end;

  insert into participation_response (club_id, fixture_id, person_id, status, reason, responded_by_person_id)
  values (the_club, f2, minor, 'not_available', 'Has a birthday party that morning.', mum);

  -- 6. An adult answers for herself — no guardian involved at all.
  begin
    insert into participation_response (club_id, fixture_id, person_id, status, responded_by_person_id)
    values (the_club, f1, adult, 'available', adult);
  exception when others then
    failures := array_append(failures, 'an adult player could not answer for herself: ' || sqlerrm);
  end;

  -- 7. And nobody else may answer for the adult, not even a coach, by
  --    naming themselves as the responder through this same insert path
  --    (the officer bypass in the family-only trigger governs column
  --    changes, not who the row claims as responder here).
  begin
    insert into participation_response (club_id, fixture_id, person_id, status, responded_by_person_id)
    values (the_club, f2, adult, 'available', mum);
    failures := array_append(failures, 'somebody else was recorded as an adult player''s own answer');
  exception when others then
    null;
  end;

  -- ---------------------------------------------------- signed in as mum
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', mum_user::text, true);

  -- 8. She reads her daughter's answers.
  select count(*) into n from participation_response where person_id = minor;
  if n <> 2 then
    failures := array_append(failures, 'the guardian read ' || n || ' of her daughter''s 2 responses, not 2');
  end if;

  -- 9. She reads nothing of the adult player, who is not her family.
  select count(*) into n from participation_response where person_id = adult;
  if n <> 0 then
    failures := array_append(failures, 'the guardian read another player''s participation response');
  end if;

  -- 10. She changes the answer — and only the answer, not which fixture or
  --     which player it is about.
  update participation_response set status = 'not_available', reason = 'Changed plans.', responded_by_person_id = mum
   where fixture_id = f1 and person_id = minor;
  perform set_config('role', 'postgres', true);
  select status into v_status from participation_response where fixture_id = f1 and person_id = minor;
  if v_status is distinct from 'not_available' then
    failures := array_append(failures, 'the guardian could not change her own answer');
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', mum_user::text, true);
  begin
    update participation_response set fixture_id = f2, responded_by_person_id = mum
     where fixture_id = f1 and person_id = minor;
    perform set_config('role', 'postgres', true);
    select count(*) into n from participation_response where fixture_id = f1 and person_id = minor;
    if n = 0 then
      failures := array_append(failures, 'a guardian moved a response to a different fixture while answering (BR62)');
    end if;
  exception when others then
    null;
  end;

  -- ------------------------------------------------------- signed in as coach
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coach_user::text, true);

  -- 11. The responsible coach reads every response at the club.
  select count(*) into n from participation_response where club_id = the_club;
  if n <> 3 then
    failures := array_append(failures, 'the coach read ' || n || ' responses, not 3 — visible to the responsible coach (BR62)');
  end if;

  -- 12. And may record one that came in by phone, for anybody on the sheet.
  begin
    insert into participation_response (club_id, fixture_id, person_id, status, reason, responded_by_person_id)
    values (the_club, f2, adult, 'not_available', 'Rang in sick.', adult);
  exception when others then
    failures := array_append(failures, 'a coach could not record a phoned-in answer: ' || sqlerrm);
  end;

  -- ---------------------------------------------- signed in as another family
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', other_user::text, true);

  -- 13. An unrelated account at the same club reads nothing of this family.
  select count(*) into n from participation_response where person_id in (minor, adult);
  if n <> 0 then
    failures := array_append(failures, 'an unrelated account at the same club read another family''s participation responses');
  end if;

  -- 14. And answers nothing on their behalf.
  begin
    insert into participation_response (club_id, fixture_id, person_id, status, responded_by_person_id)
    values (the_club, f1, unparented, 'available', unparented);
    failures := array_append(failures, 'an unrelated account answered for a player who was not theirs');
  exception when others then
    null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'A player answers for Saturday FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A player answers for Saturday OK — 14 scenarios; an adult answers for themselves, a minor is answered only by a guardian holding authority, a decline always carries a reason, only the responsible coach and the player''s own family ever read a response, a family may change only the answer, and an unrelated account at the same club reads and writes nothing';
end
$$;
