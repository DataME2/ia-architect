-- Can a club be made to pay for something it does not owe?
--
-- Every scenario here is a way money leaves a volunteer club wrongly:
--
--   BR13   paying for a match nobody confirmed happened
--   BR14   paying twice for one appointment
--   BR17   paying for a game that was called off
--   BR18   approving an abandoned match with no account of why
--   BR117  a batch that gains rows after its total went to the bank
--   #71    the person who chose the official approving their own payment
--
-- The last one is the separation BR78 already draws for player money, and
-- the one a small club is most likely to find inconvenient.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d1300000-0000-0000-0000-00000000000a', 'claims.coordinator@northstar.test');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b1300000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
   'Claim', 'Official', '1987-03-03');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  season_ns  uuid := 'a1111111-1111-1111-1111-111111111111';
  ns_admin   uuid := 'd1111111-1111-1111-1111-111111111111';
  rival_reg  uuid := 'd2222222-2222-2222-2222-222222222222';
  coord      uuid := 'd1300000-0000-0000-0000-00000000000a';
  official   uuid := 'b1300000-0000-0000-0000-00000000000a';
  treasurer  uuid;
  fix_played uuid;
  fix_cancel uuid;
  fix_aband  uuid;
  fix_spare  uuid;
  appt_ok    uuid;
  appt_cancel uuid;
  appt_aband uuid;
  appt_spare uuid;
  claim_ok   uuid;
  the_batch  uuid;
  n          integer;
  t          text;
  failures   text[] := '{}';
