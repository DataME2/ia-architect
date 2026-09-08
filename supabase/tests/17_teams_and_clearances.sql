-- Can an uncleared adult be given a team?
--
-- This is the suite that matters most in the project. Everything else here
-- protects money, tenancy or tidiness; this one protects children. The rule
-- is Queensland's and it is blunt -- no card, no start (BR19) -- and BR54
-- measures it against the **end of the season**, because a coach whose card
-- expires in round 12 has not passed, they have failed later.
--
-- It is asserted as the owner as well as through the policies, because
-- BR83 is a trigger rather than a policy: it must hold against a migration,
-- a future screen, and a hand-typed INSERT, not only against this
-- application.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a1111111-1111-1111-1111-111111117ea3',
   '11111111-1111-1111-1111-111111111111',
   '2032 (teams test)', '2032-01-01', '2032-10-01');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b7777777-0000-0000-0000-00000000c001', '11111111-1111-1111-1111-111111111111', 'Cleared', 'Coach', '1985-04-01'),
  ('b7777777-0000-0000-0000-00000000c002', '11111111-1111-1111-1111-111111111111', 'Uncleared', 'Coach', '1986-04-01'),
  ('b7777777-0000-0000-0000-00000000c003', '11111111-1111-1111-1111-111111111111', 'Lapsing', 'Coach', '1987-04-01'),
  ('b7777777-0000-0000-0000-00000000c004', '11111111-1111-1111-1111-111111111111', 'Unverified', 'Coach', '1988-04-01'),
  ('b7777777-0000-0000-0000-00000000a001', '11111111-1111-1111-1111-111111111111', 'Small', 'Player', '2024-04-01');

insert into team (id, club_id, season_id, name, age_group) values
  ('7ea11111-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111117ea3', 'Under 8 Blue', 'U8');

-- Verified and covering the whole season.
insert into clearance
  (club_id, person_id, kind, identifier, expires_on, verified_by_user_id, verified_at)
values
  ('11111111-1111-1111-1111-111111111111', 'b7777777-0000-0000-0000-00000000c001',
   'WWCC', 'BC-000001', date '2033-01-01',
   'd1111111-1111-1111-1111-111111111111', now());

-- Verified, but runs out mid-season: the BR54 case.
insert into clearance
  (club_id, person_id, kind, identifier, expires_on, verified_by_user_id, verified_at)
values
  ('11111111-1111-1111-1111-111111111111', 'b7777777-0000-0000-0000-00000000c003',
   'WWCC', 'BC-000003', date '2032-06-01',
   'd1111111-1111-1111-1111-111111111111', now());

-- A number recorded, and nobody checked it.
insert into clearance (club_id, person_id, kind, identifier, expires_on)
values
  ('11111111-1111-1111-1111-111111111111', 'b7777777-0000-0000-0000-00000000c004',
   'WWCC', 'BC-000004', date '2033-01-01');

commit;

-- --------------------------------------------------- BR19/BR54, as the owner

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  the_team   uuid := '7ea11111-0000-0000-0000-000000000001';
  cleared    uuid := 'b7777777-0000-0000-0000-00000000c001';
  uncleared  uuid := 'b7777777-0000-0000-0000-00000000c002';
  lapsing    uuid := 'b7777777-0000-0000-0000-00000000c003';
  unverified uuid := 'b7777777-0000-0000-0000-00000000c004';
  a_player   uuid := 'b7777777-0000-0000-0000-00000000a001';
  seen int;
  failures text[] := array[]::text[];
