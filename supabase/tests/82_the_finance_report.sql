-- Does the finance report read every season the same way, and only for the
-- roles that may? (0102, scope 133, BR142, BR199)
--
--   * an imported season reports what it invoiced, collected and left
--     outstanding, and what the bills were made of,
--   * a live season reports its registrations as bills, priced by the schedule,
--   * a family's bill is split between its players' teams by its lines, and
--     its payments and balance follow, so nothing is counted twice,
--   * the bills list pages, filters by team, by balance and by name,
--   * the committee reads the figures but not a family's bills; a registrar,
--     another club's treasurer and an anonymous caller read neither.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('82c00000-0000-0000-0000-000000000001', 'Ledger FC', 'AU-QLD'),
  ('82c00000-0000-0000-0000-000000000002', 'Elsewhere FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('82c00000-0000-0000-0000-0000000000a6', '82c00000-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31');
insert into fee_line (club_id, season_id, kind, name, amount_cents, standard) values
  ('82c00000-0000-0000-0000-000000000001', '82c00000-0000-0000-0000-0000000000a6', 'club', 'Everyone', 50000, true);

insert into auth.users (id, email) values
  ('d82c0000-0000-0000-0000-000000000001', 'treasurer@ledger.test'),
  ('d82c0000-0000-0000-0000-000000000002', 'committee@ledger.test'),
  ('d82c0000-0000-0000-0000-000000000003', 'registrar@ledger.test'),
  ('d82c0000-0000-0000-0000-000000000004', 'treasurer@elsewhere.test');

insert into club_membership (club_id, user_id, role) values
  ('82c00000-0000-0000-0000-000000000001', 'd82c0000-0000-0000-0000-000000000001', 'treasurer'),
  ('82c00000-0000-0000-0000-000000000001', 'd82c0000-0000-0000-0000-000000000002', 'committee'),
  ('82c00000-0000-0000-0000-000000000001', 'd82c0000-0000-0000-0000-000000000003', 'registrar'),
  ('82c00000-0000-0000-0000-000000000002', 'd82c0000-0000-0000-0000-000000000004', 'treasurer');

-- 2025, imported: one family with two children in two teams, part paid,
-- and an adult in no team, paid in full.
select import_history_season('82c00000-0000-0000-0000-000000000001', $j${
  "season": {"name": "2025", "startsOn": "2025-01-01", "endsOn": "2025-12-31"},
  "source": "Registrations_2025Season-Test.csv", "masked": true, "rowsRead": 2,
  "people": [
    {"key": "g1", "kind": "guardian", "given": "Ada", "family": "Ledger", "email": "ada@ledger.test"},
    {"key": "p1", "kind": "player", "given": "Ben", "family": "Ledger", "dob": "2015-05-01", "gender": "male", "guardian": "g1"},
    {"key": "p2", "kind": "player", "given": "Cara", "family": "Ledger", "dob": "2017-07-07", "gender": "female", "guardian": "g1"},
    {"key": "p3", "kind": "player", "given": "Dan", "family": "Solo", "dob": "1990-01-01", "gender": "male", "email": "dan@ledger.test"}],
  "registrations": [
    {"person": "p1", "registeredAt": "2025-02-01T09:00:00+10:00", "playingGroup": null},
    {"person": "p2", "registeredAt": "2025-02-01T09:00:00+10:00", "playingGroup": null},
    {"person": "p3", "registeredAt": "2025-03-01T09:00:00+10:00", "playingGroup": null}],
  "emergencyContacts": [],
  "teams": [{"name": "U10 Blue", "ageGroup": "U10", "category": "Miniroos"}, {"name": "U8 Red", "ageGroup": "U8", "category": "Miniroos"}],
  "teamMembers": [{"team": "U10 Blue", "person": "p1"}, {"team": "U8 Red", "person": "p2"}],
  "invoices": [
    {"reference": "MASK0000001", "invoicedOn": "2025-02-01", "payer": "g1", "invoiceCents": 100000, "paidCents": 60000,
     "creditCents": 0, "outstandingCents": 40000, "payments": 2, "lastPaidOn": "2025-04-01",
     "lines": [{"registration": "p1", "category": "club", "description": "Player Fee - MiniRoos", "cents": 60000},
               {"registration": "p2", "category": "club", "description": "Player Fee - MiniRoos", "cents": 50000},
               {"registration": "p2", "category": "discount", "description": "Sibling Discount - 2nd Child", "cents": -10000}]},
    {"reference": "MASK0000002", "invoicedOn": "2025-03-01", "payer": "p3", "invoiceCents": 20000, "paidCents": 20000,
     "creditCents": 0, "outstandingCents": 0, "payments": 1, "lastPaidOn": "2025-03-02",
     "lines": [{"registration": "p3", "category": "club", "description": "Player Fee - Seniors", "cents": 20000}]}]
}$j$::jsonb);

-- 2026, live: one registration priced by the schedule, part paid.
insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('82b00000-0000-0000-0000-000000000001', '82c00000-0000-0000-0000-000000000001', 'Eve', 'Live', '2016-01-01');
insert into registration (id, club_id, person_id, season_id, status) values
  ('82a00000-0000-0000-0000-000000000001', '82c00000-0000-0000-0000-000000000001', '82b00000-0000-0000-0000-000000000001',
   '82c00000-0000-0000-0000-0000000000a6', 'PENDING_PAYMENT');
insert into payment (club_id, registration_id, amount_cents, received_on, method, recorded_by_user_id) values
  ('82c00000-0000-0000-0000-000000000001', '82a00000-0000-0000-0000-000000000001', 20000, '2026-02-01', 'cash',
   'd82c0000-0000-0000-0000-000000000001');
update registration set outstanding_amount_cents = 30000 where id = '82a00000-0000-0000-0000-000000000001';

commit;

do $$
declare
  the_club   uuid := '82c00000-0000-0000-0000-000000000001';
  season26   uuid := '82c00000-0000-0000-0000-0000000000a6';
  season25   uuid;
  treasurer  uuid := 'd82c0000-0000-0000-0000-000000000001';
  committee  uuid := 'd82c0000-0000-0000-0000-000000000002';
  registrar  uuid := 'd82c0000-0000-0000-0000-000000000003';
  elsewhere  uuid := 'd82c0000-0000-0000-0000-000000000004';
  rep        jsonb;
  s25        jsonb;
  s26        jsonb;
  b          jsonb;
  t          text;
  failures   text[] := '{}';
begin
  select id into season25 from season where club_id = the_club and name = '2025';
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', treasurer::text, true);

  -- 1. An imported season: billed, collected, outstanding and made of.
  rep := app_finance_report(the_club);
  select e into s25 from jsonb_array_elements(rep->'seasons') e where e->>'name' = '2025';
  select e into s26 from jsonb_array_elements(rep->'seasons') e where e->>'name' = '2026';
  if (s25->>'invoiced')::int <> 120000 or (s25->>'collected')::int <> 80000 or (s25->>'outstanding')::int <> 40000
     or (s25->>'bills')::int <> 2 or (s25->>'owing')::int <> 1 or not (s25->>'imported')::boolean then
    failures := array_append(failures, '2025 reported ' || coalesce(s25::text, 'nothing') || ' rather than 120000 billed, 80000 in, 40000 owed');
  end if;
  if (s25#>>'{components,club}')::int <> 130000 or (s25#>>'{components,discount}')::int <> -10000 then
    failures := array_append(failures, '2025 was made of ' || coalesce(s25->>'components', 'nothing') || ' rather than 130000 in fees less 10000');
  end if;

  -- 2. A live season: its registration is its bill, priced by the schedule.
  if (s26->>'invoiced')::int <> 50000 or (s26->>'collected')::int <> 20000 or (s26->>'outstanding')::int <> 30000
     or (s26#>>'{components,club}')::int <> 50000 or (s26->>'imported')::boolean then
    failures := array_append(failures, '2026 reported ' || coalesce(s26::text, 'nothing') || ' rather than 50000 billed, 20000 in, 30000 owed');
  end if;

  -- 3. The family's bill split by its lines (BR199): 60% to U10 Blue, 40% to U8 Red.
  if not exists (select 1 from jsonb_array_elements(s25->'teams') e
                  where e->>'team' = 'U10 Blue' and (e->>'invoiced')::int = 60000 and (e->>'collected')::int = 36000
                    and (e->>'outstanding')::int = 24000 and (e->>'players')::int = 1)
     or not exists (select 1 from jsonb_array_elements(s25->'teams') e
                     where e->>'team' = 'U8 Red' and (e->>'invoiced')::int = 40000 and (e->>'collected')::int = 24000
                       and (e->>'outstanding')::int = 16000)
     or not exists (select 1 from jsonb_array_elements(s25->'teams') e
                     where e->>'team' = 'No team' and (e->>'invoiced')::int = 20000 and (e->>'outstanding')::int = 0) then
    failures := array_append(failures, 'the teams read ' || coalesce(s25->>'teams', 'nothing') || ' rather than 60/40 of the family''s bill (BR199)');
  end if;
  if (select sum((e->>'outstanding')::int) from jsonb_array_elements(s25->'teams') e) <> 40000 then
    failures := array_append(failures, 'the teams'' balances do not add up to the season''s');
  end if;

  -- 4. The bills: largest balance first, with players and lines; then filtered.
  b := app_finance_bills(the_club, season25);
  if (b->>'total')::int <> 2 or b#>>'{rows,0,reference}' <> 'MASK0000001'
     or jsonb_array_length(b#>'{rows,0,players}') <> 2 or jsonb_array_length(b#>'{rows,0,lines}') <> 3
     or b#>>'{rows,0,payer}' <> 'Ada Ledger' then
    failures := array_append(failures, 'the 2025 bills read ' || left(b::text, 300));
  end if;
  if (app_finance_bills(the_club, season25, null, true)->>'total')::int <> 1
     or (app_finance_bills(the_club, season25, 'U8 Red')->>'total')::int <> 1
     or (app_finance_bills(the_club, season25, null, false, 'solo')->>'total')::int <> 1
     or (app_finance_bills(the_club, season25, null, false, null, 1, 1)#>>'{rows,0,reference}') <> 'MASK0000002' then
    failures := array_append(failures, 'a filtered or paged list of bills came back wrong');
  end if;
  b := app_finance_bills(the_club, season26);
  if (b->>'total')::int <> 1 or (b#>>'{rows,0,invoiced}')::int <> 50000 or (b#>>'{rows,0,outstanding}')::int <> 30000 then
    failures := array_append(failures, 'the live season''s bills read ' || left(b::text, 300));
  end if;

  -- 5. The committee reads the figures, not a family's bills.
  perform set_config('request.jwt.claim.sub', committee::text, true);
  begin
    perform app_finance_report(the_club);
  exception when others then
    failures := array_append(failures, 'the committee was refused the season figures');
  end;
  begin
    perform app_finance_bills(the_club, season25);
    failures := array_append(failures, 'the committee read a family''s bills (BR78)');
  exception when insufficient_privilege then null;
  end;

  -- 6. Nobody else reads either.
  foreach t in array array[registrar::text, elsewhere::text] loop
    perform set_config('request.jwt.claim.sub', t, true);
    begin
      perform app_finance_report(the_club);
      failures := array_append(failures, (case when t = registrar::text then 'the registrar' else 'another club''s treasurer' end)
                                         || ' read the finance report (BR142)');
    exception when insufficient_privilege then null;
    end;
    begin
      perform app_finance_bills(the_club, season25);
      failures := array_append(failures, (case when t = registrar::text then 'the registrar' else 'another club''s treasurer' end)
                                         || ' read the bills');
    exception when insufficient_privilege then null;
    end;
  end loop;
  perform set_config('role', 'anon', true);
  begin
    perform app_finance_report(the_club);
    failures := array_append(failures, 'an anonymous caller read the finance report');
  exception when insufficient_privilege then null;
  end;

  perform set_config('role', 'postgres', true);
  if array_length(failures, 1) > 0 then
    raise exception 'The finance report FAILED:%', E'\n  - ' || array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'The finance report OK — 6 scenarios; an imported and a live season read the same way, a family''s bill is split between its players'' teams by its lines with nothing counted twice, the bills page and filter by team, balance and name, the committee reads the figures but no family''s bill, and a registrar, another club''s treasurer and an anonymous caller read neither';
end
$$;
