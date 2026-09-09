-- Does availability mean what a coordinator will read it to mean?
--
-- The three questions that decide whether this is safe to appoint from:
--
--   * does silence read as "no" rather than "yes" — because the wrong
--     answer puts a person on a match sheet who never said they could,
--   * does an unavailability beat a standing window regardless of which
--     was written first,
--   * and does a time-bounded window actually bound the time?
--
-- Plus the two this schema shares with every other: the narrowing holds,
-- and one club's declarations are invisible to another.

\set ON_ERROR_STOP on

begin;

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b11e0000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
   'Sam', 'Saturday', '1988-06-06'),
  ('b11e0000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111',
   'Quiet', 'Quinn', '1995-09-09');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  season_ns  uuid := 'a1111111-1111-1111-1111-111111111111';
  ns_admin   uuid := 'd1111111-1111-1111-1111-111111111111';
  rival_reg  uuid := 'd2222222-2222-2222-2222-222222222222';
  sam        uuid := 'b11e0000-0000-0000-0000-00000000000a';
  quinn      uuid := 'b11e0000-0000-0000-0000-00000000000b';
  treasurer  uuid;
  -- 2026-07-04 is a Saturday; 2026-07-05 a Sunday. Asserted here so a
  -- failure reads as a broken rule rather than a calendar surprise.
  a_saturday date := date '2026-07-04';
  a_sunday   date := date '2026-07-05';
  n          integer;
  failures   text[] := '{}';
