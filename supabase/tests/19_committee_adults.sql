-- Can a nine-year-old be the treasurer?
--
-- BR87 says no, and it is enforced in the database rather than in the
-- dropdown that offers the list. A dropdown that omits children is a
-- courtesy; the constraint is what makes it true, and there will be more
-- than one way a committee position gets written.
--
-- The rule is **age and nothing else**. A parent may serve. A life member
-- may serve. What excludes a MiniRoos player is that they are a child, not
-- that they play.
--
-- BR88 is deliberately *not* asserted as a block: a committee member with
-- no Working with Children Check can still be recorded, because the club's
-- instruction was to identify the committee first and chase paperwork
-- after. A platform that refuses to record a committee until every card is
-- in is a platform whose committee list lives in a spreadsheet.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('bc001111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Nine', 'Yearold', '2017-06-01'),
  ('bc001111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Their', 'Parent', '1988-06-01'),
  ('bc001111-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Life', 'Member', '1940-01-01'),
  -- Turns 18 three months after the term starts.
  ('bc001111-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Almost', 'Eighteen', '2008-06-01');

insert into committee_term (id, club_id, name, agm_held_on, starts_on, next_agm_due_on) values
  ('c0111111-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   '2026-27 (adults test)', date '2026-03-01', date '2026-03-01', date '2027-03-01');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  the_term   uuid := 'c0111111-0000-0000-0000-000000000001';
  child      uuid := 'bc001111-0000-0000-0000-000000000001';
  parent     uuid := 'bc001111-0000-0000-0000-000000000002';
  life       uuid := 'bc001111-0000-0000-0000-000000000003';
  almost     uuid := 'bc001111-0000-0000-0000-000000000004';
  seen int;
  failures text[] := array[]::text[];
begin
  -- 1. A MiniRoos player cannot hold a committee position.
  begin
    insert into committee_position (club_id, term_id, person_id, position)
    values (north_star, the_term, child, 'committee-member');
    failures := array_append(failures, 'a child was made a committee member (BR87)');
  exception when others then null;
  end;

  -- 2. Not under any title, including the office-bearer ones.
  begin
    insert into committee_position (club_id, term_id, person_id, position)
    values (north_star, the_term, child, 'treasurer');
    failures := array_append(failures, 'a child was made treasurer (BR87)');
  exception when others then null;
  end;

  -- 3. Their parent can.
  begin
    insert into committee_position (club_id, term_id, person_id, position)
    values (north_star, the_term, parent, 'president');
  exception when others then
    failures := array_append(failures, 'a parent was refused a committee position: ' || sqlerrm);
  end;

  -- 4. And so can a life member. The filter is age, never tenure, and never
  --    whether somebody plays.
  begin
    insert into committee_position (club_id, term_id, person_id, position)
    values (north_star, the_term, life, 'secretary');
  exception when others then
    failures := array_append(failures, 'a life member was refused a committee position: ' || sqlerrm);
  end;

  -- 5. Measured at the **term's start**, not today: someone who turns 18
  --    three months into the term was not an adult when it was elected.
  begin
    insert into committee_position (club_id, term_id, person_id, position)
    values (north_star, the_term, almost, 'committee-member');
    failures := array_append(
      failures,
      'someone under 18 at the term start was seated (BR87)'
    );
  exception when others then null;
  end;

  -- 6. The rule survives an UPDATE, the obvious way round it.
  begin
    update committee_position set person_id = child
     where term_id = the_term and person_id = parent;
    failures := array_append(failures, 'a child was swapped in by UPDATE (BR87)');
  exception when others then null;
  end;

  -- 7. BR88: the parent holds no clearance and is seated anyway. Recorded,
  --    not refused -- unlike a coach, who is blocked outright (BR83).
  select count(*) into seen
  from committee_position cp
  where cp.term_id = the_term and cp.person_id = parent;
  if seen <> 1 then
    failures := array_append(
      failures,
      'a committee member without a clearance was blocked -- BR88 surfaces, it does not enforce'
    );
  end if;

  -- 8. And the gap is visible: the expectation view reports them with no
  --    cover, which is what the governance screen warns on.
  select count(*) into seen
  from clearance_expectation
  where person_id = parent and role = 'committee' and covered_to is null;
  if seen <> 1 then
    failures := array_append(failures, 'the missing committee clearance is not visible (BR88)');
  end if;

  -- 9. A MiniRoos player is not in the expectation view at all. They are
  --    exempt (BR84), so they must never appear on a screen asking for a
  --    card -- that is the whole point of the list.
  select count(*) into seen from clearance_expectation where person_id = child;
  if seen <> 0 then
    failures := array_append(
      failures,
      'a child appears on the list of people who should hold a clearance'
    );
  end if;

  if array_length(failures, 1) > 0 then
    raise exception 'Committee adults FAILED: %', array_to_string(failures, ' | ');
  end if;

  raise notice 'Committee adults OK — 9 scenarios; a child cannot govern, a parent and a life member can, and a missing committee card is shown rather than refused.';
end
$$;