begin
  perform set_config('role', 'postgres', true);
  insert into club_membership (club_id, user_id, role) values
    (north_star, ns_admin, 'admin'),
    (north_star, coord, 'coordinator')
    on conflict do nothing;

  select m.user_id into treasurer
  from club_membership m
  where m.club_id = north_star
  group by m.user_id
  having array_agg(m.role) @> array['treasurer']
     and not (array_agg(m.role) && array['admin','registrar','coordinator']);

  insert into fixture (id, club_id, season_id, played_on, kick_off, opponent, home_away, status)
  values (gen_random_uuid(), north_star, season_ns, date '2026-05-02', time '09:00',
          'Claims A', 'home', 'played') returning id into fix_played;
  insert into fixture (id, club_id, season_id, played_on, kick_off, opponent, home_away, status)
  values (gen_random_uuid(), north_star, season_ns, date '2026-05-09', time '09:00',
          'Claims B', 'home', 'cancelled') returning id into fix_cancel;
  insert into fixture (id, club_id, season_id, played_on, kick_off, opponent, home_away, status)
  values (gen_random_uuid(), north_star, season_ns, date '2026-05-16', time '09:00',
          'Claims C', 'home', 'abandoned') returning id into fix_aband;
  insert into fixture (id, club_id, season_id, played_on, kick_off, opponent, home_away, status)
  values (gen_random_uuid(), north_star, season_ns, date '2026-05-23', time '09:00',
          'Claims D', 'home', 'played') returning id into fix_spare;

  insert into match_official_appointment (id, club_id, fixture_id, person_id, state, appointed_by)
  values (gen_random_uuid(), north_star, fix_played, official, 'accepted', 'club')
  returning id into appt_ok;
  insert into match_official_appointment (id, club_id, fixture_id, person_id, state, appointed_by)
  values (gen_random_uuid(), north_star, fix_cancel, official, 'accepted', 'club')
  returning id into appt_cancel;
  insert into match_official_appointment (id, club_id, fixture_id, person_id, state, appointed_by)
  values (gen_random_uuid(), north_star, fix_aband, official, 'accepted', 'association')
  returning id into appt_aband;
  insert into match_official_appointment (id, club_id, fixture_id, person_id, state, appointed_by)
  values (gen_random_uuid(), north_star, fix_spare, official, 'accepted', 'club')
  returning id into appt_spare;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coord::text, true);

  -- ---------------------------------------------------------------- BR13

  -- 1. **An unverified match cannot be claimed for.** The rule that makes
  --    somebody other than the payee confirm the game happened worth
  --    anything.
  --
  --    Two checks cover this — "no verification row" and "the verification
  --    says they did not officiate" — and removing either alone changes
  --    nothing, because a missing row makes `officiated` null and the
  --    second refuses anyway. That is belt and braces rather than
  --    redundancy, and it means neither half is individually proved by this
  --    scenario. Recorded rather than left to be rediscovered.
  begin
    insert into referee_payment_claim (club_id, appointment_id, amount_cents)
    values (north_star, appt_ok, 4000);
    failures := array_append(failures, 'a claim was raised against an unverified match');
  exception when others then null;
  end;

  insert into appointment_verification (club_id, appointment_id, verified_by, officiated)
  values (north_star, appt_ok, ns_admin, true);

  -- 2. Verified, and now it works.
  begin
    insert into referee_payment_claim (club_id, appointment_id, amount_cents)
    values (north_star, appt_ok, 4000) returning id into claim_ok;
  exception when others then
    failures := array_append(failures, 'a verified match could not be claimed for');
  end;

  -- 3. **BR14 — not twice.**
  begin
    insert into referee_payment_claim (club_id, appointment_id, amount_cents)
    values (north_star, appt_ok, 4000);
    failures := array_append(failures, 'one appointment was claimed for twice');
  exception when others then null;
  end;

  -- 4. A verification saying they did not officiate is not a licence to pay.
  perform set_config('role', 'postgres', true);
  insert into appointment_verification (club_id, appointment_id, verified_by, officiated)
  values (north_star, appt_spare, ns_admin, false);
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coord::text, true);
  begin
    insert into referee_payment_claim (club_id, appointment_id, amount_cents)
    values (north_star, appt_spare, 4000);
    failures := array_append(failures, 'a claim was raised where the official did not officiate');
  exception when others then null;
  end;

  -- ---------------------------------------------------------------- BR17

  -- 5. **A cancelled fixture owes nothing.**
  --
  --    The cancelled appointment is *verified first*, deliberately. Without
  --    that, removing the BR17 check changes nothing observable — BR13
  --    refuses the same insert for want of a verification, and the test
  --    passes while the rule it names is gone. Verifying it leaves BR17 as
  --    the only thing standing in the way, which is what the scenario
  --    claims to test.
  perform set_config('role', 'postgres', true);
  insert into appointment_verification (club_id, appointment_id, verified_by, officiated)
  values (north_star, appt_cancel, ns_admin, true);
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coord::text, true);

  begin
    insert into referee_payment_claim (club_id, appointment_id, amount_cents)
    values (north_star, appt_cancel, 4000);
    failures := array_append(failures, 'a cancelled fixture produced a claim');
  exception when others then null;
  end;

  -- ---------------------------------------------------------------- BR18

  -- 6. An abandoned match with no explanation is refused.
  perform set_config('role', 'postgres', true);
  insert into appointment_verification (club_id, appointment_id, verified_by, officiated)
  values (north_star, appt_aband, ns_admin, true);
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coord::text, true);
  begin
    insert into referee_payment_claim (club_id, appointment_id, amount_cents)
    values (north_star, appt_aband, 4000);
    failures := array_append(failures, 'an abandoned match was claimed with no explanation');
  exception when others then null;
  end;

  -- 7. With the official's account of why, it goes through.
  perform set_config('role', 'postgres', true);
  update appointment_verification
     set abandonment_note = 'lightning, called at 65 minutes'
   where appointment_id = appt_aband;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coord::text, true);
  begin
    insert into referee_payment_claim (club_id, appointment_id, amount_cents)
    values (north_star, appt_aband, 4000);
  exception when others then
    failures := array_append(failures, 'an explained abandonment was still refused');
  end;

  -- ------------------------------------------------------- #71, who decides

  -- 8. **A coordinator raises and does not approve.** The person who chose
  --    the official is not the person who authorises paying them.
  --
  --    Asserted on the *effect*, not on an exception. A policy whose
  --    `using` clause fails an UPDATE does not raise — it matches no rows
  --    and reports success, so a test written around `exception when
  --    others` passes whether or not the policy exists. This one was, and
  --    it only surfaced because the suite finally ran (see below).
  update referee_payment_claim set state = 'approved', decided_by = coord, decided_at = now()
   where id = claim_ok;

  select state into t from referee_payment_claim where id = claim_ok;
  if t <> 'raised' then
    failures := array_append(failures, 'a coordinator approved the claim they raised');
  end if;

  -- 9. The treasurer does.
  if treasurer is null then
    failures := array_append(failures, 'no treasurer fixture to approve with');
  else
    perform set_config('request.jwt.claim.sub', treasurer::text, true);
    begin
      update referee_payment_claim set state = 'approved', decided_by = treasurer, decided_at = now()
       where id = claim_ok;
    exception when others then
      failures := array_append(failures, 'the treasurer could not approve a claim');
    end;

    select state into t from referee_payment_claim where id = claim_ok;
    if t <> 'approved' then
      failures := array_append(failures, 'the treasurer''s approval did not take');
    end if;

    -- 10. A rejection carries its reason. An unexplained one is a decision
    --     the official cannot answer and the coordinator cannot fix.
    -- A check constraint *does* raise, unlike a policy — so this one is
    -- asserted the other way round. The difference is worth keeping
    -- straight: constraints refuse loudly, policies refuse silently.
    begin
      update referee_payment_claim set state = 'rejected' where id = claim_ok;
      failures := array_append(failures, 'a claim was rejected with no reason');
    exception when others then null;
    end;
  end if;

  -- 11. **Nobody deletes a claim.** No delete policy, so with RLS on the
  --     operation is denied — the same shape BR77 gives `payment`.
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  delete from referee_payment_claim where id = claim_ok;
  select count(*) into n from referee_payment_claim where id = claim_ok;
  if n <> 1 then
    failures := array_append(failures, 'a claim was deleted rather than rejected');
  end if;

  -- --------------------------------------------------------------- BR117

  if treasurer is not null then
    perform set_config('request.jwt.claim.sub', treasurer::text, true);

    insert into referee_payment_batch (id, club_id, reference)
    values (gen_random_uuid(), north_star, 'MAY-2026') returning id into the_batch;

    -- 12. Only an approved claim joins a batch — a batch is a payment
    --     instruction and an unapproved claim is a question.
    begin
      update referee_payment_claim set batch_id = the_batch
       where appointment_id = appt_aband;
      failures := array_append(failures, 'an unapproved claim joined a payment batch');
    exception when others then null;
    end;

    update referee_payment_claim set batch_id = the_batch where id = claim_ok;

    -- 13. The total is what the approved claims come to.
    if app_batch_total_cents(the_batch) <> 4000 then
      failures := array_append(failures, 'the batch total was not the sum of its approved claims');
    end if;

    -- 14. **Paying an open batch is paying a number that can still change.**
    begin
      update referee_payment_batch set paid_at = now(), paid_reference = 'EFT-1'
       where id = the_batch;
      failures := array_append(failures, 'an open batch was paid');
    exception when others then null;
    end;

    update referee_payment_batch set closed_at = now(), closed_by = treasurer
     where id = the_batch;

    -- 15. **A closed batch admits no further claims.** Its total has
    --     already been treated as a fact.
    perform set_config('role', 'postgres', true);
    update referee_payment_claim
       set state = 'approved', decided_by = treasurer, decided_at = now()
     where appointment_id = appt_aband;
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claim.sub', treasurer::text, true);

    begin
      update referee_payment_claim set batch_id = the_batch
       where appointment_id = appt_aband;
      failures := array_append(failures, 'a closed batch gained another claim');
    exception when others then null;
    end;

    if app_batch_total_cents(the_batch) <> 4000 then
      failures := array_append(failures, 'the closed batch total moved');
    end if;

    -- 16. Closed, so it can be paid — and the remittance records what the
    --     club did elsewhere (BR118).
    begin
      update referee_payment_batch set paid_at = now(), paid_by = treasurer, paid_reference = 'EFT-1'
       where id = the_batch;
    exception when others then
      failures := array_append(failures, 'a closed batch could not be paid');
    end;
  end if;

  -- 17. A coordinator does not open, close or pay a batch.
  perform set_config('request.jwt.claim.sub', coord::text, true);
  begin
    insert into referee_payment_batch (club_id, reference) values (north_star, 'SNEAK');
    failures := array_append(failures, 'a coordinator created a payment batch');
  exception when others then null;
  end;

  -- 18. Another club reads and writes none of it.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);
  select count(*) into n from referee_payment_claim;
  if n <> 0 then
    failures := array_append(failures, 'another club read the claims');
  end if;
  select count(*) into n from referee_payment_batch;
  if n <> 0 then
    failures := array_append(failures, 'another club read the payment batches');
  end if;
  if app_batch_total_cents(the_batch) <> 0 then
    failures := array_append(failures, 'a function handed another club a batch total');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Referee claims FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Referee claims OK — 18 scenarios; nothing unverified, cancelled, unexplained or twice-claimed is payable, the coordinator who raised it does not approve it, and a closed batch keeps its total';
end
$$;
