-- The daily check-in and academy teams (0096, scope 113).
--
--   * only a Technical Lead marks an academy team (BR184), and U13+ is read
--     from the age group,
--   * nothing is written without consent; a fifteen-year-old cannot give it,
--     their guardian can, an adult gives their own (BR185),
--   * the check-in does not reach an U12 or a non-academy team (BR184),
--   * the player writes their own, inside its window; their guardian reads
--     and does not write (BR186),
--   * their coach and the Technical Lead read; the team's manager, the
--     committee, the admin and another team's coach read nothing (BR186),
--   * withdrawing stops new entries, and the player can still remove theirs,
--   * another club reads nothing.
--
-- Dates are relative to the day the suite runs, so it keeps passing after
-- this season ends.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d9600000-0000-0000-0000-000000000001', 'td@checkin.test'),
  ('d9600000-0000-0000-0000-000000000002', 'admin@checkin.test'),
  ('d9600000-0000-0000-0000-000000000003', 'committee@checkin.test'),
  ('d9600000-0000-0000-0000-000000000004', 'coach@checkin.test'),
  ('d9600000-0000-0000-0000-000000000005', 'manager@checkin.test'),
  ('d9600000-0000-0000-0000-000000000006', 'othercoach@checkin.test'),
  ('d9600000-0000-0000-0000-000000000007', 'player@checkin.test'),
  ('d9600000-0000-0000-0000-000000000008', 'guardian@checkin.test'),
  ('d9600000-0000-0000-0000-000000000009', 'adult@checkin.test'),
  ('d9600000-0000-0000-0000-0000000000ee', 'td@rival-checkin.test');

insert into club (id, name, jurisdiction) values
  ('c9600000-0000-0000-0000-000000000001', 'Check-in FC', 'QLD'),
  ('c9600000-0000-0000-0000-000000000002', 'Rival Check-in FC', 'QLD');

insert into club_membership (club_id, user_id, role) values
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000001', 'technical_director'),
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000002', 'admin'),
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000003', 'committee'),
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000004', 'coach'),
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000005', 'coach'),
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000006', 'coach'),
  ('c9600000-0000-0000-0000-000000000002', 'd9600000-0000-0000-0000-0000000000ee', 'technical_director');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a9600000-0000-0000-0000-000000000001', 'c9600000-0000-0000-0000-000000000001', 'This season',
   current_date - 100, current_date + 100);

-- 1 the player (15), 2 their guardian, 3 coach, 4 manager, 5 another team's
-- coach, 6 an adult player, 7 a twelve-year-old (U12), 8 a fourteen-year-old
-- on a team that is not academy.
insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b9600000-0000-0000-0000-000000000001', 'c9600000-0000-0000-0000-000000000001', 'Jordan', 'Fifteen', current_date - interval '15 years 2 months'),
  ('b9600000-0000-0000-0000-000000000002', 'c9600000-0000-0000-0000-000000000001', 'Pat', 'Guardian', current_date - interval '45 years'),
  ('b9600000-0000-0000-0000-000000000003', 'c9600000-0000-0000-0000-000000000001', 'Casey', 'Coach', current_date - interval '40 years'),
  ('b9600000-0000-0000-0000-000000000004', 'c9600000-0000-0000-0000-000000000001', 'Morgan', 'Manager', current_date - interval '50 years'),
  ('b9600000-0000-0000-0000-000000000005', 'c9600000-0000-0000-0000-000000000001', 'Riley', 'Othercoach', current_date - interval '35 years'),
  ('b9600000-0000-0000-0000-000000000006', 'c9600000-0000-0000-0000-000000000001', 'Alex', 'Adult', current_date - interval '25 years'),
  ('b9600000-0000-0000-0000-000000000007', 'c9600000-0000-0000-0000-000000000001', 'Sam', 'Twelve', current_date - interval '12 years 3 months'),
  ('b9600000-0000-0000-0000-000000000008', 'c9600000-0000-0000-0000-000000000001', 'Kai', 'Fourteen', current_date - interval '14 years');

