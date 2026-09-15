-- Can a club be reduced to one administrator, and can the last-administrator
-- guard be walked around?
--
-- BR124: *a club holds at least two administrators. The second is not a
-- courtesy: a club with one cannot remove that one, and cannot get back in
-- at all if they leave.*
--
-- 0015 guarded the **last** administrator, deliberately and only that,
-- because open question #60 was open when it was written. It has since been
-- answered, and BR124 is the answer.
--
-- The guard also lived in `revoke_club_role`, while 0002's
-- `club_membership_manage` policy is `for all` to an admin — so an
-- administrator could delete the membership row straight through the API
-- and never go near the function. The Access screen calls the function, so
-- the product's flow was safe; nothing else was.
--
--   * a club with three administrators may lose one,
--   * a club with two may lose neither, whichever way it is attempted,
--   * **nor by deleting the row directly**, which is the path the old guard
--     never saw,
--   * nor by demoting an administrator to a lesser role, which is the
--     obvious way round a check that only guards deletion,
--   * a non-admin role is unaffected,
--   * granting a third unblocks it,
--   * and **deleting the club still works**, because a floor that refused
--     the cascade would make a club undeletable.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('49c00000-0000-0000-0000-000000000001', 'Two Admins FC', 'AU-QLD'),
  ('49c00000-0000-0000-0000-000000000002', 'Disbanding FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('d49c0000-0000-0000-0000-000000000001', 'first@two.test'),
  ('d49c0000-0000-0000-0000-000000000002', 'second@two.test'),
  ('d49c0000-0000-0000-0000-000000000003', 'third@two.test'),
  ('d49c0000-0000-0000-0000-000000000004', 'registrar@two.test'),
  ('d49c0000-0000-0000-0000-000000000005', 'only@disbanding.test');

insert into club_membership (club_id, user_id, role) values
  ('49c00000-0000-0000-0000-000000000001', 'd49c0000-0000-0000-0000-000000000001', 'admin'),
  ('49c00000-0000-0000-0000-000000000001', 'd49c0000-0000-0000-0000-000000000002', 'admin'),
  ('49c00000-0000-0000-0000-000000000001', 'd49c0000-0000-0000-0000-000000000003', 'admin'),
  ('49c00000-0000-0000-0000-000000000001', 'd49c0000-0000-0000-0000-000000000004', 'registrar'),
  ('49c00000-0000-0000-0000-000000000002', 'd49c0000-0000-0000-0000-000000000005', 'admin');

commit;

do $$
declare
  the_club uuid := '49c00000-0000-0000-0000-000000000001';
  doomed   uuid := '49c00000-0000-0000-0000-000000000002';
  first_a  uuid := 'd49c0000-0000-0000-0000-000000000001';
  second_a uuid := 'd49c0000-0000-0000-0000-000000000002';
  third_a  uuid := 'd49c0000-0000-0000-0000-000000000003';
  reg      uuid := 'd49c0000-0000-0000-0000-000000000004';
  n        integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- 1. Three administrators; one may go. The floor is two, not "never".
  begin
    delete from club_membership
     where club_id = the_club and user_id = third_a and role = 'admin';
  exception when others then
    failures := array_append(failures,
      'a club with three administrators could not lose one: ' || sqlerrm);
  end;

  -- 2. **The scenario this suite exists for.** Two left, and the second-last
  --    is removed — leaving a club one resignation from being locked out.
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claim.sub', first_a::text, true);
    perform revoke_club_role(second_a, 'admin');
    failures := array_append(failures,
      'the second-last administrator was revoked, leaving the club with one (BR124)');
  exception when others then
    null;
  end;
  perform set_config('role', 'postgres', true);

  select count(*) into n from club_membership
   where club_id = the_club and role = 'admin';
  if n <> 2 then
    failures := array_append(failures,
      'the club now has ' || n || ' administrators rather than 2');
  end if;

  -- 3. **And not by deleting the row directly**, which is the path
  --    `revoke_club_role` never saw: 0002's manage policy is `for all` to
  --    an admin, so this was reachable through the API all along.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', first_a::text, true);
  begin
    delete from club_membership
     where club_id = the_club and user_id = second_a and role = 'admin';
    failures := array_append(failures,
      'an administrator deleted the second-last admin row directly, walking '
      || 'straight past revoke_club_role (BR124)');
  exception when others then
    null;
  end;

  -- 4. Nor by demotion. A check that only guards deletion is a check with a
  --    rename next to it.
  begin
    update club_membership set role = 'registrar'
     where club_id = the_club and user_id = second_a and role = 'admin';
    failures := array_append(failures,
      'an administrator was demoted to registrar, which removes the role the '
      || 'floor is about');
  exception when others then
    null;
  end;

  perform set_config('role', 'postgres', true);
  select count(distinct user_id) into n from club_membership
   where club_id = the_club and role = 'admin';
  if n <> 2 then
    failures := array_append(failures,
      'after two attempts the club has ' || n || ' administrators rather than 2');
  end if;

  -- 5. A lesser role is unaffected. BR124 is about administrators; a club
  --    with one registrar is a club with one registrar.
  begin
    delete from club_membership
     where club_id = the_club and user_id = reg and role = 'registrar';
  exception when others then
    failures := array_append(failures,
      'removing the only registrar was refused, which is not what BR124 says: ' || sqlerrm);
  end;

  -- 6. Granting a third unblocks it, which is the instruction the refusal
  --    gives. A rule whose message names an act that does not work is worse
  --    than no message.
  insert into club_membership (club_id, user_id, role)
  values (the_club, third_a, 'admin');
  begin
    delete from club_membership
     where club_id = the_club and user_id = second_a and role = 'admin';
  exception when others then
    failures := array_append(failures,
      'granting a third administrator did not unblock removing the second: ' || sqlerrm);
  end;

  -- 7. **Deleting the club still works.** A floor that refused its own
  --    cascade would make a club undeletable — and this club has exactly
  --    one administrator, so it is the case that would break.
  begin
    delete from club where id = doomed;
  exception when others then
    failures := array_append(failures,
      'a club with one administrator could not be deleted at all: ' || sqlerrm);
  end;

  select count(*) into n from club where id = doomed;
  if n <> 0 then
    failures := array_append(failures, 'the club was not deleted');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'A club keeps two administrators FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A club keeps two administrators OK — 7 scenarios; three may lose one, two may lose neither by revoking, by deleting the row directly, or by demotion, a lesser role is unaffected, a third unblocks it, and a club can still be deleted';
end
$$;
