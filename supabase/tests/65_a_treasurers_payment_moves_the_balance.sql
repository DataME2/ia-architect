-- 0103: a treasurer's payment moves the balance (scope 134, WP1a; BR77, BR78).
--
-- Before 0103 a payment was an insert and then a second, separate update of
-- the registration's balance, and the update was refused — silently — for a
-- treasurer who was not also an admin: the receipt was recorded and the
-- balance stayed where it was. Each scenario below is the failure it would
-- catch if `app_record_payment` regressed:
--
--   1. a treasurer's payment that does not move the balance (the defect);
--   2. the finance report's figures disagreeing with each other after it;
--   3-4. a plan's balance not re-derived from its total, or a reversal not
--        correcting it by the same route;
--   5. a reversal pointing at another registration's payment;
--   6-9. somebody other than the admin or treasurer recording money, at this
--        club or across clubs, or a club mismatch slipping through;
--   10. a refusal halfway through leaving a stray receipt behind (BR90).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990103-0000-0000-0000-000000000001', 'Ledger FC', 'AU-QLD'),
  ('99990103-0000-0000-0000-000000000002', 'Rival Ledger FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('99990103-0000-0000-0000-0000000000a1', '99990103-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days'),
  ('99990103-0000-0000-0000-0000000000a2', '99990103-0000-0000-0000-000000000002',
   '2026', current_date - interval '60 days', current_date + interval '200 days'),
  ('99990103-0000-0000-0000-0000000000a3', '99990103-0000-0000-0000-000000000001',
   '2024', date '2024-01-01', date '2024-12-31');

insert into auth.users (id, email) values
  ('d0103000-0000-0000-0000-000000000001', 'treasurer@ledger.test'),
  ('d0103000-0000-0000-0000-000000000002', 'registrar@ledger.test'),
  ('d0103000-0000-0000-0000-000000000003', 'admin@ledger.test'),
  ('d0103000-0000-0000-0000-000000000004', 'treasurer@rival.test'),
  ('d0103000-0000-0000-0000-000000000005', 'stranger@nowhere.test');

insert into club_membership (club_id, user_id, role) values
  ('99990103-0000-0000-0000-000000000001', 'd0103000-0000-0000-0000-000000000001', 'treasurer'),
  ('99990103-0000-0000-0000-000000000001', 'd0103000-0000-0000-0000-000000000002', 'registrar'),
  ('99990103-0000-0000-0000-000000000001', 'd0103000-0000-0000-0000-000000000003', 'admin'),
  ('99990103-0000-0000-0000-000000000002', 'd0103000-0000-0000-0000-000000000004', 'treasurer');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0103000-0000-0000-0000-000000000001', '99990103-0000-0000-0000-000000000001', 'No', 'Plan', '2014-03-01'),
  ('b0103000-0000-0000-0000-000000000002', '99990103-0000-0000-0000-000000000001', 'On', 'Plan', '2013-05-01'),
  ('b0103000-0000-0000-0000-000000000003', '99990103-0000-0000-0000-000000000002', 'Their', 'Player', '2014-07-01'),
  ('b0103000-0000-0000-0000-000000000004', '99990103-0000-0000-0000-000000000001', 'Old', 'Season', '2012-09-01');

-- No fee schedule exists at either club, so the balance opens as written
-- here (0100's trigger leaves the season's own fee standing).
insert into registration (id, club_id, person_id, season_id, status, outstanding_amount_cents) values
  ('99990103-0000-0000-0000-0000000000e1', '99990103-0000-0000-0000-000000000001',
   'b0103000-0000-0000-0000-000000000001', '99990103-0000-0000-0000-0000000000a1', 'PENDING_PAYMENT', 12000),
  ('99990103-0000-0000-0000-0000000000e2', '99990103-0000-0000-0000-000000000001',
   'b0103000-0000-0000-0000-000000000002', '99990103-0000-0000-0000-0000000000a1', 'PENDING_PAYMENT', 12000),
  ('99990103-0000-0000-0000-0000000000e3', '99990103-0000-0000-0000-000000000002',
   'b0103000-0000-0000-0000-000000000003', '99990103-0000-0000-0000-0000000000a2', 'PENDING_PAYMENT', 5000);

-- What the first registration was charged, so the report has a billed
-- figure that does not depend on the balance (0102 reads the latest price).
insert into registration_price (club_id, registration_id, lines, sibling_index, discount_cents, total_cents, reason, priced_by)
values ('99990103-0000-0000-0000-000000000001', '99990103-0000-0000-0000-0000000000e1',
        '[]', 0, 0, 12000, 'opened', null);

-- A live plan on the second, its three instalments summing to the total (BR74).
insert into payment_plan (id, club_id, registration_id, total_cents, cadence, created_by_user_id)
values ('99990103-0000-0000-0000-0000000000f1', '99990103-0000-0000-0000-000000000001',
        '99990103-0000-0000-0000-0000000000e2', 12000, 'monthly', 'd0103000-0000-0000-0000-000000000001');
insert into payment_installment (club_id, payment_plan_id, sequence, due_on, amount_cents) values
  ('99990103-0000-0000-0000-000000000001', '99990103-0000-0000-0000-0000000000f1', 1, current_date + 10, 4000),
  ('99990103-0000-0000-0000-000000000001', '99990103-0000-0000-0000-0000000000f1', 2, current_date + 40, 4000),
  ('99990103-0000-0000-0000-000000000001', '99990103-0000-0000-0000-0000000000f1', 3, current_date + 70, 4000);

-- A registration imported as history (BR90): only an import may mark one.
insert into historical_import (id, club_id, season_id, source, masked, rows_read)
values ('99990103-0000-0000-0000-0000000000c1', '99990103-0000-0000-0000-000000000001',
        '99990103-0000-0000-0000-0000000000a3', 'suite 65 fixture', true, 1);
select set_config('app.importing_history', 'on', true);
insert into registration (id, club_id, person_id, season_id, status, outstanding_amount_cents, imported_from) values
  ('99990103-0000-0000-0000-0000000000e4', '99990103-0000-0000-0000-000000000001',
   'b0103000-0000-0000-0000-000000000004', '99990103-0000-0000-0000-0000000000a3', 'COMPLETE', 0,
   '99990103-0000-0000-0000-0000000000c1');

commit;

do $$
declare
  ledger    uuid := '99990103-0000-0000-0000-000000000001';
  rival     uuid := '99990103-0000-0000-0000-000000000002';
  no_plan   uuid := '99990103-0000-0000-0000-0000000000e1';
  on_plan   uuid := '99990103-0000-0000-0000-0000000000e2';
  theirs    uuid := '99990103-0000-0000-0000-0000000000e3';
  history   uuid := '99990103-0000-0000-0000-0000000000e4';
  treasurer uuid := 'd0103000-0000-0000-0000-000000000001';
  registrar uuid := 'd0103000-0000-0000-0000-000000000002';
  admin_    uuid := 'd0103000-0000-0000-0000-000000000003';
  rival_t   uuid := 'd0103000-0000-0000-0000-000000000004';
  stranger  uuid := 'd0103000-0000-0000-0000-000000000005';
  pay_id    uuid;
  second_id uuid;
  balance   integer;
  n         integer;
  billed    bigint;
  paid      bigint;
  owed      bigint;
  credit    bigint;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The defect: a treasurer-only account records $50.00 against $120.00.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  pay_id := app_record_payment(ledger, no_plan, 5000, current_date, 'cash', 'R-1', null);

  perform set_config('role', 'postgres', true);
  select outstanding_amount_cents into balance from registration where id = no_plan;
  if balance is distinct from 7000 then
    failures := array_append(failures, format('a treasurer''s $50.00 left the balance at %s, not 7000', balance));
  end if;
  if not exists (select 1 from payment where id = pay_id and recorded_by_user_id = treasurer) then
    failures := array_append(failures, 'the payment does not name the treasurer who recorded it');
  end if;
  select count(*) into n from audit_event where entity = 'payment' and entity_id = pay_id and action = 'payment_recorded';
  if n <> 1 then
    failures := array_append(failures, format('%s audit lines for the payment, not 1', n));
  end if;

  -- 2. The report agrees with itself: billed = collected + outstanding - credit.
  select b.invoiced_cents, b.paid_cents, b.outstanding_cents, b.credit_cents
    into billed, paid, owed, credit
    from finance_bills(ledger) b where b.bill_id = no_plan;
  if billed <> 12000 or paid <> 5000 or owed <> 7000 or billed <> paid + owed - credit then
    failures := array_append(failures, format('the report read billed %s, collected %s, outstanding %s, credit %s',
                                              billed, paid, owed, credit));
  end if;

  -- 3. With a live plan the balance is the plan's total less every receipt.
  perform set_config('role', 'authenticated', true);
  perform app_record_payment(ledger, on_plan, 3000, current_date, 'card', null, null);
  second_id := app_record_payment(ledger, on_plan, 2000, current_date, 'bank-transfer', null, null);
  perform set_config('role', 'postgres', true);
  select outstanding_amount_cents into balance from registration where id = on_plan;
  if balance is distinct from 7000 then
    failures := array_append(failures, format('a plan of 12000 less 5000 received left %s, not 7000', balance));
  end if;

  -- 4. Reversing the $20.00 corrects the balance by the same route (BR77).
  perform set_config('role', 'authenticated', true);
  perform app_record_payment(ledger, on_plan, -2000, current_date, 'adjustment', 'Bounced', second_id);
  perform set_config('role', 'postgres', true);
  select outstanding_amount_cents into balance from registration where id = on_plan;
  if balance is distinct from 9000 then
    failures := array_append(failures, format('the reversal left %s, not 9000', balance));
  end if;

  -- 5. A reversal naming another registration's payment is refused, and
  --    writes nothing.
  select count(*) into n from payment where registration_id = no_plan;
  perform set_config('role', 'authenticated', true);
  begin
    perform app_record_payment(ledger, no_plan, -2000, current_date, 'adjustment', null, second_id);
    failures := array_append(failures, 'a reversal of another registration''s payment was accepted');
  exception when check_violation then null;
  end;
  perform set_config('role', 'postgres', true);
  if (select count(*) from payment where registration_id = no_plan) <> n then
    failures := array_append(failures, 'a refused reversal still wrote a payment');
  end if;

  -- 6. A registrar reads money and does not record it (BR78).
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  begin
    perform app_record_payment(ledger, no_plan, 1000, current_date, 'cash', null, null);
    failures := array_append(failures, 'a registrar recorded a payment');
  exception when insufficient_privilege then null;
  end;

  -- 7. Another club's treasurer cannot record against this club's
  --    registration, under either club's name.
  perform set_config('request.jwt.claim.sub', rival_t::text, true);
  begin
    perform app_record_payment(ledger, no_plan, 1000, current_date, 'cash', null, null);
    failures := array_append(failures, 'another club''s treasurer recorded a payment here');
  exception when insufficient_privilege then null;
  end;
  begin
    perform app_record_payment(rival, no_plan, 1000, current_date, 'cash', null, null);
    failures := array_append(failures, 'a registration was found under the wrong club');
  exception when no_data_found then null;
  end;

  -- 8. A stranger with an account, and nobody at all, record nothing.
  perform set_config('request.jwt.claim.sub', stranger::text, true);
  begin
    perform app_record_payment(ledger, no_plan, 1000, current_date, 'cash', null, null);
    failures := array_append(failures, 'a non-member recorded a payment');
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform app_record_payment(ledger, no_plan, 1000, current_date, 'cash', null, null);
    failures := array_append(failures, 'an anonymous caller recorded a payment');
  exception when insufficient_privilege then null;
  end;

  -- 9. The treasurer acting in their own club cannot name it for a
  --    registration that is not its own.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  begin
    perform app_record_payment(ledger, theirs, 1000, current_date, 'cash', null, null);
    failures := array_append(failures, 'a registration of another club was found under this one');
  exception when no_data_found then null;
  end;

  perform set_config('role', 'postgres', true);
  select count(*) into n from payment where registration_id in (no_plan, theirs) and amount_cents = 1000;
  if n <> 0 then
    failures := array_append(failures, format('%s refused payments were written anyway', n));
  end if;
  select outstanding_amount_cents into balance from registration where id = no_plan;
  if balance is distinct from 7000 then
    failures := array_append(failures, format('refused calls moved the balance to %s', balance));
  end if;

  -- 10. History does not change (BR90), and a refusal leaves no stray receipt:
  --     before 0103 the payment was written and only the balance update failed.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_::text, true);
  begin
    perform app_record_payment(ledger, history, 1000, current_date, 'cash', null, null);
    failures := array_append(failures, 'a payment against imported history was accepted');
  exception when insufficient_privilege then null;
  end;
  perform set_config('role', 'postgres', true);
  if exists (select 1 from payment where registration_id = history) then
    failures := array_append(failures, 'a refused payment against history left a receipt behind');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'A treasurer''s payment moves the balance FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'A treasurer''s payment moves the balance OK — 10 scenarios';
end $$;
