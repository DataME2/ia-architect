-- 0072: a referee is paid online, simulated (scope 76; BR161, BR162).
--
--   * whoever chooses pay-or-credit (BR152) nominates where to be paid: a
--     guardian with authority for a minor, the official from eighteen; an
--     unrelated account cannot,
--   * a new nomination supersedes the old one, and a malformed one is refused,
--   * a nomination is read by its chooser, the treasurer and the admin only,
--   * the simulated payout needs a closed batch, the treasurer, and a live
--     nomination for every official in it (and names who is missing),
--   * it pays once, records `simulation` on every row, and marks the batch
--     paid with a SIMULATED reference,
--   * nobody inserts a payout directly, and each family reads only its own.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990072-0000-0000-0000-000000000001', 'Paid Online FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('99990072-0000-0000-0000-0000000000aa', '99990072-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days');

insert into auth.users (id, email) values
  ('d0072000-0000-0000-0000-000000000001', 'treasurer@paidonline.test'),
  ('d0072000-0000-0000-0000-000000000002', 'mum@paidonline.test'),
  ('d0072000-0000-0000-0000-000000000003', 'adult.ref@paidonline.test'),
  ('d0072000-0000-0000-0000-000000000004', 'other@paidonline.test');

insert into club_membership (club_id, user_id, role) values
  ('99990072-0000-0000-0000-000000000001', 'd0072000-0000-0000-0000-000000000001', 'treasurer');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0072000-0000-0000-0000-000000000001', '99990072-0000-0000-0000-000000000001',
   'Fifteen', 'Official', (current_date - interval '15 years')::date),
  ('b0072000-0000-0000-0000-000000000002', '99990072-0000-0000-0000-000000000001',
   'Authority', 'Mother', '1985-01-01'),
  ('b0072000-0000-0000-0000-000000000004', '99990072-0000-0000-0000-000000000001',
   'Adult', 'Official', '1998-01-01'),
  ('b0072000-0000-0000-0000-000000000005', '99990072-0000-0000-0000-000000000001',
   'Someone', 'Else', '1983-01-01');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99990072-0000-0000-0000-000000000001', 'b0072000-0000-0000-0000-000000000001',
   'b0072000-0000-0000-0000-000000000002', true, true);

insert into account_person (club_id, user_id, person_id) values
  ('99990072-0000-0000-0000-000000000001', 'd0072000-0000-0000-0000-000000000002', 'b0072000-0000-0000-0000-000000000002'),
  ('99990072-0000-0000-0000-000000000001', 'd0072000-0000-0000-0000-000000000003', 'b0072000-0000-0000-0000-000000000004'),
  ('99990072-0000-0000-0000-000000000001', 'd0072000-0000-0000-0000-000000000004', 'b0072000-0000-0000-0000-000000000005');

insert into clearance (club_id, person_id, kind, identifier, expires_on, verified_at) values
  ('99990072-0000-0000-0000-000000000001', 'b0072000-0000-0000-0000-000000000004',
   'wwcc', 'WWCC-72-1', (current_date + interval '365 days')::date, now());

insert into team (id, club_id, season_id, name) values
  ('99990072-0000-0000-0000-0000000000c1', '99990072-0000-0000-0000-000000000001',
   '99990072-0000-0000-0000-0000000000aa', 'U15s');

insert into fixture (id, club_id, season_id, team_id, opponent, played_on, home_away, status) values
  ('99990072-0000-0000-0000-0000000000f1', '99990072-0000-0000-0000-000000000001',
   '99990072-0000-0000-0000-0000000000aa', '99990072-0000-0000-0000-0000000000c1',
   'Rivals', (current_date - interval '10 days')::date, 'home', 'played'),
  ('99990072-0000-0000-0000-0000000000f2', '99990072-0000-0000-0000-000000000001',
   '99990072-0000-0000-0000-0000000000aa', '99990072-0000-0000-0000-0000000000c1',
   'Wanderers', (current_date - interval '5 days')::date, 'home', 'played');

