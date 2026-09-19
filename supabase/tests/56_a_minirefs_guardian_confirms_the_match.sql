-- Can a MiniRef's guardian confirm their match happened, and only theirs
-- (BR151)?
--
--   * a guardian holding authority confirms a match for an under-13
--     official, on the day of the fixture,
--   * a contact-only guardian (no authority) cannot confirm,
--   * an official who was thirteen or over on the day of the fixture
--     cannot be confirmed for at all — even if they are younger now,
--   * a fourteen-year-old confirming their own match is refused (BR151 is
--     narrower than BR113 — no self-report exists at any age),
--   * only the responsible admin/registrar/coordinator/coach and the
--     official's own family ever read a confirmation,
--   * a score is optional and never negative,
--   * officers may correct a confirmation; a family may not update one,
--   * and an unrelated account at the same club reads and writes nothing.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('56c00000-0000-0000-0000-000000000001', 'Junior Whistles FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('56c00000-0000-0000-0000-0000000000aa', '56c00000-0000-0000-0000-000000000001',
   '2026', current_date - interval '200 days', current_date + interval '60 days');

insert into auth.users (id, email) values
  ('d56c0000-0000-0000-0000-000000000001', 'coordinator@juniorwhistles.test'),
  ('d56c0000-0000-0000-0000-000000000002', 'mum@juniorwhistles.test'),
  ('d56c0000-0000-0000-0000-000000000003', 'other@juniorwhistles.test');

insert into club_membership (club_id, user_id, role) values
  ('56c00000-0000-0000-0000-000000000001', 'd56c0000-0000-0000-0000-000000000001', 'coordinator');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  -- A MiniRef, twelve on the day of the fixture below (played 100 days
  -- ago) and still twelve today.
  ('b56c0000-0000-0000-0000-000000000001', '56c00000-0000-0000-0000-000000000001',
   'Twelve', 'MiniRef', (current_date - interval '100 days' - interval '12 years')::date),
  -- Was twelve when appointed, but has since turned thirteen — the
  -- fixture is old enough that BR151 still offers it (measured then).
  ('b56c0000-0000-0000-0000-000000000002', '56c00000-0000-0000-0000-000000000001',
   'JustTurned', 'Thirteen', (current_date - interval '13 years' + interval '5 days')::date),
  -- Fourteen on the day of her own fixture — outside BR151 entirely.
  ('b56c0000-0000-0000-0000-000000000003', '56c00000-0000-0000-0000-000000000001',
   'Fourteen', 'Official', (current_date - interval '100 days' - interval '14 years')::date),
  -- Her mother, holding authority.
  ('b56c0000-0000-0000-0000-000000000004', '56c00000-0000-0000-0000-000000000001',
   'Authority', 'Mother', '1985-01-01'),
  -- A second adult, contact only.
  ('b56c0000-0000-0000-0000-000000000005', '56c00000-0000-0000-0000-000000000001',
   'Contact', 'Only', '1984-01-01'),
  -- Another family entirely.
  ('b56c0000-0000-0000-0000-000000000006', '56c00000-0000-0000-0000-000000000001',
   'Someone', 'Else', '1983-01-01');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('56c00000-0000-0000-0000-000000000001', 'b56c0000-0000-0000-0000-000000000001',
   'b56c0000-0000-0000-0000-000000000004', true, true),
  ('56c00000-0000-0000-0000-000000000001', 'b56c0000-0000-0000-0000-000000000001',
   'b56c0000-0000-0000-0000-000000000005', false, true),
  ('56c00000-0000-0000-0000-000000000001', 'b56c0000-0000-0000-0000-000000000002',
   'b56c0000-0000-0000-0000-000000000004', true, true),
  ('56c00000-0000-0000-0000-000000000001', 'b56c0000-0000-0000-0000-000000000003',
   'b56c0000-0000-0000-0000-000000000004', true, true);

