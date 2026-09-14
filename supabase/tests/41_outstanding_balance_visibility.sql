-- Does a debt from a closed season stay visible, and does the record of
-- chasing it hold up on its own?
--
-- Three claims, matching what scope 48's WP1 exists to prove:
--
--   * **BR142 applies to this report too.** A coach gets refused, not a
--     zero — `registration` is club-wide readable at the base-table level,
--     so this is the only thing standing between a coach and the same
--     figures BR78 keeps off their screen elsewhere.
--   * **The two-year window is measured from the season's end**, not from
--     today: a debt from a season that ended inside the window is in view,
--     one from a season that ended outside it is not, even though both
--     rows still sit in `registration` with a positive balance.
--   * **BR79's "never a silent write-off" is enforced twice** — once by
--     `app_record_arrears_action`'s explicit check, and once by the table's
--     own check constraint, which still holds against a caller that
--     bypasses the function and inserts directly.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99996666-0000-0000-0000-000000000001', 'Arrears Test FC', 'AU-QLD');

-- One season well inside the two-year window, one just outside it.
insert into season (id, club_id, name, starts_on, ends_on) values
  ('99996666-0000-0000-0000-0000000000aa', '99996666-0000-0000-0000-000000000001',
   'Recent', '2025-01-01', (current_date - interval '1 year')::date),
  ('99996666-0000-0000-0000-0000000000bb', '99996666-0000-0000-0000-000000000001',
   'Old', '2022-01-01', (current_date - interval '3 years')::date);

insert into auth.users (id, email) values
  ('e39a0000-0000-0000-0000-000000000001', 'arrears.coach@northstar.test'),
  ('e39a0000-0000-0000-0000-000000000002', 'arrears.treasurer@northstar.test'),
  ('e39a0000-0000-0000-0000-000000000003', 'arrears.registrar@northstar.test');

insert into club_membership (club_id, user_id, role) values
  ('99996666-0000-0000-0000-000000000001', 'e39a0000-0000-0000-0000-000000000001', 'coach'),
  ('99996666-0000-0000-0000-000000000001', 'e39a0000-0000-0000-0000-000000000002', 'treasurer'),
  ('99996666-0000-0000-0000-000000000001', 'e39a0000-0000-0000-0000-000000000003', 'registrar');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('f39a0000-0000-0000-0000-000000000001', '99996666-0000-0000-0000-000000000001', 'Owes', 'Recent', '2014-01-01'),
  ('f39a0000-0000-0000-0000-000000000002', '99996666-0000-0000-0000-000000000001', 'Owes', 'Old', '2014-02-02');

insert into registration (id, club_id, person_id, season_id, status, outstanding_amount_cents) values
  ('a49a0000-0000-0000-0000-000000000001', '99996666-0000-0000-0000-000000000001',
   'f39a0000-0000-0000-0000-000000000001', '99996666-0000-0000-0000-0000000000aa', 'PENDING_PAYMENT', 5000),
  ('a49a0000-0000-0000-0000-000000000002', '99996666-0000-0000-0000-000000000001',
   'f39a0000-0000-0000-0000-000000000002', '99996666-0000-0000-0000-0000000000bb', 'PENDING_PAYMENT', 7000);

commit;

