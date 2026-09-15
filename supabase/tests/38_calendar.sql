-- Does a feed carry only its subscriber's Saturday?
--
-- A feed URL is a bearer credential held by somebody with no account, and
-- what it returns is a record of where a person — often a child — will be
-- and when. So:
--
--   * a valid token returns that person's appointments and **nobody
--     else's** (BR30),
--   * the projection carries no other participant's data (BR32, BR141),
--   * a declined or withdrawn appointment is not a commitment and is absent,
--   * an unknown token returns nothing rather than erroring,
--   * rotating the salt kills the previous URL immediately (BR31),
--   * revoking kills it too,
--   * BR33: a minor's feed is issued to a guardian, never to the minor,
--     and an adult holds their own.

\set ON_ERROR_STOP on

begin;

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b38a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Adult', 'Official', '1990-01-01', 'adult.official@northstar.test'),
  ('b38a0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Other', 'Official', '1991-02-02', null),
  ('b38a0000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Minor', 'Official', (current_date - interval '14 years')::date, null),
  ('b38a0000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'Their', 'Guardian', '1985-05-05', null);

-- **A card, because BR84 now reaches the appointment** (migration 0044).
-- This suite appointed an uncleared adult and passed, which is the hole
-- 0044 closes. The card is a real one; the rule was not relaxed.
insert into clearance (club_id, person_id, kind, identifier, issued_on, expires_on, verified_at) values
  -- The two adults. The fourteen-year-old needs none — BR84 exempts them,
  -- and this suite is partly about a minor's feed belonging to a guardian.
  ('11111111-1111-1111-1111-111111111111', 'b38a0000-0000-0000-0000-000000000001',
   'WWCC', 'BC-CAL-1', date '2025-01-01', date '2031-12-31', now()),
  ('11111111-1111-1111-1111-111111111111', 'b38a0000-0000-0000-0000-000000000002',
   'WWCC', 'BC-CAL-2', date '2025-01-01', date '2031-12-31', now());

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('11111111-1111-1111-1111-111111111111', 'b38a0000-0000-0000-0000-000000000003',
   'b38a0000-0000-0000-0000-000000000004', true, true);

insert into fixture (id, club_id, season_id, played_on, kick_off, opponent, home_away, venue) values
  ('f38a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111', '2026-07-04', '10:00', 'Coast', 'home', 'Pitch 3, North'),
  ('f38a0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111', '2026-07-11', '14:00', 'Ranges', 'away', 'Ranges Park');

insert into match_official_appointment (club_id, fixture_id, person_id, role, state) values
  -- Theirs: one accepted, one proposed. Both are commitments to show.
  ('11111111-1111-1111-1111-111111111111', 'f38a0000-0000-0000-0000-000000000001',
   'b38a0000-0000-0000-0000-000000000001', 'referee', 'accepted'),
  ('11111111-1111-1111-1111-111111111111', 'f38a0000-0000-0000-0000-000000000002',
   'b38a0000-0000-0000-0000-000000000001', 'assistant_referee', 'proposed'),
  -- Somebody else's, at the same fixture. The feed must not carry it.
  ('11111111-1111-1111-1111-111111111111', 'f38a0000-0000-0000-0000-000000000001',
   'b38a0000-0000-0000-0000-000000000002', 'assistant_referee', 'accepted');

-- sha256('feed-token-adult') and friends, since the app derives the token
-- and the database only ever sees its hash.
insert into calendar_subscription (id, club_id, person_id, holder_person_id, feed_salt, feed_token_hash)
values ('c38a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'b38a0000-0000-0000-0000-000000000001', 'b38a0000-0000-0000-0000-000000000001',
        'salt-adult', encode(digest('feed-token-adult', 'sha256'), 'hex'));

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  adult      uuid := 'b38a0000-0000-0000-0000-000000000001';
  minor      uuid := 'b38a0000-0000-0000-0000-000000000003';
  guardian   uuid := 'b38a0000-0000-0000-0000-000000000004';
  sub        uuid := 'c38a0000-0000-0000-0000-000000000001';
  n          integer;
  txt        text;
  failures   text[] := '{}';
begin
  -- 1. **A valid token returns their own appointments**, both states that
  --    are commitments.
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);

  select count(*) into n from app_calendar_feed('feed-token-adult');
  if n <> 2 then
    failures := array_append(failures,
      'the feed returned ' || n || ' appointments; it should carry both of this official''s');
  end if;

  -- 2. **And nobody else's**, including the other official at the same
  --    fixture (BR30). The failure this catches is a join written one
  --    table too wide.
  select count(*) into n from app_calendar_feed('feed-token-adult') f
   where f.own_role = 'assistant_referee' and f.played_on = '2026-07-04';
  if n <> 0 then
    failures := array_append(failures, 'the feed carried another official''s appointment');
  end if;

  -- 3. **The projection is fixed** (BR141, BR32). Asserted against the
  --    catalogue: a future column on this function is how somebody else's
  --    name eventually reaches a calendar.
  select count(*) into n
    from information_schema.routines r
    join information_schema.parameters p on p.specific_name = r.specific_name
   where r.routine_name = 'app_calendar_feed'
     and p.parameter_mode = 'OUT'
     and p.parameter_name in ('opponent', 'person_id', 'person_name', 'appointed_with');
  if n <> 0 then
    failures := array_append(failures,
      'the feed projection grew a column naming somebody other than the subscriber');
  end if;

  -- 4. **A declined appointment is not a commitment.**
  perform set_config('role', 'postgres', true);
  update match_official_appointment set state = 'declined', reason = 'Away that weekend'
   where person_id = adult and fixture_id = 'f38a0000-0000-0000-0000-000000000002';

  perform set_config('role', 'anon', true);
  select count(*) into n from app_calendar_feed('feed-token-adult');
  if n <> 1 then
    failures := array_append(failures, 'a declined appointment stayed in the feed');
  end if;

  -- 5. **An unknown token returns nothing**, rather than erroring: a
  --    calendar client faced with an error nags its owner, and an empty
  --    calendar is what a revoked feed should look like.
  select count(*) into n from app_calendar_feed('not-a-real-token');
  if n <> 0 then failures := array_append(failures, 'an unknown token returned appointments'); end if;

  -- 6. **Rotating kills the previous URL immediately** (BR31).
  perform set_config('role', 'postgres', true);
  update calendar_subscription
     set feed_salt = 'salt-rotated',
         feed_token_hash = encode(digest('feed-token-rotated', 'sha256'), 'hex'),
         rotated_at = now()
   where id = sub;

  perform set_config('role', 'anon', true);
  select count(*) into n from app_calendar_feed('feed-token-adult');
  if n <> 0 then failures := array_append(failures, 'the previous URL still worked after a rotation'); end if;
  select count(*) into n from app_calendar_feed('feed-token-rotated');
  if n <> 1 then failures := array_append(failures, 'the rotated URL did not work'); end if;

  -- 7. **Revoking kills it too.**
  perform set_config('role', 'postgres', true);
  update calendar_subscription set revoked_at = now() where id = sub;
  perform set_config('role', 'anon', true);
  select count(*) into n from app_calendar_feed('feed-token-rotated');
  if n <> 0 then failures := array_append(failures, 'a revoked feed still resolved'); end if;

  -- 8. **BR33 — a minor's feed belongs to a guardian.**
  perform set_config('role', 'postgres', true);
  begin
    insert into calendar_subscription (club_id, person_id, holder_person_id, feed_salt, feed_token_hash)
    values (north_star, minor, minor, 'salt-x', 'hash-x');
    failures := array_append(failures,
      'a minor was issued their own calendar feed — a record of where a child will be');
  exception when others then null;
  end;

  begin
    insert into calendar_subscription (club_id, person_id, holder_person_id, feed_salt, feed_token_hash)
    values (north_star, minor, adult, 'salt-y', 'hash-y');
    failures := array_append(failures, 'somebody with no authority was issued a minor''s feed');
  exception when others then null;
  end;

  insert into calendar_subscription (club_id, person_id, holder_person_id, feed_salt, feed_token_hash)
  values (north_star, minor, guardian, 'salt-z', encode(digest('feed-token-minor', 'sha256'), 'hex'));
  select count(*) into n from calendar_subscription where person_id = minor;
  if n <> 1 then
    failures := array_append(failures, 'a guardian could not be issued their child''s feed');
  end if;

  -- 9. **And an adult holds their own, not somebody else's.**
  begin
    insert into calendar_subscription (club_id, person_id, holder_person_id, feed_salt, feed_token_hash)
    values (north_star, 'b38a0000-0000-0000-0000-000000000002', adult, 'salt-w', 'hash-w');
    failures := array_append(failures, 'one adult was issued another adult''s calendar feed');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'Calendar FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Calendar OK — 9 scenarios; a feed carries its subscriber''s commitments and nobody else''s, rotation and revocation kill the URL at once, and a minor''s feed belongs to their guardian';
end
$$;
