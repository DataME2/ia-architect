-- Can a guardian see what is still missing for their own child — and only
-- their own child?
--
-- 0028 left `registration_document` out of the family's reads, and the gap
-- was silent: BR2 asks which required documents are missing by reading the
-- rows the caller can see, so a guardian who could see none was told every
-- document was attached. So the claims worth proving are:
--
--   * a linked guardian reads their own child's documents and vouchers,
--   * reads none of another family's at the same club,
--   * read nothing before the link existed,
--   * a stranger still reads nothing, and a club officer still reads both,
--   * and the new reads bought no write — a family cannot mark a document
--     provided for themselves.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

-- Its own never-a-member account, rather than the shared `outsider`
-- fixture: an earlier suite grants that one a role at North Star, so a
-- "stranger" scenario written against it tests nothing it says it does.
insert into auth.users (id, email) values
  ('d32a0000-0000-0000-0000-000000000001', 'household.parent@northstar.test'),
  ('d32a0000-0000-0000-0000-0000000000ee', 'household.stranger@elsewhere.test');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b32a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Hana', 'Household', '1986-04-04', 'household.parent@northstar.test'),
  ('b32a0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Piri', 'Household', '2016-05-05', null),
  ('b32a0000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Other', 'Household', '1985-01-01', null),
  ('b32a0000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'Oli', 'Household', '2015-02-02', null);

insert into guardianship (club_id, person_id, guardian_person_id, is_authority) values
  ('11111111-1111-1111-1111-111111111111', 'b32a0000-0000-0000-0000-000000000002',
   'b32a0000-0000-0000-0000-000000000001', true),
  ('11111111-1111-1111-1111-111111111111', 'b32a0000-0000-0000-0000-000000000004',
   'b32a0000-0000-0000-0000-000000000003', true);

insert into registration (id, club_id, person_id, season_id, status) values
  ('c32a0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'b32a0000-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 'PENDING_DOCUMENTS'),
  ('c32a0000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'b32a0000-0000-0000-0000-000000000004', 'a1111111-1111-1111-1111-111111111111', 'PENDING_DOCUMENTS');

insert into registration_document (club_id, registration_id, document_type, required) values
  ('11111111-1111-1111-1111-111111111111', 'c32a0000-0000-0000-0000-000000000002', 'BIRTH_CERTIFICATE', true),
  ('11111111-1111-1111-1111-111111111111', 'c32a0000-0000-0000-0000-000000000004', 'BIRTH_CERTIFICATE', true);

insert into registration_voucher (club_id, registration_id, program, code, face_value_cents, attached_by_user_id) values
  ('11111111-1111-1111-1111-111111111111', 'c32a0000-0000-0000-0000-000000000002',
   'Play On!', 'HOUSEHOLD-32-A', 15000, 'd1111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111', 'c32a0000-0000-0000-0000-000000000004',
   'Play On!', 'HOUSEHOLD-32-B', 15000, 'd1111111-1111-1111-1111-111111111111');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  officer    uuid := 'd1111111-1111-1111-1111-111111111111';
  stranger   uuid := 'd32a0000-0000-0000-0000-0000000000ee';
  parent     uuid := 'd32a0000-0000-0000-0000-000000000001';
  hana       uuid := 'b32a0000-0000-0000-0000-000000000001';
  own_reg    uuid := 'c32a0000-0000-0000-0000-000000000002';
  other_reg  uuid := 'c32a0000-0000-0000-0000-000000000004';
  n          integer;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. **Nothing before the link.** An account is nobody until an
  --    administrator's assertion (or its claim) says who it is (BR107).
  perform set_config('request.jwt.claim.sub', parent::text, true);
  select count(*) into n from registration_document where registration_id = own_reg;
  if n <> 0 then
    failures := array_append(failures, 'an unlinked account read a child''s documents');
  end if;

  perform set_config('role', 'postgres', true);
  insert into account_person (club_id, user_id, person_id) values (north_star, parent, hana);
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', parent::text, true);

  -- 2. **Once linked, their own child's documents and vouchers** — without
  --    these BR2 reports every document attached.
  select count(*) into n from registration_document where registration_id = own_reg;
  if n <> 1 then
    failures := array_append(failures, 'a linked guardian could not read their child''s documents');
  end if;
  select count(*) into n from registration_voucher where registration_id = own_reg;
  if n <> 1 then
    failures := array_append(failures, 'a linked guardian could not read their child''s voucher');
  end if;

  -- 3. **And none of another family's**, at the same club.
  select count(*) into n from registration_document where registration_id = other_reg;
  if n <> 0 then
    failures := array_append(failures, 'a guardian read another family''s documents');
  end if;
  select count(*) into n from registration_voucher where registration_id = other_reg;
  if n <> 0 then
    failures := array_append(failures, 'a guardian read another family''s voucher');
  end if;

  -- 4. **Reads bought no write.** Marking a document provided stays the
  --    registrar's act; the update touches nothing, silently, as RLS does.
  update registration_document set provided_at = now() where registration_id = own_reg;
  perform set_config('role', 'postgres', true);
  select count(*) into n from registration_document where registration_id = own_reg and provided_at is not null;
  if n <> 0 then
    failures := array_append(failures, 'a guardian marked their own child''s document as provided');
  end if;
  perform set_config('role', 'authenticated', true);

  -- 5. **A stranger still reads nothing.**
  perform set_config('request.jwt.claim.sub', stranger::text, true);
  select count(*) into n from registration_document where registration_id in (own_reg, other_reg);
  if n <> 0 then
    failures := array_append(failures, 'an account with no link and no membership read documents');
  end if;

  -- 6. **A club officer's read is unchanged** — both families, as before.
  perform set_config('request.jwt.claim.sub', officer::text, true);
  select count(*) into n from registration_document where registration_id in (own_reg, other_reg);
  if n <> 2 then
    failures := array_append(failures, 'the additive policy narrowed what a club officer reads');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Household reads FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Household reads OK — 6 scenarios; a guardian sees what is missing for their own child, nobody else''s, and still writes nothing';
end
$$;
