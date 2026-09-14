-- Does a report refuse, or does it quietly lie?
--
-- This suite exists for one scenario and the rest is context. Row-Level
-- Security hides rows and **does not refuse sums**, so a finance report
-- aggregating what the caller can see would hand a coach `$0 outstanding`
-- — correct isolation producing a confident lie, and the kind nobody
-- catches because it looks like good news.
--
--   * a coach is **refused** each report, not given zeros,
--   * the roles that may have one get the **true** total, computed over
--     rows RLS would have hidden from them in an ordinary query,
--   * a treasurer gets finance and not the registration queue's report,
--     and a coordinator the reverse — the checks are per report,
--   * owing and credit are counted apart, never netted,
--   * an attached voucher is not counted as relief (BR81),
--   * and a blocker is counted once per registration, not once per recheck.

\set ON_ERROR_STOP on

begin;

-- **Its own club**, unlike most suites here. Every other test asserts
-- about rows it inserted; this one asserts about *totals*, and a total
-- computed over a fixture four other suites also write to is a number that
-- changes when somebody else adds a registration. Sharing North Star cost
-- two failures before this club existed.
insert into club (id, name, jurisdiction) values
  ('99995555-0000-0000-0000-000000000001', 'Reporting Test FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('99995555-0000-0000-0000-0000000000aa', '99995555-0000-0000-0000-000000000001',
   '2026', '2026-01-01', '2026-12-01');

insert into auth.users (id, email) values
  ('d39a0000-0000-0000-0000-000000000001', 'report.coach@northstar.test'),
  ('d39a0000-0000-0000-0000-000000000002', 'report.treasurer@northstar.test'),
  ('d39a0000-0000-0000-0000-000000000003', 'report.coordinator@northstar.test'),
  ('d39a0000-0000-0000-0000-000000000004', 'report.registrar@northstar.test');

insert into club_membership (club_id, user_id, role) values
  ('99995555-0000-0000-0000-000000000001', 'd39a0000-0000-0000-0000-000000000001', 'coach'),
  ('99995555-0000-0000-0000-000000000001', 'd39a0000-0000-0000-0000-000000000002', 'treasurer'),
  ('99995555-0000-0000-0000-000000000001', 'd39a0000-0000-0000-0000-000000000003', 'coordinator'),
  ('99995555-0000-0000-0000-000000000001', 'd39a0000-0000-0000-0000-000000000004', 'registrar');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b39a0000-0000-0000-0000-000000000001', '99995555-0000-0000-0000-000000000001', 'Owing', 'One', '2014-01-01'),
  ('b39a0000-0000-0000-0000-000000000002', '99995555-0000-0000-0000-000000000001', 'Credit', 'Two', '2014-02-02'),
  ('b39a0000-0000-0000-0000-000000000003', '99995555-0000-0000-0000-000000000001', 'Clear', 'Three', '2014-03-03');

insert into registration (id, club_id, person_id, season_id, status, outstanding_amount_cents) values
  ('c39a0000-0000-0000-0000-000000000001', '99995555-0000-0000-0000-000000000001',
   'b39a0000-0000-0000-0000-000000000001', '99995555-0000-0000-0000-0000000000aa', 'PENDING_PAYMENT', 8000),
  ('c39a0000-0000-0000-0000-000000000002', '99995555-0000-0000-0000-000000000001',
   'b39a0000-0000-0000-0000-000000000002', '99995555-0000-0000-0000-0000000000aa', 'COMPLETE', -2000),
  ('c39a0000-0000-0000-0000-000000000003', '99995555-0000-0000-0000-000000000001',
   'b39a0000-0000-0000-0000-000000000003', '99995555-0000-0000-0000-0000000000aa', 'COMPLETE', 0);

-- The same rule failing the same registration twice, at different times.
-- A blocker count that reads every row would say two.
insert into validation_result (club_id, registration_id, rule_id, status, message, evaluated_at) values
  ('99995555-0000-0000-0000-000000000001', 'c39a0000-0000-0000-0000-000000000001',
   'BR3', 'fail', 'Outstanding.', now() - interval '2 days'),
  ('99995555-0000-0000-0000-000000000001', 'c39a0000-0000-0000-0000-000000000001',
   'BR3', 'fail', 'Still outstanding.', now());

-- One attached and one verified, so BR81's distinction is testable.
--
-- The verified one needs the receipt that applied it: the schema refuses a
-- VERIFIED voucher with no relief payment, because a discount nobody can
-- trace is what that constraint exists to prevent. Writing the fixture
-- taught the same lesson the rule is about.
insert into payment
  (id, club_id, registration_id, amount_cents, received_on, method, recorded_by_user_id)
values ('a39a0000-0000-0000-0000-000000000001', '99995555-0000-0000-0000-000000000001',
        'c39a0000-0000-0000-0000-000000000002', 15000, current_date, 'voucher',
        'd1111111-1111-1111-1111-111111111111');

insert into registration_voucher
  (club_id, registration_id, program, code, face_value_cents, state, attached_by_user_id) values
  ('99995555-0000-0000-0000-000000000001', 'c39a0000-0000-0000-0000-000000000001',
   'Play On!', 'REPORT-A', 15000, 'ATTACHED', 'd1111111-1111-1111-1111-111111111111');