do $$
declare
  the_club   uuid := '99996666-0000-0000-0000-000000000001';
  recent_reg uuid := 'a49a0000-0000-0000-0000-000000000001';
  recent_person uuid := 'f39a0000-0000-0000-0000-000000000001';
  recent_season uuid := '99996666-0000-0000-0000-0000000000aa';
  old_person uuid := 'f39a0000-0000-0000-0000-000000000002';
  coach      uuid := 'e39a0000-0000-0000-0000-000000000001';
  treasurer  uuid := 'e39a0000-0000-0000-0000-000000000002';
  registrar  uuid := 'e39a0000-0000-0000-0000-000000000003';
  n          integer;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. A coach is refused the report, not handed a zero or an empty set.
  perform set_config('request.jwt.claim.sub', coach::text, true);
  begin
    perform * from app_outstanding_balances(the_club);
    failures := array_append(failures,
      'a coach was given the outstanding-balances report — RLS on registration would let it through silently');
  exception when others then
    if sqlerrm not like '%BR142%' then
      failures := array_append(failures, 'the refusal did not cite BR142: ' || sqlerrm);
    end if;
  end;

  -- 2. Treasurer and registrar both see it, and the window is honoured:
  -- the recent season's debt is in, the season that ended three years ago
  -- is out, even though both rows carry a positive balance.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  select count(*) into n from app_outstanding_balances(the_club);
  if n <> 1 then
    failures := array_append(failures,
      'expected exactly 1 row within the two-year window, got ' || n);
  end if;

  perform set_config('request.jwt.claim.sub', registrar::text, true);
  if not exists (
    select 1 from app_outstanding_balances(the_club) where person_id = recent_person
  ) then
    failures := array_append(failures, 'the recent season''s arrear did not appear for the registrar');
  end if;

  if exists (
    select 1 from app_outstanding_balances(the_club) where person_id = old_person
  ) then
    failures := array_append(failures,
      'a season that ended three years ago still appeared — the two-year window did not hold');
  end if;

  -- 3. BR79: an amendment with no reason is refused by the convenience
  -- function, citing the rule.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  begin
    perform app_record_arrears_action(the_club, recent_person, recent_season, 'amendment_recorded', null);
    failures := array_append(failures, 'a silent amendment was accepted — BR79 exists to stop exactly this');
  exception when others then
    if sqlerrm not like '%BR79%' then
      failures := array_append(failures, 'the amendment refusal did not cite BR79: ' || sqlerrm);
    end if;
  end;

  -- 4. And the table's own check constraint holds even bypassing the
  -- function — a caller going straight to the table gets no shortcut.
  begin
    insert into arrears_action (club_id, person_id, season_id, action, recorded_by_user_id)
    values (the_club, recent_person, recent_season, 'amendment_recorded', treasurer);
    failures := array_append(failures,
      'a direct insert with no reason bypassed the amendment_recorded check constraint');
  exception when others then null;
  end;

  -- 5. A payment-requested action, properly recorded, then shows as this
  -- Person's most recent action in the report.
  perform app_record_arrears_action(the_club, recent_person, recent_season, 'payment_requested', null);
  if not exists (
    select 1 from app_outstanding_balances(the_club)
     where person_id = recent_person and last_action = 'payment_requested'
  ) then
    failures := array_append(failures,
      'the recorded payment_requested action did not appear as the Person''s latest action');
  end if;

  -- 6. A coach may not insert an arrears_action directly, either — the
  -- append-only insert policy is admin/treasurer only.
  perform set_config('request.jwt.claim.sub', coach::text, true);
  begin
    insert into arrears_action (club_id, person_id, season_id, action, recorded_by_user_id)
    values (the_club, recent_person, recent_season, 'payment_requested', coach);
    failures := array_append(failures, 'a coach recorded an arrears action — insert policy did not hold');
  exception when others then null;
  end;

  -- 7. Nobody may update or delete a recorded action — append-only, like
  -- payment (BR77). With no update/delete policy, RLS matches zero rows
  -- rather than raising, so the assertion is on the row surviving
  -- unchanged, not on an exception being thrown.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  update arrears_action set reason = 'edited' where person_id = recent_person and action = 'payment_requested';
  if exists (select 1 from arrears_action where person_id = recent_person and reason = 'edited') then
    failures := array_append(failures, 'an arrears_action row was updated — it must be append-only');
  end if;

  delete from arrears_action where person_id = recent_person and action = 'payment_requested';
  if not exists (select 1 from arrears_action where person_id = recent_person and action = 'payment_requested') then
    failures := array_append(failures, 'an arrears_action row was deleted — it must be append-only');
  end if;

  -- 8. Another club's officer gets nothing of this club's — the ordinary
  -- claim, worth asserting because this function bypasses RLS by design.
  perform set_config('request.jwt.claim.sub', 'd2222222-2222-2222-2222-222222222222', true);
  begin
    perform * from app_outstanding_balances(the_club);
    failures := array_append(failures,
      'another club''s officer read this club''s outstanding balances — a definer function bypassing RLS');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'Outstanding-balance visibility FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Outstanding-balance visibility OK — 8 scenarios; a coach is refused, the two-year window is measured from the season''s end, an amendment is never silent (twice over), and the log is append-only';
end
$$;
