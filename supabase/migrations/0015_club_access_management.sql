-- 0015 — Granting and revoking access from inside the application (WP2).
--
-- The policy has always permitted this: `club_membership_manage` lets an
-- admin of a club add and remove memberships. What was missing is any way
-- to *see* who holds one, because `club_membership` stores a bare
-- `user_id` and `auth.users` is not readable through the API — so a screen
-- could list uuids and nothing a human would recognise.
--
-- Three `security definer` functions supply exactly that and nothing more.
-- Each one checks `app_has_role(club, 'admin')` for the caller's own club
-- **and takes no club argument**, which is the shape decision 6 and
-- decision 8 both use: the tenant is derived from the caller, never
-- supplied by them, so there is no argument that reaches another club.

-- --------------------------------------------------------- app_admin_club
-- The one club this caller administers, or null. Every function below
-- derives its tenant from this rather than accepting one.

create or replace function app_admin_club()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select club_id from club_membership
  where user_id = auth.uid() and role = 'admin'
  order by created_at
  limit 1
$$;

-- ------------------------------------------------------ app_club_accounts
-- Who has access to this club, in a form a person can read.
--
-- The email address is the only thing exposed from `auth.users`, and only
-- to an admin, and only for accounts that already hold a membership at
-- that admin's own club. It is not a directory: an account with no
-- membership here is invisible.

create or replace function app_club_accounts()
returns table (
  user_id     uuid,
  email       text,
  roles       text[],
  granted_at  timestamptz,
  is_self     boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id,
         u.email::text,
         array_agg(m.role order by m.role),
         min(m.created_at),
         m.user_id = auth.uid()
  from club_membership m
  join auth.users u on u.id = m.user_id
  where m.club_id = app_admin_club()
    and app_admin_club() is not null
  group by m.user_id, u.email
  order by u.email
$$;

-- ------------------------------------------------------- grant_club_role
-- Give an existing account a role at the caller's club.
--
-- **It cannot create an account.** Writing `auth.users` needs the Auth
-- admin API and the service-role key, which no page may hold — and letting
-- a club admin mint accounts would be a far larger grant than "manage who
-- may act at my club". So the person creates their own account first and
-- an admin attaches the role, which is decision 7's separation of
-- authorising from typing, one level down.

create or replace function grant_club_role(p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club   uuid := app_admin_club();
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_target uuid;
begin
  if v_club is null then
    raise exception 'Only a club administrator may change who has access.'
      using errcode = '42501';
  end if;

  -- `viewer` is the demonstration club's read-only role (BR91). Handing it
  -- to club staff would quietly create a second meaning for it, and the
  -- honest read-only role for staff does not exist yet — see open
  -- question #58.
  if p_role not in ('admin','registrar','treasurer','committee','coach','coordinator') then
    raise exception 'Not a club role: %', p_role using errcode = '22023';
  end if;

  select id into v_target from auth.users where lower(email) = v_email;

  if v_target is null then
    -- Said plainly rather than obscured. The alternative — failing
    -- identically whether or not the account exists — would leave an admin
    -- unable to tell a typo from a person who has not signed up, and the
    -- disclosure is only ever "this address has an account", to someone
    -- who already administers a club.
    raise exception 'No account exists for %. They must create one first, then you can grant access.', v_email
      using errcode = 'P0002';
  end if;

  insert into club_membership (club_id, user_id, role)
  values (v_club, v_target, p_role)
  on conflict do nothing;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'access.granted', 'club_membership', v_target, auth.uid(),
          jsonb_build_object('role', p_role, 'email', v_email));
end;
$$;

-- ------------------------------------------------------ revoke_club_role
-- Take a role away, with one refusal built in.

create or replace function revoke_club_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club  uuid := app_admin_club();
  v_admins integer;
begin
  if v_club is null then
    raise exception 'Only a club administrator may change who has access.'
      using errcode = '42501';
  end if;

  -- **A club may not lock itself out.** Removing the last admin leaves a
  -- club whose access nobody inside it can restore — the bootstrap
  -- paradox again, arrived at by an ordinary afternoon's tidying rather
  -- than by design. Whether an admin may appoint *another* admin is open
  -- question #60 and is deliberately left as the policy has it; this
  -- refuses only the irreversible half.
  if p_role = 'admin' then
    select count(distinct user_id) into v_admins
    from club_membership where club_id = v_club and role = 'admin';

    if v_admins <= 1 then
      raise exception 'This is the club''s only administrator. Grant admin to somebody else first.'
        using errcode = '23514';
    end if;
  end if;

  delete from club_membership
  where club_id = v_club and user_id = p_user_id and role = p_role;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'access.revoked', 'club_membership', p_user_id, auth.uid(),
          jsonb_build_object('role', p_role));
end;
$$;

revoke all on function app_admin_club() from public;
revoke all on function app_club_accounts() from public;
revoke all on function grant_club_role(text, text) from public;
revoke all on function revoke_club_role(uuid, text) from public;

grant execute on function app_admin_club() to authenticated;
grant execute on function app_club_accounts() to authenticated;
grant execute on function grant_club_role(text, text) to authenticated;
grant execute on function revoke_club_role(uuid, text) to authenticated;

comment on function app_club_accounts() is
  'Accounts holding a role at the calling admin''s own club, with their '
  'email addresses. Not a directory: an account with no membership at that '
  'club is invisible.';
