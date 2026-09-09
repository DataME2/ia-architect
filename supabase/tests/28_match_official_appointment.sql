-- Can somebody be appointed who should not be?
--
-- Every refusal here has the same failure mode: a person on a pitch who
-- should not be there, and a volunteer who assumed the platform checked.
-- So each is asked of the database rather than of a screen.
--
--   BR6    played in this match
--   BR9    suspended on the day of the match, not on the day of the click
--   BR109  any other role in this fixture — coach, or guardian of a player
--   BR7    already officiating something else at that hour
--   BR42   a decline without a reason is not a decline (BR112)
--   BR114  who appointed is stored, not inferred from the grade

\set ON_ERROR_STOP on

begin;

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b11f0000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
   'Ref', 'Clean', '1985-01-01'),
  ('b11f0000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111',
   'Playing', 'Ref', '2009-05-05'),
  ('b11f0000-0000-0000-0000-00000000000c', '11111111-1111-1111-1111-111111111111',
   'Coaching', 'Ref', '1980-02-02'),
  ('b11f0000-0000-0000-0000-00000000000d', '11111111-1111-1111-1111-111111111111',
   'Parent', 'Ref', '1982-03-03'),
  ('b11f0000-0000-0000-0000-00000000000e', '11111111-1111-1111-1111-111111111111',
   'Suspended', 'Ref', '1979-04-04'),
  ('b11f0000-0000-0000-0000-00000000000f', '11111111-1111-1111-1111-111111111111',
   'Busy', 'Ref', '1988-08-08'),
  -- A child who plays, so the guardian conflict has somebody to be about.
  ('b11f0000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111',
   'Child', 'Ofparent', '2015-07-07');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  season_ns  uuid := 'a1111111-1111-1111-1111-111111111111';
  ns_admin   uuid := 'd1111111-1111-1111-1111-111111111111';
  rival_reg  uuid := 'd2222222-2222-2222-2222-222222222222';
  clean      uuid := 'b11f0000-0000-0000-0000-00000000000a';
  playing    uuid := 'b11f0000-0000-0000-0000-00000000000b';
  coaching   uuid := 'b11f0000-0000-0000-0000-00000000000c';
  parent     uuid := 'b11f0000-0000-0000-0000-00000000000d';
  suspended  uuid := 'b11f0000-0000-0000-0000-00000000000e';
  busy       uuid := 'b11f0000-0000-0000-0000-00000000000f';
  child      uuid := 'b11f0000-0000-0000-0000-000000000011';
  the_team   uuid;
  fixture_a  uuid;
  fixture_b  uuid;
  fixture_c  uuid;
  reg_child  uuid;
  reg_play   uuid;
  appt       uuid;
  n          integer;
  t          text;
  failures   text[] := '{}';