insert into account_person (club_id, user_id, person_id) values
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000007', 'b9600000-0000-0000-0000-000000000001'),
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000008', 'b9600000-0000-0000-0000-000000000002'),
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000004', 'b9600000-0000-0000-0000-000000000003'),
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000005', 'b9600000-0000-0000-0000-000000000004'),
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000006', 'b9600000-0000-0000-0000-000000000005'),
  ('c9600000-0000-0000-0000-000000000001', 'd9600000-0000-0000-0000-000000000009', 'b9600000-0000-0000-0000-000000000006');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority) values
  ('c9600000-0000-0000-0000-000000000001', 'b9600000-0000-0000-0000-000000000001', 'b9600000-0000-0000-0000-000000000002', true),
  ('c9600000-0000-0000-0000-000000000001', 'b9600000-0000-0000-0000-000000000007', 'b9600000-0000-0000-0000-000000000002', true),
  ('c9600000-0000-0000-0000-000000000001', 'b9600000-0000-0000-0000-000000000008', 'b9600000-0000-0000-0000-000000000002', true);

insert into team (id, club_id, season_id, name, age_group) values
  ('99600000-0000-0000-0000-000000000001', 'c9600000-0000-0000-0000-000000000001', 'a9600000-0000-0000-0000-000000000001', 'U15 Boys', 'U15'),
  ('99600000-0000-0000-0000-000000000002', 'c9600000-0000-0000-0000-000000000001', 'a9600000-0000-0000-0000-000000000001', 'Seniors', 'Senior Men'),
  ('99600000-0000-0000-0000-000000000003', 'c9600000-0000-0000-0000-000000000001', 'a9600000-0000-0000-0000-000000000001', 'U12 Academy', 'U12'),
  ('99600000-0000-0000-0000-000000000004', 'c9600000-0000-0000-0000-000000000001', 'a9600000-0000-0000-0000-000000000001', 'U14 Social', 'U14');

-- No card, no start (BR19): every adult on a team sheet holds a clearance.
insert into clearance (club_id, person_id, kind, identifier, expires_on, verified_by_user_id, verified_at)
select 'c9600000-0000-0000-0000-000000000001', p, 'WWCC', 'BC-96-' || right(p::text, 4), current_date + 3650,
       'd9600000-0000-0000-0000-000000000002', now()
  from unnest(array[
    'b9600000-0000-0000-0000-000000000003',
    'b9600000-0000-0000-0000-000000000004',
    'b9600000-0000-0000-0000-000000000005']::uuid[]) as p;

insert into team_member (club_id, team_id, person_id, role) values
  ('c9600000-0000-0000-0000-000000000001', '99600000-0000-0000-0000-000000000001', 'b9600000-0000-0000-0000-000000000001', 'player'),
  ('c9600000-0000-0000-0000-000000000001', '99600000-0000-0000-0000-000000000001', 'b9600000-0000-0000-0000-000000000003', 'coach'),
  ('c9600000-0000-0000-0000-000000000001', '99600000-0000-0000-0000-000000000001', 'b9600000-0000-0000-0000-000000000004', 'manager'),
  ('c9600000-0000-0000-0000-000000000001', '99600000-0000-0000-0000-000000000002', 'b9600000-0000-0000-0000-000000000006', 'player'),
  ('c9600000-0000-0000-0000-000000000001', '99600000-0000-0000-0000-000000000002', 'b9600000-0000-0000-0000-000000000005', 'coach'),
  ('c9600000-0000-0000-0000-000000000001', '99600000-0000-0000-0000-000000000003', 'b9600000-0000-0000-0000-000000000007', 'player'),
  ('c9600000-0000-0000-0000-000000000001', '99600000-0000-0000-0000-000000000004', 'b9600000-0000-0000-0000-000000000008', 'player');

commit;

