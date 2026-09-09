-- Does the referee record answer BR8 and BR10, and stay out of the wrong
-- hands while doing it?
--
-- Four questions, and the last two are the ones that would fail silently:
--
--   * is the classification history actually a history — does it answer
--     "what were they in March" rather than only "what are they now",
--   * does an accreditation expire against the *fixture* and not against
--     today (BR111),
--   * does the narrowing hold — a treasurer has no business reading the
--     progression history of a twelve-year-old MiniRef,
--   * and does it stay inside its club, given a referee who officiates for
--     two of them is two records that must not see each other.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('d11d0000-0000-0000-0000-00000000000a', 'coordinator@northstar.test');

-- Two officials at North Star: an adult who has been promoted, and a
-- twelve-year-old MiniRef — the case the pathway starts with and the one
-- the narrowing exists for.
insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b11d0000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
   'Marcus', 'Whistle', '1990-04-02'),
  ('b11d0000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111',
   'Tilly', 'Young', '2014-02-20'),
  -- The same human, at another club. The schema cannot know that, which is
  -- open question #69 — asserted here as a fact this suite relies on.
  ('b11d0000-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222',
   'Marcus', 'Whistle', '1990-04-02');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  rival      uuid := '22222222-2222-2222-2222-222222222222';
  ns_admin   uuid := 'd1111111-1111-1111-1111-111111111111';
  ns_coord   uuid := 'd11d0000-0000-0000-0000-00000000000a';
  rival_reg  uuid := 'd2222222-2222-2222-2222-222222222222';
  marcus     uuid := 'b11d0000-0000-0000-0000-00000000000a';
  tilly      uuid := 'b11d0000-0000-0000-0000-00000000000b';
  marcus_r   uuid := 'b11d0000-0000-0000-0000-00000000000c';
  treasurer  uuid;
  n          integer;
  t          text;
  failures   text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- `ns_admin` is restored for the reason 25_account_person gives: an
  -- earlier suite hands North Star's last admin role to somebody else.
  insert into auth.users (id, email) values (ns_coord, 'coordinator@northstar.test')
    on conflict do nothing;
  insert into club_membership (club_id, user_id, role) values
    (north_star, ns_admin, 'admin'),
    (north_star, ns_coord, 'coordinator')
    on conflict do nothing;

  -- A treasurer at North Star, to prove the narrowing against somebody who
  -- is unambiguously a member of this club rather than a stranger.
  --
  -- **It must be a treasurer who is *only* a treasurer**, and the first
  -- version of this test was not: `where role = 'treasurer' limit 1` picked
  -- an account holding registrar as well, which reads the roster
  -- legitimately. The suite reported the narrowing broken when the policy
  -- was correct and the fixture was wrong. Roles are additive here — one
  -- person is routinely two of them — so any test that selects "a
  -- treasurer" without excluding the allowlist is testing nothing it claims
  -- to test.
  select m.user_id into treasurer
  from club_membership m
  where m.club_id = north_star
  group by m.user_id
  having array_agg(m.role) @> array['treasurer']
     and not (array_agg(m.role) && array['admin','registrar','coordinator'])
  limit 1;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_coord::text, true);

  -- 1. A coordinator keeps the referee roster. This is the role the
  --    Referee Coordinator maps to, so it is the one that must work.
  insert into referee_profile (club_id, person_id, official_number, started_on)
  values (north_star, marcus, 'FQ-88213', date '2021-03-01');
  insert into referee_profile (club_id, person_id, started_on)
  values (north_star, tilly, date '2026-02-01');

  select count(*) into n from referee_profile where club_id = north_star;
  if n <> 2 then
    failures := array_append(failures, 'the coordinator could not keep a referee roster');
  end if;

  -- 2. **One record per person per club.** A second profile is a second
  --    answer to "is this person one of our officials".
  begin
    insert into referee_profile (club_id, person_id) values (north_star, marcus);
    failures := array_append(failures, 'a person got two referee profiles at one club');
  exception when others then null;
  end;

  -- 3. A Person at another club cannot be given a profile here — the
  --    composite foreign key, not a screen.
  begin
    insert into referee_profile (club_id, person_id) values (north_star, marcus_r);
    failures := array_append(failures, 'another club''s person was made a referee here');
  exception when others then null;
  end;

  -- --------------------------------------------------- BR110: it is a history

  -- Marcus was 4.5 from 2021 and promoted in July 2026.
  insert into referee_classification (club_id, person_id, level, effective_from, sighted_at)
  values
    (north_star, marcus, 'Club Based Match Official 4.5', date '2021-03-01', now()),
    (north_star, marcus, 'Level 4',                       date '2026-07-01', now());
  insert into referee_classification (club_id, person_id, level, effective_from, sighted_at)
  values (north_star, tilly, 'MiniRef 5.0', date '2026-02-01', now());

  -- 4. **What were they in March?** The question BR8 actually asks, because
  --    it asks about the date of the match. A column would answer "Level 4"
  --    for a match played in April and retrospectively justify a
  --    designation that was wrong when it was made.
  if app_classification_on(marcus, date '2026-03-15')
     is distinct from 'Club Based Match Official 4.5' then
    failures := array_append(failures, 'the classification history answered with today''s level');
  end if;

  if app_classification_on(marcus, date '2026-08-15') is distinct from 'Level 4' then
    failures := array_append(failures, 'the current classification was not the latest row');
  end if;

  -- 5. Before the first record there is no answer, and null is the honest
  --    one — not the earliest level, which would invent a qualification.
  if app_classification_on(marcus, date '2019-01-01') is not null then
    failures := array_append(failures, 'a classification was reported before any was recorded');
  end if;

  -- 6. One standing per date: a correction replaces rather than
  --    contradicts.
  begin
    insert into referee_classification (club_id, person_id, level, effective_from)
    values (north_star, marcus, 'Level 3', date '2026-07-01');
    failures := array_append(failures, 'two contradictory classifications on one date');
  exception when others then null;
  end;

  -- --------------------------------------- BR111: expiry against the fixture

  insert into referee_accreditation
    (club_id, person_id, kind, identifier, issued_on, expires_on, verified_at)
  values
    (north_star, marcus, 'fitness', 'FIT-2026', date '2026-02-01', date '2026-06-30', now()),
    -- Recorded and never checked. BR19's separation: somebody typed it.
    (north_star, marcus, 'laws',    'LAW-2026', date '2026-02-01', date '2026-12-31', null);

  -- 7. Valid for a match inside the window, invalid for one after it —
  --    **and the answer does not depend on when it is asked.**
  if not app_accreditation_valid_on(marcus, 'fitness', date '2026-05-01') then
    failures := array_append(failures, 'a current accreditation was reported expired');
  end if;
  if app_accreditation_valid_on(marcus, 'fitness', date '2026-08-01') then
    failures := array_append(failures, 'an accreditation expired before the fixture still counted');
  end if;

  -- 8. **An unverified accreditation does not count.** Holding a number is
  --    not the same as having checked it, and BR10 is a compliance rule.
  if app_accreditation_valid_on(marcus, 'laws', date '2026-05-01') then
    failures := array_append(failures, 'an accreditation nobody verified was treated as valid');
  end if;

  -- 9. A kind never recorded is not valid by omission.
  if app_accreditation_valid_on(marcus, 'never-recorded', date '2026-05-01') then
    failures := array_append(failures, 'an accreditation that does not exist counted as held');
  end if;

  -- ------------------------------------------------------------ narrowing

  -- 10. **A treasurer reads none of it.** The schema's default would have
  --     handed them a twelve-year-old's progression history.
  if treasurer is null then
    failures := array_append(failures, 'no treasurer fixture to test the narrowing against');
  else
    perform set_config('request.jwt.claim.sub', treasurer::text, true);

    select count(*) into n from referee_profile;
    if n <> 0 then
      failures := array_append(failures, 'a treasurer read the referee roster');
    end if;

    select count(*) into n from referee_classification;
    if n <> 0 then
      failures := array_append(failures, 'a treasurer read a child''s classification history');
    end if;

    select count(*) into n from referee_accreditation;
    if n <> 0 then
      failures := array_append(failures, 'a treasurer read referee accreditations');
    end if;

    begin
      insert into referee_profile (club_id, person_id) values (north_star, tilly);
      failures := array_append(failures, 'a treasurer added a referee');
    exception when others then null;
    end;
  end if;

  -- 11. An admin does read it — the narrowing keeps the roles that appoint,
  --     and locking out the club's own administrator would be a different
  --     bug wearing the same clothes.
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  select count(*) into n from referee_profile where club_id = north_star;
  if n <> 2 then
    failures := array_append(failures, 'an admin could not read the referee roster');
  end if;

  -- ------------------------------------------------------------ isolation

  -- 12. Another club sees none of it, through the tables or the functions.
  perform set_config('request.jwt.claim.sub', rival_reg::text, true);

  select count(*) into n from referee_profile;
  if n <> 0 then
    failures := array_append(failures, 'another club read the referee roster');
  end if;
  select count(*) into n from referee_classification;
  if n <> 0 then
    failures := array_append(failures, 'another club read the classification history');
  end if;

  -- The functions are `stable`, not `security definer`, precisely so they
  -- cannot become a way around the policy above.
  if app_classification_on(marcus, date '2026-08-15') is not null then
    failures := array_append(failures, 'a function handed another club a classification');
  end if;
  if app_accreditation_valid_on(marcus, 'fitness', date '2026-05-01') then
    failures := array_append(failures, 'a function handed another club an accreditation');
  end if;

  begin
    insert into referee_classification (club_id, person_id, level, effective_from)
    values (north_star, marcus, 'Level 1', date '2026-01-01');
    failures := array_append(failures, 'another club wrote a classification at North Star');
  exception when others then null;
  end;

  -- 13. **The duplication #69 records, demonstrated rather than described.**
  --     Rival keeps its own record of the same human, and neither club can
  --     see the other's — so two clubs can hold two different levels for
  --     one referee and nothing in the schema notices.
  perform set_config('role', 'postgres', true);
  insert into referee_profile (club_id, person_id) values (rival, marcus_r);
  insert into referee_classification (club_id, person_id, level, effective_from)
  values (rival, marcus_r, 'Level 2', date '2026-07-01');
  perform set_config('role', 'authenticated', true);

  perform set_config('request.jwt.claim.sub', ns_admin::text, true);
  select level into t from referee_classification
   where person_id = marcus and effective_from = date '2026-07-01';
  if t is distinct from 'Level 4' then
    failures := array_append(failures, 'North Star''s own record changed when Rival wrote theirs');
  end if;

  select count(*) into n from referee_classification where club_id = rival;
  if n <> 0 then
    failures := array_append(failures, 'North Star read Rival''s record of the same person');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Referee record FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Referee record OK — 13 scenarios; a classification is a history answering the date of the match, an accreditation expires against the fixture, and a treasurer reads none of it';
end
$$;