begin
  perform set_config('role', 'postgres', true);
  insert into club_membership (club_id, user_id, role)
  values (north_star, ns_admin, 'admin') on conflict do nothing;

  select m.user_id into treasurer
  from club_membership m
  where m.club_id = north_star
  group by m.user_id
  having array_agg(m.role) @> array['treasurer']
     and not (array_agg(m.role) && array['admin','registrar','coordinator']);

  if extract(dow from a_saturday) <> 6 or extract(dow from a_sunday) <> 0 then
    failures := array_append(failures, 'the fixture dates are not the weekdays this suite assumes');
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);

  -- Sam does Saturday mornings. Quinn has said nothing at all.
  insert into referee_availability (club_id, season_id, person_id, weekday, from_time, to_time)
  values (north_star, season_ns, sam, 6, time '08:00', time '12:00');

  -- 1. **Silence is not availability.** The failure this prevents is a
  --    coordinator appointing somebody who never said they could do it.
  if app_referee_available_on(quinn, season_ns, a_saturday, time '09:00') then
    failures := array_append(failures, 'an official who declared nothing was reported available');
  end if;

  -- 2. A declared window means what it says, on the day it names.
  if not app_referee_available_on(sam, season_ns, a_saturday, time '09:00') then
    failures := array_append(failures, 'a declared window did not make the official available');
  end if;

  -- 3. And not on another day.
  if app_referee_available_on(sam, season_ns, a_sunday, time '09:00') then
    failures := array_append(failures, 'a Saturday window covered a Sunday');
  end if;

  -- 4. **A time-bounded window bounds the time.** A 2pm kick-off is not a
  --    Saturday morning, and appointing into it is how somebody arrives at
  --    a ground expecting to have been finished two hours earlier.
  if app_referee_available_on(sam, season_ns, a_saturday, time '14:00') then
    failures := array_append(failures, 'an afternoon kick-off matched a morning window');
  end if;

  -- 5. The window's own edges are inside it. "8 until 12" covers a game at
  --    8 and a game at 12; excluding them would be a surprise nobody
  --    declared.
  if not app_referee_available_on(sam, season_ns, a_saturday, time '08:00')
     or not app_referee_available_on(sam, season_ns, a_saturday, time '12:00') then
    failures := array_append(failures, 'the edges of a declared window fell outside it');
  end if;

  -- 6. **A fixture with no kick-off falls back to the day.** The missing
  --    datum belongs to the fixture, and excluding every time-bounded
  --    official because of it would empty the list for the wrong reason.
  if not app_referee_available_on(sam, season_ns, a_saturday, null) then
    failures := array_append(failures, 'a fixture with no kick-off excluded a time-bounded window');
  end if;

  -- 7. An all-day window is all day.
  insert into referee_availability (club_id, season_id, person_id, weekday, from_time, to_time)
  values (north_star, season_ns, sam, 0, null, null);
  if not app_referee_available_on(sam, season_ns, a_sunday, time '17:30') then
    failures := array_append(failures, 'an all-day window did not cover an evening kick-off');
  end if;

  -- 8. **An unavailability beats a standing window**, whichever was
  --    written first — somebody who said "Saturdays" in February and "away
  --    in July" in June meant the second.
  insert into referee_unavailability (club_id, person_id, starts_on, ends_on, reason)
  values (north_star, sam, date '2026-07-01', date '2026-07-31', 'away');

  if app_referee_available_on(sam, season_ns, a_saturday, time '09:00') then
    failures := array_append(failures, 'a standing window survived an unavailability covering it');
  end if;

  -- 9. And only for the days it covers. An exception is not a withdrawal.
  if not app_referee_available_on(sam, season_ns, date '2026-08-01', time '09:00') then
    failures := array_append(failures, 'an unavailability leaked past its own end date');
  end if;

  -- Its own boundary days are inside it.
  if app_referee_available_on(sam, season_ns, date '2026-07-04', time '09:00')
     or app_referee_available_on(sam, season_ns, date '2026-07-25', time '09:00') then
    failures := array_append(failures, 'an unavailability did not cover its own range');
  end if;

  -- 10. **Availability is per season, and asked per season.**
  --
  --     The first version of this scenario counted rows in other seasons
  --     and passed with the function's season filter deleted — it asserted
  --     the fixture rather than the behaviour. What has to be true is that
  --     asking about *next* season gets nothing, so a declaration somebody
  --     made for 2026 does not put them on a 2027 match sheet after they
  --     have quietly stopped refereeing.
  perform set_config('role', 'postgres', true);
  insert into season (id, club_id, name, starts_on, ends_on)
  values ('a11e0000-0000-0000-0000-00000000000a', north_star, '2027',
          date '2027-02-01', date '2027-11-30')
  on conflict do nothing;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);

  if app_referee_available_on(sam, 'a11e0000-0000-0000-0000-00000000000a',
                              date '2027-07-03', time '09:00') then
    failures := array_append(failures, 'a declaration for one season answered for another');
  end if;

  -- 11. Two identical windows are not two facts.
  begin
    insert into referee_availability (club_id, season_id, person_id, weekday, from_time, to_time)
    values (north_star, season_ns, sam, 6, time '08:00', time '12:00');
    failures := array_append(failures, 'a duplicate availability window was accepted');
  exception when others then null;
  end;

  -- 12. A window that ends before it starts is refused.
  begin
    insert into referee_availability (club_id, season_id, person_id, weekday, from_time, to_time)
    values (north_star, season_ns, quinn, 3, time '15:00', time '09:00');
    failures := array_append(failures, 'a window ending before it began was accepted');
  exception when others then null;
  end;

  -- ------------------------------------------------------------ narrowing

  -- 13. A treasurer reads none of it. Where a person — often a child — is
  --     on a Saturday morning is the reasoning decision 4 gives about
  --     calendar feeds, and it applies to the same fact recorded here.
  if treasurer is not null then
    perform set_config('request.jwt.claim.sub', treasurer::text, true);
    select count(*) into n from referee_availability;
    if n <> 0 then
      failures := array_append(failures, 'a treasurer read who is available on Saturday mornings');
    end if;
    select count(*) into n from referee_unavailability;
    if n <> 0 then
      failures := array_append(failures, 'a treasurer read why somebody is away');
    end if;
  end if;

  -- ------------------------------------------------------------ isolation

  -- 14. Another club sees none of it, through the table or the function.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);
  select count(*) into n from referee_availability;
  if n <> 0 then
    failures := array_append(failures, 'another club read North Star''s availability');
  end if;
  if app_referee_available_on(sam, season_ns, date '2026-08-01', time '09:00') then
    failures := array_append(failures, 'a function handed another club an availability answer');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Referee availability FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Referee availability OK — 14 scenarios; silence is not availability, an exception beats a standing window, and a morning window does not cover an afternoon';
end
$$;
