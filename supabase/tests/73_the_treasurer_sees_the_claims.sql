-- 0073/0074: the treasurer reads every match appointment, read only, and
-- deletes an open payment run but never a closed one (BR163, BR117).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990073-0000-0000-0000-000000000001', 'Treasurer Reads FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('99990073-0000-0000-0000-0000000000aa', '99990073-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days');

insert into auth.users (id, email) values
  ('d0073000-0000-0000-0000-000000000001', 'treasurer@treasurerreads.test'),
  ('d0073000-0000-0000-0000-000000000002', 'committee@treasurerreads.test');

insert into club_membership (club_id, user_id, role) values
  ('99990073-0000-0000-0000-000000000001', 'd0073000-0000-0000-0000-000000000001', 'treasurer'),
  ('99990073-0000-0000-0000-000000000001', 'd0073000-0000-0000-0000-000000000002', 'committee');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0073000-0000-0000-0000-000000000001', '99990073-0000-0000-0000-000000000001', 'Rita', 'Ref', '1990-01-01');

insert into clearance (club_id, person_id, kind, identifier, expires_on, verified_at) values
  ('99990073-0000-0000-0000-000000000001', 'b0073000-0000-0000-0000-000000000001',
   'wwcc', 'WWCC-73-1', (current_date + interval '365 days')::date, now());

insert into team (id, club_id, season_id, name) values
  ('99990073-0000-0000-0000-0000000000c1', '99990073-0000-0000-0000-000000000001',
   '99990073-0000-0000-0000-0000000000aa', 'U15s');

insert into fixture (id, club_id, season_id, team_id, opponent, played_on, home_away, status) values
  ('99990073-0000-0000-0000-0000000000f1', '99990073-0000-0000-0000-000000000001',
   '99990073-0000-0000-0000-0000000000aa', '99990073-0000-0000-0000-0000000000c1',
   'Rivals', (current_date - interval '10 days')::date, 'home', 'played'),
  ('99990073-0000-0000-0000-0000000000f2', '99990073-0000-0000-0000-000000000001',
   '99990073-0000-0000-0000-0000000000aa', '99990073-0000-0000-0000-0000000000c1',
   'Wanderers', (current_date + interval '10 days')::date, 'home', 'scheduled');

-- One appointment claimed for, one merely designated.
insert into match_official_appointment (id, club_id, fixture_id, person_id, role, state, appointed_by) values
  ('99990073-0000-0000-0000-0000000000a1', '99990073-0000-0000-0000-000000000001',
   '99990073-0000-0000-0000-0000000000f1', 'b0073000-0000-0000-0000-000000000001', 'referee', 'accepted', 'club'),
  ('99990073-0000-0000-0000-0000000000a2', '99990073-0000-0000-0000-000000000001',
   '99990073-0000-0000-0000-0000000000f2', 'b0073000-0000-0000-0000-000000000001', 'referee', 'proposed', 'club');

insert into appointment_verification (club_id, appointment_id, officiated, verified_by) values
  ('99990073-0000-0000-0000-000000000001', '99990073-0000-0000-0000-0000000000a1', true, 'd0073000-0000-0000-0000-000000000001');

insert into referee_payment_claim (club_id, appointment_id, amount_cents, state) values
  ('99990073-0000-0000-0000-000000000001', '99990073-0000-0000-0000-0000000000a1', 3000, 'raised');

commit;

do $$
declare
  n        integer;
  run_open   uuid;
  run_closed uuid;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The treasurer reads every appointment, claimed or merely designated (0074).
  perform set_config('request.jwt.claim.sub', 'd0073000-0000-0000-0000-000000000001', true);
  select count(*) into n from match_official_appointment where club_id = '99990073-0000-0000-0000-000000000001';
  if n <> 2 then
    failures := array_append(failures, format('the treasurer read %s appointments, not both', n));
  end if;

  -- 2. Reading is not managing.
  update match_official_appointment set role = role
   where id = '99990073-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  if n <> 0 then
    failures := array_append(failures, 'the treasurer changed an appointment');
  end if;

  -- 4. An open run with a claim in it is deleted, and the claim waits again.
  update referee_payment_claim set state = 'approved', decided_by = 'd0073000-0000-0000-0000-000000000001', decided_at = now()
   where appointment_id = '99990073-0000-0000-0000-0000000000a1';
  insert into referee_payment_batch (club_id, reference) values ('99990073-0000-0000-0000-000000000001', 'Oops')
  returning id into run_open;
  update referee_payment_claim set batch_id = run_open where appointment_id = '99990073-0000-0000-0000-0000000000a1';
  begin
    delete from referee_payment_batch where id = run_open;
  exception when others then
    failures := array_append(failures, 'the treasurer could not delete an open run: ' || sqlerrm);
  end;
  if exists (select 1 from referee_payment_claim where appointment_id = '99990073-0000-0000-0000-0000000000a1' and (batch_id is not null or state <> 'approved')) then
    failures := array_append(failures, 'the deleted run''s claim did not return to approved and unbatched');
  end if;

  -- 5. A closed run is never deleted.
  insert into referee_payment_batch (club_id, reference, closed_at) values ('99990073-0000-0000-0000-000000000001', 'Final', now())
  returning id into run_closed;
  begin
    delete from referee_payment_batch where id = run_closed;
    failures := array_append(failures, 'a closed run was deleted');
  exception when check_violation then null;
  end;

  -- 3. The committee still reads none, and deletes no run.
  perform set_config('request.jwt.claim.sub', 'd0073000-0000-0000-0000-000000000002', true);
  select count(*) into n from match_official_appointment where club_id = '99990073-0000-0000-0000-000000000001';
  if n <> 0 then
    failures := array_append(failures, format('the committee read %s appointments', n));
  end if;
  delete from referee_payment_batch where club_id = '99990073-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then
    failures := array_append(failures, 'the committee deleted a payment run');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'The treasurer sees the claims FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'The treasurer reads the referee side OK — 5 scenarios';
end $$;