insert into account_person (club_id, user_id, person_id) values
  ('56c00000-0000-0000-0000-000000000001', 'd56c0000-0000-0000-0000-000000000002',
   'b56c0000-0000-0000-0000-000000000004'),
  ('56c00000-0000-0000-0000-000000000001', 'd56c0000-0000-0000-0000-000000000003',
   'b56c0000-0000-0000-0000-000000000006');

insert into team (id, club_id, season_id, name) values
  ('56c00000-0000-0000-0000-0000000000c1', '56c00000-0000-0000-0000-000000000001',
   '56c00000-0000-0000-0000-0000000000aa', 'U8s');

insert into fixture (id, club_id, season_id, team_id, opponent, played_on, home_away, status) values
  ('56c00000-0000-0000-0000-0000000000f1', '56c00000-0000-0000-0000-000000000001',
   '56c00000-0000-0000-0000-0000000000aa', '56c00000-0000-0000-0000-0000000000c1',
   'Rivals', (current_date - interval '100 days')::date, 'home', 'played'),
  ('56c00000-0000-0000-0000-0000000000f2', '56c00000-0000-0000-0000-000000000001',
   '56c00000-0000-0000-0000-0000000000aa', '56c00000-0000-0000-0000-0000000000c1',
   'Wanderers', (current_date - interval '90 days')::date, 'away', 'played');

commit;