begin
  -- 1. A cleared coach goes in.
  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (north_star, the_team, cleared, 'coach');
  exception when others then
    failures := array_append(failures, 'a properly cleared coach was refused: ' || sqlerrm);
  end;

  -- 2. Nobody with no clearance at all. This is the whole rule.
  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (north_star, the_team, uncleared, 'coach');
    failures := array_append(failures, 'an uncleared adult was made a coach (BR19)');
  exception when others then null;
  end;

  -- 3. And not under a different official title either -- the rule is about
  --    standing in front of children, not about the word on the badge.
  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (north_star, the_team, uncleared, 'manager');
    failures := array_append(failures, 'an uncleared adult was made a manager (BR19)');
  exception when others then null;
  end;

  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (north_star, the_team, uncleared, 'team-official');
    failures := array_append(failures, 'an uncleared adult was made a team official (BR19)');
  exception when others then null;
  end;

  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (north_star, the_team, uncleared, 'assistant-coach');
    failures := array_append(failures, 'an uncleared adult was made an assistant coach (BR19)');
  exception when others then null;
  end;

  -- 4. BR54: a card valid today but expiring before the season ends fails
  --    NOW. Under a naive "is it valid" check this coach would pass.
  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (north_star, the_team, lapsing, 'coach');
    failures := array_append(
      failures,
      'a coach whose card expires mid-season was accepted (BR54)'
    );
  exception when others then null;
  end;

  -- 5. A recorded card number that nobody verified clears nobody.
  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (north_star, the_team, unverified, 'coach');
    failures := array_append(
      failures,
      'an unverified card number was treated as a clearance (BR19)'
    );
  exception when others then null;
  end;

  -- 6. A player needs none of this. A four-year-old holds no Blue Card.
  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (north_star, the_team, a_player, 'player');
  exception when others then
    failures := array_append(failures, 'a player was refused for having no clearance: ' || sqlerrm);
  end;

  -- 7. The rule survives an UPDATE, not just an INSERT -- promoting a
  --    player row to a coach row is the obvious way round a check that
  --    only fires on insert.
  begin
    update team_member set person_id = uncleared, role = 'coach'
     where team_id = the_team and person_id = a_player;
    failures := array_append(failures, 'an uncleared adult was promoted by UPDATE (BR19)');
  exception when others then null;
  end;

  -- 8. Renewing the lapsing coach's card lets them in, without deleting
  --    the old record.
  insert into clearance
    (club_id, person_id, kind, identifier, expires_on, verified_by_user_id, verified_at)
  values (north_star, lapsing, 'WWCC', 'BC-000003-R', date '2035-01-01',
          'd1111111-1111-1111-1111-111111111111', now());

  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (north_star, the_team, lapsing, 'coach');
  exception when others then
    failures := array_append(failures, 'a renewed clearance did not admit the coach: ' || sqlerrm);
  end;

  select count(*) into seen from clearance where person_id = lapsing;
  if seen <> 2 then
    failures := array_append(failures, 'the superseded clearance was lost on renewal');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception 'Teams and clearances FAILED: %', array_to_string(failures, ' | ');
  end if;
end
$$;

-- ------------------------------------------------------- who may see what

do $$
declare
  north_star   uuid := '11111111-1111-1111-1111-111111111111';
  the_team     uuid := '7ea11111-0000-0000-0000-000000000001';
  ns_registrar uuid := 'd1111111-1111-1111-1111-111111111111';
  ns_treasurer uuid := 'd3333333-3333-3333-3333-333333333333';
  rival_treas  uuid := 'd5555555-5555-5555-5555-555555555555';
  uncleared    uuid := 'b7777777-0000-0000-0000-00000000c002';
  seen int;
  failures text[] := array[]::text[];
begin
  set local role authenticated;

  -- 9. A registrar may read clearances -- they are the ones checking cards.
  perform set_config('request.jwt.claim.sub', ns_registrar::text, true);
  select count(*) into seen from clearance where club_id = north_star;
  if seen < 1 then
    failures := array_append(failures, 'a registrar cannot read clearances');
  end if;

  -- 10. A treasurer may see the roster but NOT the card numbers. A
  --     safeguarding record is not ordinary club information.
  perform set_config('request.jwt.claim.sub', ns_treasurer::text, true);
  select count(*) into seen from team_member where club_id = north_star;
  if seen < 1 then
    failures := array_append(failures, 'a treasurer cannot see the roster');
  end if;

  select count(*) into seen from clearance where club_id = north_star;
  if seen <> 0 then
    failures := array_append(failures, 'a treasurer could read Working with Children Check numbers');
  end if;

  -- 11. And cannot pick the team either -- that is a coordinator's job.
  begin
    insert into team_member (club_id, team_id, person_id, role)
    values (north_star, the_team, uncleared, 'player');
    failures := array_append(failures, 'a treasurer edited a team roster');
  exception when insufficient_privilege then null;
       when others then null;
  end;

  -- 12. P5: another club sees none of it.
  perform set_config('request.jwt.claim.sub', rival_treas::text, true);
  select count(*) into seen from team where club_id = north_star;
  if seen <> 0 then
    failures := array_append(failures, 'another club read this club''s teams');
  end if;
  select count(*) into seen from clearance where club_id = north_star;
  if seen <> 0 then
    failures := array_append(failures, 'another club read this club''s clearances');
  end if;

  -- 13. A non-member and anon see nothing at all.
  perform set_config('request.jwt.claim.sub', 'd9999999-9999-9999-9999-999999999999', true);
  select count(*) into seen from team_member;
  if seen <> 0 then
    failures := array_append(failures, 'a non-member read a roster');
  end if;

  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into seen from team;
  if seen <> 0 then failures := array_append(failures, 'anon read teams'); end if;
  select count(*) into seen from clearance;
  if seen <> 0 then failures := array_append(failures, 'anon read clearances'); end if;

  set local role postgres;

  if array_length(failures, 1) > 0 then
    raise exception 'Teams and clearances FAILED: %', array_to_string(failures, ' | ');
  end if;

  raise notice 'Teams and clearances OK — 13 scenarios; no card, no start, measured against the end of the season.';
end
$$;
