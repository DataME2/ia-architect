-- 0066: only the player's coach, or an officer, records an appearance, and
-- every record says who and when (BR158, BR101).
--
--   * the player's coach and assistant coach, and the coordinator, record,
--   * a coach of another team (holding the club's coach role), the
--     committee, the digital technology manager and a withdrawn coach are
--     refused (BR122: a narrowing is proved by a test that fails when it is
--     widened),
--   * the committee still reads every appearance, and its update touches
--     nothing,
--   * the database names the recorder even when the caller names somebody
--     else, an update never rewrites it, and every record, change and
--     removal reaches the audit log with its actor.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990066-0000-0000-0000-000000000001', 'Appearance Rights FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e6666000-0000-0000-0000-000000000001', 'admin@rights.test'),
  ('e6666000-0000-0000-0000-000000000003', 'coordinator@rights.test'),
  ('e6666000-0000-0000-0000-000000000004', 'committee@rights.test'),
  ('e6666000-0000-0000-0000-000000000005', 'dtm@rights.test'),
  ('e6666000-0000-0000-0000-000000000006', 'coach@rights.test'),
  ('e6666000-0000-0000-0000-000000000007', 'assistant@rights.test'),
  ('e6666000-0000-0000-0000-000000000008', 'othercoach@rights.test'),
  ('e6666000-0000-0000-0000-000000000009', 'withdrawn@rights.test');

insert into club_membership (club_id, user_id, role) values
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000001', 'admin'),
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000003', 'coordinator'),
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000004', 'committee'),
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000005', 'digital_technology_manager'),
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000006', 'coach'),
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000007', 'coach'),
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000008', 'coach'),
  -- Stepped down from the team sheet but still holds the club's coach role, so
  -- the role alone is proved not to be enough (BR158).
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000009', 'coach');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b6666000-0000-0000-0000-000000000001', '99990066-0000-0000-0000-000000000001', 'Sebastian', 'Player', current_date - interval '12 years'),
  ('b6666000-0000-0000-0000-000000000006', '99990066-0000-0000-0000-000000000001', 'Carlos', 'Coach', '1980-01-01'),
  ('b6666000-0000-0000-0000-000000000007', '99990066-0000-0000-0000-000000000001', 'Ana', 'Assistant', '1985-01-01'),
  ('b6666000-0000-0000-0000-000000000008', '99990066-0000-0000-0000-000000000001', 'Omar', 'Othercoach', '1979-01-01'),
  ('b6666000-0000-0000-0000-000000000009', '99990066-0000-0000-0000-000000000001', 'Wendy', 'Withdrawn', '1983-01-01');

insert into account_person (club_id, user_id, person_id) values
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000006', 'b6666000-0000-0000-0000-000000000006'),
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000007', 'b6666000-0000-0000-0000-000000000007'),
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000008', 'b6666000-0000-0000-0000-000000000008'),
  ('99990066-0000-0000-0000-000000000001', 'e6666000-0000-0000-0000-000000000009', 'b6666000-0000-0000-0000-000000000009');

-- No card, no start (BR19): every adult on a team sheet holds a clearance.
insert into clearance (club_id, person_id, kind, identifier, expires_on, verified_by_user_id, verified_at)
select '99990066-0000-0000-0000-000000000001', p, 'WWCC', 'BC-66-' || right(p::text, 4), date '2033-01-01',
       'e6666000-0000-0000-0000-000000000001', now()
  from unnest(array[
    'b6666000-0000-0000-0000-000000000006',
    'b6666000-0000-0000-0000-000000000007',
    'b6666000-0000-0000-0000-000000000008',
    'b6666000-0000-0000-0000-000000000009']::uuid[]) as p;

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a6666000-0000-0000-0000-000000000001', '99990066-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31');

insert into registration (id, club_id, person_id, season_id) values
  ('c6666000-0000-0000-0000-000000000001', '99990066-0000-0000-0000-000000000001', 'b6666000-0000-0000-0000-000000000001', 'a6666000-0000-0000-0000-000000000001');

insert into team (id, club_id, season_id, name, age_group) values
  ('7e666000-0000-0000-0000-000000000001', '99990066-0000-0000-0000-000000000001', 'a6666000-0000-0000-0000-000000000001', 'Under 12 Gold', 'U12'),
  ('7e666000-0000-0000-0000-000000000002', '99990066-0000-0000-0000-000000000001', 'a6666000-0000-0000-0000-000000000001', 'Under 14 Blue', 'U14');

insert into team_member (club_id, team_id, person_id, role) values
  ('99990066-0000-0000-0000-000000000001', '7e666000-0000-0000-0000-000000000001', 'b6666000-0000-0000-0000-000000000001', 'player'),
  ('99990066-0000-0000-0000-000000000001', '7e666000-0000-0000-0000-000000000001', 'b6666000-0000-0000-0000-000000000006', 'coach'),
  ('99990066-0000-0000-0000-000000000001', '7e666000-0000-0000-0000-000000000001', 'b6666000-0000-0000-0000-000000000007', 'assistant-coach'),
  ('99990066-0000-0000-0000-000000000001', '7e666000-0000-0000-0000-000000000002', 'b6666000-0000-0000-0000-000000000008', 'coach');

insert into team_member (club_id, team_id, person_id, role, withdrawn_at, withdrawn_reason) values
  ('99990066-0000-0000-0000-000000000001', '7e666000-0000-0000-0000-000000000001', 'b6666000-0000-0000-0000-000000000009', 'coach', now(), 'stepped down');

