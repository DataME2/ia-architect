-- A team plays in a competition (0094, BR179).
--
--   * a registrar enters a team in a competition, and the log says who and when,
--   * a program coordinator enters another and withdraws the first — each a line in the log,
--   * a coach reads where the team plays but not the log, and changes nothing,
--   * a log line cannot be changed or removed,
--   * an id of the wrong shape is refused,
--   * another club reads nothing and cannot enter this club's team.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d9400000-0000-0000-0000-000000000001', 'registrar@competition.test'),
  ('d9400000-0000-0000-0000-000000000002', 'program@competition.test'),
  ('d9400000-0000-0000-0000-000000000003', 'coach@competition.test'),
  ('d9400000-0000-0000-0000-0000000000ee', 'registrar@rival-competition.test');

insert into club (id, name, jurisdiction) values
  ('c9400000-0000-0000-0000-000000000001', 'Pyramid FC', 'QLD'),
  ('c9400000-0000-0000-0000-000000000002', 'Rival Pyramid FC', 'QLD');

insert into club_membership (club_id, user_id, role) values
  ('c9400000-0000-0000-0000-000000000001', 'd9400000-0000-0000-0000-000000000001', 'registrar'),
  ('c9400000-0000-0000-0000-000000000001', 'd9400000-0000-0000-0000-000000000002', 'program_coordinator'),
  ('c9400000-0000-0000-0000-000000000001', 'd9400000-0000-0000-0000-000000000003', 'coach'),
  ('c9400000-0000-0000-0000-000000000002', 'd9400000-0000-0000-0000-0000000000ee', 'registrar');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a9400000-0000-0000-0000-000000000001', 'c9400000-0000-0000-0000-000000000001', '2027', '2027-01-01', '2027-12-31'),
  ('a9400000-0000-0000-0000-000000000002', 'c9400000-0000-0000-0000-000000000002', '2027', '2027-01-01', '2027-12-31');

insert into team (id, club_id, season_id, name, age_group) values
  ('e9400000-0000-0000-0000-000000000001', 'c9400000-0000-0000-0000-000000000001',
   'a9400000-0000-0000-0000-000000000001', 'Pyramid Men', 'Senior'),
  ('e9400000-0000-0000-0000-000000000002', 'c9400000-0000-0000-0000-000000000002',
   'a9400000-0000-0000-0000-000000000002', 'Rival Men', 'Senior');

commit;

