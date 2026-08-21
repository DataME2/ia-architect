-- Do both surfaces produce the same registration, and is a merge safe?
--
-- The defect this suite exists for: two implementations of one business
-- process, only one of them correct. A registration created through the
-- registrar's own screen came out with no roles, no document checklist, no
-- fee and a duplicated parent, while the family link got all four. Nothing
-- caught it, because nothing compared them.
--
-- So the first assertion is an equivalence: create a registration each way
-- and demand the same shape. That is the check that would have failed in
-- August and the one that keeps the two from drifting again.
--
--   BR82  a merge repoints every reference to the survivor and leaves the
--         duplicate as a tombstone -- never a delete, and never across
--         clubs.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into season
  (id, club_id, name, starts_on, ends_on, required_document_types, registration_fee_cents)
values
  ('a1111111-1111-1111-1111-1111111c0de1',
   '11111111-1111-1111-1111-111111111111',
   '2031 (one path test)', '2031-01-01', '2031-12-01',
   array['Birth certificate', 'Photo ID'], 15000);

insert into registration_invitation
  (club_id, season_id, token_hash, label, expires_at, created_by_user_id)
values
  ('11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-1111111c0de1',
   encode(digest('onepath-token', 'sha256'), 'hex'),
   'Both paths', now() + interval '30 days',
   'd1111111-1111-1111-1111-111111111111');

commit;

-- ------------------------------------------------- the two paths must agree

do $$
declare
  north_star   uuid := '11111111-1111-1111-1111-111111111111';
  test_season  uuid := 'a1111111-1111-1111-1111-1111111c0de1';
  ns_registrar uuid := 'd1111111-1111-1111-1111-111111111111';
  public_reg   uuid;
  club_reg     uuid;
  a_docs int; b_docs int;
  a_roles int; b_roles int;
  a_fee int;  b_fee int;
  seen int;
  failures text[] := array[]::text[];
begin
  -- A family, through the link.
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  public_reg := submit_public_registration(
    'onepath-token', 'Ana', 'Rivera', null, date '2016-05-05',
    null, 'Lucia', 'Rivera', 'lucia@example.test', true, false, false);

  -- A registrar, through the club's own screen.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ns_registrar::text, true);
  club_reg := submit_club_registration(
    north_star, test_season, 'Beto', 'Rivera', null, date '2015-07-07',
    null, 'Lucia', 'Rivera', 'lucia@example.test', true, false, false);

  set local role postgres;

  -- 1. The same document checklist, both ways.
  select count(*) into a_docs from registration_document where registration_id = public_reg;
  select count(*) into b_docs from registration_document where registration_id = club_reg;
  if a_docs <> 2 or b_docs <> 2 then
    failures := array_append(
      failures,
      format('checklists differ: link produced %s, club screen produced %s (BR2)', a_docs, b_docs)
    );
  end if;

  -- 2. The same fee.
  select outstanding_amount_cents into a_fee from registration where id = public_reg;
  select outstanding_amount_cents into b_fee from registration where id = club_reg;
  if a_fee <> 15000 or b_fee <> 15000 then
    failures := array_append(
      failures,
      format('fees differ: link %s, club screen %s (BR3)', a_fee, b_fee)
    );
  end if;

  -- 3. A player role from both.
  select count(*) into a_roles from person_role pr
   join registration r on r.person_id = pr.person_id and r.season_id = pr.season_id
   where r.id = public_reg and pr.role = 'player';
  select count(*) into b_roles from person_role pr
   join registration r on r.person_id = pr.person_id and r.season_id = pr.season_id
   where r.id = club_reg and pr.role = 'player';
  if a_roles <> 1 or b_roles <> 1 then
    failures := array_append(
      failures,
      format('player roles differ: link %s, club screen %s (P1)', a_roles, b_roles)
    );
  end if;

  -- 4. And BR80 across the two surfaces: the registrar-entered sibling
  --    attaches to the parent the family link already created.
  select count(distinct g.guardian_person_id) into seen
  from guardianship g
  join registration r on r.person_id = g.person_id
  where r.id in (public_reg, club_reg);
  if seen <> 1 then
    failures := array_append(
      failures,
      format('the two paths created %s guardians for one parent (BR80)', seen)
    );
  end if;

  if array_length(failures, 1) > 0 then
    raise exception 'One path FAILED: %', array_to_string(failures, ' | ');
  end if;
end
$$;

-- ------------------------------------------------------- BR82: the merge

