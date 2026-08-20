-- Do BR2 and BR3 have anything to check, and does P1 reach the database?
--
-- This suite exists because of a silent pass. `registration_document` had a
-- table, policies and a mapper, and nothing ever wrote a row -- so BR2's
-- "every required document is attached" compared an empty list against an
-- empty list and reported *pass* on every registration ever made. A
-- safeguarding rule that cannot fail is worse than an absent one, because
-- the queue reports it as checked.
--
-- `person_role` had the same shape of gap: a table, policies, a check
-- constraint, and no code. P1 -- one Person, many roles -- was true in the
-- schema and unrepresented in the running system.
--
-- 0006 closes both at the point registrations are created. What follows
-- proves it, and proves that closing it did not open a hole in P5: a
-- registrar at one club still cannot grant a role at another.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures
-- Its own season, so this suite cannot collide with 10, 11 or 12 on
-- season-scoped unique constraints.

begin;

insert into season
  (id, club_id, name, starts_on, ends_on, required_document_types, registration_fee_cents)
values
  ('a1111111-1111-1111-1111-1111111111df',
   '11111111-1111-1111-1111-111111111111',
   '2029 (requirements test)', '2029-01-01', '2029-12-01',
   array['Birth certificate', 'Proof of address'], 12050);

insert into registration_invitation
  (club_id, season_id, token_hash, label, expires_at, created_by_user_id)
values
  ('11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-1111111111df',
   encode(digest('requirements-token', 'sha256'), 'hex'),
   'U10s 2029', now() + interval '30 days',
   'd1111111-1111-1111-1111-111111111111');

commit;

-- ------------------------------------------------------------ assertions

do $$
declare
  north_star   uuid := '11111111-1111-1111-1111-111111111111';
  rival        uuid := '22222222-2222-2222-2222-222222222222';
  ns_registrar uuid := 'd1111111-1111-1111-1111-111111111111';
  rival_person uuid := 'b2222222-2222-2222-2222-222222222222';
  test_season  uuid := 'a1111111-1111-1111-1111-1111111111df';
  rival_season uuid := 'a2222222-2222-2222-2222-222222222222';
  minor_reg    uuid;
  minor_person uuid;
  guardian_id  uuid;
  seen         integer;
  owing        integer;
  failures     text[] := array[]::text[];
