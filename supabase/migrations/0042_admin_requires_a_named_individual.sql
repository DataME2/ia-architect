-- 0042 — The administrator invitation requires a named individual
-- (scope 48, WP3).
--
-- [Scope 47](../../docs/scope/47_stakeholder-answers-september-2026.md)
-- restated BR106: an Account may not be a shared or role-based mailbox.
-- There is no *invitation* flow in this codebase to intercept the way the
-- original plan assumed — `grant_club_role` (0015) grants a role to an
-- **existing** account by email; nothing here mints one or sends a first
-- email. So there was nothing shaped like "the invitation form" to add a
-- name field to.
--
-- **What "a named individual" already means in this schema** is
-- `account_person`: the link an admin makes on the Access screen saying
-- which Person an account belongs to (0022, BR106/BR108). An unlinked
-- account is, by this schema's own definition, not yet tied to anybody —
-- `AccessForms.tsx` already renders exactly that state as *"Not linked —
-- the club knows this account, not who it belongs to."* A shared mailbox
-- cannot honestly acquire that link, because the link asserts one Person,
-- and a role-based address is not one.
--
-- So the enforcement is not a regex on the email (BR106's own reasoning
-- for why not: nothing distinguishes `admin@club.org.au` shared by three
-- people from a personal address at the same domain) — it is the
-- **existing** link, required before the **admin** role specifically may
-- be held. Rewritten in full, because a migration is never edited once
-- applied: the body below is 0015's, unchanged except for the new check.

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

  if p_role not in ('admin','registrar','treasurer','committee','coach','coordinator') then
    raise exception 'Not a club role: %', p_role using errcode = '22023';
  end if;

  select id into v_target from auth.users where lower(email) = v_email;

  if v_target is null then
    raise exception 'No account exists for %. They must create one first, then you can grant access.', v_email
      using errcode = 'P0002';
  end if;

  -- BR106: an administrator's account must belong to one identified
  -- human, not a shared or role-based mailbox. There is no way to check
  -- that from the address alone, so this checks the one thing the schema
  -- *can* check: has somebody already looked at this account and said who
  -- it is. Skipped when the account already holds admin (an idempotent
  -- re-grant, `on conflict do nothing` below) — this gates the grant, not
  -- the role's continued use, the same way BR83 gates appointment and not
  -- an already-appointed Team Official. A club that held an unlinked
  -- admin before this migration keeps them; nothing here is retroactive.
  if p_role = 'admin'
     and not exists (select 1 from account_person where club_id = v_club and user_id = v_target)
     and not exists (
       select 1 from club_membership where club_id = v_club and user_id = v_target and role = 'admin'
     )
  then
    raise exception
      'BR106: an administrator''s account must be linked to a named individual first. '
      'Grant a lesser role, link the account to who it belongs to on the Access screen, '
      'then add admin.'
      using errcode = '22023';
  end if;

  insert into club_membership (club_id, user_id, role)
  values (v_club, v_target, p_role)
  on conflict do nothing;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'access.granted', 'club_membership', v_target, auth.uid(),
          jsonb_build_object('role', p_role, 'email', v_email));
end;
$$;

comment on function grant_club_role(text, text) is
  'BR106/BR124: grants an existing account a role at the caller''s club. '
  'Refuses to grant admin to an account not yet linked to a Person '
  '(account_person) -- the schema''s own definition of "a named individual", '
  'since nothing in an email address distinguishes a shared mailbox from a '
  'personal one.';
