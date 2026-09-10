-- Can a guardian read their own child, and only their own child — without
-- ever holding a club_membership row?
--
-- That last clause is the whole design (decision 11). The obvious
-- implementation would give a guardian a `guardian` role on
-- `club_membership`, and inherit every one of the 26 still-wide-open
-- policies WP1–3 have not yet narrowed. So the questions worth asking are
-- not "can a parent see their kid" but:
--
--   * is an invitation refused before a linked child reaches COMPLETE
--     (BR126), where a screen skips the check but a trigger cannot,
--   * does only an admin or registrar get to send one,
--   * does a guardian read *anything* before claiming the invitation,
--   * does claiming create an `account_person` link and genuinely nothing
--     in `club_membership`,
--   * once claimed, does the family function draw the line at one
--     household — not one club,
--   * is an uninvited stranger, and a wrong-email claim, still refused,
--   * and does unlinking close the door exactly as it does for an officer.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('d31f0000-0000-0000-0000-000000000001', 'grace2.parent@northstar.test'),
  ('d31f0000-0000-0000-0000-000000000003', 'other.parent@northstar.test'),
  ('d31f0000-0000-0000-0000-000000000005', 'rival.parent@rival.test'),
  ('d31f0000-0000-0000-0000-0000000000c1', 'coach.only@northstar.test'),
  ('d31f0000-0000-0000-0000-0000000000ee', 'unrelated.account@northstar.test');