do $$
declare
  north_star   uuid := '11111111-1111-1111-1111-111111111111';
  rival        uuid := '22222222-2222-2222-2222-222222222222';
  ns_registrar uuid := 'd1111111-1111-1111-1111-111111111111';
  test_season  uuid := 'a1111111-1111-1111-1111-1111111c0de1';
  keeper       uuid;
  dupe         uuid;
  rival_person uuid := 'b2222222-2222-2222-2222-222222222222';
  seen int;
  failures text[] := array[]::text[];
begin
  set local role postgres;

  -- Two records for one parent, the way the club actually accumulated them:
  -- same address, different spellings of the name.
  insert into person (club_id, legal_given_names, legal_family_name, date_of_birth, email)
  values (north_star, 'Lucia', 'Rivera Gomez', date '1900-01-01', 'dupe@example.test')
  returning id into keeper;

  insert into person (club_id, legal_given_names, legal_family_name, date_of_birth, email)
  values (north_star, 'L', 'Rivera', date '1900-01-01', 'dupe@example.test')
  returning id into dupe;

  -- The duplicate holds the clearance, and therefore the coach role. The
  -- survivor holds neither. This is the case BR84 turned into a trap: a
  -- merge that moved the role without the card would leave the survivor
  -- holding a coaching role they are not cleared for.
  insert into clearance
    (club_id, person_id, kind, identifier, expires_on, verified_by_user_id, verified_at)
  values (north_star, dupe, 'WWCC', 'BC-MERGE-1', date '2040-01-01', ns_registrar, now());

  insert into person_role (club_id, person_id, season_id, role)
  values (north_star, keeper, test_season, 'guardian'),
         (north_star, dupe, test_season, 'guardian'),
         (north_star, dupe, test_season, 'coach');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ns_registrar::text, true);

  -- 1. A cross-club merge is refused outright.
  begin
    perform merge_person(keeper, rival_person);
    failures := array_append(failures, 'a person was merged across clubs');
  exception when others then null;
  end;

  -- 2. And a person cannot be merged into themselves.
  begin
    perform merge_person(keeper, keeper);
    failures := array_append(failures, 'a person was merged into themselves');
  exception when others then null;
  end;

  -- 3. The real merge.
  perform merge_person(keeper, dupe);

  -- 4. The duplicate survives as a tombstone pointing at the keeper.
  select count(*) into seen
  from person where id = dupe and merged_into_person_id = keeper;
  if seen <> 1 then
    failures := array_append(failures, 'the duplicate was not tombstoned (BR82)');
  end if;

  select count(*) into seen from person where id = dupe;
  if seen <> 1 then
    failures := array_append(failures, 'the duplicate was deleted rather than kept');
  end if;

  -- 5. Roles moved, and the collision did not duplicate.
  select count(*) into seen
  from person_role where person_id = keeper and season_id = test_season and role = 'guardian';
  if seen <> 1 then
    failures := array_append(
      failures,
      format('the survivor holds the guardian role %s times after merging', seen)
    );
  end if;

  select count(*) into seen
  from person_role where person_id = keeper and season_id = test_season and role = 'coach';
  if seen <> 1 then
    failures := array_append(failures, 'the duplicate''s unique role was lost in the merge');
  end if;

  -- 5b. And the clearance came with them. Without this the survivor holds a
  --     coaching role with no card, which BR84 exists to make impossible.
  select count(*) into seen from clearance where person_id = keeper;
  if seen <> 1 then
    failures := array_append(
      failures,
      'the clearance did not move with the person — the survivor coaches uncleared (BR84)'
    );
  end if;

  -- 6. Nothing is left pointing at the tombstone.
  select count(*) into seen from person_role where person_id = dupe;
  if seen <> 0 then
    failures := array_append(failures, 'a role still points at the merged-away record');
  end if;

  -- 7. The merge is on the record, with who did it.
  set local role postgres;
  select count(*) into seen
  from audit_event
  where action = 'person_merged' and entity_id = keeper
    and detail->>'duplicateId' = dupe::text;
  if seen <> 1 then
    failures := array_append(failures, 'the merge was not audited');
  end if;

  -- 8. And a merged record is not offered as a fresh duplicate again: the
  --    guardian lookup skips tombstones, so a later sibling attaches to the
  --    survivor rather than resurrecting the copy.
  select count(*) into seen
  from person
  where club_id = north_star
    and lower(btrim(email)) = 'dupe@example.test'
    and merged_into_person_id is null;
  if seen <> 1 then
    failures := array_append(
      failures,
      format('%s live records still share the merged email', seen)
    );
  end if;

  if array_length(failures, 1) > 0 then
    raise exception 'One path FAILED: %', array_to_string(failures, ' | ');
  end if;

  raise notice 'One path and merging OK — 12 scenarios; both surfaces build the same registration, and a merge keeps everything it moved.';
end
$$;
