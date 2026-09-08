-- Can the platform say who is signed in, without letting anybody say it
-- for themselves?
--
-- The link is a claim about identity, written by a `security definer`
-- function with Row-Level Security bypassed. So the questions worth asking
-- are not "does the screen work" but:
--
--   * can anybody but an admin assert one,
--   * can an admin reach a Person, an account, or a link at another club,
--   * can one account be two people, or one person be two accounts,
--   * does unlinking remove anything other than the link,
--   * and does an unlinked account read as unlinked rather than as
--     something guessed from an email address?
--
-- That last one is why `app_who_am_i()` returns no row rather than a
-- fallback: BR108 exists because a screen that quietly substitutes an
-- email address makes the gap invisible again.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

-- This suite brings its own never-a-member account rather than reusing the
-- shared `outsider` fixture: by the time these run, an earlier suite has
-- granted that one `treasurer` at North Star, so a test written against it
-- would silently stop testing what it says it tests.
insert into auth.users (id, email) values
  ('d11c0000-0000-0000-0000-00000000000a', 'grace.tupou@northstar.test'),
  ('d11c0000-0000-0000-0000-00000000000b', 'second.claimant@northstar.test'),
  ('d11c0000-0000-0000-0000-00000000000c', 'no.membership@elsewhere.test');

-- Two more people at North Star, and one at Rival to point a link at.
insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, preferred_name) values
  ('b11c0000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
   'Grace', 'Tupou', '1979-08-14', 'Gracie'),
  ('b11c0000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111',
   'Henry', 'Bell', '1982-01-09', null),
  ('b11c0000-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222',
   'Rival', 'Person', '1980-05-05', null);

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  rival      uuid := '22222222-2222-2222-2222-222222222222';
  ns_admin   uuid := 'd1111111-1111-1111-1111-111111111111';  -- admin + registrar
  ns_reg     uuid := 'd3333333-3333-3333-3333-333333333333';  -- registrar only
  rival_reg  uuid := 'd2222222-2222-2222-2222-222222222222';
  no_member  uuid := 'd11c0000-0000-0000-0000-00000000000c';
  grace_user uuid := 'd11c0000-0000-0000-0000-00000000000a';
  second     uuid := 'd11c0000-0000-0000-0000-00000000000b';
  grace      uuid := 'b11c0000-0000-0000-0000-00000000000a';
  henry      uuid := 'b11c0000-0000-0000-0000-00000000000b';
  rival_p    uuid := 'b11c0000-0000-0000-0000-00000000000c';
  n          integer;
  t          text;
  failures   text[] := '{}';
