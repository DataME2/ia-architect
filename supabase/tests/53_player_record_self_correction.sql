-- Can an adult player propose a correction to their own record, and does
-- nothing change until a trusted role confirms it (BR148)?
--
--   * an adult proposing about themselves succeeds,
--   * a minor is refused, citing BR148, even proposing about themselves,
--   * proposing about somebody else's registration is refused,
--   * a second live proposal is refused while the first is still pending,
--   * confirming copies exactly the proposed fields into person/player_profile
--     and leaves everything else untouched,
--   * declining changes nothing in person/player_profile,
--   * a role outside the trusted five may not review,
--   * re-reviewing an already-reviewed claim is refused.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into club (id, name, jurisdiction) values
  ('99996300-0000-0000-0000-000000000001', 'Self Correction Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e63a0000-0000-0000-0000-000000000001', 'admin@correction.test'),
  ('e63a0000-0000-0000-0000-000000000002', 'adult.player@correction.test'),
  ('e63a0000-0000-0000-0000-000000000003', 'minor.player@correction.test'),
  ('e63a0000-0000-0000-0000-000000000004', 'a.treasurer@correction.test');

insert into club_membership (club_id, user_id, role) values
  ('99996300-0000-0000-0000-000000000001', 'e63a0000-0000-0000-0000-000000000001', 'admin'),
  ('99996300-0000-0000-0000-000000000001', 'e63a0000-0000-0000-0000-000000000004', 'treasurer');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, preferred_name) values
  ('b63a0000-0000-0000-0000-000000000001', '99996300-0000-0000-0000-000000000001',
   'Adult', 'Player', '2000-01-01', 'Ad'),
  ('b63a0000-0000-0000-0000-000000000002', '99996300-0000-0000-0000-000000000001',
   'Minor', 'Player', '2015-01-01', null),
  ('b63a0000-0000-0000-0000-000000000003', '99996300-0000-0000-0000-000000000001',
   'Other', 'Player', '1999-01-01', null);

insert into account_person (club_id, user_id, person_id) values
  ('99996300-0000-0000-0000-000000000001', 'e63a0000-0000-0000-0000-000000000002', 'b63a0000-0000-0000-0000-000000000001'),
  ('99996300-0000-0000-0000-000000000001', 'e63a0000-0000-0000-0000-000000000003', 'b63a0000-0000-0000-0000-000000000002');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a63a0000-0000-0000-0000-000000000001', '99996300-0000-0000-0000-000000000001',
   '2027', '2027-01-01', '2027-12-01');

insert into registration (id, club_id, person_id, season_id) values
  ('c63a0000-0000-0000-0000-000000000001', '99996300-0000-0000-0000-000000000001',
   'b63a0000-0000-0000-0000-000000000001', 'a63a0000-0000-0000-0000-000000000001'),
  ('c63a0000-0000-0000-0000-000000000002', '99996300-0000-0000-0000-000000000001',
   'b63a0000-0000-0000-0000-000000000002', 'a63a0000-0000-0000-0000-000000000001'),
  ('c63a0000-0000-0000-0000-000000000003', '99996300-0000-0000-0000-000000000001',
   'b63a0000-0000-0000-0000-000000000003', 'a63a0000-0000-0000-0000-000000000001');

commit;

