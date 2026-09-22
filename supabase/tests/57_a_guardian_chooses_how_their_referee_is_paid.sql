-- Can an official's family choose how an approved claim is settled, and
-- only their own (BR152)?
--
--   * a guardian holding authority chooses for an under-18 official,
--   * a contact-only guardian (no authority) cannot choose,
--   * an adult official chooses for themselves,
--   * nobody may choose before the claim is approved,
--   * a family changing the settlement changes only that, nothing else
--     about the claim,
--   * only the responsible admin/registrar/coordinator/treasurer and the
--     official's own family ever read a claim through the new policies,
--   * an officer may still fully manage a claim regardless of settlement,
--   * and an unrelated account at the same club reads and writes nothing.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('57c00000-0000-0000-0000-000000000001', 'Paid Whistles FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('57c00000-0000-0000-0000-0000000000aa', '57c00000-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days');

insert into auth.users (id, email) values
  ('d57c0000-0000-0000-0000-000000000001', 'treasurer@paidwhistles.test'),
  ('d57c0000-0000-0000-0000-000000000002', 'mum@paidwhistles.test'),
  ('d57c0000-0000-0000-0000-000000000003', 'adult.ref@paidwhistles.test'),
  ('d57c0000-0000-0000-0000-000000000004', 'other@paidwhistles.test');

insert into club_membership (club_id, user_id, role) values
  ('57c00000-0000-0000-0000-000000000001', 'd57c0000-0000-0000-0000-000000000001', 'treasurer');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  -- A minor official, fifteen.
  ('b57c0000-0000-0000-0000-000000000001', '57c00000-0000-0000-0000-000000000001',
   'Fifteen', 'Official', (current_date - interval '15 years')::date),
  -- Her mother, holding authority.
  ('b57c0000-0000-0000-0000-000000000002', '57c00000-0000-0000-0000-000000000001',
   'Authority', 'Mother', '1985-01-01'),
  -- A second adult, contact only.
  ('b57c0000-0000-0000-0000-000000000003', '57c00000-0000-0000-0000-000000000001',
   'Contact', 'Only', '1984-01-01'),
  -- An adult official, answers for herself.
  ('b57c0000-0000-0000-0000-000000000004', '57c00000-0000-0000-0000-000000000001',
   'Adult', 'Official', '1998-01-01'),
  -- Another family entirely.
  ('b57c0000-0000-0000-0000-000000000005', '57c00000-0000-0000-0000-000000000001',
   'Someone', 'Else', '1983-01-01');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('57c00000-0000-0000-0000-000000000001', 'b57c0000-0000-0000-0000-000000000001',
   'b57c0000-0000-0000-0000-000000000002', true, true),
  ('57c00000-0000-0000-0000-000000000001', 'b57c0000-0000-0000-0000-000000000001',
   'b57c0000-0000-0000-0000-000000000003', false, true);

insert into account_person (club_id, user_id, person_id) values
  ('57c00000-0000-0000-0000-000000000001', 'd57c0000-0000-0000-0000-000000000002',
   'b57c0000-0000-0000-0000-000000000002'),
  ('57c00000-0000-0000-0000-000000000001', 'd57c0000-0000-0000-0000-000000000003',
   'b57c0000-0000-0000-0000-000000000004'),
  ('57c00000-0000-0000-0000-000000000001', 'd57c0000-0000-0000-0000-000000000004',
   'b57c0000-0000-0000-0000-000000000005');

insert into clearance (club_id, person_id, kind, identifier, expires_on, verified_at) values
  ('57c00000-0000-0000-0000-000000000001', 'b57c0000-0000-0000-0000-000000000004',
   'wwcc', 'WWCC-ADULT-1', (current_date + interval '365 days')::date, now());

insert into team (id, club_id, season_id, name) values
  ('57c00000-0000-0000-0000-0000000000c1', '57c00000-0000-0000-0000-000000000001',
   '57c00000-0000-0000-0000-0000000000aa', 'U15s');

insert into fixture (id, club_id, season_id, team_id, opponent, played_on, home_away, status) values
  ('57c00000-0000-0000-0000-0000000000f1', '57c00000-0000-0000-0000-000000000001',
   '57c00000-0000-0000-0000-0000000000aa', '57c00000-0000-0000-0000-0000000000c1',
   'Rivals', (current_date - interval '10 days')::date, 'home', 'played'),
  ('57c00000-0000-0000-0000-0000000000f2', '57c00000-0000-0000-0000-000000000001',
   '57c00000-0000-0000-0000-0000000000aa', '57c00000-0000-0000-0000-0000000000c1',
   'Wanderers', (current_date - interval '5 days')::date, 'home', 'played');

insert into match_official_appointment (id, club_id, fixture_id, person_id, role, state, appointed_by, responded_by_person_id) values
  ('57c00000-0000-0000-0000-0000000000a1', '57c00000-0000-0000-0000-000000000001',
   '57c00000-0000-0000-0000-0000000000f1', 'b57c0000-0000-0000-0000-000000000001', 'referee', 'accepted', 'club',
   'b57c0000-0000-0000-0000-000000000002'),
  ('57c00000-0000-0000-0000-0000000000a2', '57c00000-0000-0000-0000-000000000001',
   '57c00000-0000-0000-0000-0000000000f2', 'b57c0000-0000-0000-0000-000000000004', 'referee', 'accepted', 'club', null);

insert into appointment_verification (club_id, appointment_id, officiated, verified_by) values
  ('57c00000-0000-0000-0000-000000000001', '57c00000-0000-0000-0000-0000000000a1', true, 'd57c0000-0000-0000-0000-000000000001'),
  ('57c00000-0000-0000-0000-000000000001', '57c00000-0000-0000-0000-0000000000a2', true, 'd57c0000-0000-0000-0000-000000000001');

insert into referee_payment_claim (id, club_id, appointment_id, amount_cents, state) values
  ('57c00000-0000-0000-0000-0000000000c1', '57c00000-0000-0000-0000-000000000001',
   '57c00000-0000-0000-0000-0000000000a1', 3000, 'raised'),
  ('57c00000-0000-0000-0000-0000000000c2', '57c00000-0000-0000-0000-000000000001',
   '57c00000-0000-0000-0000-0000000000a2', 3000, 'raised');

commit;

do $$
declare
  the_club    uuid := '57c00000-0000-0000-0000-000000000001';
  minor       uuid := 'b57c0000-0000-0000-0000-000000000001';
  mum         uuid := 'b57c0000-0000-0000-0000-000000000002';
  contact     uuid := 'b57c0000-0000-0000-0000-000000000003';
  adult       uuid := 'b57c0000-0000-0000-0000-000000000004';
  mum_user    uuid := 'd57c0000-0000-0000-0000-000000000002';
  adult_user  uuid := 'd57c0000-0000-0000-0000-000000000003';
  other_user  uuid := 'd57c0000-0000-0000-0000-000000000004';
  treas_user  uuid := 'd57c0000-0000-0000-0000-000000000001';
  claim1      uuid := '57c00000-0000-0000-0000-0000000000c1';
  claim2      uuid := '57c00000-0000-0000-0000-0000000000c2';
  v_settle    text;
  v_amount    integer;
  n           integer;
  failures    text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- 1. Nobody may choose before the claim is approved — both claims are
  --    still 'raised'.
  begin
    update referee_payment_claim
       set settlement = 'pay', settlement_chosen_by = mum
     where id = claim1;
    failures := array_append(failures, 'a settlement was chosen on a claim that was not yet approved (BR152)');
  exception when others then
    if sqlerrm not like '%once it is approved%' then
      failures := array_append(failures, 'the not-yet-approved refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- Approve both, signed in as the treasurer would be — this is also what
  -- proves `assert_family_only_chooses_settlement` lets an officer's own
  -- decision through untouched.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', treas_user::text, true);
  update referee_payment_claim set state = 'approved', decided_by = treas_user, decided_at = now()
   where id in (claim1, claim2);
  perform set_config('role', 'postgres', true);

  -- 2. A contact-only guardian (no authority) cannot choose for the minor.
  begin
    update referee_payment_claim
       set settlement = 'pay', settlement_chosen_by = contact
     where id = claim1;
    failures := array_append(failures,
      'a contact-only guardian, without authority, chose a settlement for a minor (BR67/BR152)');
  exception when others then
    if sqlerrm not like '%does not hold authority%' then
      failures := array_append(failures, 'the no-authority refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 3. Nobody may name somebody else's choice as their own — the minor
  --    cannot choose for herself.
  begin
    update referee_payment_claim
       set settlement = 'pay', settlement_chosen_by = minor
     where id = claim1;
    failures := array_append(failures, 'a fifteen-year-old chose her own settlement (BR152)');
  exception when others then
    if sqlerrm not like '%does not hold authority%' then
      failures := array_append(failures, 'the self-choice refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 4. The authority guardian chooses "credit" for the minor.
  begin
    update referee_payment_claim
       set settlement = 'credit', settlement_chosen_by = mum
     where id = claim1;
  exception when others then
    failures := array_append(failures, 'the authority mother could not choose for her daughter: ' || sqlerrm);
  end;

  select settlement into v_settle from referee_payment_claim where id = claim1;
  if v_settle is distinct from 'credit' then
    failures := array_append(failures, 'the guardian''s choice did not land — settlement is ' || coalesce(v_settle, 'null'));
  end if;

  -- 5. The adult official chooses "pay" for herself — no guardian involved.
  begin
    update referee_payment_claim
       set settlement = 'pay', settlement_chosen_by = adult
     where id = claim2;
  exception when others then
    failures := array_append(failures, 'an adult official could not choose for herself: ' || sqlerrm);
  end;

  -- ------------------------------------------------------ signed in as mum
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', mum_user::text, true);

  -- 6. She reads her daughter's claim.
  select count(*) into n from referee_payment_claim where id = claim1;
  if n <> 1 then
    failures := array_append(failures, 'the guardian could not read her daughter''s own claim');
  end if;

  -- 7. She reads nothing of the adult official's claim.
  select count(*) into n from referee_payment_claim where id = claim2;
  if n <> 0 then
    failures := array_append(failures, 'the guardian read another official''s claim');
  end if;

  -- 8. She may change the settlement, and only the settlement — not the
  --    amount, not the state.
  update referee_payment_claim set settlement = 'pay', settlement_chosen_by = mum where id = claim1;
  perform set_config('role', 'postgres', true);
  select settlement into v_settle from referee_payment_claim where id = claim1;
  if v_settle is distinct from 'pay' then
    failures := array_append(failures, 'the guardian could not change her own choice');
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', mum_user::text, true);
  begin
    update referee_payment_claim set amount_cents = 999999, settlement_chosen_by = mum where id = claim1;
    perform set_config('role', 'postgres', true);
    select amount_cents into v_amount from referee_payment_claim where id = claim1;
    if v_amount = 999999 then
      failures := array_append(failures, 'a guardian rewrote the claim amount while choosing a settlement (BR152)');
    end if;
  exception when others then
    null;
  end;

  -- ------------------------------------------------------- signed in as treas
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', treas_user::text, true);

  -- 9. The treasurer reads every claim at the club, still.
  select count(*) into n from referee_payment_claim where club_id = the_club;
  if n <> 2 then
    failures := array_append(failures, 'the treasurer read ' || n || ' claims, not 2');
  end if;

  -- 10. And retains full manage regardless of a settlement already chosen.
  begin
    update referee_payment_claim set decision_note = 'Reviewed.' where id = claim1;
  exception when others then
    failures := array_append(failures, 'the treasurer could not manage a claim with a settlement already chosen: ' || sqlerrm);
  end;

  -- --------------------------------------------- signed in as another family
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', other_user::text, true);

  -- 11. An unrelated account reads nothing of either claim.
  select count(*) into n from referee_payment_claim where id in (claim1, claim2);
  if n <> 0 then
    failures := array_append(failures, 'an unrelated account read another family''s referee payment claim');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'A guardian chooses how their referee is paid FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A guardian chooses how their referee is paid OK — 11 scenarios; a settlement can only be chosen once a claim is approved, a guardian holding authority chooses for a minor and an adult chooses for themselves, a family may change only the settlement, officers keep full read and manage regardless, and an unrelated account at the same club reads and writes nothing';
end
$$;