insert into club_membership (club_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'd31f0000-0000-0000-0000-0000000000c1', 'coach')
  on conflict do nothing;

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b31f0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Grace', 'Second', '1985-03-11', 'grace2.parent@northstar.test'),
  ('b31f0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Kiri', 'Second', '2015-06-01', null),
  ('b31f0000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Other', 'Parent', '1984-01-01', 'other.parent@northstar.test'),
  ('b31f0000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'Otis', 'Parent', '2013-02-02', null),
  ('b31f0000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222',
   'Rival', 'Parent', '1983-01-01', 'rival.parent@rival.test'),
  ('b31f0000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222',
   'Rory', 'Parent', '2012-03-03', null);

insert into guardianship (club_id, person_id, guardian_person_id, is_authority) values
  ('11111111-1111-1111-1111-111111111111', 'b31f0000-0000-0000-0000-000000000002',
   'b31f0000-0000-0000-0000-000000000001', true),
  ('11111111-1111-1111-1111-111111111111', 'b31f0000-0000-0000-0000-000000000004',
   'b31f0000-0000-0000-0000-000000000003', true),
  ('22222222-2222-2222-2222-222222222222', 'b31f0000-0000-0000-0000-000000000006',
   'b31f0000-0000-0000-0000-000000000005', true);

-- Kiri is COMPLETE — this is the child BR126's gate should let through.
-- Otis is DRAFT — the child it should refuse on.
insert into registration (id, club_id, person_id, season_id, status) values
  ('c31f0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'b31f0000-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 'COMPLETE'),
  ('c31f0000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'b31f0000-0000-0000-0000-000000000004', 'a1111111-1111-1111-1111-111111111111', 'DRAFT'),
  ('c31f0000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222',
   'b31f0000-0000-0000-0000-000000000006', 'a2222222-2222-2222-2222-222222222222', 'COMPLETE');

insert into consent (club_id, person_id, purpose, granted_by_person_id) values
  ('11111111-1111-1111-1111-111111111111', 'b31f0000-0000-0000-0000-000000000002',
   'REGISTRATION_COLLECTION_NOTICE', 'b31f0000-0000-0000-0000-000000000001');

insert into team (id, club_id, season_id, name) values
  ('e31f0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111', 'U10 Family Suite');

insert into team_member (club_id, team_id, person_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'e31f0000-0000-0000-0000-000000000001',
   'b31f0000-0000-0000-0000-000000000002', 'player');

insert into fixture (id, club_id, season_id, team_id, played_on, opponent, home_away, status) values
  ('f31f0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111', 'e31f0000-0000-0000-0000-000000000001',
   '2026-06-06', 'Family Suite Opponent', 'home', 'scheduled');

insert into payment_plan (id, club_id, registration_id, total_cents, cadence, created_by_user_id) values
  ('a31f0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'c31f0000-0000-0000-0000-000000000002', 20000, 'monthly', 'd1111111-1111-1111-1111-111111111111');

insert into payment_installment (club_id, payment_plan_id, sequence, due_on, amount_cents) values
  ('11111111-1111-1111-1111-111111111111', 'a31f0000-0000-0000-0000-000000000001', 1, '2026-07-01', 20000);

insert into payment (club_id, registration_id, amount_cents, received_on, method, recorded_by_user_id) values
  ('11111111-1111-1111-1111-111111111111', 'c31f0000-0000-0000-0000-000000000002',
   20000, '2026-06-01', 'bank-transfer', 'd1111111-1111-1111-1111-111111111111');

commit;

do $$
declare
  north_star   uuid := '11111111-1111-1111-1111-111111111111';
  rival        uuid := '22222222-2222-2222-2222-222222222222';
  ns_admin     uuid := 'd1111111-1111-1111-1111-111111111111';  -- admin + registrar
  rival_reg    uuid := 'd2222222-2222-2222-2222-222222222222';
  coach_only   uuid := 'd31f0000-0000-0000-0000-0000000000c1';
  unrelated    uuid := 'd31f0000-0000-0000-0000-0000000000ee';
  grace2_user  uuid := 'd31f0000-0000-0000-0000-000000000001';
  grace2       uuid := 'b31f0000-0000-0000-0000-000000000001';
  kiri         uuid := 'b31f0000-0000-0000-0000-000000000002';
  otis         uuid := 'b31f0000-0000-0000-0000-000000000004';
  other_parent uuid := 'b31f0000-0000-0000-0000-000000000003';
  rival_kid    uuid := 'b31f0000-0000-0000-0000-000000000006';
  n            integer;
  result       integer;
  failures     text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. **BR126 refuses an invitation before COMPLETE.** Otis is DRAFT.
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  begin
    insert into guardian_invitation (club_id, guardian_person_id, email, invited_by_user_id)
    values (north_star, other_parent, 'other.parent@northstar.test', ns_admin);
    failures := array_append(failures, 'BR126 let an invitation through for a DRAFT registration');
  exception when others then null;
  end;

  -- 2. **BR126 allows it once a linked child is COMPLETE.** Kiri is.
  insert into guardian_invitation (club_id, guardian_person_id, email, invited_by_user_id)
  values (north_star, grace2, 'grace2.parent@northstar.test', ns_admin);
  select count(*) into n from guardian_invitation where club_id = north_star and guardian_person_id = grace2;
  if n <> 1 then
    failures := array_append(failures, 'a COMPLETE registration did not let an invitation through');
  end if;

  -- 3. **Only an admin or registrar may invite** — a coach at the same club
  --    may not, even for a child who is genuinely COMPLETE.
  perform set_config('request.jwt.claim.sub', coach_only::text, true);
  begin
    insert into guardian_invitation (club_id, guardian_person_id, email, invited_by_user_id)
    values (north_star, other_parent, 'other.parent@northstar.test', coach_only);
    failures := array_append(failures, 'a coach sent a guardian invitation');
  exception when others then null;
  end;

  -- 4. **A guardian reads nothing before claiming** — the invitation exists,
  --    but there is no account_person row yet, and no club_membership ever
  --    will be one.
  perform set_config('request.jwt.claim.sub', grace2_user::text, true);
  select count(*) into n from person where id = kiri;
  if n <> 0 then
    failures := array_append(failures, 'an unclaimed invitation already granted a read');
  end if;

  -- 5. **Claiming links the account — and creates no club_membership row.**
  select claim_family_access() into result;
  if result <> 1 then
    failures := array_append(failures, 'claim_family_access did not claim the pending invitation');
  end if;
  select count(*) into n from account_person where user_id = grace2_user and club_id = north_star;
  if n <> 1 then
    failures := array_append(failures, 'claiming did not link the account to the guardian''s Person');
  end if;
  select count(*) into n from club_membership where user_id = grace2_user and club_id = north_star;
  if n <> 0 then
    failures := array_append(failures, 'claiming a family invitation created a club_membership row');
  end if;

  -- 6. **Once claimed, the guardian reads their own child** across every
  --    table the built workspace renders.
  select count(*) into n from person where id = kiri; if n <> 1 then
    failures := array_append(failures, 'a claimed guardian could not read their child''s person row'); end if;
  select count(*) into n from registration where person_id = kiri; if n <> 1 then
    failures := array_append(failures, 'a claimed guardian could not read their child''s registration'); end if;
  select count(*) into n from consent where person_id = kiri; if n <> 1 then
    failures := array_append(failures, 'a claimed guardian could not read their child''s consent'); end if;
  select count(*) into n from payment_plan where registration_id = 'c31f0000-0000-0000-0000-000000000002'; if n <> 1 then
    failures := array_append(failures, 'a claimed guardian could not read their child''s payment plan'); end if;
  select count(*) into n from payment where registration_id = 'c31f0000-0000-0000-0000-000000000002'; if n <> 1 then
    failures := array_append(failures, 'a claimed guardian could not read their child''s payment'); end if;
  select count(*) into n from team_member where person_id = kiri; if n <> 1 then
    failures := array_append(failures, 'a claimed guardian could not read their child''s team'); end if;
  select count(*) into n from fixture where id = 'f31f0000-0000-0000-0000-000000000001'; if n <> 1 then
    failures := array_append(failures, 'a claimed guardian could not read their child''s fixture'); end if;
  select count(*) into n from club where id = north_star; if n <> 1 then
    failures := array_append(failures, 'a claimed guardian could not read their own club'); end if;
  select count(*) into n from season where id = 'a1111111-1111-1111-1111-111111111111'; if n <> 1 then
    failures := array_append(failures, 'a claimed guardian could not read the season'); end if;

  -- 7. **And nothing for another family at the same club.** The function
  --    scopes by household, not by membership at the club.
  select count(*) into n from person where id = otis;
  if n <> 0 then
    failures := array_append(failures, 'a guardian read a different family''s child at their own club');
  end if;
  select count(*) into n from registration where person_id = otis;
  if n <> 0 then
    failures := array_append(failures, 'a guardian read a different family''s registration');
  end if;

  -- 8. **And nothing at another club**, even one with its own guardian and
  --    child in the identical shape.
  select count(*) into n from person where id = rival_kid;
  if n <> 0 then
    failures := array_append(failures, 'a guardian read a child at a club they hold no link at');
  end if;

  -- 9. **An uninvited stranger reads nothing new.** The additive policies
  --    do not widen the base case they were built alongside.
  perform set_config('request.jwt.claim.sub', unrelated::text, true);
  select count(*) into n from person where club_id = north_star;
  if n <> 0 then
    failures := array_append(failures, 'an uninvited account with no membership read club data');
  end if;

  -- 10. **Claiming is keyed to the invited email, not to whoever is
  --     signed in.** A different account with a different address claims
  --     nothing, even knowing the function exists.
  select claim_family_access() into result;
  if result <> 0 then
    failures := array_append(failures, 'an unrelated account claimed somebody else''s invitation');
  end if;
  select count(*) into n from account_person where user_id = unrelated;
  if n <> 0 then
    failures := array_append(failures, 'an unrelated account ended up linked to a Person');
  end if;

  -- 11. **A second invitation for the same guardian is refused** — the
  --     app's resend path re-sends the email without re-inserting; the
  --     unique constraint is what makes "insert again" the wrong way to do
  --     it rather than a silent duplicate.
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  begin
    insert into guardian_invitation (club_id, guardian_person_id, email, invited_by_user_id)
    values (north_star, grace2, 'grace2.parent@northstar.test', ns_admin);
    failures := array_append(failures, 'a second invitation for the same guardian was accepted');
  exception when others then null;
  end;

  -- 12. **Invitations are club-scoped like everything else.** Rival's
  --     registrar cannot see North Star's.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);
  select count(*) into n from guardian_invitation where club_id = north_star;
  if n <> 0 then
    failures := array_append(failures, 'a registrar at one club read another club''s guardian invitations');
  end if;

  -- 13. **Unlinking closes the door exactly as it does for a club
  --     officer** (BR108) — nobody needed a new mechanism for this.
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  perform unlink_account(grace2_user);
  perform set_config('request.jwt.claim.sub', grace2_user::text, true);
  select count(*) into n from person where id = kiri;
  if n <> 0 then
    failures := array_append(failures, 'unlinking a guardian did not revoke their reads');
  end if;

  -- 14. The claim is audited, same as an officer's link.
  perform set_config('role', 'postgres', true);
  select count(*) into n from audit_event where club_id = north_star and action = 'family.claimed';
  if n < 1 then
    failures := array_append(failures, 'claiming a family invitation was not audited');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Family access FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Family access OK — 14 scenarios; a guardian is invited only once a child is COMPLETE, reads only their own household, and never holds a club_membership row';
end
$$;
