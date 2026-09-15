-- Can an adult with no Working with Children Check referee a children's match?
--
-- Found while building R20.7 and proved before it was fixed: **yes**. A
-- person with no `clearance` row and no `referee` season role went straight
-- into `match_official_appointment` for a fixture thirty days out.
--
-- BR84 is enforced — on `person_role`. What had no clearance check at all
-- was the appointment: 0025's guard is *the three refusals* in its own
-- comment (BR6, BR9, BR109, plus BR11's double-booking) and never asked
-- about a card. R20.4 claimed otherwise and had claimed it since it was
-- written.
--
-- **Reachable through the product's own flow**, not merely through SQL:
-- the screens list officials from `referee_profile`, and scope 39 creates
-- that profile even when BR84 refuses the season role — its
-- `accepted_without_role` outcome, added so a coordinator's decision is not
-- lost. The right call locally; the consequence was not followed through.
--
-- The second half is BR50, written since the business layer was drafted and
-- never coded: a card that lapses must withdraw its holder from every
-- **future** assignment, leaving past ones as historical record.
--
--   * an uncleared adult is refused the appointment,
--   * a cleared one is not, and the check is against the **fixture's date**
--     rather than the season's end (BR111's line, for BR111's reason),
--   * an under-18 is exempt, as BR84 says,
--   * revocation withdraws future appointments **immediately**,
--   * expiry withdraws them on the nightly sweep,
--   * a withdrawal carries its reason, and **past fixtures are untouched**,
--   * and the sweep is idempotent.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('45c00000-0000-0000-0000-000000000001', 'Card Check FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('45c00000-0000-0000-0000-0000000000aa', '45c00000-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days');

insert into auth.users (id, email) values
  ('d45c0000-0000-0000-0000-000000000001', 'coord@cardcheck.test');
insert into club_membership (club_id, user_id, role) values
  ('45c00000-0000-0000-0000-000000000001', 'd45c0000-0000-0000-0000-000000000001', 'coordinator');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  -- Adult, no clearance at all. The person this suite exists for.
  ('b45c0000-0000-0000-0000-000000000001', '45c00000-0000-0000-0000-000000000001',
   'Uncleared', 'Adult', '1980-01-01'),
  -- Adult with a verified card covering the season.
  ('b45c0000-0000-0000-0000-000000000002', '45c00000-0000-0000-0000-000000000001',
   'Cleared', 'Adult', '1981-01-01'),
  -- Fifteen. BR84 exempts them.
  ('b45c0000-0000-0000-0000-000000000003', '45c00000-0000-0000-0000-000000000001',
   'Young', 'MiniRef', (current_date - interval '15 years')::date),
  -- Adult whose card will be revoked mid-suite.
  ('b45c0000-0000-0000-0000-000000000004', '45c00000-0000-0000-0000-000000000001',
   'ToBe', 'Revoked', '1982-01-01'),
  -- Adult whose card expires next week: valid for a fixture in three days,
  -- not for one in thirty. BR111's line, drawn for a clearance.
  ('b45c0000-0000-0000-0000-000000000005', '45c00000-0000-0000-0000-000000000001',
   'Expiring', 'Soon', '1983-01-01');

insert into clearance (club_id, person_id, identifier, expires_on, verified_at) values
  ('45c00000-0000-0000-0000-000000000001', 'b45c0000-0000-0000-0000-000000000002',
   'BC-CLEARED', (current_date + interval '400 days')::date, now()),
  ('45c00000-0000-0000-0000-000000000001', 'b45c0000-0000-0000-0000-000000000004',
   'BC-REVOKE', (current_date + interval '400 days')::date, now()),
  ('45c00000-0000-0000-0000-000000000001', 'b45c0000-0000-0000-0000-000000000005',
   'BC-EXPIRING', (current_date + interval '7 days')::date, now());

insert into team (id, club_id, season_id, name) values
  ('45c00000-0000-0000-0000-0000000000c1', '45c00000-0000-0000-0000-000000000001',
   '45c00000-0000-0000-0000-0000000000aa', 'U12');

insert into fixture (id, club_id, season_id, team_id, opponent, played_on, home_away, status) values
  -- Thirty days out.
  ('45c00000-0000-0000-0000-0000000000f1', '45c00000-0000-0000-0000-000000000001',
   '45c00000-0000-0000-0000-0000000000aa', '45c00000-0000-0000-0000-0000000000c1',
   'Rivals', (current_date + 30)::date, 'home', 'scheduled'),
  -- Three days out — inside the expiring card's window.
  ('45c00000-0000-0000-0000-0000000000f2', '45c00000-0000-0000-0000-000000000001',
   '45c00000-0000-0000-0000-0000000000aa', '45c00000-0000-0000-0000-0000000000c1',
   'Rivals', (current_date + 3)::date, 'away', 'scheduled'),
  -- Already played. BR50 leaves this alone.
  ('45c00000-0000-0000-0000-0000000000f3', '45c00000-0000-0000-0000-000000000001',
   '45c00000-0000-0000-0000-0000000000aa', '45c00000-0000-0000-0000-0000000000c1',
   'Rivals', (current_date - 20)::date, 'home', 'played');

commit;

do $$
declare
  uncleared uuid := 'b45c0000-0000-0000-0000-000000000001';
  cleared   uuid := 'b45c0000-0000-0000-0000-000000000002';
  minor     uuid := 'b45c0000-0000-0000-0000-000000000003';
  revoked   uuid := 'b45c0000-0000-0000-0000-000000000004';
  expiring  uuid := 'b45c0000-0000-0000-0000-000000000005';
  the_club  uuid := '45c00000-0000-0000-0000-000000000001';
  far       uuid := '45c00000-0000-0000-0000-0000000000f1';
  soon      uuid := '45c00000-0000-0000-0000-0000000000f2';
  past      uuid := '45c00000-0000-0000-0000-0000000000f3';
  v_state   text;
  v_reason  text;
  n         integer;
  failures  text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- 1. **The scenario this suite exists for.** An adult with no card, and
  --    no referee role, appointed to a children's fixture.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role, state)
    values (the_club, far, uncleared, 'referee', 'accepted');
    failures := array_append(failures,
      'an adult with no Working with Children Check was appointed to officiate a '
      || 'children''s fixture — BR84 is enforced on person_role and nowhere near this table');
  exception when others then
    if sqlerrm not like '%BR84%' and sqlerrm not like '%BR19%' then
      failures := array_append(failures, 'the refusal did not cite BR84: ' || sqlerrm);
    end if;
  end;

  -- 2. **A cleared adult is not refused**, or the check is a blanket ban.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role, state)
    values (the_club, far, cleared, 'referee', 'accepted');
  exception when others then
    failures := array_append(failures, 'a cleared adult was refused: ' || sqlerrm);
  end;

  -- 3. **BR84 exempts an under-18.** MiniRefs are children, and the rule
  --    says so explicitly.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role, state)
    values (the_club, far, minor, 'assistant_referee', 'accepted');
  exception when others then
    failures := array_append(failures, 'a fifteen-year-old MiniRef was refused: ' || sqlerrm);
  end;

  -- 4. **Measured against the fixture, not the season** (BR111's line). A
  --    card expiring in seven days covers a match in three and not one in
  --    thirty — and a season-end check would have refused both.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role, state)
    values (the_club, soon, expiring, 'referee', 'accepted');
  exception when others then
    failures := array_append(failures,
      'a card valid on the day of the match was refused — the check is measured '
      || 'against the season rather than the fixture: ' || sqlerrm);
  end;

  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role, state)
    values (the_club, far, expiring, 'referee', 'accepted');
    failures := array_append(failures,
      'a card that expires before the match was accepted for it');
  exception when others then null;
  end;

  -- 5. **Revocation withdraws future appointments immediately** (BR50).
  insert into match_official_appointment (club_id, fixture_id, person_id, role, state)
  values (the_club, far, revoked, 'referee', 'accepted');
  insert into match_official_appointment (club_id, fixture_id, person_id, role, state)
  values (the_club, past, revoked, 'referee', 'accepted');

  update clearance set revoked_at = now()
   where person_id = revoked and club_id = the_club;

  select state, reason into v_state, v_reason
    from match_official_appointment
   where person_id = revoked and fixture_id = far;
  if v_state is distinct from 'withdrawn' then
    failures := array_append(failures,
      'a revoked clearance left a future appointment standing as ' || coalesce(v_state, 'null')
      || ' — BR50 says revocation withdraws');
  end if;
  if coalesce(btrim(v_reason), '') = '' then
    failures := array_append(failures, 'the withdrawal carried no reason');
  end if;

  -- 6. **Past assignments are historical record** (BR50, explicitly).
  select state into v_state
    from match_official_appointment where person_id = revoked and fixture_id = past;
  if v_state is distinct from 'accepted' then
    failures := array_append(failures,
      'a fixture already played was rewritten to ' || coalesce(v_state, 'null')
      || ' — BR50 leaves the past alone');
  end if;

  -- 7. **Expiry withdraws on the sweep**, which is the half a trigger
  --    cannot do: nothing is written when a date passes.
  update clearance set expires_on = (current_date - 1)::date
   where person_id = cleared and club_id = the_club;

  perform app_withdraw_lapsed_clearances(the_club);

  select state into v_state
    from match_official_appointment where person_id = cleared and fixture_id = far;
  if v_state is distinct from 'withdrawn' then
    failures := array_append(failures,
      'an expired clearance left a future appointment standing as ' || coalesce(v_state, 'null'));
  end if;

  -- 8. **The sweep is idempotent.** It runs nightly; a second pass must
  --    not re-withdraw, re-notify, or disturb what it already settled.
  select count(*) into n from match_official_appointment
   where club_id = the_club and state = 'withdrawn';
  perform app_withdraw_lapsed_clearances(the_club);
  perform app_withdraw_lapsed_clearances(the_club);
  select count(*) - n into n from match_official_appointment
   where club_id = the_club and state = 'withdrawn';
  if n <> 0 then
    failures := array_append(failures, 'a second sweep changed ' || n || ' more rows');
  end if;

  -- 9. **The MiniRef is left alone by the sweep.** Exempt at appointment
  --    time and exempt afterwards — a sweep that withdrew children would
  --    be the rule inverted.
  select state into v_state
    from match_official_appointment where person_id = minor and fixture_id = far;
  if v_state is distinct from 'accepted' then
    failures := array_append(failures,
      'the sweep withdrew a fifteen-year-old, who needs no card at all (BR84)');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Card at the appointment FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Card at the appointment OK — 9 scenarios; no card no match, measured against the fixture rather than the season, under-18s exempt at both moments, revocation withdraws at once and expiry on the sweep, the past is left alone, and running the sweep twice changes nothing';
end
$$;
