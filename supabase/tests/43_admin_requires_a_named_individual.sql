-- Can `admin` be granted to an account nobody has said anything about?
--
-- BR106 (scope 48, WP3): an administrator's account must belong to one
-- identified human. There is no way to check that from an email address
-- alone, so `grant_club_role` (0042) checks the one thing the schema
-- *can* check instead: has an `account_person` link already been made.
--
--   * granting `admin` to an unlinked account is refused, citing BR106,
--   * granting any other role to the same account is unaffected,
--   * once linked, the same grant succeeds,
--   * and an account that already held `admin` before 0042 keeps it —
--     this gates the grant, not continued use.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99998888-0000-0000-0000-000000000001', 'Admin Link Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e59a0000-0000-0000-0000-000000000001', 'existing.admin@northstar.test'),
  ('e59a0000-0000-0000-0000-000000000002', 'unlinked.newcomer@northstar.test');

insert into club_membership (club_id, user_id, role) values
  ('99998888-0000-0000-0000-000000000001', 'e59a0000-0000-0000-0000-000000000001', 'admin');

commit;

do $$
declare
  the_club uuid := '99998888-0000-0000-0000-000000000001';
  existing_admin uuid := 'e59a0000-0000-0000-0000-000000000001';
  newcomer       uuid := 'e59a0000-0000-0000-0000-000000000002';
  person_id      uuid;
  n              integer;
  failures       text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', existing_admin::text, true);

  -- 1. A lesser role for the newcomer, ordinary and unaffected by BR106.
  perform grant_club_role('unlinked.newcomer@northstar.test', 'registrar');
  select count(*) into n from club_membership
   where club_id = the_club and user_id = newcomer and role = 'registrar';
  if n <> 1 then
    failures := array_append(failures, 'granting registrar to an unlinked account was refused -- BR106 only concerns admin');
  end if;

  -- 2. Admin, still unlinked, is refused and cites BR106.
  begin
    perform grant_club_role('unlinked.newcomer@northstar.test', 'admin');
    failures := array_append(failures, 'admin was granted to an unlinked account');
  exception when others then
    if sqlerrm not like '%BR106%' then
      failures := array_append(failures, 'the refusal did not cite BR106: ' || sqlerrm);
    end if;
  end;

  select count(*) into n from club_membership
   where club_id = the_club and user_id = newcomer and role = 'admin';
  if n <> 0 then
    failures := array_append(failures, 'admin ended up granted despite the refusal');
  end if;

  -- 3. Linked, the same grant now succeeds.
  insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth)
  values (gen_random_uuid(), the_club, 'New', 'Comer', '1990-01-01')
  returning id into person_id;
  perform link_account_to_person(newcomer, person_id);

  perform grant_club_role('unlinked.newcomer@northstar.test', 'admin');
  select count(*) into n from club_membership
   where club_id = the_club and user_id = newcomer and role = 'admin';
  if n <> 1 then
    failures := array_append(failures, 'admin was still refused after the account was linked');
  end if;

  -- 4. An account already holding admin keeps it -- this gates the grant,
  -- not continued use. Re-granting (on conflict do nothing) must not
  -- somehow revoke it by re-checking a link that was never made for the
  -- original admin fixture.
  perform grant_club_role('existing.admin@northstar.test', 'admin');
  select count(*) into n from club_membership
   where club_id = the_club and user_id = existing_admin and role = 'admin';
  if n <> 1 then
    failures := array_append(failures, 're-granting admin to an already-admin account changed its standing');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Admin requires a named individual FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Admin requires a named individual OK — 4 scenarios; admin is refused to an unlinked account citing BR106, a lesser role is unaffected, linking unblocks it, and an existing admin keeps their access';
end
$$;
