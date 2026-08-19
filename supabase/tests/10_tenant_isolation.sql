-- Does Row-Level Security actually isolate tenants?
--
-- scripts/check_rls.py proves a policy *exists*. This proves it *works* —
-- which is a different claim, and the one Principle P5 actually rests on.
-- A policy can be present and wrong, and the failure is silent until it is
-- one club reading another club's children's records.
--
-- Every assertion runs as the `authenticated` role, which does not own the
-- tables. Owners bypass RLS, so a test run as `postgres` would pass no
-- matter how broken the policies were.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

-- Supabase owns auth.users; the memberships below reference it (0003).
insert into auth.users (id, email) values
  ('d1111111-1111-1111-1111-111111111111', 'registrar@northstar.test'),
  ('d2222222-2222-2222-2222-222222222222', 'registrar@rival.test'),
  ('d9999999-9999-9999-9999-999999999999', 'nobody@example.test');

insert into club (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'North Star FC'),
  ('22222222-2222-2222-2222-222222222222', 'Rival United');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2026', '2026-01-01', '2026-12-01'),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '2026', '2026-01-01', '2026-12-01');

-- Registrar at North Star, registrar at Rival, and an outsider with no
-- membership anywhere.
insert into club_membership (club_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'registrar'),
  ('11111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'registrar');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Alexandra Jane', 'Nguyen', '2014-03-02'),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Thomas', 'Smith', '2013-06-11');

insert into registration (id, club_id, person_id, season_id) values
  ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111'),
  ('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222');

insert into audit_event (club_id, action, entity) values
  ('11111111-1111-1111-1111-111111111111', 'seed', 'test');

commit;

-- ----------------------------------------------------------- the assertions

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  rival      uuid := '22222222-2222-2222-2222-222222222222';
  ns_person  uuid := 'b1111111-1111-1111-1111-111111111111';
  rival_person uuid := 'b2222222-2222-2222-2222-222222222222';
  ns_season  uuid := 'a1111111-1111-1111-1111-111111111111';
  n integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd1111111-1111-1111-1111-111111111111', true);

  -- 1. Sees own club's people, and only those.
  select count(*) into n from person;
  if n <> 1 then failures := array_append(failures, format('person: saw %s rows, expected 1', n)); end if;

  select count(*) into n from person where club_id = rival;
  if n <> 0 then failures := array_append(failures, 'person: another club''s rows are visible'); end if;

  -- 2. Same for registrations, seasons, memberships.
  select count(*) into n from registration;
  if n <> 1 then failures := array_append(failures, format('registration: saw %s rows, expected 1', n)); end if;

  select count(*) into n from season;
  if n <> 1 then failures := array_append(failures, format('season: saw %s rows, expected 1', n)); end if;

  select count(*) into n from club;
  if n <> 1 then failures := array_append(failures, format('club: saw %s rows, expected 1', n)); end if;

  -- 3. Cannot write into another club.
  begin
    insert into person (club_id, legal_given_names, legal_family_name, date_of_birth)
    values (rival, 'Injected', 'Row', '2010-01-01');
    failures := array_append(failures, 'person: INSERT into another club was allowed');
  exception when insufficient_privilege then null;
  end;

  -- 4. Cannot update another club's row (silently affects zero rows).
  update person set preferred_name = 'hijacked' where id = rival_person;
  get diagnostics n = row_count;
  if n <> 0 then failures := array_append(failures, 'person: UPDATE reached another club''s row'); end if;

  -- 5. Cannot delete another club's row.
  delete from person where id = rival_person;
  get diagnostics n = row_count;
  if n <> 0 then failures := array_append(failures, 'person: DELETE reached another club''s row'); end if;

  -- 6. validation_result is insert-only (BR: results are evidence).
  insert into validation_result (club_id, registration_id, rule_id, status, message)
  values (north_star, 'c1111111-1111-1111-1111-111111111111', 'BR55', 'fail', 'test');
  update validation_result set status = 'pass' where club_id = north_star;
  get diagnostics n = row_count;
  if n <> 0 then failures := array_append(failures, 'validation_result: UPDATE was allowed'); end if;
  delete from validation_result where club_id = north_star;
  get diagnostics n = row_count;
  if n <> 0 then failures := array_append(failures, 'validation_result: DELETE was allowed'); end if;

  -- 7. audit_event is append-only, even for an admin (this user is one).
  update audit_event set action = 'tampered' where club_id = north_star;
  get diagnostics n = row_count;
  if n <> 0 then failures := array_append(failures, 'audit_event: UPDATE was allowed'); end if;
  delete from audit_event where club_id = north_star;
  get diagnostics n = row_count;
  if n <> 0 then failures := array_append(failures, 'audit_event: DELETE was allowed'); end if;

  -- 8. submission_pack cannot be deleted (BR58: it is evidence of what was sent).
  insert into submission_pack (club_id, season_id, version, generated_by_user_id, storage_path)
  values (north_star, ns_season, 1, 'd1111111-1111-1111-1111-111111111111', 'packs/1.csv');
  delete from submission_pack where club_id = north_star;
  get diagnostics n = row_count;
  if n <> 0 then failures := array_append(failures, 'submission_pack: DELETE was allowed'); end if;

  -- 9. A user with no membership anywhere sees nothing at all.
  perform set_config('request.jwt.claim.sub', 'd9999999-9999-9999-9999-999999999999', true);
  select count(*) into n from person;
  if n <> 0 then failures := array_append(failures, format('non-member saw %s person rows', n)); end if;
  select count(*) into n from registration;
  if n <> 0 then failures := array_append(failures, format('non-member saw %s registration rows', n)); end if;

  -- 10. An unauthenticated request sees nothing.
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from person;
  if n <> 0 then failures := array_append(failures, format('anonymous saw %s person rows', n)); end if;

  -- 11. The other club's registrar sees their own, and only their own.
  perform set_config('request.jwt.claim.sub', 'd2222222-2222-2222-2222-222222222222', true);
  select count(*) into n from person;
  if n <> 1 then failures := array_append(failures, format('rival registrar saw %s rows, expected 1', n)); end if;
  select count(*) into n from person where id = ns_person;
  if n <> 0 then failures := array_append(failures, 'rival registrar can see North Star''s player'); end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'TENANT ISOLATION FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'Tenant isolation OK — 11 scenarios, all enforced by the database.';
end
$$;
