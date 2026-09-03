-- Can a stranger walk into the demonstration club, and only that one?
--
-- The demo has to be reachable without an account, because a prospect will
-- not be given one before they have seen anything. That means an
-- unauthenticated visitor takes an anonymous session and is granted
-- membership of a tenant — which is exactly the sort of thing that quietly
-- becomes a cross-tenant leak.
--
-- So the claims worth proving are not "the demo works". They are:
--
--   * `enter_demo()` cannot be pointed at a real club,
--   * the membership it grants can **read** the demo and **write nothing**,
--   * P5 still holds — a demo visitor sees no other club at all,
--   * and the prospect record it captures is not readable through the API
--     by the very session that created it.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('daaaaaaa-0000-0000-0000-00000000000a', null),  -- the anonymous visitor
  ('daaaaaaa-0000-0000-0000-00000000000b', null);  -- a second one

insert into club (id, name) values
  ('dede0000-0000-0000-0000-0000000000c1', 'Riverbend Rovers FC (DEMO)');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('dede0000-0000-0000-0000-0000000000a1', 'dede0000-0000-0000-0000-0000000000c1',
   '2026', '2026-01-01', '2026-12-01');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('dede0000-0000-0000-0000-0000000000b1', 'dede0000-0000-0000-0000-0000000000c1',
   'Amara', 'Okafor', '2015-04-04');

insert into registration (id, club_id, person_id, season_id) values
  ('dede0000-0000-0000-0000-0000000000e1', 'dede0000-0000-0000-0000-0000000000c1',
   'dede0000-0000-0000-0000-0000000000b1', 'dede0000-0000-0000-0000-0000000000a1');

commit;

-- ----------------------------------------------------------- the assertions

