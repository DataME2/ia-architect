-- 0068: a coach reads no payment plan (scope 35 WP2, #73, BR78).
--
--   * the admin, treasurer, registrar and IT manager read the plan, its
--     instalments and its receipts,
--   * a coach, a committee member and a coordinator read none of the three
--     (BR122: a narrowing is proved by a test that fails when it is widened),
--   * the family still reads its own plan, instalments and receipts.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990068-0000-0000-0000-000000000001', 'Money Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e0068000-0000-0000-0000-000000000001', 'admin@money.test'),
  ('e0068000-0000-0000-0000-000000000002', 'treasurer@money.test'),
  ('e0068000-0000-0000-0000-000000000003', 'registrar@money.test'),
  ('e0068000-0000-0000-0000-000000000004', 'itmanager@money.test'),
  ('e0068000-0000-0000-0000-000000000005', 'coach@money.test'),
  ('e0068000-0000-0000-0000-000000000006', 'committee@money.test'),
  ('e0068000-0000-0000-0000-000000000007', 'coordinator@money.test'),
  ('e0068000-0000-0000-0000-000000000008', 'parent@money.test');

insert into club_membership (club_id, user_id, role) values
  ('99990068-0000-0000-0000-000000000001', 'e0068000-0000-0000-0000-000000000001', 'admin'),
  ('99990068-0000-0000-0000-000000000001', 'e0068000-0000-0000-0000-000000000002', 'treasurer'),
  ('99990068-0000-0000-0000-000000000001', 'e0068000-0000-0000-0000-000000000003', 'registrar'),
  ('99990068-0000-0000-0000-000000000001', 'e0068000-0000-0000-0000-000000000004', 'digital_technology_manager'),
  ('99990068-0000-0000-0000-000000000001', 'e0068000-0000-0000-0000-000000000005', 'coach'),
  ('99990068-0000-0000-0000-000000000001', 'e0068000-0000-0000-0000-000000000006', 'committee'),
  ('99990068-0000-0000-0000-000000000001', 'e0068000-0000-0000-0000-000000000007', 'coordinator');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0068000-0000-0000-0000-000000000001', '99990068-0000-0000-0000-000000000001', 'Parent', 'Money', '1985-01-01'),
  ('b0068000-0000-0000-0000-000000000002', '99990068-0000-0000-0000-000000000001', 'Child', 'Money', current_date - interval '10 years');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99990068-0000-0000-0000-000000000001', 'b0068000-0000-0000-0000-000000000002', 'b0068000-0000-0000-0000-000000000001', true, true);

insert into account_person (club_id, user_id, person_id) values
  ('99990068-0000-0000-0000-000000000001', 'e0068000-0000-0000-0000-000000000008', 'b0068000-0000-0000-0000-000000000001');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a0068000-0000-0000-0000-000000000001', '99990068-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31');

insert into registration (id, club_id, person_id, season_id) values
  ('c0068000-0000-0000-0000-000000000001', '99990068-0000-0000-0000-000000000001', 'b0068000-0000-0000-0000-000000000002', 'a0068000-0000-0000-0000-000000000001');

insert into payment_plan (id, club_id, registration_id, total_cents, cadence, created_by_user_id) values
  ('d0068000-0000-0000-0000-000000000001', '99990068-0000-0000-0000-000000000001', 'c0068000-0000-0000-0000-000000000001', 12000, 'monthly', 'e0068000-0000-0000-0000-000000000002');

insert into payment_installment (club_id, payment_plan_id, sequence, due_on, amount_cents) values
  ('99990068-0000-0000-0000-000000000001', 'd0068000-0000-0000-0000-000000000001', 1, '2026-03-01', 6000),
  ('99990068-0000-0000-0000-000000000001', 'd0068000-0000-0000-0000-000000000001', 2, '2026-04-01', 6000);

insert into payment (club_id, registration_id, amount_cents, received_on, method, recorded_by_user_id) values
  ('99990068-0000-0000-0000-000000000001', 'c0068000-0000-0000-0000-000000000001', 6000, '2026-03-01', 'bank-transfer', 'e0068000-0000-0000-0000-000000000002');

commit;

do $$
declare
  reader   record;
  plans    integer;
  instals  integer;
  receipts integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  for reader in
    select * from (values
      ('e0068000-0000-0000-0000-000000000001'::uuid, 'the admin',       true),
      ('e0068000-0000-0000-0000-000000000002'::uuid, 'the treasurer',   true),
      ('e0068000-0000-0000-0000-000000000003'::uuid, 'the registrar',   true),
      ('e0068000-0000-0000-0000-000000000004'::uuid, 'the IT manager',  true),
      ('e0068000-0000-0000-0000-000000000008'::uuid, 'the family',      true),
      ('e0068000-0000-0000-0000-000000000005'::uuid, 'a coach',         false),
      ('e0068000-0000-0000-0000-000000000006'::uuid, 'the committee',   false),
      ('e0068000-0000-0000-0000-000000000007'::uuid, 'the coordinator', false)
    ) as t(uid, label, sees)
  loop
    perform set_config('request.jwt.claim.sub', reader.uid::text, true);
    select count(*) into plans    from payment_plan        where registration_id = 'c0068000-0000-0000-0000-000000000001';
    select count(*) into instals  from payment_installment where payment_plan_id = 'd0068000-0000-0000-0000-000000000001';
    select count(*) into receipts from payment             where registration_id = 'c0068000-0000-0000-0000-000000000001';

    if reader.sees and (plans <> 1 or instals <> 2 or receipts <> 1) then
      failures := array_append(failures, format('%s should read the plan: saw %s plan, %s instalments, %s receipts',
                                                reader.label, plans, instals, receipts));
    end if;
    if not reader.sees and (plans + instals + receipts) <> 0 then
      failures := array_append(failures, format('%s read money: %s plan, %s instalments, %s receipts (BR78)',
                                                reader.label, plans, instals, receipts));
    end if;
  end loop;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'A coach reads no payment plan FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A coach reads no payment plan OK — 8 readers';
end
$$;
