-- When a Working with Children Check lapses, is anybody told?
--
-- BR50 ends: *...blocks new ones, and **notifies both the holder and the
-- responsible coordinator** that the resulting vacancies need re-filling.*
-- The withdrawal has worked since 0044 (scope 50); the notice was left open
-- as that scope's WP6, and a coordinator found out by looking at the match
-- sheet.
--
-- Nothing recorded that a withdrawal had happened **for this reason**, so
-- there was nothing to notify from. This suite is about the record, which
-- is the half that has to be right: the sending itself is covered by the
-- unit tests, and a notice sent twice or never is always a defect in what
-- was recorded rather than in what was composed.
--
--   * a lapse writes one vacancy per emptied assignment, naming what was
--     lost in words captured at the time,
--   * a team role and an appointment both count,
--   * **a second sweep writes nothing**, and neither does a re-appointment
--     that lapses again — the guarantee lives in a unique constraint, not
--     in the caller,
--   * the past is not a vacancy,
--   * an under-18 never has one, because they never needed a card,
--   * holder and coordinator are marked **separately**, so one suppressed
--     subscriber does not silence the other's notice,
--   * a coordinator reads them and another club reads none,
--   * and a club officer can neither fabricate a vacancy nor silence one.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('47c00000-0000-0000-0000-000000000001', 'Lapse FC', 'AU-QLD'),
  ('47c00000-0000-0000-0000-000000000002', 'Other FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('47c00000-0000-0000-0000-0000000000aa', '47c00000-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days');

insert into auth.users (id, email) values
  ('d47c0000-0000-0000-0000-000000000001', 'coord@lapse.test'),
  ('d47c0000-0000-0000-0000-000000000002', 'coach@lapse.test'),
  ('d47c0000-0000-0000-0000-000000000003', 'coord@other.test');

insert into club_membership (club_id, user_id, role) values
  ('47c00000-0000-0000-0000-000000000001', 'd47c0000-0000-0000-0000-000000000001', 'coordinator'),
  ('47c00000-0000-0000-0000-000000000001', 'd47c0000-0000-0000-0000-000000000002', 'coach'),
  ('47c00000-0000-0000-0000-000000000002', 'd47c0000-0000-0000-0000-000000000003', 'coordinator');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  -- The holder. An adult with a card that is about to be revoked.
  ('b47c0000-0000-0000-0000-000000000001', '47c00000-0000-0000-0000-000000000001',
   'Lapsing', 'Official', '1980-01-01'),
  -- Sixteen. BR84 asks her for no card, so no lapse can reach her.
  ('b47c0000-0000-0000-0000-000000000002', '47c00000-0000-0000-0000-000000000001',
   'Young', 'MiniRef', (current_date - interval '16 years')::date),
  -- Her mother, so BR113 has somebody to propose to (scope 51).
  ('b47c0000-0000-0000-0000-000000000003', '47c00000-0000-0000-0000-000000000001',
   'MiniRef', 'Mother', '1986-01-01');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('47c00000-0000-0000-0000-000000000001', 'b47c0000-0000-0000-0000-000000000002',
   'b47c0000-0000-0000-0000-000000000003', true, true);

insert into clearance (id, club_id, person_id, identifier, expires_on, verified_at) values
  ('47c00000-0000-0000-0000-0000000000e1', '47c00000-0000-0000-0000-000000000001',
   'b47c0000-0000-0000-0000-000000000001', 'BC-LAPSE',
   (current_date + interval '400 days')::date, now());

insert into team (id, club_id, season_id, name) values
  ('47c00000-0000-0000-0000-0000000000c1', '47c00000-0000-0000-0000-000000000001',
   '47c00000-0000-0000-0000-0000000000aa', 'U12'),
  -- The side he coaches. A different one from the side he referees for,
  -- because BR109 refuses that combination at the appointment — the
  -- ordinary volunteer, not a contrivance.
  ('47c00000-0000-0000-0000-0000000000c2', '47c00000-0000-0000-0000-000000000001',
   '47c00000-0000-0000-0000-0000000000aa', 'U8');

insert into fixture (id, club_id, season_id, team_id, opponent, played_on, kick_off, home_away, status) values
  ('47c00000-0000-0000-0000-0000000000f1', '47c00000-0000-0000-0000-000000000001',
   '47c00000-0000-0000-0000-0000000000aa', '47c00000-0000-0000-0000-0000000000c1',
   'Rivals', (current_date + 30)::date, '09:00', 'home', 'scheduled'),
  ('47c00000-0000-0000-0000-0000000000f2', '47c00000-0000-0000-0000-000000000001',
   '47c00000-0000-0000-0000-0000000000aa', '47c00000-0000-0000-0000-0000000000c1',
   'Wanderers', (current_date - 20)::date, '11:00', 'away', 'played');

-- The holder's two assignments: a future appointment and a coaching role.
-- Both are emptied by the lapse; the past fixture is not.
insert into match_official_appointment (id, club_id, fixture_id, person_id, role, state) values
  ('47c00000-0000-0000-0000-0000000000a1', '47c00000-0000-0000-0000-000000000001',
   '47c00000-0000-0000-0000-0000000000f1', 'b47c0000-0000-0000-0000-000000000001',
   'assistant_referee', 'accepted'),
  ('47c00000-0000-0000-0000-0000000000a2', '47c00000-0000-0000-0000-000000000001',
   '47c00000-0000-0000-0000-0000000000f2', 'b47c0000-0000-0000-0000-000000000001',
   'referee', 'accepted');

insert into team_member (id, club_id, team_id, person_id, role) values
  ('47c00000-0000-0000-0000-0000000000d1', '47c00000-0000-0000-0000-000000000001',
   '47c00000-0000-0000-0000-0000000000c2', 'b47c0000-0000-0000-0000-000000000001', 'coach');

commit;

do $$
declare
  the_club  uuid := '47c00000-0000-0000-0000-000000000001';
  other     uuid := '47c00000-0000-0000-0000-000000000002';
  holder    uuid := 'b47c0000-0000-0000-0000-000000000001';
  minor     uuid := 'b47c0000-0000-0000-0000-000000000002';
  mum       uuid := 'b47c0000-0000-0000-0000-000000000003';
  coord     uuid := 'd47c0000-0000-0000-0000-000000000001';
  coach     uuid := 'd47c0000-0000-0000-0000-000000000002';
  outsider  uuid := 'd47c0000-0000-0000-0000-000000000003';
  future    uuid := '47c00000-0000-0000-0000-0000000000f1';
  past_appt uuid := '47c00000-0000-0000-0000-0000000000a2';
  v_text    text;
  n         integer;
  v_total   integer;
  failures  text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- The MiniRef takes the fixture the lapse is about to empty, so scenario 5
  -- has something that *could* have been swept and was not.
  insert into match_official_appointment
    (club_id, fixture_id, person_id, role, state, responded_by_person_id)
  values (the_club, future, minor, 'fourth_official', 'accepted', mum);

  -- 1. **The lapse.** Revoking the card fires 0044's trigger, which calls
  --    the sweep — so this is the immediate path, not the nightly one, and
  --    both must record the same thing.
  update clearance set revoked_at = now()
   where id = '47c00000-0000-0000-0000-0000000000e1';

  select count(*) into n from clearance_lapse_vacancy where club_id = the_club;
  if n <> 2 then
    failures := array_append(failures,
      'a lapse that emptied a future appointment and a coaching role recorded '
      || n || ' vacancies, not 2 — so there is nothing to notify anybody from (BR50)');
  end if;

  -- 2. The vacancy says what was lost, in words. "One assignment" is not
  --    something a coordinator can act on at nine on a Friday.
  select describes into v_text from clearance_lapse_vacancy
   where club_id = the_club and kind = 'appointment';
  if v_text is null or v_text not like '%Assistant Referee%Rivals%' then
    failures := array_append(failures,
      'the appointment vacancy does not name the role and the fixture: '
      || coalesce(v_text, 'null'));
  end if;

  select describes into v_text from clearance_lapse_vacancy
   where club_id = the_club and kind = 'team_role';
  if v_text is null or v_text not like '%Coach%U8%' then
    failures := array_append(failures,
      'the team-role vacancy does not name the role and the team: ' || coalesce(v_text, 'null'));
  end if;

  -- 3. **The past is not a vacancy.** BR50 keeps past assignments as
  --    historical record; nobody is asked to re-fill a match already played.
  select count(*) into n from clearance_lapse_vacancy v
   where v.appointment_id = past_appt;
  if n <> 0 then
    failures := array_append(failures,
      'a fixture already played was recorded as a vacancy needing re-filling');
  end if;

  -- 4. **A second sweep writes nothing**, and nor does a third. The
  --    guarantee is the unique constraint, so this holds even if a future
  --    caller forgets it.
  select count(*) into n from clearance_lapse_vacancy where club_id = the_club;
  perform app_withdraw_lapsed_clearances(the_club);
  perform app_withdraw_lapsed_clearances(the_club);
  select count(*) - n into n from clearance_lapse_vacancy where club_id = the_club;
  if n <> 0 then
    failures := array_append(failures,
      'two more sweeps recorded ' || n || ' further vacancies, so somebody is told twice');
  end if;

  -- 5. **The MiniRef has none.** She needed no card, so nothing of hers
  --    lapsed — a sweep that emptied a child's fixture would be BR84
  --    inverted, and it would arrive as an email saying so.
  select count(*) into n from clearance_lapse_vacancy where person_id = minor;
  if n <> 0 then
    failures := array_append(failures,
      'a sixteen-year-old, who needs no Working with Children Check at all, was '
      || 'recorded as having lost an assignment to one lapsing (BR84)');
  end if;

  -- 6 and 7, which are one situation. The club restores the official's
  --    card, the coordinator puts them back on the match, they also take a
  --    manager's role in that team — and then the card is revoked again.
  --
  -- 6. **The same assignment emptying twice is one vacancy.** They were
  --    told; telling them again is noise. The guarantee is a unique
  --    constraint, so it holds even if a future caller forgets it.
  --
  -- 7. **A conflict that arose after the appointment must not block the
  --    withdrawal.** Found while writing this suite. 0025's guard fires on
  --    update as well as insert, so BR109 refused the sweep's own write —
  --    BR50 could not take an uncleared official off a children's match
  --    because a second rule also said they should not be there. Removing
  --    somebody is never the moment to refuse on the grounds that they
  --    should not be there; 0044 learned this for the card check, and 0025
  --    predates that lesson.
  update clearance set revoked_at = null
   where id = '47c00000-0000-0000-0000-0000000000e1';
  update match_official_appointment set state = 'proposed', reason = null
   where id = '47c00000-0000-0000-0000-0000000000a1';
  insert into team_member (club_id, team_id, person_id, role)
  values (the_club, '47c00000-0000-0000-0000-0000000000c1', holder, 'manager');

  select count(*) into n from clearance_lapse_vacancy
   where appointment_id = '47c00000-0000-0000-0000-0000000000a1';

  begin
    update clearance set revoked_at = now()
     where id = '47c00000-0000-0000-0000-0000000000e1';
  exception when others then
    failures := array_append(failures,
      'revoking the card could not withdraw an official who had since joined the '
      || 'fixture''s team: ' || sqlerrm);
  end;

  select state into v_text from match_official_appointment
   where id = '47c00000-0000-0000-0000-0000000000a1';
  if v_text is distinct from 'withdrawn' then
    failures := array_append(failures,
      'a conflicting official was left on the match sheet as ' || coalesce(v_text, 'null'));
  end if;

  select count(*) - n into n from clearance_lapse_vacancy
   where appointment_id = '47c00000-0000-0000-0000-0000000000a1';
  if n <> 0 then
    failures := array_append(failures,
      'the same assignment emptying twice produced ' || n || ' extra vacancies, '
      || 'so somebody is told about it twice');
  end if;

  -- 8. **Holder and coordinator are marked separately.** Two messages to
  --    two people: a subscriber who has unsubscribed (BR129) must not
  --    silence the other's notice, and a club with no coordinator recorded
  --    must still tell the official.
  select count(*) into v_total from clearance_lapse_vacancy where club_id = the_club;
  update clearance_lapse_vacancy set holder_notified_at = now()
   where club_id = the_club;
  select count(*) into n from clearance_lapse_vacancy
   where club_id = the_club and coordinator_notified_at is null;
  if n <> v_total then
    failures := array_append(failures,
      'marking the holder notified also settled the coordinator''s notice for '
      || (v_total - n) || ' vacancies');
  end if;

  -- ---------------------------------------------------- who may read it
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coord::text, true);
  select count(*) into n from clearance_lapse_vacancy;
  if n <> v_total then
    failures := array_append(failures,
      'the coordinator, who is the person expected to fill the vacancy, reads '
      || n || ' of the club''s ' || v_total);
  end if;

  -- 9. A coach reads none. A vacancy names somebody whose card has lapsed,
  --    which is closer to a clearance record than to a match sheet.
  perform set_config('request.jwt.claim.sub', coach::text, true);
  select count(*) into n from clearance_lapse_vacancy;
  if n <> 0 then
    failures := array_append(failures, 'a coach read ' || n || ' vacancies');
  end if;

  -- 10. Another club reads none (P5).
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select count(*) into n from clearance_lapse_vacancy;
  if n <> 0 then
    failures := array_append(failures,
      'a coordinator at another club read ' || n || ' of this club''s vacancies (P5)');
  end if;

  -- 11. **Nobody writes this table by hand.** Not a fabricated vacancy, and
  --     not a real one silenced by marking it notified — the second is the
  --     one that matters, because it fails quietly.
  perform set_config('request.jwt.claim.sub', coord::text, true);
  begin
    insert into clearance_lapse_vacancy (club_id, person_id, kind, appointment_id, describes)
    values (the_club, holder, 'appointment', null, 'Invented.');
    failures := array_append(failures, 'a coordinator inserted a vacancy by hand');
  exception when others then
    null;
  end;

  update clearance_lapse_vacancy set coordinator_notified_at = now() where club_id = the_club;
  perform set_config('role', 'postgres', true);
  select count(*) into n from clearance_lapse_vacancy
   where club_id = the_club and coordinator_notified_at is not null;
  if n <> 0 then
    failures := array_append(failures,
      'a coordinator silenced ' || n || ' vacancies by marking them notified');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'The vacancy a lapse leaves FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'The vacancy a lapse leaves OK — 11 scenarios; a lapse records what it emptied in words, the past is not a vacancy, a child never has one, a second sweep and a re-appointment both add nothing, holder and coordinator are marked apart, a conflict arising later never blocks the sweep''s own write, and the table is read by the people who fill vacancies and written by nobody';
end
$$;
