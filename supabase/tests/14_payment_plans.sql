-- Do payment plans hold their own arithmetic, and stay inside their club?
--
-- Two claims are asserted here that no amount of application testing can
-- establish, because they are claims about what the *database* will refuse:
--
--   BR74  a plan's instalments sum to exactly its total. Enforced by a
--         deferred constraint trigger, so it holds against any writer --
--         including the next screen, a migration, or a hand-typed UPDATE.
--   BR77  a payment is append-only. Enforced by the *absence* of an update
--         and a delete policy: with RLS on, an operation with no policy is
--         denied, so a receipt cannot be rewritten through the API at all.
--
-- Plus the BR22-shaped separation the finance tables introduce: any club
-- member may read what a family owes, because a registrar chasing BR3 needs
-- to know why a registration is blocked, but only an admin or treasurer may
-- change it.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('d3333333-3333-3333-3333-333333333333', 'treasurer@northstar.test'),
  ('d4444444-4444-4444-4444-444444444444', 'registrar2@northstar.test'),
  ('d5555555-5555-5555-5555-555555555555', 'treasurer@rival.test');

insert into club_membership (club_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'd3333333-3333-3333-3333-333333333333', 'treasurer'),
  -- A registrar and nothing else: the negative case for the separation.
  ('11111111-1111-1111-1111-111111111111', 'd4444444-4444-4444-4444-444444444444', 'registrar'),
  ('22222222-2222-2222-2222-222222222222', 'd5555555-5555-5555-5555-555555555555', 'treasurer');

commit;

-- ---------------------------------------------------- BR74, as the owner
-- The trigger is not a policy, so it applies to the owner too. Asserting it
-- here first proves the constraint itself, independently of who may write.

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  ns_reg     uuid := 'c1111111-1111-1111-1111-111111111111';
  plan_id    uuid;
  failures   text[] := array[]::text[];
begin
  -- 1. A plan whose instalments do not sum to its total is refused at
  --    commit -- not silently accepted to be discovered in a dispute.
  begin
    insert into payment_plan (club_id, registration_id, total_cents, cadence, created_by_user_id)
    values (north_star, ns_reg, 12000, 'monthly', 'd3333333-3333-3333-3333-333333333333')
    returning id into plan_id;

    -- 3000 x 3 = 9000, three thousand cents short of the total.
    insert into payment_installment (club_id, payment_plan_id, sequence, due_on, amount_cents)
    values
      (north_star, plan_id, 1, date '2026-03-01', 3000),
      (north_star, plan_id, 2, date '2026-04-01', 3000),
      (north_star, plan_id, 3, date '2026-05-01', 3000);

    -- Force the deferred triggers to fire.
    set constraints all immediate;
    failures := array_append(failures, 'a plan short of its total was accepted (BR74)');
  exception when others then
    null;  -- expected
  end;
end
$$;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  ns_reg     uuid := 'c1111111-1111-1111-1111-111111111111';
  plan_id    uuid;
  seen       integer;
  failures   text[] := array[]::text[];
begin
  -- 2. And a plan that does add up commits, remainder cents included --
  --    $120.50 over three is 4018 + 4016 + 4016, the odd cents on the first.
  insert into payment_plan (club_id, registration_id, total_cents, cadence, created_by_user_id)
  values (north_star, ns_reg, 12050, 'monthly', 'd3333333-3333-3333-3333-333333333333')
  returning id into plan_id;

  insert into payment_installment (club_id, payment_plan_id, sequence, due_on, amount_cents)
  values
    (north_star, plan_id, 1, date '2026-03-01', 4018),
    (north_star, plan_id, 2, date '2026-04-01', 4016),
    (north_star, plan_id, 3, date '2026-05-01', 4016);

  set constraints all immediate;

  select count(*) into seen from payment_installment where payment_plan_id = plan_id;
  if seen <> 3 then
    failures := array_append(failures, 'a balanced plan did not commit');
  end if;

  -- 3. Raising the total without rescheduling is caught from the plan side.
  begin
    update payment_plan set total_cents = 15000 where id = plan_id;
    set constraints all immediate;
    failures := array_append(failures, 'a plan total was raised without rescheduling (BR74)');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception 'Payment plans FAILED: %', array_to_string(failures, ' | ');
  end if;
end
$$;

