-- Can somebody verify their own match, and can a club price one?
--
-- Two things are being asked here, and the first is the one that would be
-- quietly wrong:
--
--   * BR119 — the person being paid does not get to say the match happened.
--     This is only checkable because migration 0022 recorded which Person
--     an account belongs to; before that link existed the platform could
--     not tell that the coordinator signing this off and the official on
--     the appointment were the same human.
--
--   * BR115 — a fee schedule is a dated version, so a rate published in
--     July does not reprice a game played in May.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d1200000-0000-0000-0000-00000000000a', 'the.official@northstar.test'),
  ('d1200000-0000-0000-0000-00000000000b', 'someone.else@northstar.test');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b1200000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
   'Paid', 'Official', '1990-10-10');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  season_ns  uuid := 'a1111111-1111-1111-1111-111111111111';
  ns_admin   uuid := 'd1111111-1111-1111-1111-111111111111';
  rival_reg  uuid := 'd2222222-2222-2222-2222-222222222222';
  self_user  uuid := 'd1200000-0000-0000-0000-00000000000a';
  other_user uuid := 'd1200000-0000-0000-0000-00000000000b';
  official   uuid := 'b1200000-0000-0000-0000-00000000000a';
  the_fix    uuid;
  the_appt   uuid;
  second_fix uuid;
  second_appt uuid;
  sched_may  uuid;
  sched_july uuid;
  treasurer  uuid;
  n          integer;
  t          uuid;
  failures   text[] := '{}';