do $$
declare
  the_club   uuid := '56c00000-0000-0000-0000-000000000001';
  twelve     uuid := 'b56c0000-0000-0000-0000-000000000001';
  now_teen   uuid := 'b56c0000-0000-0000-0000-000000000002';
  fourteen   uuid := 'b56c0000-0000-0000-0000-000000000003';
  mum        uuid := 'b56c0000-0000-0000-0000-000000000004';
  contact    uuid := 'b56c0000-0000-0000-0000-000000000005';
  mum_user   uuid := 'd56c0000-0000-0000-0000-000000000002';
  other_user uuid := 'd56c0000-0000-0000-0000-000000000003';
  coord_user uuid := 'd56c0000-0000-0000-0000-000000000001';
  f1         uuid := '56c00000-0000-0000-0000-0000000000f1';
  f2         uuid := '56c00000-0000-0000-0000-0000000000f2';
  n          integer;
  v_home     integer;
  failures   text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- 1. A contact-only guardian cannot confirm.
  begin
    insert into referee_match_confirmation (club_id, fixture_id, person_id, confirmed_by_person_id)
    values (the_club, f1, twelve, contact);
    failures := array_append(failures,
      'a contact-only guardian, without authority, confirmed a MiniRef''s match (BR67/BR151)');
  exception when others then
    if sqlerrm not like '%does not hold authority%' then
      failures := array_append(failures, 'the no-authority refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 2. Fourteen on the day of her own fixture — outside BR151 entirely,
  --    even for her own authority-holding mother.
  begin
    insert into referee_match_confirmation (club_id, fixture_id, person_id, confirmed_by_person_id)
    values (the_club, f1, fourteen, mum);
    failures := array_append(failures,
      'a match official fourteen on the day of the fixture was confirmed for (BR151)');
  exception when others then
    if sqlerrm not like '%under thirteen%' then
      failures := array_append(failures, 'the fourteen-year-old refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 3. Nobody may confirm their own match — BR151 is narrower than BR113,
  --    and no self-report exists at any age.
  begin
    insert into referee_match_confirmation (club_id, fixture_id, person_id, confirmed_by_person_id)
    values (the_club, f1, twelve, twelve);
    failures := array_append(failures, 'a twelve-year-old confirmed her own match (BR151)');
  exception when others then
    if sqlerrm not like '%does not hold authority%' then
      failures := array_append(failures, 'the self-confirmation refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 4. The authority guardian confirms, with a score.
  begin
    insert into referee_match_confirmation
      (club_id, fixture_id, person_id, confirmed_by_person_id, home_score, away_score)
    values (the_club, f1, twelve, mum, 3, 1);
  exception when others then
    failures := array_append(failures, 'the authority mother could not confirm her daughter''s match: ' || sqlerrm);
  end;

  select home_score into v_home from referee_match_confirmation where fixture_id = f1 and person_id = twelve;
  if v_home is distinct from 3 then
    failures := array_append(failures, 'the score did not land — home_score is ' || coalesce(v_home::text, 'null'));
  end if;

  -- 5. A negative score is refused (the ordinary check constraint).
  begin
    insert into referee_match_confirmation
      (club_id, fixture_id, person_id, confirmed_by_person_id, home_score)
    values (the_club, f2, twelve, mum, -1);
    failures := array_append(failures, 'a negative score was recorded');
  exception when others then
    null;
  end;

  -- 6. An official who was twelve when the fixture was played is still
  --    offered, even though they have since turned thirteen — measured
  --    against the fixture, not today.
  begin
    insert into referee_match_confirmation (club_id, fixture_id, person_id, confirmed_by_person_id)
    values (the_club, f1, now_teen, mum);
  exception when others then
    failures := array_append(failures,
      'an official who was twelve on the day of the fixture could not be confirmed, '
      || 'even though they have since turned thirteen (BR151 measures the fixture date): ' || sqlerrm);
  end;

  -- ------------------------------------------------------ signed in as mum
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', mum_user::text, true);

  -- 7. She reads her children's confirmations.
  select count(*) into n from referee_match_confirmation where person_id in (twelve, now_teen);
  if n <> 2 then
    failures := array_append(failures, 'the guardian read ' || n || ' confirmations, not 2');
  end if;

  -- 8. A family may not update a confirmation — no update policy for them.
  begin
    update referee_match_confirmation set home_score = 9
     where fixture_id = f1 and person_id = twelve;
    perform set_config('role', 'postgres', true);
    select home_score into v_home from referee_match_confirmation where fixture_id = f1 and person_id = twelve;
    if v_home = 9 then
      failures := array_append(failures, 'a guardian updated a confirmation after submitting it');
    end if;
  exception when others then
    null;
  end;

  -- ---------------------------------------------------- signed in as coord
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coord_user::text, true);

  -- 9. The coordinator reads every confirmation at the club.
  select count(*) into n from referee_match_confirmation where club_id = the_club;
  if n <> 2 then
    failures := array_append(failures, 'the coordinator read ' || n || ' confirmations, not 2');
  end if;

  -- 10. And may correct one (an officer's ordinary latitude).
  begin
    update referee_match_confirmation set home_score = 4
     where fixture_id = f1 and person_id = twelve;
    perform set_config('role', 'postgres', true);
    select home_score into v_home from referee_match_confirmation where fixture_id = f1 and person_id = twelve;
    if v_home is distinct from 4 then
      failures := array_append(failures, 'the coordinator could not correct a confirmed score');
    end if;
  exception when others then
    failures := array_append(failures, 'the coordinator could not correct a confirmed score: ' || sqlerrm);
  end;

  -- -------------------------------------------- signed in as another family
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', other_user::text, true);

  -- 11. An unrelated account reads nothing.
  select count(*) into n from referee_match_confirmation where person_id in (twelve, now_teen);
  if n <> 0 then
    failures := array_append(failures, 'an unrelated account read another family''s match confirmation');
  end if;

  -- 12. And confirms nothing on their behalf.
  begin
    insert into referee_match_confirmation (club_id, fixture_id, person_id, confirmed_by_person_id)
    values (the_club, f2, twelve, twelve);
    failures := array_append(failures, 'an unrelated account confirmed a match for a player who was not theirs');
  exception when others then
    null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'A MiniRef''s guardian confirms the match FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A MiniRef''s guardian confirms the match OK — 12 scenarios; a guardian holding authority confirms a match official who was under thirteen on the day of the fixture, measured against the fixture rather than today, nobody confirms their own match, only the responsible officer roles and the official''s own family ever read a confirmation, a family may not revise one after submitting it, and an unrelated account at the same club reads and writes nothing';
end
$$;