do $$
declare
  club       uuid := 'c9600000-0000-0000-0000-000000000001';
  u15        uuid := '99600000-0000-0000-0000-000000000001';
  seniors    uuid := '99600000-0000-0000-0000-000000000002';
  u12        uuid := '99600000-0000-0000-0000-000000000003';
  player     uuid := 'b9600000-0000-0000-0000-000000000001';
  adult_p    uuid := 'b9600000-0000-0000-0000-000000000006';
  twelve     uuid := 'b9600000-0000-0000-0000-000000000007';
  fourteen   uuid := 'b9600000-0000-0000-0000-000000000008';
  td         uuid := 'd9600000-0000-0000-0000-000000000001';
  admin      uuid := 'd9600000-0000-0000-0000-000000000002';
  committee  uuid := 'd9600000-0000-0000-0000-000000000003';
  coach      uuid := 'd9600000-0000-0000-0000-000000000004';
  manager    uuid := 'd9600000-0000-0000-0000-000000000005';
  othercoach uuid := 'd9600000-0000-0000-0000-000000000006';
  player_u   uuid := 'd9600000-0000-0000-0000-000000000007';
  guardian   uuid := 'd9600000-0000-0000-0000-000000000008';
  adult_u    uuid := 'd9600000-0000-0000-0000-000000000009';
  rival_td   uuid := 'd9600000-0000-0000-0000-0000000000ee';
  who        uuid;
  n          integer;
  failures   text[] := '{}';
