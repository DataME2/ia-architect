-- 0013 — The demonstration front door.
--
-- A prospect should be able to see the product working without being given
-- an account, and the club that sells the product should learn who looked.
-- Both, without weakening P5.
--
-- The shape is decision 6's, one level along: an unauthenticated caller
-- performs exactly one scoped write through a `security definer` function
-- **whose club is not an argument**. Here the caller first takes an
-- anonymous Supabase session, so `auth.uid()` is a real subject and every
-- policy in the schema keeps working unchanged. Nothing below adds a
-- cross-tenant read, and nothing below lets the caller name a club.

-- --------------------------------------------------------------- prospect
-- Deliberately outside the club-scoped world (scope 28 §3): a prospect is
-- not a member of anything, and giving this table a club_id would make the
-- marketing surface part of the tenant world it must never touch.

create table prospect (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (position('@' in email) > 1),
  phone      text,
  -- The anonymous session that was issued, so a returning visitor is one
  -- prospect rather than a new one each time, and so a sales conversation
  -- can be tied to what the person actually looked at.
  user_id    uuid references auth.users (id) on delete set null,
  source     text not null default 'demo',
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- One prospect per address, not one per visit. Somebody who comes back to
-- look again is the same lead with a fresher date, and a sales list where
-- the keenest prospect appears eleven times is a worse list.
create unique index prospect_email_idx on prospect (lower(email));

alter table prospect enable row level security;

-- No API access at all, in either direction. The only writer is
-- `enter_demo()` below, which owns the table and therefore is not subject
-- to this; the only readers are the platform owner through the dashboard.
-- Explicit rather than absent, because RLS with no policy denies everyone
-- silently and reads as an omission.
create policy prospect_no_api_access on prospect
  for all using (false) with check (false);

-- ---------------------------------------------------------------- viewer
-- A membership role that appears in no write policy anywhere in the schema.
--
-- That is the whole mechanism, and it is worth being explicit about why it
-- needs no new policies: reads in this schema are membership-based
-- (`club_id in (select app_member_club_ids())`) and writes are role-based
-- (`app_has_role(club_id, array[...])`). A role no write policy names can
-- therefore read its club and change nothing in it — automatically, and for
-- every table added in future, without anyone remembering to exclude it.
--
-- The one exception is `audit_event_insert`, which admits any member. A
-- viewer may append to the audit log, which is the correct outcome: their
-- visit is recorded and they cannot rewrite it.

alter table club_membership drop constraint club_membership_role_check;

alter table club_membership add constraint club_membership_role_check
  check (role in ('registrar','treasurer','committee','coach','coordinator','admin','viewer'));

-- ------------------------------------------------------------- enter_demo
-- Exchanges an email address and phone number for read-only membership of
-- the demonstration club.

create or replace function enter_demo(p_email text, p_phone text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_club  uuid;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_user is null then
    raise exception 'A session is required. Take an anonymous one first.'
      using errcode = '42501';
  end if;

  if position('@' in v_email) < 2 then
    raise exception 'A valid email address is required.'
      using errcode = '22023';
  end if;

  -- The club is looked up, never passed in. An argument here would be a way
  -- to ask for membership of an arbitrary club, which is the one thing this
  -- function must not be able to do.
  select id into v_club
  from club
  where name like '%(DEMO)%'
  order by created_at
  limit 1;

  if v_club is null then
    raise exception 'No demonstration club is seeded in this deployment.'
      using errcode = 'P0002';
  end if;

  -- Refuse anyone who already belongs to a real club. A registrar who
  -- wandered through the marketing page should not quietly acquire a second
  -- membership: the screens show one club, and which one would then depend
  -- on insertion order.
  if exists (
    select 1 from club_membership
    where user_id = v_user and club_id <> v_club
  ) then
    raise exception 'This account already belongs to a club. Sign out first.'
      using errcode = '42501';
  end if;

  insert into prospect (email, phone, user_id)
  values (v_email, nullif(btrim(coalesce(p_phone, '')), ''), v_user)
  on conflict ((lower(email))) do update
    -- Never blank out a number already given: a second visit that skips the
    -- phone field should not lose the one from the first.
    set phone        = coalesce(excluded.phone, prospect.phone),
        user_id      = excluded.user_id,
        last_seen_at = now();

  insert into club_membership (club_id, user_id, role)
  values (v_club, v_user, 'viewer')
  on conflict do nothing;

  return v_club;
end;
$$;

revoke all on function enter_demo(text, text) from public;
grant execute on function enter_demo(text, text) to anon, authenticated;

comment on function enter_demo(text, text) is
  'Grants the calling session read-only (viewer) membership of the '
  'demonstration club and records the caller as a prospect. The club is '
  'looked up, never supplied, so this cannot be pointed at a real tenant.';