do $$
declare
  club      uuid := 'c9400000-0000-0000-0000-000000000001';
  rival     uuid := 'c9400000-0000-0000-0000-000000000002';
  team_id_  uuid := 'e9400000-0000-0000-0000-000000000001';
  registrar uuid := 'd9400000-0000-0000-0000-000000000001';
  program   uuid := 'd9400000-0000-0000-0000-000000000002';
  coach     uuid := 'd9400000-0000-0000-0000-000000000003';
  rival_reg uuid := 'd9400000-0000-0000-0000-0000000000ee';
  cal       text := 'fq-2027-seq-advanced-metro';
  n         integer;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The registrar enters the team in QPL 1 Men; the log names them.
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  insert into team_competition (club_id, team_id, calendar_id, competition_ref)
  values (club, team_id_, cal, 'qpl-1-men');
  select count(*) into n from team_competition where team_id = team_id_ and entered_by = registrar;
  if n <> 1 then failures := array_append(failures, 'the registrar could not enter the team, or was not recorded'); end if;
  select count(*) into n from team_competition_change
   where team_id = team_id_ and action = 'entered' and changed_by = registrar and team_name = 'Pyramid Men';
  if n <> 1 then failures := array_append(failures, 'the entry was not logged with who made it'); end if;

  -- 2. The program coordinator moves it: enters the Queensland Cup, withdraws QPL 1.
  perform set_config('request.jwt.claim.sub', program::text, true);
  insert into team_competition (club_id, team_id, calendar_id, competition_ref)
  values (club, team_id_, cal, 'queensland-cup-men');
  delete from team_competition where team_id = team_id_ and competition_ref = 'qpl-1-men';
  select count(*) into n from team_competition where team_id = team_id_;
  if n <> 1 then failures := array_append(failures, format('expected 1 competition after the move, found %s', n)); end if;
  select count(*) into n from team_competition_change where team_id = team_id_ and changed_by = program;
  if n <> 2 then failures := array_append(failures, 'the program coordinator''s two changes were not both logged'); end if;
  select count(*) into n from team_competition_change where team_id = team_id_ and action = 'withdrawn' and competition_ref = 'qpl-1-men';
  if n <> 1 then failures := array_append(failures, 'the withdrawal was not logged'); end if;

  -- The history names who made each change.
  select count(*) into n from app_team_competition_history(club) where changed_by_name = 'program@competition.test';
  if n <> 2 then failures := array_append(failures, 'the history did not name the program coordinator'); end if;

  -- 3. The same competition twice is refused.
  begin
    insert into team_competition (club_id, team_id, calendar_id, competition_ref)
    values (club, team_id_, cal, 'queensland-cup-men');
    failures := array_append(failures, 'a team was entered in the same competition twice');
  exception when unique_violation then null;
  end;

  -- 4. An id of the wrong shape is refused.
  begin
    insert into team_competition (club_id, team_id, calendar_id, competition_ref)
    values (club, team_id_, cal, 'QPL 1 Men; drop table team');
    failures := array_append(failures, 'a malformed competition id was accepted');
  exception when check_violation then null;
  end;

  -- 5. The log cannot be rewritten, even by someone who reads it.
  update team_competition_change set changed_by = null where club_id = club;
  delete from team_competition_change where club_id = club;
  select count(*) into n from team_competition_change where club_id = club and changed_by is not null;
  if n <> 3 then failures := array_append(failures, format('the log was changed or shortened (%s lines)', n)); end if;

  -- 6. A coach reads where the team plays, not the log, and changes nothing.
  perform set_config('request.jwt.claim.sub', coach::text, true);
  select count(*) into n from team_competition where club_id = club;
  if n <> 1 then failures := array_append(failures, 'a coach could not see where the team plays'); end if;
  select count(*) into n from team_competition_change where club_id = club;
  if n <> 0 then failures := array_append(failures, 'a coach read the change log'); end if;
  select count(*) into n from app_team_competition_history(club);
  if n <> 0 then failures := array_append(failures, 'a coach read the history'); end if;
  begin
    insert into team_competition (club_id, team_id, calendar_id, competition_ref)
    values (club, team_id_, cal, 'npl-men');
    failures := array_append(failures, 'a coach entered the team in a competition');
  exception when insufficient_privilege then null;
  end;
  delete from team_competition where club_id = club;
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  select count(*) into n from team_competition where club_id = club;
  if n <> 1 then failures := array_append(failures, 'a coach withdrew the team'); end if;

  -- 7. Another club reads nothing, and cannot enter this club's team.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);
  select count(*) into n from team_competition where club_id = club;
  if n <> 0 then failures := array_append(failures, 'another club read where this club''s team plays'); end if;
  select count(*) into n from team_competition_change where club_id = club;
  if n <> 0 then failures := array_append(failures, 'another club read this club''s change log'); end if;
  select count(*) into n from app_team_competition_history(club);
  if n <> 0 then failures := array_append(failures, 'another club read this club''s history'); end if;
  begin
    insert into team_competition (club_id, team_id, calendar_id, competition_ref)
    values (rival, team_id_, cal, 'npl-men');
    failures := array_append(failures, 'another club entered this club''s team under its own name');
  exception when insufficient_privilege then null;
  end;
  begin
    insert into team_competition (club_id, team_id, calendar_id, competition_ref)
    values (club, team_id_, cal, 'npl-men');
    failures := array_append(failures, 'another club entered this club''s team');
  exception when insufficient_privilege then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'A team plays in a competition FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A team plays in a competition OK — 7 scenarios; four roles enter and withdraw, every change is logged with who and when, the log is append-only, and nothing crosses a club';
end
$$;
