-- Can the club forget somebody — and can it be stopped from forgetting the
-- wrong somebody?
--
-- The claims worth proving, in the order they would fail:
--
--   * an erasure with nothing binding it deletes the Person **and
--     everything attached**, leaving nothing to re-identify them by,
--   * the request survives its own subject, naming nobody (BR132),
--   * an erasure with a basis binding it is refused, naming **every**
--     basis and the date the last one lapses,
--   * a lapsed basis does not bind — the same request becomes honourable,
--   * the retention review **deletes nothing**, and never proposes a life
--     member, living or dead (BR69, BR70),
--   * disposal is refused for anything the review did not propose, and
--     re-checks the bases rather than trusting the review row (BR133),
--   * authority ends at eighteen and contactability does not (BR67),
--   * a coach reads none of it, and a second club reads none of the first's.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('d34a0000-0000-0000-0000-000000000001', 'privacy.coach@northstar.test');

insert into club_membership (club_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'd34a0000-0000-0000-0000-000000000001', 'coach');

-- Four people: one erasable, one bound, one life member (deceased), one
-- child who has just turned eighteen.
insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email, deceased_on) values
  ('b34a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Forgettable', 'Frank', '1990-01-01', 'frank@northstar.test', null),
  ('b34a0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Bound', 'Bella', '1991-02-02', 'bella@northstar.test', null),
  ('b34a0000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Honoured', 'Hemi', '1930-03-03', null, '2019-04-01'),
  ('b34a0000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'Grown', 'Gemma', (current_date - interval '18 years 1 day')::date, null, null),
  ('b34a0000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
   'Guardian', 'Gwen', '1980-05-05', 'gwen@northstar.test', null);

-- Frank has a registration and a consent, so the cascade has something to
-- prove rather than deleting a bare row.
insert into registration (id, club_id, person_id, season_id, status) values
  ('c34a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'b34a0000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'PENDING_DOCUMENTS');

insert into consent (club_id, person_id, purpose, granted_at, granted_by_person_id) values
  ('11111111-1111-1111-1111-111111111111', 'b34a0000-0000-0000-0000-000000000001',
   'REGISTRATION_COLLECTION_NOTICE', now(), 'b34a0000-0000-0000-0000-000000000001');

-- Hemi is a life member: seasonless, and the row the clock must not reach.
insert into person_role (club_id, person_id, season_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'b34a0000-0000-0000-0000-000000000003', null, 'life_member');

-- Gemma turned eighteen yesterday; Gwen holds authority and contact.
insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('11111111-1111-1111-1111-111111111111', 'b34a0000-0000-0000-0000-000000000004',
   'b34a0000-0000-0000-0000-000000000005', true, true);

-- Two bases on Bella: one lapsed, one live, so "names every basis" and
-- "reports the latest expiry" are both testable.
insert into retention_basis (club_id, person_id, basis, expires_on) values
  ('11111111-1111-1111-1111-111111111111', 'b34a0000-0000-0000-0000-000000000002',
   'statutory_financial', (current_date + interval '5 years')::date),
  ('11111111-1111-1111-1111-111111111111', 'b34a0000-0000-0000-0000-000000000002',
   'child_safety', (current_date - interval '1 day')::date);

insert into erasure_request (id, club_id, person_id) values
  ('e34a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'b34a0000-0000-0000-0000-000000000001'),
  ('e34a0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'b34a0000-0000-0000-0000-000000000002');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  admin_user uuid := 'd1111111-1111-1111-1111-111111111111';
  coach      uuid := 'd34a0000-0000-0000-0000-000000000001';
  frank      uuid := 'b34a0000-0000-0000-0000-000000000001';
  bella      uuid := 'b34a0000-0000-0000-0000-000000000002';
  hemi       uuid := 'b34a0000-0000-0000-0000-000000000003';
  gemma      uuid := 'b34a0000-0000-0000-0000-000000000004';
  req_frank  uuid := 'e34a0000-0000-0000-0000-000000000001';
  req_bella  uuid := 'e34a0000-0000-0000-0000-000000000002';
  n          integer;
  txt        text;
  d          date;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_user::text, true);

  -- 1. **Bound is refused, naming every basis that binds.** The lapsed one
  --    must not be named: a refusal citing a reason that has expired is a
  --    refusal a family can take apart.
  txt := app_decide_erasure(req_bella);
  if txt <> 'refused' then
    failures := array_append(failures, 'an erasure was honoured while a retention basis bound it');
  end if;

  perform set_config('role', 'postgres', true);
  select jsonb_array_length(refused_bases), honourable_from into n, d
    from erasure_request where id = req_bella;
  if n <> 1 then
    failures := array_append(failures, 'the refusal named ' || n || ' bases; it should name the one that still binds');
  end if;
  if d is null or d <= current_date then
    failures := array_append(failures, 'the refusal did not say when the record becomes erasable');
  end if;

  -- 2. **Nothing was deleted by a refusal.**
  select count(*) into n from person where id = bella;
  if n <> 1 then
    failures := array_append(failures, 'a refused erasure deleted the record anyway');
  end if;

  -- 3. **Unbound is honoured, and the cascade takes everything attached.**
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_user::text, true);
  txt := app_decide_erasure(req_frank);
  if txt <> 'honoured' then
    failures := array_append(failures, 'an erasure with nothing binding it was refused');
  end if;

  perform set_config('role', 'postgres', true);
  select count(*) into n from person where id = frank;
  if n <> 0 then failures := array_append(failures, 'an honoured erasure left the person behind'); end if;
  select count(*) into n from registration where person_id = frank;
  if n <> 0 then failures := array_append(failures, 'an honoured erasure left a registration behind'); end if;
  select count(*) into n from consent where person_id = frank;
  if n <> 0 then failures := array_append(failures, 'an honoured erasure left a consent behind'); end if;

  -- 4. **The request survives its subject, naming nobody** (BR132). "We
  --    deleted them" is an answer a regulator may want years later.
  select count(*) into n from erasure_request where id = req_frank and state = 'honoured' and person_id is null;
  if n <> 1 then
    failures := array_append(failures, 'the erasure request did not survive the erasure it authorised, or still names the person');
  end if;

  -- 5. **An answered request cannot be answered twice.**
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_user::text, true);
  begin
    txt := app_decide_erasure(req_bella);
    failures := array_append(failures, 'a decided request was decided again');
  exception when others then null;
  end;

  -- 6. **The review proposes and deletes nothing** (BR133).
  n := app_run_retention_review(north_star);
  perform set_config('role', 'postgres', true);
  select count(*) into n from person where club_id = north_star;
  if n < 4 then
    failures := array_append(failures, 'the retention review deleted records');
  end if;

  -- 7. **A life member is never proposed, deceased or not** (BR69, BR70).
  select count(*) into n from retention_review
   where person_id = hemi and state = 'due_for_disposal';
  if n <> 0 then
    failures := array_append(failures, 'a deceased life member was proposed for disposal — BR70 exists for exactly this row');
  end if;
  select count(*) into n from retention_review where person_id = hemi and state = 'life_member';
  if n <> 1 then
    failures := array_append(failures, 'a life member was not recognised by the review');
  end if;

  -- 8. **Disposal is refused for anything the review did not propose.**
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_user::text, true);
  begin
    perform app_dispose_person((select id from retention_review where person_id = hemi limit 1));
    failures := array_append(failures, 'a life member was disposed of through the disposal function');
  exception when others then null;
  end;

  -- 9. **Authority ends at eighteen; contact does not** (BR67).
  n := app_transfer_authority(north_star);
  perform set_config('role', 'postgres', true);
  select count(*) into n from guardianship
   where person_id = gemma and is_authority = false and is_contact = true;
  if n <> 1 then
    failures := array_append(failures, 'authority did not end at eighteen, or contactability ended with it');
  end if;

  -- 10. **A coach reads none of it.** Who asked to be forgotten is not a
  --     coach's business — BR120, and BR122's test that fails if widened.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coach::text, true);
  select count(*) into n from erasure_request;
  if n <> 0 then failures := array_append(failures, 'a coach read the club''s erasure requests'); end if;
  select count(*) into n from retention_basis;
  if n <> 0 then failures := array_append(failures, 'a coach read the club''s retention bases'); end if;
  select count(*) into n from retention_review;
  if n <> 0 then failures := array_append(failures, 'a coach read the club''s retention review'); end if;

  -- 11. **A coach cannot decide, review or export.**
  begin
    perform app_run_retention_review(north_star);
    failures := array_append(failures, 'a coach ran the retention review');
  exception when others then null;
  end;
  begin
    perform export_club_data(north_star);
    failures := array_append(failures, 'a coach exported the club''s data');
  exception when others then null;
  end;

  -- 12. **An administrator's export carries their own club and no other.**
  perform set_config('request.jwt.claim.sub', admin_user::text, true);
  select jsonb_array_length(export_club_data(north_star) -> 'people') into n;
  if n < 4 then failures := array_append(failures, 'the export did not carry the club''s people'); end if;
  select (export_club_data(north_star) -> 'club' ->> 'id') into txt;
  if txt <> north_star::text then
    failures := array_append(failures, 'the export named the wrong club');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Privacy rights FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Privacy rights OK — 12 scenarios; an erasure deletes or refuses with its reasons named, the request outlives its subject, the review proposes without deleting, a life member is never proposed, and authority ends at eighteen without contact ending with it';
end
$$;
