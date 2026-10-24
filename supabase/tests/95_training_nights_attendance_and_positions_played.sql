-- Training nights, attendance and positions played (0095, scope 112).
--
--   * a Technical Lead adds a training night and a game day; a committee
--     member adds neither,
--   * an adult player answers a night, and not available needs a reason (BR62),
--   * the team's manager marks attendance; another team's coach cannot, and
--     nobody is marked who is not a player on the team,
--   * the manager records an appearance and its positions (BR158 with #112),
--     and positions never add up to more than the appearance,
--   * the player reads their own night, mark, appearance and positions,
--   * a Technical Lead reads the night's answers (BR62),
--   * another club reads nothing of any of it.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d9500000-0000-0000-0000-000000000001', 'td@academy.test'),
  ('d9500000-0000-0000-0000-000000000002', 'committee@academy.test'),
  ('d9500000-0000-0000-0000-000000000003', 'manager@academy.test'),
  ('d9500000-0000-0000-0000-000000000004', 'othercoach@academy.test'),
  ('d9500000-0000-0000-0000-000000000005', 'player@academy.test'),
  ('d9500000-0000-0000-0000-0000000000ee', 'td@rival-academy.test');

insert into club (id, name, jurisdiction) values
  ('c9500000-0000-0000-0000-000000000001', 'Academy FC', 'QLD'),
  ('c9500000-0000-0000-0000-000000000002', 'Rival Academy FC', 'QLD');

insert into club_membership (club_id, user_id, role) values
  ('c9500000-0000-0000-0000-000000000001', 'd9500000-0000-0000-0000-000000000001', 'head_of_performance'),
  ('c9500000-0000-0000-0000-000000000001', 'd9500000-0000-0000-0000-000000000002', 'committee'),
  ('c9500000-0000-0000-0000-000000000001', 'd9500000-0000-0000-0000-000000000003', 'coach'),
  ('c9500000-0000-0000-0000-000000000001', 'd9500000-0000-0000-0000-000000000004', 'coach'),
  ('c9500000-0000-0000-0000-000000000002', 'd9500000-0000-0000-0000-0000000000ee', 'technical_director');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a9500000-0000-0000-0000-000000000001', 'c9500000-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b9500000-0000-0000-0000-000000000001', 'c9500000-0000-0000-0000-000000000001', 'Jordan', 'Winger', '2004-02-02'),
  ('b9500000-0000-0000-0000-000000000002', 'c9500000-0000-0000-0000-000000000001', 'Morgan', 'Manager', '1980-01-01'),
  ('b9500000-0000-0000-0000-000000000003', 'c9500000-0000-0000-0000-000000000001', 'Casey', 'Othercoach', '1985-01-01');

insert into account_person (club_id, user_id, person_id) values
  ('c9500000-0000-0000-0000-000000000001', 'd9500000-0000-0000-0000-000000000005', 'b9500000-0000-0000-0000-000000000001'),
  ('c9500000-0000-0000-0000-000000000001', 'd9500000-0000-0000-0000-000000000003', 'b9500000-0000-0000-0000-000000000002'),
  ('c9500000-0000-0000-0000-000000000001', 'd9500000-0000-0000-0000-000000000004', 'b9500000-0000-0000-0000-000000000003');

insert into team (id, club_id, season_id, name, age_group) values
  ('99500000-0000-0000-0000-000000000001', 'c9500000-0000-0000-0000-000000000001', 'a9500000-0000-0000-0000-000000000001', 'Seniors', 'Senior Men'),
  ('99500000-0000-0000-0000-000000000002', 'c9500000-0000-0000-0000-000000000001', 'a9500000-0000-0000-0000-000000000001', 'U15 Boys', 'U15');

-- No card, no start (BR19): every adult on a team sheet holds a clearance.
insert into clearance (club_id, person_id, kind, identifier, expires_on, verified_by_user_id, verified_at)
select 'c9500000-0000-0000-0000-000000000001', p, 'WWCC', 'BC-95-' || right(p::text, 4), date '2033-01-01',
       'd9500000-0000-0000-0000-000000000001', now()
  from unnest(array[
    'b9500000-0000-0000-0000-000000000002',
    'b9500000-0000-0000-0000-000000000003']::uuid[]) as p;

insert into team_member (club_id, team_id, person_id, role) values
  ('c9500000-0000-0000-0000-000000000001', '99500000-0000-0000-0000-000000000001', 'b9500000-0000-0000-0000-000000000001', 'player'),
  ('c9500000-0000-0000-0000-000000000001', '99500000-0000-0000-0000-000000000001', 'b9500000-0000-0000-0000-000000000002', 'manager'),
  ('c9500000-0000-0000-0000-000000000001', '99500000-0000-0000-0000-000000000002', 'b9500000-0000-0000-0000-000000000003', 'coach');

insert into registration (id, club_id, person_id, season_id) values
  ('e9500000-0000-0000-0000-000000000001', 'c9500000-0000-0000-0000-000000000001',
   'b9500000-0000-0000-0000-000000000001', 'a9500000-0000-0000-0000-000000000001');

insert into fixture (id, club_id, season_id, team_id, played_on, opponent, home_away, status) values
  ('f9500000-0000-0000-0000-000000000001', 'c9500000-0000-0000-0000-000000000001',
   'a9500000-0000-0000-0000-000000000001', '99500000-0000-0000-0000-000000000001',
   '2026-05-02', 'Rival United', 'home', 'played');

commit;

do $$
declare
  club       uuid := 'c9500000-0000-0000-0000-000000000001';
  season     uuid := 'a9500000-0000-0000-0000-000000000001';
  seniors    uuid := '99500000-0000-0000-0000-000000000001';
  night      uuid := '79500000-0000-0000-0000-000000000001';
  fix        uuid := 'f9500000-0000-0000-0000-000000000001';
  reg        uuid := 'e9500000-0000-0000-0000-000000000001';
  player     uuid := 'b9500000-0000-0000-0000-000000000001';
  manager_p  uuid := 'b9500000-0000-0000-0000-000000000002';
  lead       uuid := 'd9500000-0000-0000-0000-000000000001';
  committee  uuid := 'd9500000-0000-0000-0000-000000000002';
  manager    uuid := 'd9500000-0000-0000-0000-000000000003';
  othercoach uuid := 'd9500000-0000-0000-0000-000000000004';
  player_u   uuid := 'd9500000-0000-0000-0000-000000000005';
  rival_td   uuid := 'd9500000-0000-0000-0000-0000000000ee';
  app        uuid;
  n          integer;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. A Technical Lead (here the Head of Performance, #104) adds a night and a game day.
  perform set_config('request.jwt.claim.sub', lead::text, true);
  insert into training_session (id, club_id, team_id, held_on, starts_at, ends_at, venue)
  values (night, club, seniors, '2026-05-05', '17:30', '19:00', 'Main pitch');
  insert into fixture (club_id, season_id, team_id, played_on, opponent, home_away, status)
  values (club, season, seniors, '2026-05-09', 'Eastern Lions', 'away', 'scheduled');
  select count(*) into n from training_session where club_id = club;
  if n <> 1 then failures := array_append(failures, 'a Technical Lead could not add a training night'); end if;
  select count(*) into n from fixture where club_id = club and opponent = 'Eastern Lions';
  if n <> 1 then failures := array_append(failures, 'a Technical Lead could not add a game day'); end if;

  -- 2. A committee member adds no night.
  perform set_config('request.jwt.claim.sub', committee::text, true);
  begin
    insert into training_session (club_id, team_id, held_on, starts_at) values (club, seniors, '2026-05-07', '17:30');
    failures := array_append(failures, 'a committee member added a training night');
  exception when insufficient_privilege then null;
  end;

  -- 3. The adult player answers the night; not available needs a reason (BR62).
  perform set_config('request.jwt.claim.sub', player_u::text, true);
  begin
    insert into participation_response (club_id, training_session_id, person_id, status, responded_by_person_id)
    values (club, night, player, 'not_available', player);
    failures := array_append(failures, 'not available was accepted without a reason');
  exception when check_violation then null;
  end;
  insert into participation_response (club_id, training_session_id, person_id, status, reason, responded_by_person_id)
  values (club, night, player, 'not_available', 'School camp', player);
  select count(*) into n from participation_response where training_session_id = night;
  if n <> 1 then failures := array_append(failures, 'the player could not answer the night'); end if;

  -- 4. The team's manager marks attendance.
  perform set_config('request.jwt.claim.sub', manager::text, true);
  insert into training_attendance (club_id, training_session_id, person_id, mark, reason)
  values (club, night, player, 'absent', 'School camp');
  select count(*) into n from training_attendance where training_session_id = night and marked_by = manager;
  if n <> 1 then failures := array_append(failures, 'the manager could not mark attendance, or the mark did not name them'); end if;

  -- 5. Nobody is marked who is not a player on the team.
  begin
    insert into training_attendance (club_id, training_session_id, person_id, mark) values (club, night, manager_p, 'present');
    failures := array_append(failures, 'a non-player was marked');
  exception when check_violation then null;
  end;

  -- 6. The manager records the appearance and its positions (BR158 with #112).
  insert into appearance (club_id, fixture_id, person_id, registration_id, minutes_played, started)
  values (club, fix, player, reg, 60, true)
  returning id into app;
  insert into appearance_position (club_id, appearance_id, position, minutes) values
    (club, app, 'midfielder', 40),
    (club, app, 'forward', 15);
  select count(*) into n from appearance_position where appearance_id = app;
  if n <> 2 then failures := array_append(failures, 'the manager could not record positions'); end if;

  -- 7. Positions never add up to more than the appearance.
  begin
    insert into appearance_position (club_id, appearance_id, position, minutes) values (club, app, 'goalkeeper', 10);
    failures := array_append(failures, 'positions were accepted beyond the appearance''s minutes');
  exception when check_violation then null;
  end;

  -- 8. Another team's coach marks nothing and records no positions.
  perform set_config('request.jwt.claim.sub', othercoach::text, true);
  begin
    update training_attendance set mark = 'present' where training_session_id = night;
    select count(*) into n from training_attendance where training_session_id = night and mark = 'present';
    if n <> 0 then failures := array_append(failures, 'another team''s coach changed a mark'); end if;
  end;
  begin
    -- Five minutes still fit, so only the policy can refuse it.
    insert into appearance_position (club_id, appearance_id, position, minutes) values (club, app, 'goalkeeper', 5);
    failures := array_append(failures, 'another team''s coach recorded a position');
  exception when insufficient_privilege then null;
  end;

  -- 9. The player reads their own night, mark, appearance and positions.
  perform set_config('request.jwt.claim.sub', player_u::text, true);
  select count(*) into n from training_session where id = night;
  if n <> 1 then failures := array_append(failures, 'the player could not read their training night'); end if;
  select count(*) into n from training_attendance where person_id = player;
  if n <> 1 then failures := array_append(failures, 'the player could not read their own mark'); end if;
  select count(*) into n from appearance where person_id = player;
  if n <> 1 then failures := array_append(failures, 'the player could not read their own appearance'); end if;
  select count(*) into n from appearance_position where appearance_id = app;
  if n <> 2 then failures := array_append(failures, 'the player could not read their own positions'); end if;

  -- 10. A Technical Lead reads the night's answer and its reason (BR62).
  perform set_config('request.jwt.claim.sub', lead::text, true);
  select count(*) into n from participation_response where training_session_id = night and reason = 'School camp';
  if n <> 1 then failures := array_append(failures, 'a Technical Lead could not read the night''s answer'); end if;

  -- 11. Another club reads nothing and adds nothing.
  perform set_config('request.jwt.claim.sub', rival_td::text, true);
  select count(*) into n from training_session where club_id = club;
  if n <> 0 then failures := array_append(failures, 'another club read a training night'); end if;
  select count(*) into n from training_attendance where club_id = club;
  if n <> 0 then failures := array_append(failures, 'another club read attendance'); end if;
  select count(*) into n from appearance_position where club_id = club;
  if n <> 0 then failures := array_append(failures, 'another club read positions'); end if;
  begin
    insert into training_session (club_id, team_id, held_on, starts_at) values (club, seniors, '2026-05-12', '17:30');
    failures := array_append(failures, 'another club added a training night');
  exception when insufficient_privilege then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'Training nights, attendance and positions FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Training nights, attendance and positions OK — 11 scenarios; Technical Leads add nights and game days, the team''s staff mark them, positions fit the minutes, the family reads its own, and nothing crosses a club';
end
$$;