begin
  perform set_config('role', 'postgres', true);
  insert into club_membership (club_id, user_id, role) values
    (north_star, ns_admin, 'admin'),
    (north_star, self_user, 'coordinator'),
    (north_star, other_user, 'coordinator')
    on conflict do nothing;

  select m.user_id into treasurer
  from club_membership m
  where m.club_id = north_star
  group by m.user_id
  having array_agg(m.role) @> array['treasurer']
     and not (array_agg(m.role) && array['admin','registrar','coordinator']);

  -- The official's own account is linked to their Person (migration 0022).
  insert into account_person (club_id, user_id, person_id)
  values (north_star, self_user, official);

  insert into fixture (id, club_id, season_id, played_on, kick_off, opponent, home_away, competition)
  values (gen_random_uuid(), north_star, season_ns, date '2026-05-16', time '11:00',
          'Fee Test United', 'home', 'Division 3')
  returning id into the_fix;

  insert into match_official_appointment (id, club_id, fixture_id, person_id, state, appointed_by)
  values (gen_random_uuid(), north_star, the_fix, official, 'accepted', 'club')
  returning id into the_appt;

  -- A second fixture and appointment, left unverified, so the permission
  -- checks below have something the permission alone is refusing.
  insert into fixture (id, club_id, season_id, played_on, kick_off, opponent, home_away, competition)
  values (gen_random_uuid(), north_star, season_ns, date '2026-08-15', time '11:00',
          'Fee Test Rovers', 'away', 'Division 3')
  returning id into second_fix;

  insert into match_official_appointment (id, club_id, fixture_id, person_id, state, appointed_by)
  values (gen_random_uuid(), north_star, second_fix, official, 'accepted', 'association')
  returning id into second_appt;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);

  -- ------------------------------------------------------ BR119, the point

  -- 1. **Nobody verifies the match they were paid for.** The account here
  --    is linked to the very Person named on the appointment.
  begin
    insert into appointment_verification (club_id, appointment_id, verified_by)
    values (north_star, the_appt, self_user);
    failures := array_append(failures, 'an official verified the match they officiated');
  exception when others then null;
  end;

  -- 2. Somebody else may.
  begin
    insert into appointment_verification (club_id, appointment_id, verified_by)
    values (north_star, the_appt, other_user);
  exception when others then
    failures := array_append(failures, 'a colleague could not verify the match');
  end;

  -- 3. **And the check is on the link, not on a name.** An account nobody
  --    has linked cannot be recognised as the official — which is the
  --    honest limit of decision 10: identity is asserted, so an unasserted
  --    identity is unknown rather than guessed. Recorded here so the
  --    behaviour is deliberate rather than discovered.
  perform set_config('role', 'postgres', true);
  delete from appointment_verification where appointment_id = the_appt;
  delete from account_person where club_id = north_star and user_id = self_user;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);

  begin
    insert into appointment_verification (club_id, appointment_id, verified_by)
    values (north_star, the_appt, self_user);
  exception when others then
    failures := array_append(failures, 'an unlinked account could not verify at all');
  end;

  select count(*) into n from appointment_verification where appointment_id = the_appt;
  if n <> 1 then
    failures := array_append(failures, 'the verification was not recorded');
  end if;

  -- 4. One verification per appointment. Two would be two answers to
  --    whether the game was officiated.
  begin
    insert into appointment_verification (club_id, appointment_id, verified_by)
    values (north_star, the_appt, other_user);
    failures := array_append(failures, 'a second verification was accepted');
  exception when others then null;
  end;

  -- 5. The trigger fires on update too — verifying as somebody else and
  --    then editing the row is the obvious way round an insert-only guard.
  perform set_config('role', 'postgres', true);
  insert into account_person (club_id, user_id, person_id)
  values (north_star, self_user, official);
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  begin
    update appointment_verification set verified_by = self_user
     where appointment_id = the_appt;
    failures := array_append(failures, 'a verification was edited to name the official');
  exception when others then null;
  end;

  -- ------------------------------------------------- BR115, dated schedules

  insert into referee_fee_schedule (id, club_id, effective_from, note)
  values (gen_random_uuid(), north_star, date '2026-03-01', 'season opening')
  returning id into sched_may;

  insert into referee_fee_rate (club_id, schedule_id, role, amount_cents)
  values (north_star, sched_may, 'referee', 4000);

  insert into referee_fee_schedule (id, club_id, effective_from, note)
  values (gen_random_uuid(), north_star, date '2026-07-01', 'mid-season rise')
  returning id into sched_july;

  insert into referee_fee_rate (club_id, schedule_id, role, amount_cents)
  values (north_star, sched_july, 'referee', 5500);

  -- 6. **A game in May is priced by May's schedule**, after July's exists.
  --    Question #72's answer, made structural: a treasurer must not find
  --    that last month's total has moved.
  if app_fee_schedule_on(north_star, date '2026-05-16') is distinct from sched_may then
    failures := array_append(failures, 'a game was repriced by a schedule published after it');
  end if;

  if app_fee_schedule_on(north_star, date '2026-08-16') is distinct from sched_july then
    failures := array_append(failures, 'a later game was not priced by the current schedule');
  end if;

  -- 7. Before any schedule there is no schedule — not the earliest one.
  --    Inventing a rate for a game played before the club set any is how a
  --    number nobody agreed to ends up on a claim.
  if app_fee_schedule_on(north_star, date '2026-01-01') is not null then
    failures := array_append(failures, 'a rate was resolved before any schedule existed');
  end if;

  -- 8. One schedule per start date.
  begin
    insert into referee_fee_schedule (club_id, effective_from)
    values (north_star, date '2026-07-01');
    failures := array_append(failures, 'two schedules started on one date');
  exception when others then null;
  end;

  -- 9. **One cell, one rate.** `unique nulls not distinct` — without it
  --    Postgres treats each null as unique and a club can define "any
  --    competition, any classification" twice, which is two answers to what
  --    a game pays.
  begin
    insert into referee_fee_rate (club_id, schedule_id, role, amount_cents)
    values (north_star, sched_july, 'referee', 9999);
    failures := array_append(failures, 'the same rate cell was defined twice');
  exception when others then null;
  end;

  -- 10. Differing on a dimension is a different cell, and allowed.
  begin
    insert into referee_fee_rate (club_id, schedule_id, role, competition, amount_cents)
    values (north_star, sched_july, 'referee', 'Division 3', 7000);
  exception when others then
    failures := array_append(failures, 'a more specific rate cell was refused');
  end;

  -- 11. A negative rate is not a rate.
  begin
    insert into referee_fee_rate (club_id, schedule_id, role, amount_cents)
    values (north_star, sched_july, 'fourth_official', -100);
    failures := array_append(failures, 'a negative fee was accepted');
  exception when others then null;
  end;

  -- 12. An invented appointing party is refused — BR16 answers "who pays"
  --     from this column, so it is a closed set.
  begin
    insert into referee_fee_rate (club_id, schedule_id, role, appointed_by, amount_cents)
    values (north_star, sched_july, 'referee', 'whoever', 5000);
    failures := array_append(failures, 'an invented appointing party was priced');
  exception when others then null;
  end;

  -- ------------------------------------------------------------- who reads

  -- 13. A treasurer reads verifications and rates — BR13 makes the first a
  --     precondition of the claim they approve — and writes no verification.
  if treasurer is not null then
    perform set_config('request.jwt.claim.sub', treasurer::text, true);

    select count(*) into n from appointment_verification;
    if n = 0 then
      failures := array_append(failures, 'a treasurer could not read the verification a claim rests on');
    end if;

    select count(*) into n from referee_fee_rate;
    if n = 0 then
      failures := array_append(failures, 'a treasurer could not read the rates they pay');
    end if;

    -- **A second, unverified appointment.** The first version of this used
    -- the appointment already verified above, so the insert failed on the
    -- one-per-appointment constraint rather than on the policy — it passed
    -- with the treasurer added to the write policy, which is exactly what
    -- it claims to refuse. A permission test needs a row the permission is
    -- the only thing standing in the way of.
    begin
      insert into appointment_verification (club_id, appointment_id, verified_by)
      values (north_star, second_appt, treasurer);
      failures := array_append(failures, 'a treasurer verified a match');
    exception when others then null;
    end;
  end if;

  -- 14. A coordinator appoints and verifies, and does not set the rates —
  --     the club's Committee does that (#1), and the treasurer keeps them.
  perform set_config('request.jwt.claim.sub', other_user::text, true);
  begin
    insert into referee_fee_rate (club_id, schedule_id, role, amount_cents)
    values (north_star, sched_july, 'fourth_official', 3000);
    failures := array_append(failures, 'a coordinator set the club''s fee rates');
  exception when others then null;
  end;

  -- 15. Another club reads none of it.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);
  select count(*) into n from referee_fee_rate;
  if n <> 0 then
    failures := array_append(failures, 'another club read the fee schedule');
  end if;
  select count(*) into n from appointment_verification;
  if n <> 0 then
    failures := array_append(failures, 'another club read a verification');
  end if;
  if app_fee_schedule_on(north_star, date '2026-05-16') is not null then
    failures := array_append(failures, 'a function handed another club a schedule');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Verification and fees FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Verification and fees OK — 15 scenarios; nobody verifies their own match, a May game keeps May''s rate, and one cell holds one rate';
end
$$;
