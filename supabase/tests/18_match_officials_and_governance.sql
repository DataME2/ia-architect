-- Match officials need a card. Twelve-year-old match officials do not.
--
-- BR84 extends BR19 from team officials to referees, which is the club's
-- rule. The correction that came with it is the interesting part: Football
-- Queensland's referee pathway starts at **MiniRefs**, and Queensland
-- exempts volunteers under 18 from the Blue Card. A rule requiring every
-- match official to hold one would have made the platform refuse the very
-- people that pathway exists to bring in -- and would have been wrong in
-- law, not merely inconvenient.
--
-- So the exemption is asserted here as hard as the requirement is, because
-- an over-strict safeguarding rule fails quietly: the club works around it,
-- and the workaround is where the real risk goes.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a1111111-1111-1111-1111-11111111ac01',
   '11111111-1111-1111-1111-111111111111',
   '2033 (officials test)', '2033-01-01', '2033-10-01');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  -- An adult referee with no card.
  ('bacc0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Adult', 'Referee', '1990-01-01'),
  -- A twelve-year-old MiniRef. Exempt.
  ('bacc0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Mini', 'Ref', '2021-06-01'),
  -- An adult referee who does hold one.
  ('bacc0000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Cleared', 'Referee', '1991-01-01'),
  -- Turns 18 during the season: on the season-end date they are an adult.
  ('bacc0000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Turning', 'Eighteen', '2015-06-01'),
  ('bacc0000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Committee', 'Person', '1975-01-01');

insert into clearance
  (club_id, person_id, kind, identifier, expires_on, verified_by_user_id, verified_at)
values
  ('11111111-1111-1111-1111-111111111111', 'bacc0000-0000-0000-0000-000000000003',
   'WWCC', 'BC-REF-1', date '2035-01-01',
   'd1111111-1111-1111-1111-111111111111', now());

commit;

-- ---------------------------------------------------------------- BR84

do $$
declare
  north_star  uuid := '11111111-1111-1111-1111-111111111111';
  the_season  uuid := 'a1111111-1111-1111-1111-11111111ac01';
  adult_ref   uuid := 'bacc0000-0000-0000-0000-000000000001';
  mini_ref    uuid := 'bacc0000-0000-0000-0000-000000000002';
  cleared_ref uuid := 'bacc0000-0000-0000-0000-000000000003';
  turning_18  uuid := 'bacc0000-0000-0000-0000-000000000004';
  committee_p uuid := 'bacc0000-0000-0000-0000-000000000005';
  seen int;
  failures text[] := array[]::text[];