begin
  perform set_config('role', 'postgres', true);
  insert into club_membership (club_id, user_id, role)
  values (north_star, ns_admin, 'admin') on conflict do nothing;

  -- A team, three fixtures, and two registrations so somebody can appear.
  insert into team (id, club_id, season_id, name)
  values (gen_random_uuid(), north_star, season_ns, 'Officiating Test XI')
  returning id into the_team;

  insert into fixture (id, club_id, season_id, team_id, played_on, kick_off, opponent, home_away)
  values (gen_random_uuid(), north_star, season_ns, the_team,
          date '2026-06-06', time '10:00', 'Appointment Test A', 'home')
  returning id into fixture_a;

  insert into fixture (id, club_id, season_id, played_on, kick_off, opponent, home_away)
  values (gen_random_uuid(), north_star, season_ns,
          date '2026-06-06', time '10:00', 'Appointment Test B', 'away')
  returning id into fixture_b;

  insert into fixture (id, club_id, season_id, played_on, kick_off, opponent, home_away)
  values (gen_random_uuid(), north_star, season_ns,
          date '2026-06-06', time '14:00', 'Appointment Test C', 'home')
  returning id into fixture_c;

  insert into registration (id, club_id, person_id, season_id)
  values (gen_random_uuid(), north_star, playing, season_ns) returning id into reg_play;
  insert into registration (id, club_id, person_id, season_id)
  values (gen_random_uuid(), north_star, child, season_ns) returning id into reg_child;

  insert into appearance (club_id, fixture_id, person_id, registration_id, minutes_played)
  values (north_star, fixture_a, playing, reg_play, 60),
         (north_star, fixture_a, child,   reg_child, 40);

  -- BR83 refuses an uncleared adult a team, and refused this fixture setup
  -- when it was first written — the safeguarding trigger working on the
  -- test that needed a coach to exist. The card comes first, as it does in
  -- the club.
  insert into clearance (club_id, person_id, kind, identifier, issued_on, expires_on, verified_at)
  values (north_star, coaching, 'WWCC', 'BC-APPT-1', date '2025-01-01', date '2030-12-31', now());

  insert into team_member (club_id, team_id, person_id, role)
  values (north_star, the_team, coaching, 'coach');

  insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact)
  values (north_star, child, parent, true, true);

  insert into referee_suspension (club_id, person_id, starts_on, ends_on, reason)
  values (north_star, suspended, date '2026-05-01', date '2026-07-01', 'pending hearing');

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);

  -- 1. The ordinary case works, and records **who appointed** (BR114).
  insert into match_official_appointment (club_id, fixture_id, person_id, appointed_by)
  values (north_star, fixture_a, clean, 'club') returning id into appt;

  select appointed_by into t from match_official_appointment where id = appt;
  if t <> 'club' then
    failures := array_append(failures, 'the appointing party was not recorded');
  end if;

  -- 2. **BR6** — the referee played in this match.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id)
    values (north_star, fixture_a, playing);
    failures := array_append(failures, 'a player was appointed to officiate their own match');
  exception when others then null;
  end;

  -- 3. **BR109, the case that actually happens** — the coach of a team in
  --    this fixture. BR6 alone would have let this through.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id)
    values (north_star, fixture_a, coaching);
    failures := array_append(failures, 'a coach of a team in the fixture was appointed to it');
  exception when others then null;
  end;

  -- 4. **BR109, the other half** — the parent of a child on the field.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id)
    values (north_star, fixture_a, parent);
    failures := array_append(failures, 'the guardian of a player in the fixture was appointed to it');
  exception when others then null;
  end;

  -- 5. **BR9** — suspended on the date of the fixture. The suspension ends
  --    1 July and the game is 6 June.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id)
    values (north_star, fixture_b, suspended);
    failures := array_append(failures, 'a suspended official was appointed');
  exception when others then null;
  end;

  -- 6. And the same person is appointable to a fixture *after* it ends —
  --    a suspension is a period, not a mark on the record.
  perform set_config('role', 'postgres', true);
  insert into fixture (id, club_id, season_id, played_on, kick_off, opponent, home_away)
  values ('f11f0000-0000-0000-0000-000000000001', north_star, season_ns,
          date '2026-09-05', time '10:00', 'After The Suspension', 'home');
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id)
    values (north_star, 'f11f0000-0000-0000-0000-000000000001', suspended);
  exception when others then
    failures := array_append(failures, 'a suspension blocked a fixture after it had ended');
  end;

  -- 7. **BR7** — two games at the same hour.
  insert into match_official_appointment (club_id, fixture_id, person_id)
  values (north_star, fixture_a, busy);
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id)
    values (north_star, fixture_b, busy);
    failures := array_append(failures, 'one official was appointed to two games at the same time');
  exception when others then null;
  end;

  -- 8. Two games on one day at different times is ordinary, and must not
  --    be refused — a rule that blocked it would be wrong every weekend.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id)
    values (north_star, fixture_c, busy);
  exception when others then
    failures := array_append(failures, 'two games at different hours on one day were refused');
  end;

  -- 9. **The trigger fires on update too.** Proposing somebody impossible
  --    and then accepting it is the obvious way round an insert-only guard.
  perform set_config('role', 'postgres', true);
  insert into match_official_appointment (id, club_id, fixture_id, person_id, state)
  values ('e11f0000-0000-0000-0000-000000000001', north_star,
          'f11f0000-0000-0000-0000-000000000001', clean, 'proposed');
  insert into referee_suspension (club_id, person_id, starts_on, ends_on)
  values (north_star, clean, date '2026-09-01', date '2026-09-30');
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  begin
    update match_official_appointment set state = 'accepted'
     where id = 'e11f0000-0000-0000-0000-000000000001';
    failures := array_append(failures, 'a suspension acquired after the proposal did not block acceptance');
  exception when others then null;
  end;

  -- 10. **BR42/BR112** — a decline without a reason is not recorded.
  begin
    update match_official_appointment set state = 'declined' where id = appt;
    failures := array_append(failures, 'a decline was recorded with no reason');
  exception when others then null;
  end;

  update match_official_appointment
     set state = 'declined', reason = 'working that morning', responded_at = now()
   where id = appt;
  select state into t from match_official_appointment where id = appt;
  if t <> 'declined' then
    failures := array_append(failures, 'a decline with a reason was refused');
  end if;

  -- 11. A withdrawal needs one too — it is the case BR42 singles out.
  perform set_config('role', 'postgres', true);
  insert into match_official_appointment (id, club_id, fixture_id, person_id, state)
  values ('e11f0000-0000-0000-0000-000000000002', north_star, fixture_c, clean, 'accepted');
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  begin
    update match_official_appointment set state = 'withdrawn'
     where id = 'e11f0000-0000-0000-0000-000000000002';
    failures := array_append(failures, 'a withdrawal was recorded with no reason');
  exception when others then null;
  end;

  -- 12. One person is not two officials at one game.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role)
    values (north_star, fixture_a, busy, 'assistant_referee');
    failures := array_append(failures, 'one person was appointed twice to one fixture');
  exception when others then null;
  end;

  -- 13. An invented appointing party is refused — BR114 is a closed set,
  --     because "who pays" is answered from it.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, appointed_by)
    values (north_star, fixture_c, parent, 'whoever');
    failures := array_append(failures, 'an invented appointing party was accepted');
  exception when others then null;
  end;

  -- ------------------------------------------------------------ isolation

  -- 14. A fixture at another club cannot be appointed into, and another
  --     club reads none of this.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);
  select count(*) into n from match_official_appointment;
  if n <> 0 then
    failures := array_append(failures, 'another club read North Star''s appointments');
  end if;
  select count(*) into n from referee_suspension;
  if n <> 0 then
    failures := array_append(failures, 'another club read a suspension');
  end if;

  -- 15. A coordinator appoints; a suspension is narrower than that, because
  --     what they need is the refusal and not the disciplinary history.
  perform set_config('role', 'postgres', true);
  insert into club_membership (club_id, user_id, role)
  values (north_star, 'd11d0000-0000-0000-0000-00000000000a', 'coordinator')
  on conflict do nothing;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd11d0000-0000-0000-0000-00000000000a', true);

  select count(*) into n from match_official_appointment where club_id = north_star;
  if n = 0 then
    failures := array_append(failures, 'a coordinator could not read the appointments they make');
  end if;
  select count(*) into n from referee_suspension;
  if n <> 0 then
    failures := array_append(failures, 'a coordinator read the disciplinary history');
  end if;

  -- And the refusal still reaches them, which is the point of putting it in
  -- the database rather than in a screen they can read.
  --
  -- **Fixture A, not B.** The first version of this used fixture B, which
  -- has no team — so BR109 had nothing to fire on and the appointment was
  -- correctly allowed. The suite reported a coordinator bypassing the rules
  -- when what actually happened is that there was no conflict to find. A
  -- conflict test needs a fixture the conflict is *about*.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id)
    values (north_star, fixture_a, coaching);
    failures := array_append(failures, 'a coordinator appointed somebody the rules refuse');
  exception when others then null;
  end;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Match official appointment FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Match official appointment OK — 15 scenarios; a player, a coach, a parent and a suspended official are all refused, two games at one hour are refused and two at different hours are not, and a decline carries its reason';
end
$$;