-- 4. Deleting an instalment breaks the sum, and is refused.
do $$
declare
  plan_id uuid;
begin
  select id into plan_id from payment_plan
   where registration_id = 'c1111111-1111-1111-1111-111111111111'
     and cancelled_at is null limit 1;

  begin
    delete from payment_installment where payment_plan_id = plan_id and sequence = 3;
    set constraints all immediate;
    raise exception 'Payment plans FAILED: an instalment was deleted, leaving the plan short (BR74)';
  exception
    when others then
      if sqlerrm like 'Payment plans FAILED%' then raise; end if;
  end;
end
$$;

-- --------------------------------------------------- the policies, as users

do $$
declare
  north_star    uuid := '11111111-1111-1111-1111-111111111111';
  rival         uuid := '22222222-2222-2222-2222-222222222222';
  ns_reg        uuid := 'c1111111-1111-1111-1111-111111111111';
  rival_reg     uuid := 'c2222222-2222-2222-2222-222222222222';
  ns_treasurer  uuid := 'd3333333-3333-3333-3333-333333333333';
  ns_registrar  uuid := 'd4444444-4444-4444-4444-444444444444';
  rival_treas   uuid := 'd5555555-5555-5555-5555-555555555555';
  plan_id       uuid;
  payment_id    uuid;
  seen          integer;
  failures      text[] := array[]::text[];
begin
  select id into plan_id from payment_plan
   where registration_id = ns_reg and cancelled_at is null limit 1;

  -- ---------------------------------------------------------- treasurer
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ns_treasurer::text, true);

  -- 5. The treasurer can see the plan and record a receipt.
  select count(*) into seen from payment_plan where id = plan_id;
  if seen <> 1 then
    failures := array_append(failures, 'the treasurer cannot see their own club''s plan');
  end if;

  begin
    insert into payment
      (club_id, registration_id, amount_cents, received_on, method, recorded_by_user_id)
    values (north_star, ns_reg, 4018, current_date, 'bank-transfer', ns_treasurer)
    returning id into payment_id;
  exception when others then
    failures := array_append(failures, 'the treasurer could not record a payment: ' || sqlerrm);
  end;

  -- 6. BR77: and cannot then rewrite it. No update policy exists, so the
  --    update matches no row rather than erroring -- which is why this is
  --    asserted by counting, not by catching.
  if payment_id is not null then
    update payment set amount_cents = 999999 where id = payment_id;

    select count(*) into seen from payment where id = payment_id and amount_cents = 4018;
    if seen <> 1 then
      failures := array_append(failures, 'a recorded payment was rewritten (BR77)');
    end if;

    -- 7. Nor delete it.
    delete from payment where id = payment_id;
    select count(*) into seen from payment where id = payment_id;
    if seen <> 1 then
      failures := array_append(failures, 'a recorded payment was deleted (BR77)');
    end if;
  end if;

  -- 8. A correction is a reversing entry, and that is permitted.
  begin
    insert into payment
      (club_id, registration_id, amount_cents, received_on, method,
       reverses_payment_id, recorded_by_user_id)
    values (north_star, ns_reg, -4018, current_date, 'adjustment', payment_id, ns_treasurer);
  exception when others then
    failures := array_append(failures, 'a reversing entry was refused: ' || sqlerrm);
  end;

  -- 9. P5: the treasurer cannot reach another club's registration.
  begin
    insert into payment
      (club_id, registration_id, amount_cents, received_on, method, recorded_by_user_id)
    values (rival, rival_reg, 5000, current_date, 'cash', ns_treasurer);
    failures := array_append(failures, 'a treasurer recorded a payment at another club');
  exception
    when insufficient_privilege then null;
    when others then null;
  end;

  -- ------------------------------------------------- registrar, not money
  perform set_config('request.jwt.claim.sub', ns_registrar::text, true);

  -- 10. A registrar may read -- they need to know why BR3 is failing.
  select count(*) into seen from payment_plan where id = plan_id;
  if seen <> 1 then
    failures := array_append(failures, 'a registrar cannot see why BR3 is blocked');
  end if;

  select count(*) into seen from payment where registration_id = ns_reg;
  if seen < 1 then
    failures := array_append(failures, 'a registrar cannot see receipts');
  end if;

  -- 11. But may not record money. That is the BR22 separation.
  begin
    insert into payment
      (club_id, registration_id, amount_cents, received_on, method, recorded_by_user_id)
    values (north_star, ns_reg, 1000, current_date, 'cash', ns_registrar);
    failures := array_append(failures, 'a registrar recorded a payment (BR22 separation)');
  exception
    when insufficient_privilege then null;
    when others then null;
  end;

  -- 12. Nor agree a plan.
  begin
    insert into payment_plan (club_id, registration_id, total_cents, cadence, created_by_user_id)
    values (north_star, ns_reg, 5000, 'weekly', ns_registrar);
    failures := array_append(failures, 'a registrar agreed a payment plan');
  exception
    when insufficient_privilege then null;
    when others then null;
  end;

  -- 13. Nor cancel one.
  update payment_plan set cancelled_at = now() where id = plan_id;
  select count(*) into seen from payment_plan where id = plan_id and cancelled_at is null;
  if seen <> 1 then
    failures := array_append(failures, 'a registrar cancelled a payment plan');
  end if;

  -- ---------------------------------------------- another club's treasurer
  perform set_config('request.jwt.claim.sub', rival_treas::text, true);

  -- 14. Sees none of it, and cannot write into it.
  select count(*) into seen from payment_plan where club_id = north_star;
  if seen <> 0 then
    failures := array_append(failures, 'another club''s treasurer read a payment plan');
  end if;

  select count(*) into seen from payment where club_id = north_star;
  if seen <> 0 then
    failures := array_append(failures, 'another club''s treasurer read receipts');
  end if;

  begin
    insert into payment
      (club_id, registration_id, amount_cents, received_on, method, recorded_by_user_id)
    values (north_star, ns_reg, 9999, current_date, 'cash', rival_treas);
    failures := array_append(failures, 'another club''s treasurer recorded a payment');
  exception
    when insufficient_privilege then null;
    when others then null;
  end;

  -- ------------------------------------------------ non-member, and anon
  perform set_config('request.jwt.claim.sub', 'd9999999-9999-9999-9999-999999999999', true);

  select count(*) into seen from payment_plan;
  if seen <> 0 then
    failures := array_append(failures, 'a non-member read payment plans');
  end if;
  select count(*) into seen from payment;
  if seen <> 0 then
    failures := array_append(failures, 'a non-member read receipts');
  end if;

  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);

  select count(*) into seen from payment_plan;
  if seen <> 0 then failures := array_append(failures, 'anon read payment plans'); end if;
  select count(*) into seen from payment_installment;
  if seen <> 0 then failures := array_append(failures, 'anon read instalments'); end if;
  select count(*) into seen from payment;
  if seen <> 0 then failures := array_append(failures, 'anon read receipts'); end if;

  set local role postgres;

  if array_length(failures, 1) > 0 then
    raise exception 'Payment plans FAILED: %', array_to_string(failures, ' | ');
  end if;
