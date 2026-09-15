-- Can the president see that she is the president?
--
-- Reported against a real account: a person elected president on the
-- governance screen opened `/me` and found no governance workspace at all.
--
-- The product has **three** different things that can be called "committee",
-- and only one of them is the election:
--
--   * `club_membership.role = 'committee'` — an access grant an admin makes
--     to an *account*, separate from any election;
--   * `person_role.role = 'committee'` — a season role on the Person;
--   * `committee_position` — the actual office, held for a term (BR85).
--
-- The third is what the governance screen writes and what BR21 means by
-- committee authority. This suite asserts the thing that was missing: **a
-- person can see their own position**, whatever access role their account
-- happens to hold — including none at all.
--
-- The additive-policy shape is [scope 31](../../docs/scope/31_the-interface-and-the-southern-ocean-palette.md)'s,
-- reused: permissive policies combine with `or`, so a policy that admits a
-- person to their own row can never narrow what a club officer already sees.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures
--
-- **Its own club.** Scenarios 3, 5 and 6 count rows across the whole table
-- to prove the policy admits a person to their own row and no other, and a
-- club four other suites also elect committees in makes those counts
-- somebody else's arithmetic. Sharing North Star cost two false failures
-- before this club existed.

begin;

insert into club (id, name, jurisdiction) values
  ('41c00000-0000-0000-0000-000000000001', 'Committee Visibility FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('d41c0000-0000-0000-0000-000000000001', 'president@northstar.test'),
  ('d41c0000-0000-0000-0000-000000000002', 'coachpres@northstar.test'),
  ('d41c0000-0000-0000-0000-000000000003', 'nobody@northstar.test');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  -- Elected president, and **no club_membership row at all** — a parent who
  -- was elected, which is the ordinary case at a volunteer club.
  ('b41c0000-0000-0000-0000-000000000001', '41c00000-0000-0000-0000-000000000001',
   'Elected', 'President', '1980-01-01'),
  -- Elected secretary, and a membership role that is not `committee`.
  ('b41c0000-0000-0000-0000-000000000002', '41c00000-0000-0000-0000-000000000001',
   'Elected', 'Secretary', '1981-01-01'),
  -- Linked to an account, on the committee of nothing.
  ('b41c0000-0000-0000-0000-000000000003', '41c00000-0000-0000-0000-000000000001',
   'Not', 'Elected', '1982-01-01');

insert into account_person (club_id, person_id, user_id, linked_by) values
  ('41c00000-0000-0000-0000-000000000001', 'b41c0000-0000-0000-0000-000000000001',
   'd41c0000-0000-0000-0000-000000000001', 'd1111111-1111-1111-1111-111111111111'),
  ('41c00000-0000-0000-0000-000000000001', 'b41c0000-0000-0000-0000-000000000002',
   'd41c0000-0000-0000-0000-000000000002', 'd1111111-1111-1111-1111-111111111111'),
  ('41c00000-0000-0000-0000-000000000001', 'b41c0000-0000-0000-0000-000000000003',
   'd41c0000-0000-0000-0000-000000000003', 'd1111111-1111-1111-1111-111111111111');

-- A coach, deliberately: the access role says nothing about the office.
insert into club_membership (club_id, user_id, role) values
  ('41c00000-0000-0000-0000-000000000001', 'd41c0000-0000-0000-0000-000000000002', 'coach');

insert into committee_term (id, club_id, name, starts_on, next_agm_due_on) values
  ('c41c0000-0000-0000-0000-0000000000aa', '41c00000-0000-0000-0000-000000000001',
   '2026 (self-visibility)', current_date - interval '30 days', current_date + interval '300 days');

insert into committee_position (club_id, term_id, person_id, position, elected_on) values
  ('41c00000-0000-0000-0000-000000000001', 'c41c0000-0000-0000-0000-0000000000aa',
   'b41c0000-0000-0000-0000-000000000001', 'president', current_date - interval '30 days'),
  ('41c00000-0000-0000-0000-000000000001', 'c41c0000-0000-0000-0000-0000000000aa',
   'b41c0000-0000-0000-0000-000000000002', 'secretary', current_date - interval '30 days');

commit;

do $$
declare
  president uuid := 'd41c0000-0000-0000-0000-000000000001';
  secretary uuid := 'd41c0000-0000-0000-0000-000000000002';
  nobody    uuid := 'd41c0000-0000-0000-0000-000000000003';
  outsider  uuid := 'd1111111-1111-1111-1111-111111111111';  -- North Star's admin
  n         integer;
  v_text    text;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. **The scenario this suite exists for.** Elected president, no
  --    club_membership row. Before the fix she read nothing at all, so the
  --    screen could not have shown her the office even had it looked.
  perform set_config('request.jwt.claim.sub', president::text, true);

  select count(*) into n from committee_position
   where person_id = 'b41c0000-0000-0000-0000-000000000001';
  if n <> 1 then
    failures := array_append(failures,
      'the president cannot read her own election — a person is not shown an office '
      || 'they hold because their account was never also granted an access role');
  end if;

  -- 2. **And the term it belongs to**, or the position is a row with no
  --    mandate behind it: BR85 makes a position meaningless without its term.
  select count(*) into n from committee_term
   where id = 'c41c0000-0000-0000-0000-0000000000aa';
  if n <> 1 then
    failures := array_append(failures,
      'the president can read her position but not the term it is held for');
  end if;

  -- 3. **Seeing her own office is not seeing the committee.** She is not a
  --    club officer, so the rest of the committee stays invisible — the
  --    additive policy admits a person to their *own* row and nothing else.
  select count(*) into n from committee_position;
  if n <> 1 then
    failures := array_append(failures,
      'reading her own position also disclosed ' || (n - 1) || ' other people''s — '
      || 'the policy widened past the person it was written for');
  end if;

  -- 4. **A membership role that is not `committee` is not the question
  --    either.** The secretary holds `coach`, which is what made this a bug
  --    rather than a missing grant: the election is the fact, and the
  --    access role is a separate one.
  perform set_config('request.jwt.claim.sub', secretary::text, true);
  select position into v_text from committee_position
   where person_id = 'b41c0000-0000-0000-0000-000000000002';
  if v_text is distinct from 'secretary' then
    failures := array_append(failures,
      'the secretary, whose account holds the coach role, could not read her own office');
  end if;

  -- A coach *is* a member, so this one legitimately sees the whole committee
  -- — BR21 says who the committee is, is club information. Asserted so the
  -- additive policy is not mistaken for a narrowing of what already worked.
  select count(*) into n from committee_position
   where term_id = 'c41c0000-0000-0000-0000-0000000000aa';
  if n <> 2 then
    failures := array_append(failures,
      'a club member stopped seeing their own club''s committee (' || n || ' of 2) — the new '
      || 'policy narrowed something instead of only widening it');
  end if;

  -- 5. **Nothing is granted by being linked to an account.** A person on the
  --    committee of nothing sees nothing, which is what stops "can read
  --    their own row" from meaning "can read a row".
  perform set_config('request.jwt.claim.sub', nobody::text, true);
  select count(*) into n from committee_position;
  if n <> 0 then
    failures := array_append(failures,
      'somebody who holds no office and no membership read ' || n || ' committee positions');
  end if;

  -- 6. **P5 still holds.** Another club's admin reads none of this club's
  --    committee, however the policy was widened.
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select count(*) into n from committee_position
   where club_id = '41c00000-0000-0000-0000-000000000001';
  if n <> 0 then
    failures := array_append(failures,
      'another club''s admin read this club''s committee — the widening crossed a tenant');
  end if;

  -- 7. **Still read-only.** Seeing the office does not confer changing it
  --    (BR21: changing the committee is governance, and an admin's act).
  perform set_config('request.jwt.claim.sub', president::text, true);
  begin
    update committee_position set position = 'treasurer'
     where person_id = 'b41c0000-0000-0000-0000-000000000001';
    get diagnostics n = row_count;
    if n > 0 then
      failures := array_append(failures, 'the president promoted herself');
    end if;
  exception when others then null;
  end;

  begin
    insert into committee_position (club_id, term_id, person_id, position)
    values ('41c00000-0000-0000-0000-000000000001', 'c41c0000-0000-0000-0000-0000000000aa',
            'b41c0000-0000-0000-0000-000000000003', 'treasurer');
    failures := array_append(failures, 'the president appointed somebody to the committee');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'Committee self-visibility FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Committee self-visibility OK — 7 scenarios; a person reads the office they hold and the term behind it, whatever access role their account has or has not, and reads no other member, no other club, and cannot change any of it';
end
$$;
