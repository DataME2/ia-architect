-- Does a voucher stay inert until someone checks it, and does a second
-- child reuse the parent it already has?
--
-- Both claims are about what the database does on its own:
--
--   BR80  a family registering a second child through the public link gets
--         the *same* guardian Person, not a copy. Asserted through the
--         security-definer function, as `anon`, the way a family arrives.
--   BR81  a voucher may not be marked VERIFIED without a receipt carrying
--         its relief, and may not sit in ATTACHED while carrying one --
--         a check constraint, so no writer can produce a discount nobody
--         can trace.
--
-- Plus the split BR78 draws and BR21 motivates: a registrar may attach a
-- voucher, because collecting the document is registration work, but only
-- an admin or treasurer may verify one, because that is the act that moves
-- money.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into season
  (id, club_id, name, starts_on, ends_on, required_document_types, registration_fee_cents)
values
  ('a1111111-1111-1111-1111-11111111ab01',
   '11111111-1111-1111-1111-111111111111',
   '2030 (voucher test)', '2030-01-01', '2030-12-01', array[]::text[], 20000);

insert into registration_invitation
  (club_id, season_id, token_hash, label, expires_at, created_by_user_id)
values
  ('11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-11111111ab01',
   encode(digest('family-token', 'sha256'), 'hex'),
   'MiniRoos 2030', now() + interval '30 days',
   'd1111111-1111-1111-1111-111111111111');

commit;

-- --------------------------------------------- BR80, through the real path

do $$
declare
  north_star  uuid := '11111111-1111-1111-1111-111111111111';
  test_season uuid := 'a1111111-1111-1111-1111-11111111ab01';
  reg_one     uuid;
  reg_two     uuid;
  reg_three   uuid;
  guardians   integer;
  seen        integer;
  failures    text[] := array[]::text[];
begin
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);

  -- Two children, one parent, same email -- the MiniRoos case.
  reg_one := submit_public_registration(
    'family-token', 'Aarav', 'Kaur', null, date '2018-04-02',
    null, 'Simran', 'Kaur', 'simran@example.test', true, false, false);

  reg_two := submit_public_registration(
    'family-token', 'Meera', 'Kaur', null, date '2020-08-19',
    null, 'Simran', 'Kaur', 'Simran@Example.TEST  ', true, false, false);

  -- A third family with no email given: the old behaviour must still work.
  reg_three := submit_public_registration(
    'family-token', 'Tom', 'Baker', null, date '2019-01-05',
    null, 'Alice', 'Baker', null, true, false, false);

  set local role postgres;

  -- 1. One guardian Person for the two siblings, not two.
  select count(distinct g.guardian_person_id) into guardians
  from guardianship g
  join registration r on r.person_id = g.person_id
  where r.id in (reg_one, reg_two);

  if guardians <> 1 then
    failures := array_append(
      failures,
      format('expected 1 shared guardian for two siblings, found %s (BR80)', guardians)
    );
  end if;

  -- 2. Matching is case- and space-insensitive on the email, because a
  --    parent typing their own address twice will not type it identically.
  select count(*) into seen
  from person
  where club_id = north_star and lower(btrim(email)) = 'simran@example.test';
  if seen <> 1 then
    failures := array_append(
      failures,
      format('expected 1 person for the parent email, found %s -- the match is too strict', seen)
    );
  end if;

  -- 3. Each child still has their own guardianship row: shared parent, two
  --    relationships. Collapsing those would lose a child.
  select count(*) into seen
  from guardianship g
  join registration r on r.person_id = g.person_id
  where r.id in (reg_one, reg_two);
  if seen <> 2 then
    failures := array_append(failures, 'the two siblings do not each have a guardianship');
  end if;

  -- 4. The guardian holds the role once, not once per child.
  select count(*) into seen
  from person_role pr
  join person p on p.id = pr.person_id
  where p.club_id = north_star
    and lower(btrim(p.email)) = 'simran@example.test'
    and pr.season_id = test_season
    and pr.role = 'guardian';
  if seen <> 1 then
    failures := array_append(failures, 'the shared guardian holds the guardian role more than once');
  end if;

  -- 5. A different family is NOT merged into them.
  select count(*) into seen
  from guardianship g
  join registration r on r.person_id = g.person_id
  where r.id = reg_three
    and g.guardian_person_id in (
      select id from person where club_id = north_star
        and lower(btrim(email)) = 'simran@example.test'
    );
  if seen <> 0 then
    failures := array_append(failures, 'an unrelated family was attached to another parent');
  end if;

  -- 6. No email means no match, and a new Person -- BR5 catches duplicates
  --    later rather than this function guessing.
  select count(*) into seen
  from person
  where club_id = north_star and legal_given_names = 'Alice' and legal_family_name = 'Baker';
  if seen <> 1 then
    failures := array_append(failures, 'the emailless guardian was not created');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception 'Vouchers and siblings FAILED: %', array_to_string(failures, ' | ');
  end if;