insert into match_official_appointment (id, club_id, fixture_id, person_id, role, state, appointed_by, responded_by_person_id) values
  ('99990072-0000-0000-0000-0000000000a1', '99990072-0000-0000-0000-000000000001',
   '99990072-0000-0000-0000-0000000000f1', 'b0072000-0000-0000-0000-000000000001', 'referee', 'accepted', 'club',
   'b0072000-0000-0000-0000-000000000002'),
  ('99990072-0000-0000-0000-0000000000a2', '99990072-0000-0000-0000-000000000001',
   '99990072-0000-0000-0000-0000000000f2', 'b0072000-0000-0000-0000-000000000004', 'referee', 'accepted', 'club', null);

insert into appointment_verification (club_id, appointment_id, officiated, verified_by) values
  ('99990072-0000-0000-0000-000000000001', '99990072-0000-0000-0000-0000000000a1', true, 'd0072000-0000-0000-0000-000000000001'),
  ('99990072-0000-0000-0000-000000000001', '99990072-0000-0000-0000-0000000000a2', true, 'd0072000-0000-0000-0000-000000000001');

insert into referee_payment_claim (id, club_id, appointment_id, amount_cents, state) values
  ('99990072-0000-0000-0000-0000000000e1', '99990072-0000-0000-0000-000000000001',
   '99990072-0000-0000-0000-0000000000a1', 3000, 'raised'),
  ('99990072-0000-0000-0000-0000000000e2', '99990072-0000-0000-0000-000000000001',
   '99990072-0000-0000-0000-0000000000a2', 4500, 'raised');

insert into referee_payment_batch (id, club_id, reference) values
  ('99990072-0000-0000-0000-0000000000b1', '99990072-0000-0000-0000-000000000001', 'October run');

commit;