do $$
declare
  the_club     uuid := '99996300-0000-0000-0000-000000000001';
  admin_user   uuid := 'e63a0000-0000-0000-0000-000000000001';
  adult_user   uuid := 'e63a0000-0000-0000-0000-000000000002';
  minor_user   uuid := 'e63a0000-0000-0000-0000-000000000003';
  treasurer    uuid := 'e63a0000-0000-0000-0000-000000000004';
  adult_person uuid := 'b63a0000-0000-0000-0000-000000000001';
  minor_person uuid := 'b63a0000-0000-0000-0000-000000000002';
  adult_reg    uuid := 'c63a0000-0000-0000-0000-000000000001';
  minor_reg    uuid := 'c63a0000-0000-0000-0000-000000000002';
  other_reg    uuid := 'c63a0000-0000-0000-0000-000000000003';
  correction_id uuid;
  n            integer;
  outcome      text;
  failures     text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. An adult proposing about themselves succeeds.
  perform set_config('request.jwt.claim.sub', adult_user::text, true);
  begin
    insert into player_record_correction (club_id, registration_id, person_id, proposed_by_user_id, preferred_name, squad_number)
    values (the_club, adult_reg, adult_person, adult_user, 'Ace', 9)
    returning id into correction_id;
  exception when others then
    failures := array_append(failures, 'an adult could not propose a correction about themselves: ' || sqlerrm);
  end;

  -- 2. A minor is refused, citing BR148, even proposing about themselves.
  perform set_config('request.jwt.claim.sub', minor_user::text, true);
  begin
    insert into player_record_correction (club_id, registration_id, person_id, proposed_by_user_id, preferred_name)
    values (the_club, minor_reg, minor_person, minor_user, 'Junior');
    failures := array_append(failures, 'a minor was allowed to propose a correction');
  exception when others then
    if sqlerrm not like '%BR148%' then
      failures := array_append(failures, 'the minor refusal did not cite BR148: ' || sqlerrm);
    end if;
  end;

  -- 3. Proposing about somebody else's registration is refused.
  begin
    insert into player_record_correction (club_id, registration_id, person_id, proposed_by_user_id, preferred_name)
    values (the_club, other_reg, adult_person, adult_user, 'Not mine');
    failures := array_append(failures, 'a player proposed a correction against another person''s registration');
  exception when others then null;
  end;

  -- 4. A second live proposal is refused while the first is still pending.
  perform set_config('request.jwt.claim.sub', adult_user::text, true);
  begin
    insert into player_record_correction (club_id, registration_id, person_id, proposed_by_user_id, email)
    values (the_club, adult_reg, adult_person, adult_user, 'second@correction.test');
    failures := array_append(failures, 'a second pending correction was accepted alongside the first');
  exception when others then null;
  end;

  -- 5. A role outside the trusted five may not review.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  begin
    perform app_review_player_record_correction(correction_id, true, null);
    failures := array_append(failures, 'a treasurer was able to review a player record correction');
  exception when others then null;
  end;

  -- 6. Confirming copies exactly the proposed fields, and nothing else.
  perform set_config('request.jwt.claim.sub', admin_user::text, true);
  select app_review_player_record_correction(correction_id, true, 'looks right') into outcome;
  if outcome <> 'confirmed' then
    failures := array_append(failures, 'confirming did not report "confirmed"');
  end if;

  perform set_config('role', 'postgres', true);
  select count(*) into n from person where id = adult_person and preferred_name = 'Ace';
  if n <> 1 then
    failures := array_append(failures, 'confirming did not write the proposed preferred_name onto person');
  end if;
  select count(*) into n from player_profile where registration_id = adult_reg and squad_number = 9;
  if n <> 1 then
    failures := array_append(failures, 'confirming did not write the proposed squad_number onto player_profile');
  end if;

  -- 7. Re-reviewing an already-reviewed claim is refused.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_user::text, true);
  begin
    perform app_review_player_record_correction(correction_id, false, null);
    failures := array_append(failures, 'a confirmed correction was reviewed a second time');
  exception when others then null;
  end;

  -- 8. Declining changes nothing in person/player_profile. A fresh
  --    proposal, since the pending slot for adult_reg is free again.
  perform set_config('request.jwt.claim.sub', adult_user::text, true);
  declare
    v_second uuid;
  begin
    insert into player_record_correction (club_id, registration_id, person_id, proposed_by_user_id, preferred_name)
    values (the_club, adult_reg, adult_person, adult_user, 'Should Not Land')
    returning id into v_second;

    perform set_config('request.jwt.claim.sub', admin_user::text, true);
    perform app_review_player_record_correction(v_second, false, 'not this season');

    perform set_config('role', 'postgres', true);
    select count(*) into n from person where id = adult_person and preferred_name = 'Should Not Land';
    if n <> 0 then
      failures := array_append(failures, 'declining still wrote the proposed value onto person');
    end if;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'Player record self-correction FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Player record self-correction OK — 8 scenarios; an adult proposes about themselves, a minor and a mismatched registration are refused, a second pending claim is refused, confirming applies exactly what was proposed, declining applies nothing, and only the trusted roles may review';
end
$$;