begin
  -- 1. An adult match official with no card is refused. This is the ask.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (north_star, adult_ref, the_season, 'referee');
    failures := array_append(failures, 'an uncleared adult was made a match official (BR84)');
  exception when others then null;
  end;

  -- 2. A twelve-year-old MiniRef is NOT refused. Queensland exempts
  --    volunteers under 18, and this pathway is built out of them.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (north_star, mini_ref, the_season, 'referee');
  exception when others then
    failures := array_append(
      failures,
      'a MiniRef under 18 was refused for having no Blue Card: ' || sqlerrm
    );
  end;

  -- 3. A cleared adult goes through.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (north_star, cleared_ref, the_season, 'referee');
  exception when others then
    failures := array_append(failures, 'a cleared referee was refused: ' || sqlerrm);
  end;

  -- 4. Coaches are match-official-adjacent and covered by the same rule.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (north_star, adult_ref, the_season, 'coach');
    failures := array_append(failures, 'an uncleared adult was made a coach (BR84)');
  exception when others then null;
  end;

  -- 5. Age is measured at the **season end**, so someone who turns 18
  --    during the season is treated as the adult they will be. Born
  --    2015-06-01, season ends 2033-10-01: they are 18.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (north_star, turning_18, the_season, 'referee');
    failures := array_append(
      failures,
      'someone who is 18 by the end of the season was exempted (BR54/BR84)'
    );
  exception when others then null;
  end;

  -- 6. Players are never asked, whatever their age.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (north_star, adult_ref, the_season, 'player');
  exception when others then
    failures := array_append(failures, 'a player was refused for having no clearance: ' || sqlerrm);
  end;

  -- 7. Guardian and committee are not child-facing roles here, and are not
  --    blocked. Whether a committee member should need one is open (#55),
  --    and guessing yes would lock a club out of recording its own
  --    committee.
  begin
    insert into person_role (club_id, person_id, season_id, role)
    values (north_star, committee_p, the_season, 'committee');
  exception when others then
    failures := array_append(failures, 'a committee role was blocked by the clearance rule: ' || sqlerrm);
  end;

  -- 8. And the rule survives an UPDATE, the obvious way round it.
  begin
    update person_role set role = 'referee'
     where person_id = adult_ref and season_id = the_season and role = 'player';
    failures := array_append(failures, 'an uncleared adult was promoted to referee by UPDATE');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception 'Match officials FAILED: %', array_to_string(failures, ' | ');
  end if;
end
$$;

-- 9. The same exemption reaches 0010's team trigger, which had the latent
--    error too: a sixteen-year-old assistant coach is exempt.
do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  mini_ref   uuid := 'bacc0000-0000-0000-0000-000000000002';
  the_team   uuid := '7ea11111-0000-0000-0000-000000000001';
begin
  insert into team_member (club_id, team_id, person_id, role)
  values (north_star, the_team, mini_ref, 'assistant-coach');
exception when others then
  raise exception 'Match officials FAILED: a minor assistant coach was refused: %', sqlerrm;
end
$$;

-- ------------------------------------------------------ BR85/BR86, governance

do $$
declare
  north_star   uuid := '11111111-1111-1111-1111-111111111111';
  rival        uuid := '22222222-2222-2222-2222-222222222222';
  ns_admin     uuid := 'd1111111-1111-1111-1111-111111111111';
  ns_registrar uuid := 'd4444444-4444-4444-4444-444444444444';
  rival_treas  uuid := 'd5555555-5555-5555-5555-555555555555';
  a_person     uuid := 'bacc0000-0000-0000-0000-000000000005';
  term_id      uuid;
  seen int;
  failures text[] := array[]::text[];
begin
  set local role postgres;

  insert into committee_term (club_id, name, agm_held_on, starts_on, next_agm_due_on)
  values (north_star, '2033-34', date '2033-03-01', date '2033-03-01', date '2034-03-01')
  returning id into term_id;

  -- 1. A term must end after it starts.
  begin
    insert into committee_term (club_id, name, starts_on, next_agm_due_on)
    values (north_star, 'Backwards', date '2034-03-01', date '2033-03-01');
    failures := array_append(failures, 'a term ending before it starts was accepted');
  exception when check_violation then null;
       when others then null;
  end;

  -- 2. One term name per club.
  begin
    insert into committee_term (club_id, name, starts_on, next_agm_due_on)
    values (north_star, '2033-34', date '2033-03-01', date '2034-03-01');
    failures := array_append(failures, 'a duplicate term name was accepted');
  exception when unique_violation then null;
       when others then null;
  end;

  insert into committee_position (club_id, term_id, person_id, position, elected_on)
  values (north_star, term_id, a_person, 'president', date '2033-03-01');

  -- 3. One person, one position, one term -- twice is a data-entry slip.
  begin
    insert into committee_position (club_id, term_id, person_id, position)
    values (north_star, term_id, a_person, 'president');
    failures := array_append(failures, 'the same position was recorded twice for one person');
  exception when unique_violation then null;
       when others then null;
  end;

  -- 4. The same person may hold a second, different position -- small clubs
  --    routinely have a secretary who is also the registrar.
  begin
    insert into committee_position (club_id, term_id, person_id, position)
    values (north_star, term_id, a_person, 'registrar');
  exception when others then
    failures := array_append(failures, 'one person could not hold two committee positions: ' || sqlerrm);
  end;

  -- --------------------------------------------------------- the policies
  set local role authenticated;

  -- 5. A registrar may READ the committee -- BR21 approvals rest on knowing
  --    who it is -- but may not change it. Governance is an admin act.
  perform set_config('request.jwt.claim.sub', ns_registrar::text, true);

  select count(*) into seen from committee_term where club_id = north_star;
  if seen < 1 then
    failures := array_append(failures, 'a registrar cannot see who the committee is');
  end if;

  begin
    insert into committee_position (club_id, term_id, person_id, position)
    values (north_star, term_id, a_person, 'treasurer');
    failures := array_append(failures, 'a registrar appointed a committee member');
  exception when insufficient_privilege then null;
       when others then null;
  end;

  -- 6. An admin may.
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  begin
    insert into committee_position (club_id, term_id, person_id, position)
    values (north_star, term_id, a_person, 'treasurer');
  exception when others then
    failures := array_append(failures, 'an admin could not appoint a committee member: ' || sqlerrm);
  end;

  -- 7. P5: another club sees none of it.
  perform set_config('request.jwt.claim.sub', rival_treas::text, true);
  select count(*) into seen from committee_term where club_id = north_star;
  if seen <> 0 then
    failures := array_append(failures, 'another club read this club''s committee');
  end if;
  select count(*) into seen from committee_position where club_id = north_star;
  if seen <> 0 then
    failures := array_append(failures, 'another club read this club''s committee positions');
  end if;

  -- 8. And anon nothing.
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into seen from committee_term;
  if seen <> 0 then failures := array_append(failures, 'anon read committee terms'); end if;

  set local role postgres;

  if array_length(failures, 1) > 0 then
    raise exception 'Governance FAILED: %', array_to_string(failures, ' | ');
  end if;

  raise notice 'Match officials and governance OK — 17 scenarios; adults need a card, MiniRefs do not, and the club has a committee with a term.';
end
$$;
