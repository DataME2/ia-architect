-- 0088: an earlier season's debt at the same club stops play (scope 92;
-- BR79 amended; open question 81).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990088-0000-0000-0000-000000000001', 'Ledger FC', 'AU-QLD'),
  ('99990088-0000-0000-0000-000000000002', 'Elsewhere FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('99990088-0000-0000-0000-0000000000a1', '99990088-0000-0000-0000-000000000001', '2023', current_date - 1300, current_date - 1100),
  ('99990088-0000-0000-0000-0000000000a2', '99990088-0000-0000-0000-000000000001', '2025', current_date - 300, current_date - 100),
  ('99990088-0000-0000-0000-0000000000a3', '99990088-0000-0000-0000-000000000001', '2026', current_date - 50, current_date + 150),
  ('99990088-0000-0000-0000-0000000000b1', '99990088-0000-0000-0000-000000000002', '2026', current_date - 50, current_date + 150);

insert into auth.users (id, email) values
  ('d0088000-0000-0000-0000-000000000001', 'registrar@ledger.test'),
  ('d0088000-0000-0000-0000-000000000002', 'treasurer@ledger.test');

insert into club_membership (club_id, user_id, role) values
  ('99990088-0000-0000-0000-000000000001', 'd0088000-0000-0000-0000-000000000001', 'registrar');

-- P owes 2025; Q owed 2023 (outside the two years); R owes 2025, amended;
-- S owes 2025, payment requested only; T owes only this season.
insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0088000-0000-0000-0000-00000000000f', '99990088-0000-0000-0000-000000000001', 'Pat', 'Owing', '2014-01-01'),
  ('b0088000-0000-0000-0000-00000000000a', '99990088-0000-0000-0000-000000000001', 'Quin', 'Old', '2014-01-01'),
  ('b0088000-0000-0000-0000-00000000000b', '99990088-0000-0000-0000-000000000001', 'Rae', 'Amended', '2014-01-01'),
  ('b0088000-0000-0000-0000-00000000000c', '99990088-0000-0000-0000-000000000001', 'Sol', 'Chased', '2014-01-01'),
  ('b0088000-0000-0000-0000-00000000000d', '99990088-0000-0000-0000-000000000001', 'Tia', 'Current', '2014-01-01'),
  ('b0088000-0000-0000-0000-00000000000e', '99990088-0000-0000-0000-000000000002', 'Pat', 'Owing', '2014-01-01');

insert into registration (id, club_id, person_id, season_id, status, outstanding_amount_cents) values
  -- earlier seasons
  ('99990088-0000-0000-0000-0000000000c1', '99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000f', '99990088-0000-0000-0000-0000000000a2', 'COMPLETE', 7500),
  ('99990088-0000-0000-0000-0000000000c2', '99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000a', '99990088-0000-0000-0000-0000000000a1', 'COMPLETE', 5000),
  ('99990088-0000-0000-0000-0000000000c3', '99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000b', '99990088-0000-0000-0000-0000000000a2', 'COMPLETE', 3000),
  ('99990088-0000-0000-0000-0000000000c4', '99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000c', '99990088-0000-0000-0000-0000000000a2', 'COMPLETE', 3000),
  -- this season, all paid but T
  ('99990088-0000-0000-0000-0000000000d1', '99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000f', '99990088-0000-0000-0000-0000000000a3', 'COMPLETE', 0),
  ('99990088-0000-0000-0000-0000000000d2', '99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000a', '99990088-0000-0000-0000-0000000000a3', 'COMPLETE', 0),
  ('99990088-0000-0000-0000-0000000000d3', '99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000b', '99990088-0000-0000-0000-0000000000a3', 'COMPLETE', 0),
  ('99990088-0000-0000-0000-0000000000d4', '99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000c', '99990088-0000-0000-0000-0000000000a3', 'COMPLETE', 0),
  ('99990088-0000-0000-0000-0000000000d5', '99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000d', '99990088-0000-0000-0000-0000000000a3', 'COMPLETE', 4000),
  -- the same name at another club, paid there
  ('99990088-0000-0000-0000-0000000000e1', '99990088-0000-0000-0000-000000000002', 'b0088000-0000-0000-0000-00000000000e', '99990088-0000-0000-0000-0000000000b1', 'COMPLETE', 0);

insert into arrears_action (club_id, person_id, season_id, action, reason, recorded_by_user_id, recorded_at) values
  ('99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000b', '99990088-0000-0000-0000-0000000000a2',
   'payment_requested', null, 'd0088000-0000-0000-0000-000000000002', now() - interval '20 days'),
  ('99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000b', '99990088-0000-0000-0000-0000000000a2',
   'amendment_recorded', 'Hardship waiver agreed at the July meeting', 'd0088000-0000-0000-0000-000000000002', now() - interval '10 days'),
  ('99990088-0000-0000-0000-000000000001', 'b0088000-0000-0000-0000-00000000000c', '99990088-0000-0000-0000-0000000000a2',
   'payment_requested', null, 'd0088000-0000-0000-0000-000000000002', now() - interval '5 days');

commit;

do $$
declare
  r        record;
  failures text[] := '{}';
  expected jsonb := jsonb_build_object(
    '99990088-0000-0000-0000-0000000000d1', true,   -- P: 2025 unpaid, within two years
    '99990088-0000-0000-0000-0000000000d2', false,  -- Q: 2023, outside the window
    '99990088-0000-0000-0000-0000000000d3', false,  -- R: amended by the treasurer
    '99990088-0000-0000-0000-0000000000d4', true,   -- S: only chased, still owes
    '99990088-0000-0000-0000-0000000000d5', false   -- T: owes this season, not an earlier one
  );
  seen     integer := 0;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd0088000-0000-0000-0000-000000000001', true);

  for r in
    select * from app_registration_money(array[
      '99990088-0000-0000-0000-0000000000d1', '99990088-0000-0000-0000-0000000000d2',
      '99990088-0000-0000-0000-0000000000d3', '99990088-0000-0000-0000-0000000000d4',
      '99990088-0000-0000-0000-0000000000d5']::uuid[])
  loop
    seen := seen + 1;
    if r.owes_earlier is distinct from (expected ->> r.registration_id::text)::boolean then
      failures := array_append(failures, format('%s: owes_earlier was %s', r.registration_id, r.owes_earlier));
    end if;
  end loop;
  if seen <> 5 then
    failures := array_append(failures, format('the registrar read %s registrations, not 5', seen));
  end if;

  -- T's own balance still answers `owes`; the new column does not replace it.
  select * into r from app_registration_money(array['99990088-0000-0000-0000-0000000000d5']::uuid[]);
  if r.owes is distinct from true then
    failures := array_append(failures, 'this season''s debt no longer answered owes');
  end if;

  -- Another club's registration is not readable, so nothing crosses tenants (P5).
  select count(*) into seen from app_registration_money(array['99990088-0000-0000-0000-0000000000e1']::uuid[]);
  if seen <> 0 then
    failures := array_append(failures, 'a registrar read another club''s registration money');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'An earlier debt stops play FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'An earlier debt stops play OK — 7 scenarios';
end $$;
