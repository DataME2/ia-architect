-- 0075: from thirteen a person decides about their own money and Saturdays
-- (scope 78; question 80 (C); BR62, BR152, BR161).
--
--   * the answerer set is the person from thirteen plus an authority
--     guardian until eighteen; under thirteen, the guardian alone,
--   * a 15-year-old official chooses pay or credit on their own claim,
--   * and nominates where they are paid; their guardian still may too.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990075-0000-0000-0000-000000000001', 'Thirteen Decides FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('99990075-0000-0000-0000-0000000000aa', '99990075-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days');

insert into auth.users (id, email) values
  ('d0075000-0000-0000-0000-000000000001', 'treasurer@thirteen.test'),
  ('d0075000-0000-0000-0000-000000000002', 'mum@thirteen.test'),
  ('d0075000-0000-0000-0000-000000000003', 'teen@thirteen.test');

insert into club_membership (club_id, user_id, role) values
  ('99990075-0000-0000-0000-000000000001', 'd0075000-0000-0000-0000-000000000001', 'treasurer');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0075000-0000-0000-0000-000000000001', '99990075-0000-0000-0000-000000000001',
   'Fifteen', 'Ref', (current_date - interval '15 years')::date),
  ('b0075000-0000-0000-0000-000000000002', '99990075-0000-0000-0000-000000000001',
   'Their', 'Mum', '1984-01-01'),
  ('b0075000-0000-0000-0000-000000000003', '99990075-0000-0000-0000-000000000001',
   'Twelve', 'Ref', (current_date - interval '12 years')::date);

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99990075-0000-0000-0000-000000000001', 'b0075000-0000-0000-0000-000000000001', 'b0075000-0000-0000-0000-000000000002', true, true),
  ('99990075-0000-0000-0000-000000000001', 'b0075000-0000-0000-0000-000000000003', 'b0075000-0000-0000-0000-000000000002', true, true);

insert into account_person (club_id, user_id, person_id) values
  ('99990075-0000-0000-0000-000000000001', 'd0075000-0000-0000-0000-000000000002', 'b0075000-0000-0000-0000-000000000002'),
  ('99990075-0000-0000-0000-000000000001', 'd0075000-0000-0000-0000-000000000003', 'b0075000-0000-0000-0000-000000000001');

insert into team (id, club_id, season_id, name) values
  ('99990075-0000-0000-0000-0000000000c1', '99990075-0000-0000-0000-000000000001',
   '99990075-0000-0000-0000-0000000000aa', 'U12s');

insert into fixture (id, club_id, season_id, team_id, opponent, played_on, home_away, status) values
  ('99990075-0000-0000-0000-0000000000f1', '99990075-0000-0000-0000-000000000001',
   '99990075-0000-0000-0000-0000000000aa', '99990075-0000-0000-0000-0000000000c1',
   'Rivals', (current_date - interval '10 days')::date, 'home', 'played');

insert into match_official_appointment (id, club_id, fixture_id, person_id, role, state, appointed_by, responded_by_person_id) values
  ('99990075-0000-0000-0000-0000000000a1', '99990075-0000-0000-0000-000000000001',
   '99990075-0000-0000-0000-0000000000f1', 'b0075000-0000-0000-0000-000000000001', 'referee', 'accepted', 'club',
   'b0075000-0000-0000-0000-000000000001');

insert into appointment_verification (club_id, appointment_id, officiated, verified_by) values
  ('99990075-0000-0000-0000-000000000001', '99990075-0000-0000-0000-0000000000a1', true, 'd0075000-0000-0000-0000-000000000001');

insert into referee_payment_claim (id, club_id, appointment_id, amount_cents, state) values
  ('99990075-0000-0000-0000-0000000000e1', '99990075-0000-0000-0000-000000000001',
   '99990075-0000-0000-0000-0000000000a1', 3000, 'raised');

commit;

do $$
declare
  the_club  uuid := '99990075-0000-0000-0000-000000000001';
  teen      uuid := 'b0075000-0000-0000-0000-000000000001';
  mum       uuid := 'b0075000-0000-0000-0000-000000000002';
  twelve    uuid := 'b0075000-0000-0000-0000-000000000003';
  claim1    uuid := '99990075-0000-0000-0000-0000000000e1';
  n         integer;
  v_settle  text;
  failures  text[] := '{}';
begin
  -- 1. Who answers: the 15-year-old and their mother; for the 12-year-old,
  --    the mother alone.
  if not exists (select 1 from app_may_answer_designation(teen, the_club, current_date) a where a = teen)
     or not exists (select 1 from app_may_answer_designation(teen, the_club, current_date) a where a = mum) then
    failures := array_append(failures, 'a 15-year-old and their guardian were not both answerers');
  end if;
  if exists (select 1 from app_may_answer_designation(twelve, the_club, current_date) a where a = twelve) then
    failures := array_append(failures, 'a 12-year-old answered for themself');
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd0075000-0000-0000-0000-000000000001', true);
  update referee_payment_claim set state = 'approved', decided_by = 'd0075000-0000-0000-0000-000000000001', decided_at = now()
   where id = claim1;

  -- 2. The 15-year-old chooses pay or credit on their own claim (BR152).
  perform set_config('request.jwt.claim.sub', 'd0075000-0000-0000-0000-000000000003', true);
  begin
    update referee_payment_claim
       set settlement = 'pay', settlement_chosen_by = teen, settlement_chosen_at = now()
     where id = claim1;
  exception when others then
    failures := array_append(failures, 'a 15-year-old could not choose how their own claim is paid: ' || sqlerrm);
  end;
  select settlement into v_settle from referee_payment_claim where id = claim1;
  if v_settle is distinct from 'pay' then
    failures := array_append(failures, format('the 15-year-old''s choice did not land (settlement %s)', v_settle));
  end if;

  -- 3. ...and nominates where they are paid (BR161).
  begin
    insert into payout_nomination (club_id, person_id, method, paypal_email, nominated_by_person_id)
    values (the_club, teen, 'paypal', 'teen@example.test', teen);
  exception when others then
    failures := array_append(failures, 'a 15-year-old could not nominate where they are paid: ' || sqlerrm);
  end;

  -- 4. The guardian may still nominate, and it supersedes.
  perform set_config('request.jwt.claim.sub', 'd0075000-0000-0000-0000-000000000002', true);
  begin
    insert into payout_nomination (club_id, person_id, method, account_name, bsb, account_number, nominated_by_person_id)
    values (the_club, teen, 'bank_transfer', 'Their Mum', '064000', '12345678', mum);
  exception when others then
    failures := array_append(failures, 'the guardian could no longer nominate for a 15-year-old: ' || sqlerrm);
  end;
  select count(*) into n from payout_nomination where person_id = teen and superseded_at is null;
  if n <> 1 then
    failures := array_append(failures, format('%s live nominations for the 15-year-old, not 1', n));
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Thirteen decides money and Saturdays FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'Thirteen decides money and Saturdays OK — 4 scenarios';
end $$;
