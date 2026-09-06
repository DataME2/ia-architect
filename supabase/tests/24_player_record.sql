-- Who may read a child's height, and can a statistic be attached to the
-- wrong season?
--
-- Two claims carry this migration.
--
--   * **Physique is narrowed on read.** Every other table in this schema is
--     readable by any member of the club in any role. A height and a weight
--     are measurements of a child, so `player_profile` follows `clearance`
--     instead and reaches only the roles that pick teams (BR99).
--   * **An appearance cannot drift.** Fixture, registration and person all
--     have to agree about the club, the season and the human — otherwise
--     last season's enrolment quietly accumulates this season's games.
--
-- And one deliberate absence: BR103 says an appearance by an ineligible
-- player is **recorded and flagged, never refused**. The last scenario
-- asserts that the database does not block it, because blocking it would
-- not un-play the match — it would only mean the club stops recording games.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('ba110000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Ruby', 'Nkemelu', '2014-08-08');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a1110000-0000-0000-0000-000000000027', '11111111-1111-1111-1111-111111111111',
   '2027', '2027-01-01', '2027-12-01');

insert into registration (id, club_id, person_id, season_id) values
  -- Same player, two seasons. The pair the coherence trigger exists for.
  ('ca110000-0000-0000-0000-000000000026', '11111111-1111-1111-1111-111111111111',
   'ba110000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111'),
  ('ca110000-0000-0000-0000-000000000027', '11111111-1111-1111-1111-111111111111',
   'ba110000-0000-0000-0000-000000000001', 'a1110000-0000-0000-0000-000000000027');

