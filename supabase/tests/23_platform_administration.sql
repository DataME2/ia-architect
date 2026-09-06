-- Can the platform owner create clubs, and can anybody else touch any of it?
--
-- These functions run with Row-Level Security bypassed, because they must:
-- `club` denies every write unconditionally and the first `club_membership`
-- cannot be created by anyone inside the application. That makes them the
-- most dangerous surface in the schema, so the questions are:
--
--   * does a club admin — the most privileged ordinary user there is —
--     reach any of it,
--   * does the allowlist itself stay out of the API in both directions,
--   * and does the console stop where decision 9 says it stops, at
--     metadata, never reading a person or a payment?

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('df000000-0000-0000-0000-00000000000a', 'owner@datame.test'),
  ('df000000-0000-0000-0000-00000000000b', 'newclub.admin@example.test');

-- The allowlist is seeded by the database owner, never by the application.
-- This insert is what that looks like.
insert into platform_admin (user_id, note)
values ('df000000-0000-0000-0000-00000000000a', 'test platform owner');

commit;

do $$
declare
  owner      uuid := 'df000000-0000-0000-0000-00000000000a';
  club_admin uuid := 'd1111111-1111-1111-1111-111111111111';  -- admin at North Star
  outsider   uuid := 'd9999999-9999-9999-9999-999999999999';
  new_admin  uuid := 'df000000-0000-0000-0000-00000000000b';
  v_club     uuid;
  v_again    uuid;
  n          integer;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. A club admin is not a platform admin. This is the whole separation:
  --    the most privileged ordinary account in the system reaches none of
  --    it.
  perform set_config('request.jwt.claim.sub', club_admin::text, true);
  if app_is_platform() then
    failures := array_append(failures, 'a club admin was treated as a platform admin');
  end if;

  select count(*) into n from platform_clubs();
  if n <> 0 then
    failures := array_append(failures, 'a club admin listed every club on the platform');
  end if;

  begin
    perform provision_club('Sneaky FC', 'AU-QLD', null, null, null,
                           'A Person', 'a@example.test', null, null, null, null);
    failures := array_append(failures, 'a club admin provisioned a club');
  exception when others then null;
  end;

  -- 2. Nor is a stranger.
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select count(*) into n from platform_clubs();
  if n <> 0 then
    failures := array_append(failures, 'a non-member listed every club');
  end if;

  -- 3. **The allowlist is not readable or writable through the API**, by
  --    anyone — including the platform owner. Rows are added by the
  --    database owner alone, because an allowlist the application can edit
  --    is an allowlist an application bug can edit.
  select count(*) into n from platform_admin;
  if n <> 0 then
    failures := array_append(failures, 'the platform allowlist was readable');
  end if;

  perform set_config('request.jwt.claim.sub', owner::text, true);
  select count(*) into n from platform_admin;
  if n <> 0 then
    failures := array_append(failures, 'the platform owner could read the allowlist');
  end if;

  begin
    insert into platform_admin (user_id) values (outsider);
    failures := array_append(failures, 'somebody added themselves to the allowlist');
  exception when others then null;
  end;

  -- ---------------------------------------------------------- provisioning

  -- 4. The owner sees every club, and can create one.
  select count(*) into n from platform_clubs();
  if n < 2 then
    failures := array_append(failures, 'the owner could not see the existing clubs');
  end if;

  v_club := provision_club('Example United FC', 'AU-QLD', null, null, null,
                           'Dana Reyes', 'dana@example.test', '0400 111 222', null, null, null);
  if v_club is null then
    failures := array_append(failures, 'provisioning returned no club');
  end if;

  -- 5. **Idempotent.** The failure this replaces is a half-created tenant:
  --    somebody ran statement one, lost the connection, and ran the lot
  --    again.
  v_again := provision_club('example united fc', 'AU-QLD', null, null, null,
                            'Dana Reyes', 'dana@example.test', null, null, null, null);
  if v_again is distinct from v_club then
    failures := array_append(failures, 'provisioning twice made two clubs');
  end if;

  perform set_config('role', 'postgres', true);
  select count(*) into n from club where lower(name) = 'example united fc';
  if n <> 1 then
    failures := array_append(failures, format('expected one club, found %s', n));
  end if;
  perform set_config('role', 'authenticated', true);

  -- 6. A jurisdiction is required — BR52 turns on it.
  begin
    perform provision_club('No Jurisdiction FC', '', null, null, null,
                           'A Person', 'a@example.test', null, null, null, null);
    failures := array_append(failures, 'a club was created without a jurisdiction');
  exception when others then null;
  end;
  begin
    perform provision_club('   ', 'AU-QLD', null, null, null,
                           'A Person', 'a@example.test', null, null, null, null);
    failures := array_append(failures, 'a club was created without a name');
  exception when others then null;
  end;

  -- 7. A demonstration club is seeded, never provisioned — a second one
  --    would make `enter_demo` silently pick the older of two.
  begin
    perform provision_club('Somewhere FC (DEMO)', 'AU-QLD', null, null, null,
                           'A Person', 'a@example.test', null, null, null, null);
    failures := array_append(failures, 'a second demonstration club was provisioned');
  exception when others then null;
  end;

  -- 8. **A club needs somebody answerable for it.** Required where the
  --    season is not: a tenant with no responsible person is how a club
  --    becomes nobody's problem.
  begin
    perform provision_club('Nobodys FC', 'AU-NSW', null, null, null,
                           null, null, null, null, null, null);
    failures := array_append(failures, 'a club was created with nobody responsible');
  exception when others then null;
  end;
  begin
    perform provision_club('Halfway FC', 'AU-NSW', null, null, null,
                           'A Person', null, null, null, null, null);
    failures := array_append(failures, 'a responsible person was accepted with no email');
  exception when others then null;
  end;

  -- 9. **An email nobody has an account for is fine.** This is the whole
  --    point: the contact is recorded as a pending grant, the person is
  --    emailed a sign-in link by Supabase, and the club is never waiting on
  --    the platform owner to run something by hand.
  v_again := provision_club('Example United FC', 'AU-QLD',
                            '2027', date '2027-01-01', date '2027-12-01',
                            'Dana Reyes', 'dana@example.test', '0400 111 222',
                            'Sam Ali', 'newclub.admin@example.test', '0400 333 444');
  if v_again is distinct from v_club then
    failures := array_append(failures, 'recording contacts created a second club');
  end if;

  perform set_config('role', 'postgres', true);
  select count(*) into n from club_contact where club_id = v_club;
  if n <> 2 then
    failures := array_append(failures, format('expected two contacts, found %s', n));
  end if;

  select count(*) into n from club_contact
   where club_id = v_club and kind = 'primary' and phone = '0400 111 222';
  if n <> 1 then
    failures := array_append(failures, 'the phone number was not recorded');
  end if;

  -- Nobody has claimed anything yet, so there is still no administrator.
  select count(*) into n from club_membership where club_id = v_club and role = 'admin';
  if n <> 0 then
    failures := array_append(failures, 'access existed before anybody claimed it');
  end if;

  select count(*) into n from season where club_id = v_club;
  if n <> 1 then
    failures := array_append(failures, 'the first season was not created');
  end if;

  -- 10. Provisioning again is not a second season, a third contact, or a
  --     lost phone number.
  perform set_config('role', 'authenticated', true);
  perform provision_club('Example United FC', 'AU-QLD',
                         '2027', date '2027-01-01', date '2027-12-01',
                         'Dana Reyes', 'dana@example.test', null, null, null, null);
  perform set_config('role', 'postgres', true);
  select count(*) into n from season where club_id = v_club;
  if n <> 1 then
    failures := array_append(failures, 'provisioning twice made two seasons');
  end if;
  select count(*) into n from club_contact where club_id = v_club;
  if n <> 2 then
    failures := array_append(failures, 'provisioning twice duplicated a contact');
  end if;
  select count(*) into n from club_contact
   where club_id = v_club and kind = 'primary' and phone = '0400 111 222';
  if n <> 1 then
    failures := array_append(failures, 'a repeat provision erased the phone number');
  end if;

  -- 11. **Claiming.** The deputy signs in and their access exists. The
  --     email is read from their own session and never from an argument,
  --     so nobody can claim a club by naming somebody else.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', new_admin::text, true);
  if claim_club_access() <> 1 then
    failures := array_append(failures, 'signing in did not claim the access recorded for that email');
  end if;

  perform set_config('role', 'postgres', true);
  select count(*) into n from club_membership
   where club_id = v_club and user_id = new_admin and role = 'admin';
  if n <> 1 then
    failures := array_append(failures, 'claiming did not create the administrator membership');
  end if;

  select count(*) into n from club_contact
   where club_id = v_club and kind = 'primary' and claimed_at is not null;
  if n <> 0 then
    failures := array_append(failures, 'claiming one contact claimed the other as well');
  end if;

  -- 12. Claiming twice is not two memberships, and a stranger claims
  --     nothing at all.
  perform set_config('role', 'authenticated', true);
  if claim_club_access() <> 0 then
    failures := array_append(failures, 'the same access was claimable twice');
  end if;

  perform set_config('request.jwt.claim.sub', outsider::text, true);
  if claim_club_access() <> 0 then
    failures := array_append(failures, 'a stranger claimed access');
  end if;

  -- ------------------------------------------------------------- licence

  -- 13. Only the platform records commercial terms. A club admin may read
  --     their own licence and may never set one.
  perform set_config('request.jwt.claim.sub', club_admin::text, true);
  begin
    perform set_club_licence(v_club, date '2026-01-01', date '2026-12-31',
                             'active', 1200000, 'AUD', 'self-awarded');
    failures := array_append(failures, 'a club admin set its own licence');
  exception when others then null;
  end;

  perform set_config('request.jwt.claim.sub', owner::text, true);
  perform set_club_licence(v_club, date '2026-01-01', date '2026-12-31',
                           'active', 1200000, 'AUD', 'first year including migration');

  perform set_config('role', 'postgres', true);
  select count(*) into n from club_licence
   where club_id = v_club and fee_cents = 1200000 and currency = 'AUD';
  if n <> 1 then
    failures := array_append(failures, 'the negotiated fee was not recorded');
  end if;

  -- 14. Correcting today's entry updates it; a renewal is a new row, so a
  --     club's commercial history stays answerable.
  perform set_config('role', 'authenticated', true);
  perform set_club_licence(v_club, date '2026-01-01', date '2026-12-31',
                           'active', 1350000, 'AUD', null);
  perform set_config('role', 'postgres', true);
  select count(*) into n from club_licence where club_id = v_club;
  if n <> 1 then
    failures := array_append(failures, 'correcting a licence made a second one');
  end if;
  select count(*) into n from club_licence
   where club_id = v_club and fee_cents = 1350000;
  if n <> 1 then
    failures := array_append(failures, 'the corrected fee was not stored');
  end if;
  -- The note was not resupplied and must survive.
  select count(*) into n from club_licence
   where club_id = v_club and note = 'first year including migration';
  if n <> 1 then
    failures := array_append(failures, 'correcting a licence erased what was agreed');
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_club_licence(v_club, date '2027-01-01', date '2027-12-31',
                           'active', 1400000, 'AUD', 'renewal');
  perform set_config('role', 'postgres', true);
  select count(*) into n from club_licence where club_id = v_club;
  if n <> 2 then
    failures := array_append(failures, 'a renewal did not keep the previous term');
  end if;

  -- 15. A term must be a term, and a state must be a real one.
  perform set_config('role', 'authenticated', true);
  begin
    perform set_club_licence(v_club, date '2028-06-01', date '2028-01-01', 'active', null, 'AUD', null);
    failures := array_append(failures, 'a licence ended before it started');
  exception when others then null;
  end;
  begin
    perform set_club_licence(v_club, date '2029-01-01', date '2029-12-31', 'gratis', null, 'AUD', null);
    failures := array_append(failures, 'an invented licence state was accepted');
  exception when others then null;
  end;

  -- 16. A club may read its own commercial terms — they are its own — and
  --     no other club's.
  perform set_config('request.jwt.claim.sub', club_admin::text, true);
  select count(*) into n from club_licence where club_id = v_club;
  if n <> 0 then
    failures := array_append(failures, 'a club read another club''s licence');
  end if;

  -- ------------------------------------------------- the boundary itself

  -- 11. **The console reads metadata and never tenant contents.** The
  --     platform owner holds no club membership, so every ordinary policy
  --     denies them exactly as it denies a stranger. This is decision 9's
  --     entire claim, and it is worth asserting rather than trusting.
  perform set_config('request.jwt.claim.sub', owner::text, true);
  select count(*) into n from person;
  if n <> 0 then
    failures := array_append(failures, 'the platform owner could read people');
  end if;
  select count(*) into n from registration;
  if n <> 0 then
    failures := array_append(failures, 'the platform owner could read registrations');
  end if;
  select count(*) into n from payment;
  if n <> 0 then
    failures := array_append(failures, 'the platform owner could read payments');
  end if;
  select count(*) into n from clearance;
  if n <> 0 then
    failures := array_append(failures, 'the platform owner could read clearances');
  end if;
  select count(*) into n from consent;
  if n <> 0 then
    failures := array_append(failures, 'the platform owner could read consents');
  end if;

  -- 12. And holds no membership anywhere, which is what keeps that true.
  perform set_config('role', 'postgres', true);
  select count(*) into n from club_membership where user_id = owner;
  if n <> 0 then
    failures := array_append(failures, 'the platform owner holds a club membership');
  end if;

  -- 13. Provisioning is on the record, inside the club it created.
  select count(*) into n from audit_event
   where club_id = v_club and action = 'club.provisioned';
  if n < 1 then
    failures := array_append(failures, 'provisioning was not audited');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Platform administration FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Platform administration OK — 21 scenarios; provisions tenants, records who is responsible and what was agreed, reads nothing inside one';
end
$$;