do $$
declare
  demo_club   uuid := 'dede0000-0000-0000-0000-0000000000c1';
  north_star  uuid := '11111111-1111-1111-1111-111111111111';
  visitor     uuid := 'daaaaaaa-0000-0000-0000-00000000000a';
  visitor_b   uuid := 'daaaaaaa-0000-0000-0000-00000000000b';
  registrar   uuid := 'd1111111-1111-1111-1111-111111111111';
  got         uuid;
  n           integer;
  failures    text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. No session, no entry. The function keys off auth.uid() and has
  --    nothing to grant a membership to.
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform enter_demo('someone@example.test', '0400 000 000', false, null);
    failures := array_append(failures, 'enter_demo ran without a session');
  exception when others then null;
  end;

  -- 2. An email address is required — it is the whole point of the door.
  perform set_config('request.jwt.claim.sub', visitor::text, true);
  begin
    perform enter_demo('   ', '0400 000 000', false, null);
    failures := array_append(failures, 'enter_demo accepted a blank email');
  exception when others then null;
  end;
  begin
    perform enter_demo('not-an-email', null, false, null);
    failures := array_append(failures, 'enter_demo accepted a non-address');
  exception when others then null;
  end;

  -- 3. A visitor who gives one is let in, and lands in the demo club.
  select enter_demo('prospect@example.test', '0400 111 222', false, null) into got;
  if got is distinct from demo_club then
    failures := array_append(failures, 'enter_demo returned the wrong club');
  end if;

  select count(*) into n from club_membership
   where user_id = visitor and club_id = demo_club and role = 'viewer';
  if n <> 1 then
    failures := array_append(failures, 'no viewer membership was granted');
  end if;

  -- 4. A phone number is captured but never demanded.
  perform set_config('request.jwt.claim.sub', visitor_b::text, true);
  begin
    perform enter_demo('nophone@example.test', null, false, null);
  exception when others then
    failures := array_append(failures, 'enter_demo required a phone number');
  end;

  -- 5. Coming back is not a second membership, and not a second lead. The
  --    phone number given the first time survives a visit that omits it.
  perform set_config('request.jwt.claim.sub', visitor::text, true);
  perform enter_demo('prospect@example.test', null, false, null);
  select count(*) into n from club_membership
   where user_id = visitor and club_id = demo_club;
  if n <> 1 then
    failures := array_append(failures, 'a repeat visit duplicated the membership');
  end if;

  -- ---------------------------------------------------------------- reads

  -- 6. The visitor can see the demonstration club. Without this the whole
  --    exercise is pointless.
  select count(*) into n from person where club_id = demo_club;
  if n < 1 then
    failures := array_append(failures, 'the visitor cannot see the demo club');
  end if;

  -- 7. **P5 holds.** An unfiltered query returns the demo and nothing else —
  --    not North Star, not Rival United.
  select count(*) into n from person where club_id <> demo_club;
  if n <> 0 then
    failures := array_append(failures, 'a demo visitor saw another club''s people');
  end if;

  select count(*) into n from registration where club_id <> demo_club;
  if n <> 0 then
    failures := array_append(failures, 'a demo visitor saw another club''s registrations');
  end if;

  select count(*) into n from club where id <> demo_club;
  if n <> 0 then
    failures := array_append(failures, 'a demo visitor saw that another club exists');
  end if;

  -- --------------------------------------------------------------- writes

  -- 8. A viewer changes nothing. This is the mechanism the role rests on:
  --    every write policy in the schema names roles, and none of them names
  --    this one — so it is refused everywhere, without a policy being
  --    written for it, and that will still be true of tables added later.
  begin
    insert into person (club_id, legal_given_names, legal_family_name, date_of_birth)
    values (demo_club, 'Vandal', 'Visitor', '2015-01-01');
    failures := array_append(failures, 'a viewer inserted a person');
  exception when others then null;
  end;

  update person set preferred_name = 'Tampered' where club_id = demo_club;
  get diagnostics n = row_count;
  if n <> 0 then
    failures := array_append(failures, 'a viewer updated a person');
  end if;

  delete from person where club_id = demo_club;
  get diagnostics n = row_count;
  if n <> 0 then
    failures := array_append(failures, 'a viewer deleted a person');
  end if;

  delete from registration where club_id = demo_club;
  get diagnostics n = row_count;
  if n <> 0 then
    failures := array_append(failures, 'a viewer deleted a registration');
  end if;

  begin
    insert into season (club_id, name, starts_on, ends_on)
    values (demo_club, 'Fake', '2027-01-01', '2027-12-01');
    failures := array_append(failures, 'a viewer created a season');
  exception when others then null;
  end;

  begin
    insert into club_membership (club_id, user_id, role)
    values (demo_club, visitor, 'admin');
    failures := array_append(failures, 'a viewer promoted themselves to admin');
  exception when others then null;
  end;

  -- 9. Nor into a real club, obviously — but say it rather than assume it.
  begin
    insert into person (club_id, legal_given_names, legal_family_name, date_of_birth)
    values (north_star, 'Vandal', 'Visitor', '2015-01-01');
    failures := array_append(failures, 'a viewer inserted into a real club');
  exception when others then null;
  end;

  -- ------------------------------------------------------------- prospect

  -- 10. The captured contact details are not readable through the API — not
  --     by the visitor who supplied them, and not by anyone else. The table
  --     is written only by enter_demo(), which owns it.
  select count(*) into n from prospect;
  if n <> 0 then
    failures := array_append(failures, 'a session could read the prospect list');
  end if;

  -- ----------------------------------------------- a real club's registrar

  -- 11. Someone who already belongs to a club is refused, so a registrar
  --     cannot quietly acquire a second membership and leave the screens
  --     showing whichever club happened to sort first.
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  begin
    perform enter_demo('registrar@northstar.test', null, false, null);
    failures := array_append(failures, 'a real club''s registrar was given demo membership');
  exception when others then null;
  end;

  -- 12. And the demo never became visible to them.
  select count(*) into n from person where club_id = demo_club;
  if n <> 0 then
    failures := array_append(failures, 'North Star''s registrar could read the demo club');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Demo front door FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Demo front door OK — 12 scenarios';
end
$$;

-- The prospect was captured all the same, even though no session can read
-- it back. The platform owner reads this table through the dashboard.
do $$
declare
  n integer;
  kept text;
begin
  select count(*) into n from prospect where email = 'prospect@example.test';
  if n <> 1 then
    raise exception 'two visits made two prospects (found %)', n;
  end if;

  -- The second visit gave no phone number. The first one's must survive:
  -- a returning lead should not get quieter the more interested they are.
  select phone into kept from prospect where email = 'prospect@example.test';
  if kept is distinct from '0400 111 222' then
    raise exception 'the phone number was lost on the second visit (%)', kept;
  end if;

  select count(*) into n from prospect;
  if n <> 2 then
    raise exception 'expected two distinct prospects, found %', n;
  end if;

  raise notice 'Prospect capture OK — the owner can read what the API cannot';
end
$$;
