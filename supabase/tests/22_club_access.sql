-- Can an admin manage access to their own club, and only their own?
--
-- These three functions read `auth.users` and write `club_membership` with
-- Row-Level Security bypassed, which is what `security definer` means. So
-- the questions worth asking are not "does the screen work" but:
--
--   * can a non-admin call them at all,
--   * can an admin of one club reach another club through them,
--   * does the email address of an account leak beyond the club it belongs
--     to,
--   * and can a club lock itself out by an ordinary afternoon's tidying?

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('deeeeeee-0000-0000-0000-00000000000a', 'second.admin@northstar.test'),
  ('deeeeeee-0000-0000-0000-00000000000b', 'newcomer@northstar.test'),
  ('deeeeeee-0000-0000-0000-00000000000c', 'nobody.here@elsewhere.test');

commit;

do $$
declare
  north_star  uuid := '11111111-1111-1111-1111-111111111111';
  rival       uuid := '22222222-2222-2222-2222-222222222222';
  ns_admin    uuid := 'd1111111-1111-1111-1111-111111111111';  -- admin + registrar
  rival_reg   uuid := 'd2222222-2222-2222-2222-222222222222';  -- registrar only
  outsider    uuid := 'd9999999-9999-9999-9999-999999999999';  -- no membership
  second      uuid := 'deeeeeee-0000-0000-0000-00000000000a';
  newcomer    uuid := 'deeeeeee-0000-0000-0000-00000000000b';
  n           integer;
  failures    text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. A registrar is not an admin. Rival's registrar administers nothing.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);
  if app_admin_club() is not null then
    failures := array_append(failures, 'a registrar was treated as an administrator');
  end if;

  select count(*) into n from app_club_accounts();
  if n <> 0 then
    failures := array_append(failures, 'a non-admin read the access list');
  end if;

  begin
    perform grant_club_role('newcomer@northstar.test', 'registrar');
    failures := array_append(failures, 'a non-admin granted access');
  exception when others then null;
  end;

  -- 2. Nor is a stranger with no membership at all.
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select count(*) into n from app_club_accounts();
  if n <> 0 then
    failures := array_append(failures, 'a non-member read an access list');
  end if;

  -- 3. North Star's admin sees North Star's accounts, with emails.
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  -- Asserted as a property rather than a count: earlier suites in this run
  -- add their own memberships at North Star, and a test that counts other
  -- tests' fixtures breaks for reasons that are nobody's fault.
  select count(*) into n from app_club_accounts() where user_id = ns_admin;
  if n <> 1 then
    failures := array_append(failures, 'the admin could not see their own account');
  end if;

  select count(*) into n from app_club_accounts() a
   where not exists (select 1 from club_membership m
                     where m.user_id = a.user_id and m.club_id = north_star);
  if n <> 0 then
    failures := array_append(failures, 'the list included an account with no membership at this club');
  end if;

  select count(*) into n from app_club_accounts() where email = 'registrar@northstar.test';
  if n <> 1 then
    failures := array_append(failures, 'the account list did not carry the email address');
  end if;

  -- **Not a directory.** Rival's registrar has an account and no membership
  -- at North Star, so North Star's admin must not see them.
  select count(*) into n from app_club_accounts() where email = 'registrar@rival.test';
  if n <> 0 then
    failures := array_append(failures, 'another club''s account was visible in the access list');
  end if;

  -- 4. Granting works, and lands at the caller's own club — the club is
  --    never an argument, so there is nothing to point elsewhere.
  perform grant_club_role('newcomer@northstar.test', 'registrar');
  select count(*) into n from club_membership
   where club_id = north_star and user_id = newcomer and role = 'registrar';
  if n <> 1 then
    failures := array_append(failures, 'the grant did not create a membership');
  end if;

  select count(*) into n from club_membership
   where club_id = rival and user_id = newcomer;
  if n <> 0 then
    failures := array_append(failures, 'a grant reached another club');
  end if;

  -- 5. Granting twice is not two memberships.
  perform grant_club_role('newcomer@northstar.test', 'registrar');
  select count(*) into n from club_membership
   where club_id = north_star and user_id = newcomer and role = 'registrar';
  if n <> 1 then
    failures := array_append(failures, 'granting twice duplicated the membership');
  end if;

  -- 6. `viewer` is the demonstration club's role and not a club role.
  begin
    perform grant_club_role('newcomer@northstar.test', 'viewer');
    failures := array_append(failures, 'viewer was granted as a club role');
  exception when others then null;
  end;
  begin
    perform grant_club_role('newcomer@northstar.test', 'superuser');
    failures := array_append(failures, 'an invented role was accepted');
  exception when others then null;
  end;

  -- 7. An account that does not exist is refused, not silently created.
  begin
    perform grant_club_role('ghost@nowhere.test', 'registrar');
    failures := array_append(failures, 'a role was granted to a non-existent account');
  exception when others then null;
  end;

  -- ------------------------------------------------------------- lockout

  -- 8. **The last administrator cannot be removed.** This is the one that
  --    matters: a club with no admin cannot restore its own access, and
  --    the route to it is ordinary tidying rather than intent.
  begin
    perform revoke_club_role(ns_admin, 'admin');
    failures := array_append(failures, 'the club''s only administrator was removed');
    -- Put it back before continuing. Without this the club is locked out
    -- and every later scenario dies on "only an administrator may…",
    -- which reports the symptom three steps downstream of the cause.
    perform set_config('role', 'postgres', true);
    insert into club_membership (club_id, user_id, role)
    values (north_star, ns_admin, 'admin') on conflict do nothing;
    perform set_config('role', 'authenticated', true);
  exception when others then null;
  end;

  select count(*) into n from club_membership
   where club_id = north_star and role = 'admin';
  if n <> 1 then
    failures := array_append(failures, 'the only administrator is gone after a refused revoke');
  end if;

  -- 9. With a second admin, the first becomes removable.
  perform grant_club_role('second.admin@northstar.test', 'admin');
  begin
    perform revoke_club_role(ns_admin, 'admin');
  exception when others then
    failures := array_append(failures, 'an admin could not be removed even with a second one');
  end;

  select count(*) into n from club_membership
   where club_id = north_star and role = 'admin';
  if n <> 1 then
    failures := array_append(failures, 'the wrong number of admins after a permitted revoke');
  end if;

  -- 10. And the caller, no longer an admin, immediately loses the screen.
  select count(*) into n from app_club_accounts();
  if n <> 0 then
    failures := array_append(failures, 'a former admin could still read the access list');
  end if;

  -- 11. Non-admin roles have no lockout guard — losing the only registrar
  --     is inconvenient, not irreversible, because an admin can grant it
  --     back. Guarding it would be a rule nobody asked for.
  perform set_config('request.jwt.claim.sub', second::text, true);
  begin
    perform revoke_club_role(newcomer, 'registrar');
  exception when others then
    failures := array_append(failures, 'removing a non-admin role was refused');
  end;

  -- 12. Granting did not quietly create the account it refused to find.
  --     Checked as the owner, because `authenticated` cannot read
  --     `auth.users` at all — which is itself the right answer.
  perform set_config('role', 'postgres', true);
  select count(*) into n from auth.users where email = 'ghost@nowhere.test';
  if n <> 0 then
    failures := array_append(failures, 'granting created an auth account');
  end if;

  -- 13. Every change is on the record.
  select count(*) into n from audit_event
   where club_id = north_star and action in ('access.granted', 'access.revoked');
  if n < 4 then
    failures := array_append(failures, format('access changes were not audited (found %s)', n));
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Club access FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Club access OK — 13 scenarios; an admin manages their own club and cannot lock it out';
end
$$;