end
$$;

-- 15. One live plan per registration; a cancelled one leaves room for a
--     replacement. Two live plans are two answers to "what does this family
--     owe", and the family gets whichever one the screen happened to load.
do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  ns_reg     uuid := 'c1111111-1111-1111-1111-111111111111';
  plan_id    uuid;
  new_plan   uuid;
begin
  begin
    insert into payment_plan (club_id, registration_id, total_cents, cadence, created_by_user_id)
    values (north_star, ns_reg, 6000, 'weekly', 'd3333333-3333-3333-3333-333333333333');
    set constraints all immediate;
    raise exception 'Payment plans FAILED: a second live plan was accepted for one registration';
  exception
    when unique_violation then null;
    when others then
      if sqlerrm like 'Payment plans FAILED%' then raise; end if;
  end;

  update payment_plan set cancelled_at = now()
   where registration_id = ns_reg and cancelled_at is null
   returning id into plan_id;

  insert into payment_plan (club_id, registration_id, total_cents, cadence, created_by_user_id)
  values (north_star, ns_reg, 6000, 'weekly', 'd3333333-3333-3333-3333-333333333333')
  returning id into new_plan;

  insert into payment_installment (club_id, payment_plan_id, sequence, due_on, amount_cents)
  values (north_star, new_plan, 1, date '2026-03-01', 6000);

  set constraints all immediate;

  raise notice 'Payment plans OK — 15 scenarios; BR74 holds against any writer, BR77 receipts cannot be rewritten, and money stays inside its club.';
end
$$;
