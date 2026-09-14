-- Is the one exception to P5 actually as narrow as it claims?
--
-- Everything else in this suite proves data stays *in*. This proves the one
-- place it deliberately goes out, and that nothing else follows it.
--
--   * an unpublished event is invisible to anon and to other clubs,
--   * publishing makes the event, its entries and its draw readable by anon
--     — and **nothing else becomes readable with them**,
--   * unpublishing hides it again (BR140),
--   * anon can read and **cannot write** any of it,
--   * BR29: only the recorded Events Coordinator changes the conditions,
--     whatever else they hold at the club,
--   * a team cannot play itself, and half a score is refused,
--   * and the tables carry **no person_id column at all** (BR139) — asserted
--     against the catalogue, because that is the claim the whole exception
--     rests on.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d37a0000-0000-0000-0000-000000000001', 'carnival.coordinator@northstar.test'),
  ('d37a0000-0000-0000-0000-000000000002', 'carnival.other@northstar.test');

insert into club_membership (club_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'd37a0000-0000-0000-0000-000000000001', 'coordinator'),
  ('11111111-1111-1111-1111-111111111111', 'd37a0000-0000-0000-0000-000000000002', 'admin');

insert into carnival_event (id, club_id, name, starts_on, ends_on, venue, coordinator_user_id, conditions)
values ('44445555-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'Girls United Carnival', '2026-07-04', '2026-07-05', 'North Star Park',
        'd37a0000-0000-0000-0000-000000000001', 'Three points for a win.');