begin
  -- 1. U13+ is read from the age group (BR184).
  if app_age_group_is_u13_plus('U12') or not app_age_group_is_u13_plus('U13')
     or not app_age_group_is_u13_plus('Under 15') or not app_age_group_is_u13_plus('Senior Men')
     or app_age_group_is_u13_plus(null) then
    failures := array_append(failures, 'U13+ was misread from an age group');
  end if;

  perform set_config('role', 'authenticated', true);

  -- 2. The admin marks no academy team; the Technical Lead does.
  perform set_config('request.jwt.claim.sub', admin::text, true);
  begin
    update team set academy = true where id = u15;
    failures := array_append(failures, 'the admin marked an academy team');
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', td::text, true);
  perform app_set_team_academy(u15, true);
  perform app_set_team_academy(seniors, true);
  perform app_set_team_academy(u12, true);
  select count(*) into n from team where club_id = club and academy;
  if n <> 3 then failures := array_append(failures, 'the Technical Lead could not mark academy teams'); end if;

  -- 3. Without consent, the player writes nothing.
  perform set_config('request.jwt.claim.sub', player_u::text, true);
  begin
    insert into wellbeing_entry (club_id, person_id, entered_on, motivation, mood, sleep_quality, stress, soreness)
    values (club, player, current_date, 7, 6, 5, 3, 8);
    failures := array_append(failures, 'a check-in was written without consent');
  exception when insufficient_privilege then null;
  end;

  -- 4. A fifteen-year-old cannot consent; their guardian can (BR185).
  begin
    perform app_grant_check_in_consent(club, player);
    failures := array_append(failures, 'a fifteen-year-old consented to their own check-in');
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', guardian::text, true);
  perform app_grant_check_in_consent(club, player);
  select count(*) into n from app_check_in_players(club) where person_id = player and consented_at is not null;
  if n <> 1 then failures := array_append(failures, 'the guardian''s consent did not count'); end if;

  -- 5. Not for an U12 team, nor a team that is not academy (BR184).
  begin
    perform app_grant_check_in_consent(club, twelve);
    failures := array_append(failures, 'the check-in reached an U12 player');
  exception when check_violation then null;
  end;
  begin
    perform app_grant_check_in_consent(club, fourteen);
    failures := array_append(failures, 'the check-in reached a team that is not academy');
  exception when check_violation then null;
  end;

  -- 6. The guardian reads, and does not write.
  begin
    insert into wellbeing_entry (club_id, person_id, entered_on, motivation, mood, sleep_quality, stress, soreness)
    values (club, player, current_date, 5, 5, 5, 5, 5);
    failures := array_append(failures, 'a guardian wrote their child''s check-in');
  exception when insufficient_privilege then null;
  end;

  -- 7. The player writes their own, inside its window (BR186).
  perform set_config('request.jwt.claim.sub', player_u::text, true);
  insert into wellbeing_entry (club_id, person_id, entered_on, motivation, mood, sleep_quality, stress, soreness)
  values (club, player, current_date, 7, 6, 5, 3, 9);
  update wellbeing_entry set soreness = 8 where person_id = player and entered_on = current_date;
  insert into rpe_entry (club_id, person_id, done_on, kind, rpe) values (club, player, current_date, 'team_training', 7);
  insert into rpe_entry (club_id, person_id, done_on, kind, rpe) values (club, player, current_date - 5, 'gym', 4);
  begin
    insert into wellbeing_entry (club_id, person_id, entered_on, motivation, mood, sleep_quality, stress, soreness)
    values (club, player, current_date - 3, 7, 6, 5, 3, 8);
    failures := array_append(failures, 'a check-in was written for an earlier day');
  exception when check_violation then null;
  end;
  begin
    insert into rpe_entry (club_id, person_id, done_on, kind, rpe) values (club, player, current_date - 9, 'gym', 4);
    failures := array_append(failures, 'a session nine days old was entered');
  exception when check_violation then null;
  end;
  select count(*) into n from wellbeing_entry where person_id = player and soreness = 8;
  if n <> 1 then failures := array_append(failures, 'the player could not write and change their check-in'); end if;

  -- 8. An adult consents for themselves, and checks in.
  perform set_config('request.jwt.claim.sub', adult_u::text, true);
  perform app_grant_check_in_consent(club, adult_p);
  insert into rpe_entry (club_id, person_id, done_on, kind, rpe) values (club, adult_p, current_date, 'other_sport', 3);

  -- 9. The guardian reads their child's; the coach and the Technical Lead read.
  perform set_config('request.jwt.claim.sub', guardian::text, true);
  select count(*) into n from wellbeing_entry where person_id = player;
  if n <> 1 then failures := array_append(failures, 'the guardian could not read their child''s check-in'); end if;
  perform set_config('request.jwt.claim.sub', coach::text, true);
  select count(*) into n from rpe_entry where person_id = player;
  if n <> 2 then failures := array_append(failures, 'the player''s coach could not read their sessions'); end if;
  select count(*) into n from app_check_in_players(club);
  if n <> 1 then failures := array_append(failures, 'the coach was given players outside their team'); end if;
  perform set_config('request.jwt.claim.sub', td::text, true);
  select count(*) into n from rpe_entry where club_id = club;
  if n <> 3 then failures := array_append(failures, 'the Technical Lead could not read every session'); end if;

  -- 10. The manager, the committee, the admin and another team's coach read nothing.
  foreach who in array array[manager, committee, admin, othercoach, rival_td] loop
    perform set_config('request.jwt.claim.sub', who::text, true);
    select count(*) into n from wellbeing_entry where person_id = player;
    if n <> 0 then failures := array_append(failures, 'a check-in was read by ' || who::text); end if;
  end loop;

  -- 11. Withdrawing stops new entries; the player can still remove theirs.
  perform set_config('request.jwt.claim.sub', guardian::text, true);
  perform app_withdraw_check_in_consent(club, player);
  perform set_config('request.jwt.claim.sub', player_u::text, true);
  begin
    insert into rpe_entry (club_id, person_id, done_on, kind, rpe) values (club, player, current_date, 'gym', 5);
    failures := array_append(failures, 'a session was entered after consent was withdrawn');
  exception when insufficient_privilege then null;
  end;
  delete from rpe_entry where person_id = player and kind = 'gym';
  select count(*) into n from rpe_entry where person_id = player;
  if n <> 1 then failures := array_append(failures, 'the player could not remove their own session'); end if;

  -- 12. Neither a signed-in non-lead nor a caller without sign-in flips the
  --     academy switch (0097): the trigger lets a write without auth.uid()
  --     through, so the function decides for itself.
  perform set_config('request.jwt.claim.sub', admin::text, true);
  begin
    perform app_set_team_academy(u15, false);
    failures := array_append(failures, 'the admin unmarked an academy team through the switch');
  exception when insufficient_privilege then null;
  end;
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform app_set_team_academy(u15, false);
    failures := array_append(failures, 'a caller without sign-in unmarked an academy team');
  exception when insufficient_privilege then null;
  end;
  perform set_config('role', 'postgres', true);
  select count(*) into n from team where id = u15 and academy;
  if n <> 1 then failures := array_append(failures, 'the academy switch was flipped without a Technical Lead'); end if;

  if array_length(failures, 1) > 0 then
    raise exception E'The daily check-in FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'The daily check-in OK — 12 scenarios; a Technical Lead marks academy teams, nothing is written without the right person''s consent, the player writes their own, few read it, and nothing crosses a club';
end
$$;