insert into registration_voucher
  (club_id, registration_id, program, code, face_value_cents, state, attached_by_user_id, relief_payment_id)
values ('99995555-0000-0000-0000-000000000001', 'c39a0000-0000-0000-0000-000000000002',
        'Play On!', 'REPORT-V', 15000, 'VERIFIED', 'd1111111-1111-1111-1111-111111111111',
        'a39a0000-0000-0000-0000-000000000001');

commit;

do $$
declare
  the_club   uuid := '99995555-0000-0000-0000-000000000001';
  season     uuid := '99995555-0000-0000-0000-0000000000aa';
  registrar  uuid := 'd39a0000-0000-0000-0000-000000000004';
  coach      uuid := 'd39a0000-0000-0000-0000-000000000001';
  treasurer  uuid := 'd39a0000-0000-0000-0000-000000000002';
  coord      uuid := 'd39a0000-0000-0000-0000-000000000003';
  n          bigint;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. **The scenario this suite exists for.** A coach aggregating what
  --    they can see would get zero; they must get an exception instead.
  perform set_config('request.jwt.claim.sub', coach::text, true);
  begin
    perform * from app_finance_summary(the_club, season);
    failures := array_append(failures,
      'a coach was given a finance report — RLS would have made it $0, which reads as good news');
  exception when others then
    if sqlerrm not like '%BR142%' then
      failures := array_append(failures, 'the finance refusal did not cite BR142: ' || sqlerrm);
    end if;
  end;

  -- 2. **And the same for the other two.** Three reports, three checks,
  --    rather than one check somebody remembers to copy.
  begin
    perform * from app_registration_summary(the_club, season);
    failures := array_append(failures, 'a coach was given the registration report');
  exception when others then null;
  end;
  begin
    perform * from app_officiating_summary(the_club, season);
    failures := array_append(failures, 'a coach was given the officiating report');
  exception when others then null;
  end;

  -- 3. **The checks are per report, not one blanket role set.** A
  --    treasurer has finance and not the registrar's queue report; a
  --    coordinator the reverse.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  begin
    perform * from app_registration_summary(the_club, season);
    failures := array_append(failures, 'a treasurer was given the registration report');
  exception when others then null;
  end;

  perform set_config('request.jwt.claim.sub', coord::text, true);
  begin
    perform * from app_finance_summary(the_club, season);
    failures := array_append(failures, 'a coordinator was given the finance report');
  exception when others then null;
  end;

  -- 4. **A treasurer gets the true total**, computed over rows an ordinary
  --    query as them would not have returned in full.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  select outstanding_cents into n from app_finance_summary(the_club, season);
  if n <> 8000 then
    failures := array_append(failures, 'outstanding came back as ' || n || ', expected 8000');
  end if;

  -- 5. **Owing and credit are counted apart, never netted.** A club owed
  --    $80 that owes $20 back is not a club owed $60.
  select credit_cents into n from app_finance_summary(the_club, season);
  if n <> 2000 then
    failures := array_append(failures, 'credit came back as ' || n || ', expected 2000 — netted?');
  end if;
  select owing into n from app_finance_summary(the_club, season);
  if n <> 1 then
    failures := array_append(failures, 'families owing came back as ' || n || ', expected 1');
  end if;

  -- 6. **BR81 — an attached voucher has moved no money.** Counting it as
  --    relief overstates what the club has collected.
  select voucher_relief_cents into n from app_finance_summary(the_club, season);
  if n <> 15000 then
    failures := array_append(failures,
      'voucher relief came back as ' || n || ', expected 15000 — an attached voucher was counted');
  end if;
  select vouchers_attached into n from app_finance_summary(the_club, season);
  if n <> 1 then
    failures := array_append(failures, 'the attached voucher was not surfaced as work');
  end if;

  -- 7. **A blocker is counted once per registration, not once per
  --    recheck.** `validation_result` is a history; reading every row
  --    double-counts the same family.
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  select (blocked_by ->> 'BR3')::bigint into n from app_registration_summary(the_club, season);
  if n <> 1 then
    failures := array_append(failures,
      'BR3 blocked ' || n || ' registrations; it blocks one, counted twice by reading the history');
  end if;

  select complete into n from app_registration_summary(the_club, season);
  if n <> 2 then
    failures := array_append(failures, 'complete came back as ' || n || ', expected 2');
  end if;

  -- 8. **Another club's officer gets nothing of this club's**, the
  --    ordinary claim — worth asserting because these functions bypass RLS.
  perform set_config('request.jwt.claim.sub', 'd2222222-2222-2222-2222-222222222222', true);
  begin
    perform * from app_finance_summary(the_club, season);
    failures := array_append(failures,
      'another club''s officer read this club''s finance report — a definer function bypassing RLS');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'Reporting FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Reporting OK — 8 scenarios; a coach is refused rather than handed zeros, the checks are per report, owing and credit stay apart, and a blocker is counted once per registration';
end
$$;