insert into carnival_entry (id, club_id, event_id, entrant_name, team_name) values
  ('55555555-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '44445555-0000-0000-0000-000000000001', 'North Star', 'U12'),
  ('55555555-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   '44445555-0000-0000-0000-000000000001', 'Coast', 'U12');

insert into carnival_fixture (id, club_id, event_id, home_entry_id, away_entry_id, played_on, kick_off)
values ('66665555-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        '44445555-0000-0000-0000-000000000001',
        '55555555-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002',
        '2026-07-04', '10:00');

commit;

do $$
declare
  v_event    uuid := '44445555-0000-0000-0000-000000000001';
  v_fixture  uuid := '66665555-0000-0000-0000-000000000001';
  home       uuid := '55555555-0000-0000-0000-000000000001';
  away       uuid := '55555555-0000-0000-0000-000000000002';
  coord      uuid := 'd37a0000-0000-0000-0000-000000000001';
  other      uuid := 'd37a0000-0000-0000-0000-000000000002';
  outsider   uuid := 'd2222222-2222-2222-2222-222222222222';
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  n          integer;
  failures   text[] := '{}';
begin
  -- 1. **BR139 — there is no column to leak.** Asserted against the
  --    catalogue rather than trusted, because the whole exception rests on
  --    it: a policy that forgets to exclude a name is a bug; a table with
  --    no name in it cannot have that bug.
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public'
     and table_name in ('carnival_event', 'carnival_entry', 'carnival_fixture')
     and (column_name = 'person_id' or column_name like '%person%');
  if n <> 0 then
    failures := array_append(failures,
      'a carnival table grew a person column — P6''s exception then publishes personal data');
  end if;

  -- 2. **Unpublished is invisible to anon.**
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from carnival_event where id = v_event;
  if n <> 0 then failures := array_append(failures, 'an unpublished carnival was readable by anon'); end if;
  select count(*) into n from carnival_fixture;
  if n <> 0 then failures := array_append(failures, 'an unpublished draw was readable by anon'); end if;

  -- 3. **And invisible to another club** (#81): before publication it is
  --    the host club's data and nobody else's, so P5 holds right up to the
  --    moment P6 is deliberately invoked.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select count(*) into n from carnival_event where id = v_event;
  if n <> 0 then failures := array_append(failures, 'another club read an unpublished carnival'); end if;

  -- 4. **Publishing opens exactly three tables** (BR140, BR27).
  perform set_config('request.jwt.claim.sub', coord::text, true);
  perform app_publish_event(v_event, true);

  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from carnival_event where id = v_event;
  if n <> 1 then failures := array_append(failures, 'a published carnival was not readable by anon'); end if;
  select count(*) into n from carnival_entry where event_id = v_event;
  if n <> 2 then failures := array_append(failures, 'a published carnival''s teams were not readable'); end if;
  select count(*) into n from carnival_fixture where event_id = v_event;
  if n <> 1 then failures := array_append(failures, 'a published draw was not readable'); end if;

  -- 5. **And nothing else came with them.** The point of the exception
  --    being scoped: publishing a carnival must not publish a club.
  select count(*) into n from person;
  if n <> 0 then failures := array_append(failures, 'publishing a carnival exposed person rows to anon'); end if;
  select count(*) into n from registration;
  if n <> 0 then failures := array_append(failures, 'publishing a carnival exposed registrations to anon'); end if;
  select count(*) into n from club;
  if n <> 0 then failures := array_append(failures, 'publishing a carnival exposed clubs to anon'); end if;

  -- 6. **anon may read and may not write.**
  begin
    update carnival_fixture set home_goals = 9, away_goals = 0 where id = v_fixture;
    select count(*) into n from carnival_fixture where id = v_fixture and home_goals = 9;
    if n <> 0 then failures := array_append(failures, 'an anonymous visitor changed a result'); end if;
  exception when others then null;
  end;
  begin
    insert into carnival_entry (club_id, event_id, entrant_name, team_name)
    values (north_star, v_event, 'Anon FC', 'U12');
    failures := array_append(failures, 'an anonymous visitor entered a team');
  exception when others then null;
  end;

  -- 7. **BR29 — the conditions are the recorded coordinator's alone**, even
  --    against a club admin.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', other::text, true);
  begin
    update carnival_event set points_for_win = 99 where id = v_event;
    failures := array_append(failures,
      'a club admin who is not the recorded coordinator changed the carnival conditions');
  exception when others then null;
  end;

  -- The coordinator may.
  perform set_config('request.jwt.claim.sub', coord::text, true);
  update carnival_event set points_for_win = 2 where id = v_event;
  perform set_config('role', 'postgres', true);
  select points_for_win into n from carnival_event where id = v_event;
  if n <> 2 then failures := array_append(failures, 'the recorded coordinator could not change the conditions'); end if;

  -- And an ordinary officer may still change everything else about it.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', other::text, true);
  update carnival_event set venue = 'Coast Reserve' where id = v_event;
  perform set_config('role', 'postgres', true);
  select count(*) into n from carnival_event where id = v_event and venue = 'Coast Reserve';
  if n <> 1 then
    failures := array_append(failures, 'BR29 was read too widely — an officer could not change the venue');
  end if;

  -- 8. **A team cannot play itself, and half a score is refused.**
  begin
    insert into carnival_fixture (club_id, event_id, home_entry_id, away_entry_id, played_on)
    values (north_star, v_event, home, home, '2026-07-05');
    failures := array_append(failures, 'a team was drawn against itself');
  exception when others then null;
  end;
  begin
    update carnival_fixture set home_goals = 3, away_goals = null where id = v_fixture;
    failures := array_append(failures, 'half a score was accepted — a ladder from it is a guess');
  exception when others then null;
  end;

  -- 9. **Unpublishing hides it again** (BR140).
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coord::text, true);
  perform app_publish_event(v_event, false);

  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from carnival_fixture where event_id = v_event;
  if n <> 0 then failures := array_append(failures, 'unpublishing did not hide the draw'); end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Carnivals FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Carnivals OK — 9 scenarios; the tables carry no person column at all, publishing opens exactly three of them and nothing else, anon reads and never writes, and the conditions stay the coordinator''s';
end
$$;