do $$
declare
  the_club   uuid := '99990072-0000-0000-0000-000000000001';
  minor      uuid := 'b0072000-0000-0000-0000-000000000001';
  mum        uuid := 'b0072000-0000-0000-0000-000000000002';
  adult      uuid := 'b0072000-0000-0000-0000-000000000004';
  someone    uuid := 'b0072000-0000-0000-0000-000000000005';
  treas_user uuid := 'd0072000-0000-0000-0000-000000000001';
  mum_user   uuid := 'd0072000-0000-0000-0000-000000000002';
  adult_user uuid := 'd0072000-0000-0000-0000-000000000003';
  other_user uuid := 'd0072000-0000-0000-0000-000000000004';
  claim1     uuid := '99990072-0000-0000-0000-0000000000e1';
  claim2     uuid := '99990072-0000-0000-0000-0000000000e2';
  batch      uuid := '99990072-0000-0000-0000-0000000000b1';
  n          integer;
  ref        text;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- Approve both claims and put them in the run, as the treasurer.
  perform set_config('request.jwt.claim.sub', treas_user::text, true);
  update referee_payment_claim set state = 'approved', decided_by = treas_user, decided_at = now()
   where id in (claim1, claim2);
  update referee_payment_claim set batch_id = batch where id in (claim1, claim2);

  -- 1. Paying an open run is refused (BR117).
  begin
    perform app_simulate_batch_payout(batch);
    failures := array_append(failures, 'an open payment run was paid');
  exception when others then
    if sqlerrm not like '%Close the payment run%' then
      failures := array_append(failures, 'the open-run refusal did not say so: ' || sqlerrm);
    end if;
  end;
  update referee_payment_batch set closed_at = now(), closed_by = treas_user where id = batch;

  -- 2. The guardian with authority nominates a bank account for the minor.
  perform set_config('request.jwt.claim.sub', mum_user::text, true);
  begin
    insert into payout_nomination (club_id, person_id, method, account_name, bsb, account_number, nominated_by_person_id)
    values (the_club, minor, 'bank_transfer', 'A Mother', '064000', '12345678', mum);
  exception when others then
    failures := array_append(failures, 'the guardian could not nominate for her child: ' || sqlerrm);
  end;

  -- 3. An unrelated account cannot nominate for the adult official.
  perform set_config('request.jwt.claim.sub', other_user::text, true);
  begin
    insert into payout_nomination (club_id, person_id, method, paypal_email, nominated_by_person_id)
    values (the_club, adult, 'paypal', 'thief@example.test', someone);
    failures := array_append(failures, 'an unrelated account nominated where an official is paid');
  exception when insufficient_privilege then null;
  end;

  -- 4. A run with an official who has nowhere to be paid stops, naming them.
  perform set_config('request.jwt.claim.sub', treas_user::text, true);
  begin
    perform app_simulate_batch_payout(batch);
    failures := array_append(failures, 'a run was paid with an official who had no nomination');
  exception when others then
    if sqlerrm not like '%Adult Official%' then
      failures := array_append(failures, 'the missing-nomination refusal did not name the official: ' || sqlerrm);
    end if;
  end;

  -- 5. The adult nominates PayPal, then replaces it with Stripe; a malformed
  --    nomination is refused.
  perform set_config('request.jwt.claim.sub', adult_user::text, true);
  insert into payout_nomination (club_id, person_id, method, paypal_email, nominated_by_person_id)
  values (the_club, adult, 'paypal', 'adult.ref@example.test', adult);
  insert into payout_nomination (club_id, person_id, method, stripe_account_id, nominated_by_person_id)
  values (the_club, adult, 'stripe', 'acct_1Test72', adult);
  select count(*) into n from payout_nomination where person_id = adult and superseded_at is null;
  if n <> 1 then
    failures := array_append(failures, format('%s live nominations after a replacement, not 1', n));
  end if;
  begin
    insert into payout_nomination (club_id, person_id, method, account_name, bsb, account_number, nominated_by_person_id)
    values (the_club, adult, 'bank_transfer', 'Adult', '06400', '123', adult);
    failures := array_append(failures, 'a malformed BSB was accepted');
  exception when check_violation then null;
  end;

  -- 6. Each reads only what is theirs; the treasurer reads both live ones.
  if exists (select 1 from payout_nomination where person_id = minor) then
    failures := array_append(failures, 'the adult official read another official''s bank details');
  end if;
  perform set_config('request.jwt.claim.sub', other_user::text, true);
  select count(*) into n from payout_nomination;
  if n <> 0 then
    failures := array_append(failures, format('an unrelated account read %s nominations', n));
  end if;
  perform set_config('request.jwt.claim.sub', treas_user::text, true);
  select count(*) into n from payout_nomination where club_id = the_club and superseded_at is null;
  if n <> 2 then
    failures := array_append(failures, format('the treasurer read %s live nominations, not 2', n));
  end if;

  -- 7. The guardian cannot pay the run; the treasurer can, once.
  perform set_config('request.jwt.claim.sub', mum_user::text, true);
  begin
    perform app_simulate_batch_payout(batch);
    failures := array_append(failures, 'a guardian paid a payment run');
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', treas_user::text, true);
  n := app_simulate_batch_payout(batch);
  if n <> 2 then
    failures := array_append(failures, format('the simulated run paid %s claims, not 2', n));
  end if;
  select paid_reference into ref from referee_payment_batch where id = batch;
  if ref not like 'SIMULATED SIM-%' then
    failures := array_append(failures, format('the run''s paid reference was %s, not SIMULATED', ref));
  end if;
  if exists (select 1 from referee_payout where batch_id = batch and (provider <> 'simulation' or status <> 'simulated')) then
    failures := array_append(failures, 'a simulated payout claimed to be real');
  end if;
  begin
    perform app_simulate_batch_payout(batch);
    failures := array_append(failures, 'a run was paid twice');
  exception when others then null;
  end;

  -- 8. Nobody writes a payout directly, not even the treasurer.
  begin
    insert into referee_payout (club_id, batch_id, claim_id, nomination_id, method, amount_cents, provider, provider_reference, status)
    select the_club, batch, claim1, id, 'paypal', 1, 'paypal', 'TYPED-IN', 'sent' from payout_nomination limit 1;
    failures := array_append(failures, 'the treasurer typed in a payout');
  exception when insufficient_privilege or unique_violation then null;
  end;

  -- 9. Each family reads only its own payout.
  perform set_config('request.jwt.claim.sub', mum_user::text, true);
  select count(*) into n from referee_payout;
  if n <> 1 then
    failures := array_append(failures, format('the guardian read %s payouts, not her child''s 1', n));
  end if;
  perform set_config('request.jwt.claim.sub', other_user::text, true);
  select count(*) into n from referee_payout;
  if n <> 0 then
    failures := array_append(failures, format('an unrelated account read %s payouts', n));
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'A referee is paid online FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'A referee is paid online OK — 9 scenarios, simulated';
end $$;