end
$$;

-- -------------------------------------------------- BR81, and who may act

do $$
declare
  north_star   uuid := '11111111-1111-1111-1111-111111111111';
  rival        uuid := '22222222-2222-2222-2222-222222222222';
  ns_treasurer uuid := 'd3333333-3333-3333-3333-333333333333';
  ns_registrar uuid := 'd4444444-4444-4444-4444-444444444444';
  rival_treas  uuid := 'd5555555-5555-5555-5555-555555555555';
  the_reg      uuid;
  voucher_id   uuid;
  pay_id       uuid;
  owed         integer;
  seen         integer;
  failures     text[] := array[]::text[];
begin
  select r.id into the_reg
  from registration r
  join person p on p.id = r.person_id
  where p.legal_given_names = 'Aarav' and r.club_id = north_star;

  -- 1. BR81 as a constraint: VERIFIED without a receipt is refused, so a
  --    discount nobody can trace cannot be written by any route.
  set local role postgres;
  begin
    insert into registration_voucher
      (club_id, registration_id, program, code, face_value_cents, state, attached_by_user_id)
    values (north_star, the_reg, 'Play On!', 'BAD-1', 20000, 'VERIFIED', ns_treasurer);
    failures := array_append(failures, 'a voucher was verified with no relief payment (BR81)');
  exception when check_violation then null;
       when others then null;
  end;

  -- 2. And ATTACHED *with* a receipt is equally refused -- the invariant
  --    runs both ways, so relief cannot be applied without a decision.
  insert into payment
    (id, club_id, registration_id, amount_cents, received_on, method, recorded_by_user_id)
  values (gen_random_uuid(), north_star, the_reg, 100, current_date, 'voucher', ns_treasurer)
  returning id into pay_id;

  begin
    insert into registration_voucher
      (club_id, registration_id, program, code, face_value_cents, state,
       attached_by_user_id, relief_payment_id)
    values (north_star, the_reg, 'Play On!', 'BAD-2', 20000, 'ATTACHED', ns_treasurer, pay_id);
    failures := array_append(failures, 'an unverified voucher carried relief (BR81)');
  exception when check_violation then null;
       when others then null;
  end;

  -- ------------------------------------------------------- as a registrar
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ns_registrar::text, true);

  -- 3. A registrar may attach: collecting the document is registration work.
  begin
    insert into registration_voucher
      (club_id, registration_id, program, code, face_value_cents, attached_by_user_id)
    values (north_star, the_reg, 'Play On!', 'PO-55501', 20000, ns_registrar)
    returning id into voucher_id;
  exception when others then
    failures := array_append(failures, 'a registrar could not attach a voucher: ' || sqlerrm);
  end;

  -- 4. But may not verify one -- that is the act that moves money (BR78).
  if voucher_id is not null then
    update registration_voucher set state = 'VERIFIED' where id = voucher_id;
    select count(*) into seen
    from registration_voucher where id = voucher_id and state = 'ATTACHED';
    if seen <> 1 then
      failures := array_append(failures, 'a registrar verified a voucher (BR78)');
    end if;
  end if;

  -- 5. Nor may they attach one already marked verified, sidestepping the
  --    decision entirely.
  begin
    insert into registration_voucher
      (club_id, registration_id, program, code, face_value_cents, state, attached_by_user_id)
    values (north_star, the_reg, 'Play On!', 'PO-55502', 20000, 'VERIFIED', ns_registrar);
    failures := array_append(failures, 'a voucher was attached pre-verified');
  exception when others then null;
  end;

  -- 6. BR81 in effect: the balance has not moved.
  select outstanding_amount_cents into owed from registration where id = the_reg;
  if owed <> 20000 then
    failures := array_append(
      failures,
      format('attaching a voucher changed the balance to %s -- it must not (BR81)', owed)
    );
  end if;

  -- ------------------------------------------------------- as a treasurer
  perform set_config('request.jwt.claim.sub', ns_treasurer::text, true);

  -- 7. The treasurer may verify, and the constraint forces a receipt with it.
  if voucher_id is not null then
    insert into payment
      (club_id, registration_id, amount_cents, received_on, method, reference, recorded_by_user_id)
    values (north_star, the_reg, 20000, current_date, 'voucher', 'Play On! PO-55501', ns_treasurer)
    returning id into pay_id;

    update registration_voucher
       set state = 'VERIFIED', verified_by_user_id = ns_treasurer,
           verified_at = now(), relief_payment_id = pay_id
     where id = voucher_id;

    select count(*) into seen
    from registration_voucher where id = voucher_id and state = 'VERIFIED';
    if seen <> 1 then
      failures := array_append(failures, 'the treasurer could not verify a voucher');
    end if;
  end if;

  -- 8. One government voucher, one child. The same code twice is either a
  --    mistake or a duplicate claim, and the club should hear about it now.
  begin
    insert into registration_voucher
      (club_id, registration_id, program, code, face_value_cents, attached_by_user_id)
    values (north_star, the_reg, 'Play On!', 'PO-55501', 20000, ns_treasurer);
    failures := array_append(failures, 'the same voucher code was attached twice');
  exception when unique_violation then null;
       when others then null;
  end;

  -- 9. A voucher cannot be deleted: that a family once claimed one, and the
  --    club looked, is the record.
  delete from registration_voucher where id = voucher_id;
  select count(*) into seen from registration_voucher where id = voucher_id;
  if seen <> 1 then
    failures := array_append(failures, 'a voucher was deleted');
  end if;

  -- --------------------------------------------------------------- P5
  perform set_config('request.jwt.claim.sub', rival_treas::text, true);

  -- 10. Another club's treasurer sees none of it and cannot attach into it.
  select count(*) into seen from registration_voucher where club_id = north_star;
  if seen <> 0 then
    failures := array_append(failures, 'another club''s treasurer read vouchers');
  end if;

  begin
    insert into registration_voucher
      (club_id, registration_id, program, code, face_value_cents, attached_by_user_id)
    values (north_star, the_reg, 'Play On!', 'PO-99999', 20000, rival_treas);
    failures := array_append(failures, 'another club''s treasurer attached a voucher');
  exception when insufficient_privilege then null;
       when others then null;
  end;

  -- 11. A non-member and anon see nothing.
  perform set_config('request.jwt.claim.sub', 'd9999999-9999-9999-9999-999999999999', true);
  select count(*) into seen from registration_voucher;
  if seen <> 0 then
    failures := array_append(failures, 'a non-member read vouchers');
  end if;

  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into seen from registration_voucher;
  if seen <> 0 then
    failures := array_append(failures, 'anon read vouchers');
  end if;

  set local role postgres;

  if array_length(failures, 1) > 0 then
    raise exception 'Vouchers and siblings FAILED: %', array_to_string(failures, ' | ');
  end if;

  raise notice 'Vouchers and siblings OK — 17 scenarios; siblings share one guardian, and a voucher moves no money until someone decides.';
end
$$;
