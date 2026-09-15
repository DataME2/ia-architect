-- Can a club rewrite what it paid last season?
--
-- The fee-schedule editor is the screen scope 34 left unbuilt as WP2, and
-- until it existed no club had any rates at all — so `rateFor` returned "no
-- rate" for every appointment and no official could be paid.
--
-- The editor does not offer to change a superseded schedule. **That offer
-- being absent is not a control**, which is the T2 defect class this
-- repository keeps a list of, so the refusal lives here.
--
-- BR115: a schedule is a dated version, not an edited row. Editing a
-- superseded one is a second answer to "what did we pay from March", given
-- after the question was asked.
--
--   * a superseded schedule refuses an added, changed or removed rate,
--   * **the schedule in force does not** — a rate mistyped this morning
--     must be correctable,
--   * nor does one that has not started yet,
--   * publishing a later schedule closes the earlier one **at that moment**,
--     without anything editing the earlier one,
--   * a second schedule starting the same day is refused (one answer per
--     date),
--   * and the roles are 0026's: a coordinator reads and does not write, a
--     treasurer writes, another club sees none of it.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('48c00000-0000-0000-0000-000000000001', 'Rates FC', 'AU-QLD'),
  ('48c00000-0000-0000-0000-000000000002', 'Other FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('d48c0000-0000-0000-0000-000000000001', 'treasurer@rates.test'),
  ('d48c0000-0000-0000-0000-000000000002', 'coord@rates.test'),
  ('d48c0000-0000-0000-0000-000000000003', 'treasurer@other.test');

insert into club_membership (club_id, user_id, role) values
  ('48c00000-0000-0000-0000-000000000001', 'd48c0000-0000-0000-0000-000000000001', 'treasurer'),
  ('48c00000-0000-0000-0000-000000000001', 'd48c0000-0000-0000-0000-000000000002', 'coordinator'),
  ('48c00000-0000-0000-0000-000000000002', 'd48c0000-0000-0000-0000-000000000003', 'treasurer');

-- Seeded one schedule at a time, each with its rates, because 0047 closes a
-- schedule the moment a later one is published — so last season's rates have
-- to be written while last season's schedule is still the one in force.
-- Which is exactly how a real club arrives at this state.
insert into referee_fee_schedule (id, club_id, effective_from, note) values
  ('48c00000-0000-0000-0000-0000000000b1', '48c00000-0000-0000-0000-000000000001',
   (current_date - 400)::date, 'Season before last');
insert into referee_fee_rate (club_id, schedule_id, role, amount_cents) values
  ('48c00000-0000-0000-0000-000000000001', '48c00000-0000-0000-0000-0000000000b1', 'referee', 4000);

insert into referee_fee_schedule (id, club_id, effective_from, note) values
  ('48c00000-0000-0000-0000-0000000000b2', '48c00000-0000-0000-0000-000000000001',
   (current_date - 30)::date, 'Current');
insert into referee_fee_rate (club_id, schedule_id, role, amount_cents) values
  ('48c00000-0000-0000-0000-000000000001', '48c00000-0000-0000-0000-0000000000b2', 'referee', 4500);

insert into referee_fee_schedule (id, club_id, effective_from, note) values
  ('48c00000-0000-0000-0000-0000000000b3', '48c00000-0000-0000-0000-000000000001',
   (current_date + 60)::date, 'From the AGM');
insert into referee_fee_rate (club_id, schedule_id, role, amount_cents) values
  ('48c00000-0000-0000-0000-000000000001', '48c00000-0000-0000-0000-0000000000b3', 'referee', 5000);

commit;

do $$
declare
  the_club  uuid := '48c00000-0000-0000-0000-000000000001';
  old_s     uuid := '48c00000-0000-0000-0000-0000000000b1';
  now_s     uuid := '48c00000-0000-0000-0000-0000000000b2';
  later_s   uuid := '48c00000-0000-0000-0000-0000000000b3';
  treasurer uuid := 'd48c0000-0000-0000-0000-000000000001';
  coord     uuid := 'd48c0000-0000-0000-0000-000000000002';
  outsider  uuid := 'd48c0000-0000-0000-0000-000000000003';
  v_cents   integer;
  n         integer;
  failures  text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- 1. **The scenario this suite exists for.** Rewriting what the club paid
  --    from a date it has already paid from.
  begin
    update referee_fee_rate set amount_cents = 9900
     where schedule_id = old_s;
    failures := array_append(failures,
      'a superseded schedule''s rate was rewritten — what the club paid from that '
      || 'date now has a second answer (BR115)');
  exception when others then
    null;
  end;

  select amount_cents into v_cents from referee_fee_rate where schedule_id = old_s;
  if v_cents is distinct from 4000 then
    failures := array_append(failures,
      'last season''s rate is now ' || coalesce(v_cents::text, 'null') || ' rather than 4000');
  end if;

  -- 2. And nothing may be added to it or taken out of it either. A rate
  --    quietly appearing in a closed schedule prices a past match that was
  --    unpriced when it was played.
  begin
    insert into referee_fee_rate (club_id, schedule_id, role, amount_cents)
    values (the_club, old_s, 'fourth_official', 1000);
    failures := array_append(failures, 'a rate was added to a superseded schedule');
  exception when others then
    null;
  end;

  begin
    delete from referee_fee_rate where schedule_id = old_s;
    failures := array_append(failures, 'a rate was deleted from a superseded schedule');
  exception when others then
    null;
  end;

  -- 3. **The schedule in force is still editable.** A rate mistyped this
  --    morning must be correctable; a rule that refused would send the club
  --    to a second schedule starting today, which is worse history than the
  --    typo.
  begin
    update referee_fee_rate set amount_cents = 4600 where schedule_id = now_s;
  exception when others then
    failures := array_append(failures,
      'the schedule in force could not be corrected: ' || sqlerrm);
  end;

  begin
    insert into referee_fee_rate (club_id, schedule_id, role, amount_cents)
    values (the_club, now_s, 'assistant_referee', 3000);
  exception when others then
    failures := array_append(failures,
      'a rate could not be added to the schedule in force: ' || sqlerrm);
  end;

  -- 4. Nor is one that has not started yet closed. It is nobody's answer to
  --    anything until its date arrives.
  begin
    update referee_fee_rate set amount_cents = 5100 where schedule_id = later_s;
    insert into referee_fee_rate (club_id, schedule_id, role, amount_cents)
    values (the_club, later_s, 'fourth_official', 2500);
  exception when others then
    failures := array_append(failures,
      'a schedule that has not started yet was treated as history: ' || sqlerrm);
  end;

  -- 5. **Publishing closes the earlier one at that moment**, with nothing
  --    editing the earlier one. This is the part a `closed` flag would get
  --    wrong: somebody would have to remember to set it.
  insert into referee_fee_schedule (club_id, effective_from, note)
  values (the_club, current_date, 'Published today');

  begin
    update referee_fee_rate set amount_cents = 4700 where schedule_id = now_s;
    failures := array_append(failures,
      'the previously-current schedule stayed editable after a later one was published');
  exception when others then
    null;
  end;

  -- 6. One answer per date (0026's unique constraint, asserted because the
  --    editor's message depends on it).
  begin
    insert into referee_fee_schedule (club_id, effective_from)
    values (the_club, current_date);
    failures := array_append(failures,
      'two schedules start on the same day, so the club has two answers to what it pays');
  exception when others then
    null;
  end;

  -- ------------------------------------------------------------ the roles
  -- 7. A coordinator reads the rates — they need to know what a game pays
  --    before designating somebody — and sets none of them.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coord::text, true);

  select count(*) into n from referee_fee_rate;
  if n = 0 then
    failures := array_append(failures,
      'a coordinator cannot read what a game pays before designating somebody');
  end if;

  begin
    insert into referee_fee_rate (club_id, schedule_id, role, amount_cents)
    values (the_club, later_s, 'referee', 1);
    failures := array_append(failures, 'a coordinator set a rate (0026: admin and treasurer)');
  exception when others then
    null;
  end;

  -- 8. A treasurer sets them, because the Committee decides the rates and
  --    the treasurer keeps them.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  begin
    insert into referee_fee_rate (club_id, schedule_id, role, competition, amount_cents)
    values (the_club, later_s, 'referee', 'Div 3', 5500);
  exception when others then
    failures := array_append(failures, 'a treasurer could not set a rate: ' || sqlerrm);
  end;

  -- 9. Another club sees none of it (P5).
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select count(*) into n from referee_fee_rate;
  if n <> 0 then
    failures := array_append(failures,
      'a treasurer at another club read ' || n || ' of this club''s rates (P5)');
  end if;
  select count(*) into n from referee_fee_schedule;
  if n <> 0 then
    failures := array_append(failures,
      'a treasurer at another club read ' || n || ' of this club''s schedules (P5)');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'A superseded schedule is history FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A superseded schedule is history OK — 9 scenarios; a closed schedule refuses an added, changed or removed rate while the one in force and the one not yet started do not, publishing closes the earlier one with nothing editing it, one date has one answer, and the rates are read by those who designate and set by those who pay';
end
$$;
