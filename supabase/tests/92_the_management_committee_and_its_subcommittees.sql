-- Does committee_position keep BR175's shape (0092)?
--
--   * a management office (President…Registrar) refuses a sub-committee
--     and a role,
--   * a sub-committee position accepts both,
--   * one person sits on two sub-committees in one term, but not twice on
--     the same one (case and spacing do not make a second),
--   * a one-letter sub-committee is refused,
--   * and the admin-only write (0011) still holds: a committee member
--     cannot add a position.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d9200000-0000-0000-0000-000000000001', 'admin@subcommittee.test'),
  ('d9200000-0000-0000-0000-000000000002', 'member@subcommittee.test');

insert into club (id, name, jurisdiction) values
  ('c9200000-0000-0000-0000-000000000001', 'Sub-committee FC', 'QLD');

insert into club_membership (club_id, user_id, role) values
  ('c9200000-0000-0000-0000-000000000001', 'd9200000-0000-0000-0000-000000000001', 'admin'),
  ('c9200000-0000-0000-0000-000000000001', 'd9200000-0000-0000-0000-000000000002', 'committee');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b9200000-0000-0000-0000-000000000001', 'c9200000-0000-0000-0000-000000000001', 'Pat', 'President', '1980-01-01'),
  ('b9200000-0000-0000-0000-000000000002', 'c9200000-0000-0000-0000-000000000001', 'Sam', 'Helper', '1985-02-02');

insert into committee_term (id, club_id, name, starts_on, next_agm_due_on) values
  ('e9200000-0000-0000-0000-000000000001', 'c9200000-0000-0000-0000-000000000001',
   '2026–27', '2026-06-01', '2027-06-01');

commit;

do $$
declare
  club     uuid := 'c9200000-0000-0000-0000-000000000001';
  term     uuid := 'e9200000-0000-0000-0000-000000000001';
  pat      uuid := 'b9200000-0000-0000-0000-000000000001';
  sam      uuid := 'b9200000-0000-0000-0000-000000000002';
  admin_u  uuid := 'd9200000-0000-0000-0000-000000000001';
  member_u uuid := 'd9200000-0000-0000-0000-000000000002';
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_u::text, true);

  -- 1. A management office refuses a sub-committee.
  begin
    insert into committee_position (club_id, term_id, person_id, position, subcommittee)
    values (club, term, pat, 'president', 'Fundraising');
    failures := array_append(failures, 'a President was recorded on a sub-committee');
  exception when check_violation then null;
  end;

  -- 2. And the office itself is recorded as before.
  insert into committee_position (club_id, term_id, person_id, position)
  values (club, term, pat, 'president');

  -- 3. A sub-committee position names its sub-committee and role.
  insert into committee_position (club_id, term_id, person_id, position, subcommittee, role_title)
  values (club, term, sam, 'committee-member', 'Junior football', 'Coordinator');

  -- 4. The same person on a second sub-committee, same position.
  begin
    insert into committee_position (club_id, term_id, person_id, position, subcommittee, role_title)
    values (club, term, sam, 'committee-member', 'Fundraising', 'Member');
  exception when unique_violation then
    failures := array_append(failures, 'one person could not sit on two sub-committees in one term');
  end;

  -- 5. But not twice on the same one, whatever the case or spacing.
  begin
    insert into committee_position (club_id, term_id, person_id, position, subcommittee)
    values (club, term, sam, 'committee-member', '  junior FOOTBALL ');
    failures := array_append(failures, 'the same sub-committee was recorded twice for one person');
  exception when unique_violation then null;
  end;

  -- 6. A one-letter sub-committee is refused.
  begin
    insert into committee_position (club_id, term_id, person_id, position, subcommittee)
    values (club, term, sam, 'subcommittee-member', 'X');
    failures := array_append(failures, 'a one-letter sub-committee was accepted');
  exception when check_violation then null;
  end;

  -- 7. A committee member still cannot add a position (0011, admin only).
  perform set_config('request.jwt.claim.sub', member_u::text, true);
  begin
    insert into committee_position (club_id, term_id, person_id, position, subcommittee)
    values (club, term, sam, 'subcommittee-member', 'Referees');
    failures := array_append(failures, 'a committee member added a position');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'The Management Committee and its sub-committees FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'The Management Committee and its sub-committees OK — 7 scenarios; a management office carries no sub-committee, one person sits on two sub-committees but not twice on one, and the write stays admin-only';
end
$$;
