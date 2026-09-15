-- 0048 — A club keeps two administrators (scope 55).
--
-- BR124: *a club holds at least two administrators. The second is not a
-- courtesy: a club with one cannot remove that one, and cannot get back in
-- at all if they leave.*
--
-- What 0015 enforces is the **last** administrator — `revoke_club_role`
-- refuses to leave a club with none. That is the irreversible half, and it
-- was deliberately the only half: open question #60 was still open when it
-- was written. #60 has since been answered, and BR124 is the answer. A club
-- reduced to one administrator is not locked out today; it is one
-- resignation, one lost password, or one holiday away from it, and the
-- moment it happens nobody inside the club can fix it.
--
-- **The check moves from the function to the table**, and that is the
-- substantive change rather than a tidy-up. 0002's `club_membership_manage`
-- policy is `for all` to an admin, so an administrator can delete a
-- membership row straight through the API without going near
-- `revoke_club_role` — which means the last-administrator guard has been
-- bypassable since it was written. The Access screen calls the function, so
-- the product's own flow is safe; nothing else was.
--
-- It is the lesson 0010 states and 0044 and 0045 have each re-learned on a
-- different table: there will be more than one way this row gets written,
-- and a rule that lives in one of the ways is not a rule.
--
-- **`revoke_club_role` therefore stops counting.** Two counts would be two
-- definitions of the floor, and the one in the function is the one a future
-- migration can change without touching the other.
--
-- **Both directions.** Deleting the row removes the role; so does updating
-- it to a lesser one, which is the obvious way round a check that only
-- guarded deletion — the same lesson 0025's trigger records.
--
-- **Except when the club or the account is going away.** A `delete from
-- club` cascades into these rows, and a floor that refused the cascade
-- would make a club undeletable. The rule is about a club that still
-- exists keeping its administrators, not about the order Postgres unwinds
-- a cascade in.

create or replace function assert_two_administrators_remain()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_remaining integer;
begin
  -- Only the admin role has a floor, and only a change that takes it away.
  if old.role <> 'admin' then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and new.role = 'admin' then
    return new;
  end if;

  -- The club is being deleted, or the account is. Nothing here is about
  -- either; letting the cascade through is not a loophole, because there is
  -- no club left to lock out.
  if not exists (select 1 from club where id = old.club_id)
     or not exists (select 1 from auth.users where id = old.user_id) then
    return coalesce(new, old);
  end if;

  -- Distinct accounts, not rows: BR106 makes an account one identified
  -- human, so counting accounts counts people.
  select count(distinct user_id) into v_remaining
    from club_membership
   where club_id = old.club_id
     and role = 'admin'
     and user_id <> old.user_id;

  if v_remaining < 1 then
    raise exception
      'this is the club''s only administrator -- removing them would leave nobody '
      'who can restore access from inside the club (BR124)'
      using errcode = '23514';
  end if;

  if v_remaining < 2 then
    raise exception
      'a club keeps two administrators (BR124). Removing them would leave one, and '
      'a club with one administrator is a resignation away from having none. Grant '
      'admin to somebody else first.'
      using errcode = '23514';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger club_membership_keeps_two_administrators
  before delete or update on club_membership
  for each row execute function assert_two_administrators_remain();

comment on function assert_two_administrators_remain() is
  'BR124. A club that still exists keeps at least two administrators. On '
  'the table rather than in revoke_club_role, because 0002''s manage policy '
  'lets an admin delete a membership row directly and a rule that lives in '
  'one of the ways a row is written is not a rule.';

-- ------------------------------------------------- revoke_club_role, again
-- 0015's body, with its own administrator count removed: the floor is the
-- trigger's now, and two counts would be two definitions of it. Rewritten
-- in full because a migration is never edited once applied.

create or replace function revoke_club_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club uuid := app_admin_club();
begin
  if v_club is null then
    raise exception 'Only a club administrator may change who has access.'
      using errcode = '42501';
  end if;

  -- BR124's floor is enforced by `club_membership_keeps_two_administrators`,
  -- which also catches the paths that do not come through here.
  delete from club_membership
  where club_id = v_club and user_id = p_user_id and role = p_role;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'access.revoked', 'club_membership', p_user_id, auth.uid(),
          jsonb_build_object('role', p_role));
end;
$$;

revoke all on function revoke_club_role(uuid, text) from public;
grant execute on function revoke_club_role(uuid, text) to authenticated;