insert into fixture (id, club_id, season_id, played_on, opponent, home_away, status) values
  ('fa110000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111', '2026-05-02', 'Rival United', 'home', 'played');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  ns_admin   uuid := 'd1111111-1111-1111-1111-111111111111';  -- admin + registrar
  rival_reg  uuid := 'd2222222-2222-2222-2222-222222222222';
  outsider   uuid := 'd9999999-9999-9999-9999-999999999999';
  player     uuid := 'ba110000-0000-0000-0000-000000000001';
  reg_2026   uuid := 'ca110000-0000-0000-0000-000000000026';
  reg_2027   uuid := 'ca110000-0000-0000-0000-000000000027';
  the_fixture uuid := 'fa110000-0000-0000-0000-000000000001';
  n          integer;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);

  -- 1. A profile is recorded, and everything on it is optional.
  insert into player_profile (club_id, registration_id, preferred_position, squad_number)
  values (north_star, reg_2026, 'forward', 9);

  select count(*) into n from player_profile where registration_id = reg_2026;
  if n <> 1 then
    failures := array_append(failures, 'the profile was not recorded');
  end if;

  -- Height and weight left null is the ordinary case, not an error (BR99).
  select count(*) into n from player_profile
   where registration_id = reg_2026 and height_cm is null and weight_kg is null;
  if n <> 1 then
    failures := array_append(failures, 'physique was not optional');
  end if;

  -- 2. One profile per registration. Two would be two answers to the same
  --    question, and the screen would show whichever it loaded.
  begin
    insert into player_profile (club_id, registration_id) values (north_star, reg_2026);
    failures := array_append(failures, 'a registration took a second profile');
  exception when others then null;
  end;

  -- 3. Implausible measurements are refused. A 3cm player is a typo, and a
  --    typo in a child's record that nobody catches is worse than a form
  --    that says no.
  begin
    insert into player_profile (club_id, registration_id, height_cm)
    values (north_star, reg_2027, 3);
    failures := array_append(failures, 'a 3cm player was accepted');
  exception when others then null;
  end;
  begin
    insert into player_profile (club_id, registration_id, weight_kg)
    values (north_star, reg_2027, 900);
    failures := array_append(failures, 'a 900kg player was accepted');
  exception when others then null;
  end;
  begin
    insert into player_profile (club_id, registration_id, preferred_position)
    values (north_star, reg_2027, 'sweeper-keeper');
    failures := array_append(failures, 'an invented position was accepted');
  exception when others then null;
  end;

  -- ------------------------------------------------------ who may read it

  -- 4. **The narrowing.** Every other table here is readable by any member.
  --    This one is not: a treasurer has no use for a child's weight, and
  --    the default would have given them one.
  perform set_config('role', 'postgres', true);
  insert into club_membership (club_id, user_id, role)
  values (north_star, outsider, 'treasurer') on conflict do nothing;
  perform set_config('role', 'authenticated', true);

  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select count(*) into n from player_profile;
  if n <> 0 then
    failures := array_append(failures, 'a treasurer read a child''s height and weight');
  end if;

  -- But the same treasurer still sees the roster and the fixtures — the
  -- narrowing is on physique, not on the player existing.
  select count(*) into n from fixture where club_id = north_star;
  if n < 1 then
    failures := array_append(failures, 'a member could not see the club''s fixtures');
  end if;

  -- 5. Another club reaches none of it, physique or otherwise.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);
  select count(*) into n from player_profile;
  if n <> 0 then
    failures := array_append(failures, 'another club read a player profile');
  end if;
  select count(*) into n from fixture;
  if n <> 0 then
    failures := array_append(failures, 'another club read our fixtures');
  end if;
  select count(*) into n from appearance;
  if n <> 0 then
    failures := array_append(failures, 'another club read our appearances');
  end if;

  -- --------------------------------------------------------- appearances

  perform set_config('request.jwt.claim.sub', ns_admin::text, true);

  -- 6. An ordinary appearance.
  insert into appearance (club_id, fixture_id, person_id, registration_id,
                          minutes_played, started, goals, assists, recorded_by)
  values (north_star, the_fixture, player, reg_2026, 55, true, 2, 1, ns_admin);

  select count(*) into n from appearance where fixture_id = the_fixture;
  if n <> 1 then
    failures := array_append(failures, 'the appearance was not recorded');
  end if;

  -- 7. A player appears once per fixture. Two rows would double every
  --    total they contribute to, silently.
  begin
    insert into appearance (club_id, fixture_id, person_id, registration_id)
    values (north_star, the_fixture, player, reg_2026);
    failures := array_append(failures, 'a player appeared twice in one fixture');
  exception when others then null;
  end;

  -- 8. **The coherence guard.** The 2027 registration cannot collect a 2026
  --    fixture — otherwise last season's enrolment quietly accumulates this
  --    season's games and a career total is nonsense.
  begin
    insert into appearance (club_id, fixture_id, person_id, registration_id)
    values (north_star, the_fixture, player, reg_2027);
    failures := array_append(failures, 'an appearance was attached to the wrong season');
  exception when others then null;
  end;

  -- Nor may it name a different human than its own registration.
  begin
    insert into appearance (club_id, fixture_id, person_id, registration_id)
    values (north_star, the_fixture, 'b1111111-1111-1111-1111-111111111111', reg_2026);
    failures := array_append(failures, 'an appearance named a different person than its registration');
  exception when others then null;
  end;

  -- 9. Impossible figures are refused: negative goals, and a match longer
  --    than any match.
  begin
    insert into appearance (club_id, fixture_id, person_id, registration_id, goals)
    values (north_star, the_fixture, player, reg_2026, -1);
    failures := array_append(failures, 'a negative goal tally was accepted');
  exception when others then null;
  end;

  perform set_config('role', 'postgres', true);
  delete from appearance where fixture_id = the_fixture and person_id = player;
  perform set_config('role', 'authenticated', true);
  begin
    insert into appearance (club_id, fixture_id, person_id, registration_id, minutes_played)
    values (north_star, the_fixture, player, reg_2026, 400);
    failures := array_append(failures, 'a 400-minute match was accepted');
  exception when others then null;
  end;

  -- 10. **BR103 — the deliberate absence.** An appearance by a player who
  --     should not have taken the field is recorded, not refused. Blocking
  --     it would not un-play the match; it would only mean the club stops
  --     recording games. The flag is the application's job.
  perform set_config('role', 'postgres', true);
  update registration set status = 'PENDING_PAYMENT' where id = reg_2026;
  perform set_config('role', 'authenticated', true);

  begin
    insert into appearance (club_id, fixture_id, person_id, registration_id,
                            minutes_played, recorded_by)
    values (north_star, the_fixture, player, reg_2026, 30, ns_admin);
  exception when others then
    failures := array_append(failures,
      'the database refused to record that an ineligible player took the field (BR103)');
  end;

  select count(*) into n from appearance where fixture_id = the_fixture and person_id = player;
  if n <> 1 then
    failures := array_append(failures, 'the ineligible appearance was not kept');
  end if;

  -- 11. Every statistic knows who entered it (BR101).
  select count(*) into n from appearance
   where fixture_id = the_fixture and recorded_by = ns_admin and recorded_at is not null;
  if n <> 1 then
    failures := array_append(failures, 'the appearance did not record who entered it');
  end if;

  -- ------------------------------------------------------- the photograph

  -- 12. **BR56, enforced for the first time.** `person.photo_path` has
  --     existed since the first migration and nothing ever wrote it, so
  --     the rule that a photograph is held only under a consent recorded
  --     for that purpose was documented and unchecked. Adding the uploader
  --     without this check is how that would have stayed true.
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  begin
    update person set photo_path = '11111111-1111-1111-1111-111111111111/x/1.jpg'
     where id = player;
    failures := array_append(failures, 'a photograph was stored with no consent (BR56)');
  exception when others then null;
  end;

  -- 13. With the consent recorded, the same update is allowed.
  perform set_config('role', 'postgres', true);
  insert into consent (club_id, person_id, purpose, granted_by_person_id)
  values (north_star, player, 'IDENTIFICATION_PHOTOGRAPH', player);
  perform set_config('role', 'authenticated', true);

  begin
    update person set photo_path = '11111111-1111-1111-1111-111111111111/x/1.jpg'
     where id = player;
  exception when others then
    failures := array_append(failures, 'a consented photograph was refused');
  end;

  select count(*) into n from person where id = player and photo_path is not null;
  if n <> 1 then
    failures := array_append(failures, 'the photograph reference was not stored');
  end if;

  -- 14. A withdrawn consent must never trap the picture it covered:
  --     removal stays possible however the consent stands (BR48, BR49).
  perform set_config('role', 'postgres', true);
  update consent set revoked_at = now()
   where person_id = player and purpose = 'IDENTIFICATION_PHOTOGRAPH';
  perform set_config('role', 'authenticated', true);

  begin
    update person set photo_path = null where id = player;
  exception when others then
    failures := array_append(failures,
      'a photograph could not be removed after the consent was withdrawn');
  end;

  -- And it cannot be put back while the consent stands withdrawn.
  begin
    update person set photo_path = '11111111-1111-1111-1111-111111111111/x/2.jpg'
     where id = player;
    failures := array_append(failures, 'a photograph was restored under a withdrawn consent');
  exception when others then null;
  end;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Player record FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Player record OK — 14 scenarios; physique is narrowed, a statistic cannot drift seasons, an ineligible appearance is recorded rather than refused, and a photograph needs the consent BR56 has always required';
end
$$;