begin
  -- Set up this suite's memberships as the owner. **`ns_admin` is restored
  -- deliberately**: 22_club_access proves a club can hand its last
  -- administrator role to somebody else, and leaves North Star that way. A
  -- suite that assumed the fixture it inherited would fail here for a
  -- reason belonging to a different file.
  perform set_config('role', 'postgres', true);
  insert into auth.users (id, email) values (ns_reg, 'registrar.only@northstar.test')
    on conflict do nothing;
  insert into club_membership (club_id, user_id, role) values
    (north_star, ns_admin, 'admin'),
    (north_star, ns_reg, 'registrar'),
    (north_star, grace_user, 'committee'),
    (north_star, second, 'coach')
    on conflict do nothing;

  perform set_config('role', 'authenticated', true);

  -- 1. **Only an administrator may assert a link** (BR107). A registrar at
  --    the same club writes people all day and still may not say who an
  --    account is — that is an access decision, not data entry.
  perform set_config('request.jwt.claim.sub', ns_reg::text, true);
  begin
    perform link_account_to_person(grace_user, grace);
    failures := array_append(failures, 'a registrar asserted who an account belongs to');
  exception when others then null;
  end;

  -- 2. Nor a member with no role that writes anything.
  perform set_config('request.jwt.claim.sub', grace_user::text, true);
  begin
    perform link_account_to_person(grace_user, grace);
    failures := array_append(failures, 'an account claimed its own identity');
  exception when others then null;
  end;

  -- 3. Nor a stranger with no membership at all.
  perform set_config('request.jwt.claim.sub', no_member::text, true);
  begin
    perform link_account_to_person(grace_user, grace);
    failures := array_append(failures, 'a non-member asserted a link');
  exception when others then null;
  end;

  -- 4. Nor an admin of a *different* club. Rival's registrar is not an
  --    admin anywhere, so this also covers the cross-club direction.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);
  begin
    perform link_account_to_person(grace_user, grace);
    failures := array_append(failures, 'another club''s member asserted a link at North Star');
  exception when others then null;
  end;

  select count(*) into n from account_person;
  if n <> 0 then
    failures := array_append(failures, 'a link exists that nobody was allowed to create');
  end if;

  -- ------------------------------------------------------ the admin's turn

  perform set_config('request.jwt.claim.sub', ns_admin::text, true);

  -- 5. The link lands, at the caller's own club, which is never an argument.
  perform link_account_to_person(grace_user, grace);
  select count(*) into n from account_person
   where club_id = north_star and user_id = grace_user and person_id = grace;
  if n <> 1 then
    failures := array_append(failures, 'the link was not recorded');
  end if;

  select count(*) into n from account_person where club_id = rival;
  if n <> 0 then
    failures := array_append(failures, 'a link reached another club');
  end if;

  -- 6. **A Person at another club is refused.** The composite foreign key
  --    is the actual guard; the function's own check only makes the message
  --    readable. Both are exercised here because either alone would let a
  --    North Star admin record that an account "is" somebody at Rival.
  begin
    perform link_account_to_person(grace_user, rival_p);
    failures := array_append(failures, 'an admin linked an account to another club''s person');
  exception when others then null;
  end;

  -- 7. An account with no access here cannot be linked. The link names
  --    somebody who signs in; it is not a second directory.
  begin
    perform link_account_to_person(no_member, henry);
    failures := array_append(failures, 'an account with no membership was linked');
  exception when others then null;
  end;

  -- 8. **One account is not two people** (BR106, first direction).
  --    Re-linking is a correction and replaces; it never accumulates.
  perform link_account_to_person(grace_user, henry);
  select count(*) into n from account_person where user_id = grace_user;
  if n <> 1 then
    failures := array_append(failures, 'one account ended up linked to two people');
  end if;
  select person_id::text into t from account_person where user_id = grace_user;
  if t <> henry::text then
    failures := array_append(failures, 'a correction did not replace the earlier link');
  end if;
  perform link_account_to_person(grace_user, grace);

  -- 9. **One Person is not two accounts** (BR106, the direction nobody
  --    looks for). Without it, two accounts both claim to be the treasurer
  --    and revoking one leaves the other still asserting it.
  begin
    perform link_account_to_person(second, grace);
    failures := array_append(failures, 'two accounts both claimed to be the same person');
  exception when others then null;
  end;

  -- 10. An invented person id is refused rather than stored.
  begin
    perform link_account_to_person(second, '00000000-0000-0000-0000-0000000000ff');
    failures := array_append(failures, 'a link was recorded to a person who does not exist');
  exception when others then null;
  end;

  -- ------------------------------------------------------------ reading it

  -- 11. The access list carries the name, and carries **null** where there
  --     is no link — never the email address dressed as a name (BR108).
  select legal_name into t from app_club_accounts() where user_id = grace_user;
  if t is distinct from 'Grace Tupou' then
    failures := array_append(failures, 'the access list did not carry the linked name');
  end if;

  select count(*) into n from app_club_accounts()
   where user_id = second and legal_name is null and person_id is null;
  if n <> 1 then
    failures := array_append(failures, 'an unlinked account was not reported as unlinked');
  end if;

  -- Every account still appears. A left join written as an inner one would
  -- make unlinked accounts vanish from the screen that exists to manage
  -- them, which is the quiet way this feature breaks access management.
  select count(*) into n from app_club_accounts() where user_id = second;
  if n <> 1 then
    failures := array_append(failures, 'an unlinked account disappeared from the access list');
  end if;

  -- 12. `app_who_am_i` answers for the caller, and only at a club they
  --     belong to.
  perform set_config('request.jwt.claim.sub', grace_user::text, true);
  select preferred_name into t from app_who_am_i(north_star);
  if t is distinct from 'Gracie' then
    failures := array_append(failures, 'a linked account could not be told who it is');
  end if;

  -- A link at Rival is planted as the owner, so this assertion has
  -- something to refuse. Without it the query returns nothing because
  -- nothing is there, and the membership filter it exists to guard could
  -- be deleted with the test still passing.
  perform set_config('role', 'postgres', true);
  insert into account_person (club_id, user_id, person_id)
  values (rival, grace_user, rival_p);
  perform set_config('role', 'authenticated', true);

  select count(*) into n from app_who_am_i(rival);
  if n <> 0 then
    failures := array_append(failures, 'a link was readable at a club the caller does not belong to');
  end if;

  perform set_config('role', 'postgres', true);
  delete from account_person where club_id = rival;
  perform set_config('role', 'authenticated', true);

  -- 13. An unlinked account gets no row — not a guess, not a fallback.
  perform set_config('request.jwt.claim.sub', second::text, true);
  select count(*) into n from app_who_am_i(north_star);
  if n <> 0 then
    failures := array_append(failures, 'an unlinked account was told who it is');
  end if;

  -- 14. Another club sees no link of North Star's, through the table or
  --     the function.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);
  select count(*) into n from account_person;
  if n <> 0 then
    failures := array_append(failures, 'another club read North Star''s links');
  end if;

  -- 15. And no direct write reaches the table either, from a non-admin or
  --     from another club — the policy, not the function, refusing.
  begin
    insert into account_person (club_id, user_id, person_id)
    values (north_star, second, henry);
    failures := array_append(failures, 'another club inserted a link directly');
  exception when others then null;
  end;

  perform set_config('request.jwt.claim.sub', ns_reg::text, true);
  begin
    insert into account_person (club_id, user_id, person_id)
    values (north_star, second, henry);
    failures := array_append(failures, 'a registrar inserted a link directly');
  exception when others then null;
  end;
  begin
    delete from account_person where user_id = grace_user;
    if not found then null; end if;
  exception when others then null;
  end;
  select count(*) into n from account_person where user_id = grace_user;
  if n <> 1 then
    failures := array_append(failures, 'a registrar deleted a link');
  end if;

  -- ------------------------------------------------------------ unlinking

  -- 16. Only an admin unlinks.
  begin
    perform unlink_account(grace_user);
    failures := array_append(failures, 'a registrar unlinked an account');
  exception when others then null;
  end;

  -- 17. **Unlinking removes the link and nothing else** (BR108). The
  --     Person keeps existing, the account keeps its access, and the club
  --     is simply back to not knowing who somebody is.
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  perform unlink_account(grace_user);

  select count(*) into n from account_person where user_id = grace_user;
  if n <> 0 then
    failures := array_append(failures, 'the link survived being removed');
  end if;
  select count(*) into n from person where id = grace;
  if n <> 1 then
    failures := array_append(failures, 'unlinking deleted the person');
  end if;
  select count(*) into n from club_membership
   where club_id = north_star and user_id = grace_user;
  if n <> 1 then
    failures := array_append(failures, 'unlinking removed the account''s access');
  end if;

  -- 18. And the Person is claimable again afterwards — an unlink that left
  --     the reverse-direction constraint occupied would strand a person
  --     nobody could ever be.
  perform link_account_to_person(second, grace);
  select count(*) into n from account_person where user_id = second and person_id = grace;
  if n <> 1 then
    failures := array_append(failures, 'a person could not be claimed after an unlink');
  end if;

  -- 19. Both actions are on the audit log, which is where "who did what"
  --     has to be answerable from — the reason this feature exists.
  perform set_config('role', 'postgres', true);
  select count(*) into n from audit_event
   where club_id = north_star and action in ('account.linked', 'account.unlinked');
  if n < 2 then
    failures := array_append(failures, 'linking and unlinking were not audited');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Account identity FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Account identity OK — 19 scenarios; only an admin asserts a link, one account is one person and one person is one account, and unlinked reads as unlinked';
end
$$;