insert into fixture (id, club_id, season_id, played_on, opponent, home_away, status)
select ('f6666000-0000-0000-0000-00000000000' || n)::uuid, '99990066-0000-0000-0000-000000000001',
       'a6666000-0000-0000-0000-000000000001', date '2026-05-01' + n, 'Rival ' || n, 'home', 'played'
  from generate_series(1, 4) as n;

commit;

do $$
declare
  the_club    uuid := '99990066-0000-0000-0000-000000000001';
  the_player  uuid := 'b6666000-0000-0000-0000-000000000001';
  the_reg     uuid := 'c6666000-0000-0000-0000-000000000001';
  admin       uuid := 'e6666000-0000-0000-0000-000000000001';
  coordinator uuid := 'e6666000-0000-0000-0000-000000000003';
  committee   uuid := 'e6666000-0000-0000-0000-000000000004';
  dtm         uuid := 'e6666000-0000-0000-0000-000000000005';
  coach       uuid := 'e6666000-0000-0000-0000-000000000006';
  assistant   uuid := 'e6666000-0000-0000-0000-000000000007';
  othercoach  uuid := 'e6666000-0000-0000-0000-000000000008';
  withdrawn   uuid := 'e6666000-0000-0000-0000-000000000009';
  f1 uuid := 'f6666000-0000-0000-0000-000000000001';
  f2 uuid := 'f6666000-0000-0000-0000-000000000002';
  f3 uuid := 'f6666000-0000-0000-0000-000000000003';
  f4 uuid := 'f6666000-0000-0000-0000-000000000004';
  n        integer;
  who      uuid;
  outsider record;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The player's coach records, naming somebody else as the recorder.
  --    The database names the coach instead (BR101).
  perform set_config('request.jwt.claim.sub', coach::text, true);
  insert into appearance (club_id, fixture_id, person_id, registration_id, minutes_played, goals, recorded_by)
  values (the_club, f1, the_player, the_reg, 60, 1, admin);
  select recorded_by into who from appearance where fixture_id = f1;
  if who is distinct from coach then
    failures := array_append(failures, 'recorded_by was taken from the caller, not set by the database');
  end if;

  -- 2. The assistant coach records.
  perform set_config('request.jwt.claim.sub', assistant::text, true);
  begin
    insert into appearance (club_id, fixture_id, person_id, registration_id) values (the_club, f2, the_player, the_reg);
  exception when others then
    failures := array_append(failures, 'the player''s assistant coach was refused: ' || sqlerrm);
  end;

  -- 3. Refused: another team's coach, the committee, the digital technology
  --    manager, and a coach who has stepped down.
  for outsider in
    select * from (values (othercoach, 'a coach of another team'), (committee, 'the committee'),
                          (dtm, 'the digital technology manager'), (withdrawn, 'a withdrawn coach')) as t(uid, label)
  loop
    perform set_config('request.jwt.claim.sub', outsider.uid::text, true);
    begin
      insert into appearance (club_id, fixture_id, person_id, registration_id) values (the_club, f3, the_player, the_reg);
      failures := array_append(failures, outsider.label || ' recorded an appearance');
    exception when insufficient_privilege then null;
    end;
  end loop;

  -- 4. The coordinator records for any player.
  perform set_config('request.jwt.claim.sub', coordinator::text, true);
  begin
    insert into appearance (club_id, fixture_id, person_id, registration_id) values (the_club, f3, the_player, the_reg);
  exception when others then
    failures := array_append(failures, 'the coordinator was refused: ' || sqlerrm);
  end;

  -- 5. The committee reads every appearance, and its update touches nothing.
  perform set_config('request.jwt.claim.sub', committee::text, true);
  select count(*) into n from appearance where registration_id = the_reg;
  if n <> 3 then
    failures := array_append(failures, format('the committee read %s appearances, expected 3', n));
  end if;
  update appearance set goals = 9 where registration_id = the_reg;
  get diagnostics n = row_count;
  if n <> 0 then
    failures := array_append(failures, 'the committee changed an appearance');
  end if;

  -- 6. An admin corrects the coach's figures. The recorder stays the coach.
  perform set_config('request.jwt.claim.sub', admin::text, true);
  update appearance set goals = 2 where fixture_id = f1;
  select recorded_by into who from appearance where fixture_id = f1;
  if who is distinct from coach then
    failures := array_append(failures, 'an update rewrote who recorded the appearance');
  end if;

  -- 7. The admin removes the assistant's entry.
  delete from appearance where fixture_id = f2;

  -- 8. The audit log holds each act, with its actor (read as the owner,
  --    since only an admin reads audit_event and the check is about writing).
  perform set_config('role', 'postgres', true);
  if not exists (select 1 from audit_event where action = 'appearance.recorded' and actor_user_id = coach and club_id = the_club) then
    failures := array_append(failures, 'the coach''s record did not reach the audit log');
  end if;
  if not exists (select 1 from audit_event where action = 'appearance.changed' and actor_user_id = admin
                   and (detail -> 'before' ->> 'goals') = '1' and (detail -> 'after' ->> 'goals') = '2') then
    failures := array_append(failures, 'the admin''s change was not logged with before and after');
  end if;
  if not exists (select 1 from audit_event where action = 'appearance.removed' and actor_user_id = admin and club_id = the_club) then
    failures := array_append(failures, 'the removal did not reach the audit log');
  end if;
  select count(*) into n from audit_event where club_id = the_club and action like 'appearance.%';
  if n <> 5 then
    failures := array_append(failures, format('%s appearance audit events, expected 5 (3 recorded, 1 changed, 1 removed)', n));
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Who records an appearance FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Who records an appearance OK — 8 scenarios';
end
$$;