begin
  -- A family submits, with no session at all.
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);

  begin
    minor_reg := submit_public_registration(
      'requirements-token', 'Priya', 'Kaur', null, date '2018-09-14',
      null, 'Simran', 'Kaur', 'simran@example.test', true, false, false);
  exception when others then
    failures := array_append(failures, 'the requirements-season link was refused: ' || sqlerrm);
  end;

  -- The function is SECURITY DEFINER and bypasses RLS, so its effects are
  -- inspected as the owner.
  set local role postgres;

  if minor_reg is null then
    raise exception 'Requirements and roles FAILED: no registration was created';
  end if;

  select person_id, outstanding_amount_cents
    into minor_person, owing
  from registration where id = minor_reg;

  -- 1. BR2 now has something to check: one row per required document.
  select count(*) into seen
  from registration_document
  where registration_id = minor_reg and required;
  if seen <> 2 then
    failures := array_append(
      failures,
      format('expected 2 required documents from the season checklist, found %s -- BR2 would pass vacuously', seen)
    );
  end if;

  -- 2. Named exactly as configured. BR2 reads these names back to a family,
  --    so a mangled one is a message nobody can act on.
  select count(*) into seen
  from registration_document
  where registration_id = minor_reg
    and document_type in ('Birth certificate', 'Proof of address');
  if seen <> 2 then
    failures := array_append(failures, 'the document types do not match the season checklist');
  end if;

  -- 3. And none of them is marked received. A checklist that arrives
  --    pre-satisfied is the same bug wearing a different hat.
  select count(*) into seen
  from registration_document
  where registration_id = minor_reg and provided_at is not null;
  if seen <> 0 then
    failures := array_append(failures, 'a document arrived already marked as received');
  end if;

  -- 4. BR3 likewise: the registration opens owing the season's fee.
  if owing <> 12050 then
    failures := array_append(
      failures,
      format('expected the season fee of 12050 cents outstanding, found %s', owing)
    );
  end if;

  -- 5. P1: the child holds a player role for the season.
  select count(*) into seen
  from person_role
  where person_id = minor_person and season_id = test_season and role = 'player';
  if seen <> 1 then
    failures := array_append(failures, 'the registered child holds no player role (P1)');
  end if;

  -- 6. And the guardian is a Person holding a guardian role, not a second
  --    kind of record -- which is what makes them findable at all.
  select guardian_person_id into guardian_id
  from guardianship where person_id = minor_person;

  if guardian_id is null then
    failures := array_append(failures, 'no guardianship was created for a minor (BR1)');
  else
    select count(*) into seen
    from person_role
    where person_id = guardian_id and season_id = test_season and role = 'guardian';
    if seen <> 1 then
      failures := array_append(failures, 'the guardian holds no guardian role (P1)');
    end if;
  end if;

  -- 7. Every one of those rows carries the inviting club, and nothing
  --    reached another one.
  select count(*) into seen
  from person_role
  where season_id = test_season and club_id <> north_star;
  if seen <> 0 then
    failures := array_append(failures, 'a role row landed outside the inviting club');
  end if;

  select count(*) into seen
  from registration_document
  where registration_id = minor_reg and club_id <> north_star;
  if seen <> 0 then
    failures := array_append(failures, 'a document row landed outside the inviting club');
  end if;

  -- ------------------------------------------------------------- as a user
  -- The rest runs as `authenticated`, which does not own the tables, so the
  -- policies actually apply.

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ns_registrar::text, true);

  -- 8. The club's own registrar can read the roles.
  select count(*) into seen from person_role where season_id = test_season;
  if seen < 2 then
    failures := array_append(failures, 'the club''s registrar cannot see its own roles');
  end if;

  -- 9. And can grant one.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (north_star, minor_person, test_season, 'referee');
  exception when others then
    failures := array_append(failures, 'the club''s registrar could not grant a role: ' || sqlerrm);
  end;

  -- 10. Granting the same role twice is refused by the constraint rather
  --     than duplicated -- the screen is a form a registrar can double-post.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (north_star, minor_person, test_season, 'referee');
    failures := array_append(failures, 'a duplicate role row was accepted');
  exception
    when unique_violation then null;
    when others then null;
  end;

  -- 11. P5: it cannot grant a role at another club, even naming that club's
  --     own person and season.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (rival, rival_person, rival_season, 'player');
    failures := array_append(failures, 'a registrar granted a role at another club');
  exception
    when insufficient_privilege then null;
    when others then null;
  end;

  -- 12. Nor can it label its own person with another club's id.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (rival, minor_person, test_season, 'coach');
    failures := array_append(failures, 'a registrar wrote a role row stamped with another club');
  exception
    when insufficient_privilege then null;
    when others then null;
  end;

  -- 13. It cannot see another club's roles, and cannot mark another club's
  --     document as received -- the update matches no visible row.
  select count(*) into seen from person_role where club_id = rival;
  if seen <> 0 then
    failures := array_append(failures, 'a registrar could read another club''s roles');
  end if;

  -- 14. An outsider with no membership sees none of it.
  perform set_config('request.jwt.claim.sub', 'd9999999-9999-9999-9999-999999999999', true);

  select count(*) into seen from person_role;
  if seen <> 0 then
    failures := array_append(failures, 'a non-member could read roles');
  end if;

  select count(*) into seen from registration_document;
  if seen <> 0 then
    failures := array_append(failures, 'a non-member could read required documents');
  end if;

  -- 15. And an anonymous caller sees nothing, including the season's fee.
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);

  select count(*) into seen from person_role;
  if seen <> 0 then
    failures := array_append(failures, 'anon could read roles');
  end if;

  select count(*) into seen from season;
  if seen <> 0 then
    failures := array_append(failures, 'anon could read season configuration');
  end if;

  set local role postgres;

  if array_length(failures, 1) > 0 then
    raise exception 'Requirements and roles FAILED: %', array_to_string(failures, ' | ');
  end if;

  raise notice 'Requirements and roles OK — 15 scenarios; BR2 and BR3 have something to check, and P1 reaches the database without weakening P5.';
end
$$;
