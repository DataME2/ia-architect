-- 0022 — Saying who is signed in (scope 29, WP1).
--
-- `club_membership` binds an `auth.users` id to a club and a role. Nothing
-- binds it to a `person`, so the application can answer "which email is
-- signed in" and never "who". The session strip shows a club and a role;
-- the audit log records a uuid that resolves to nothing a club would
-- recognise; and a committee member cannot be shown *their* governance
-- record, because the system does not know which committee member they
-- are. This is the one place Principle P1 is unhonoured.
--
-- Two things are settled here, and the second is the load-bearing one.
--
-- **Where the link lives.** The obvious home is `club_membership` — and it
-- is unique on (club_id, user_id, role), so an account holding both admin
-- and registrar is *two rows*. A `person_id` column would be stored twice,
-- could disagree with itself, and revoking one role would drop half the
-- link. The fact being recorded is one per account per club, so it gets a
-- table whose uniqueness says exactly that, in both directions (BR106).
--
-- **How the link is established.** By an administrator saying so, never by
-- matching `person.email` against `auth.users.email` (BR107, decision 10).
-- Families share an inbox, a club address outlives three secretaries, and
-- `person.email` is typed by a registrar off a form nobody verified — so a
-- match would make anybody registering with the secretary's address *be*
-- the secretary. That is the failure 23_platform_administration.sql already
-- catches for club access, arriving through a different door.

-- ------------------------------------------------- a key to point a FK at
-- `person` is tenant-scoped, so a link must not reach a Person at another
-- club. A composite foreign key makes that the database's job rather than
-- three screens' — the cheaper half of the pattern
-- `assert_appearance_is_coherent()` needed a trigger for, because only two
-- tables are involved here.

alter table person add constraint person_club_id_key unique (club_id, id);

-- ----------------------------------------------------------- the link
create table account_person (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  person_id  uuid not null references person(id) on delete cascade,
  linked_at  timestamptz not null default now(),
  linked_by  uuid,

  -- BR106, both directions. Without the first, one account claims to be
  -- two people. Without the second — the one nobody looks for — two
  -- accounts both claim to be the treasurer, and revoking one leaves the
  -- other still asserting it.
  unique (club_id, user_id),
  unique (club_id, person_id),

  -- The Person must belong to the club the link is recorded at.
  foreign key (club_id, person_id) references person (club_id, id) on delete cascade
);

alter table account_person enable row level security;

-- Read: any member of the club. This exposes nothing new — `person` is
-- already readable club-wide, and so is `club_membership`. What the link
-- adds is which of those two rows go together, which is the point.
create policy account_person_select on account_person
  for select using (club_id in (select app_member_club_ids()));

-- Write: admin only, matching `club_membership_manage`. Deciding that this
-- account *is* this person is an access decision, not a data-entry one —
-- and BR107 says nobody may claim an identity for themselves, which a
-- registrar-writable policy would quietly permit for any registrar.
create policy account_person_manage on account_person
  for all using (app_has_role(club_id, array['admin']))
  with check (app_has_role(club_id, array['admin']));

comment on table account_person is
  'Which Person a sign-in account belongs to, at one club. Asserted by an '
  'administrator (BR107), never inferred from a matching email address. '
  'One per account per club and one per Person per club (BR106).';

-- --------------------------------------------------- link_account_to_person
-- Both arguments identify rows the caller can already see; the club comes
-- from `app_admin_club()` and is never an argument. Decision 6's shape,
-- reused in decisions 8 and 9 and again here.

create or replace function link_account_to_person(p_user_id uuid, p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club uuid := app_admin_club();
begin
  if v_club is null then
    raise exception 'Only a club administrator may say who an account belongs to.'
      using errcode = '42501';
  end if;

  -- The account must already have access here. Linking an account that is
  -- not a member would let an admin record assertions about people outside
  -- their club — and the link is meant to name somebody who signs in, not
  -- to be a second directory.
  if not exists (select 1 from club_membership
                 where club_id = v_club and user_id = p_user_id) then
    raise exception 'That account has no access at this club. Grant it a role first.'
      using errcode = 'P0002';
  end if;

  -- The composite foreign key would refuse a Person from another club
  -- anyway; this says so in words a person can act on.
  if not exists (select 1 from person
                 where id = p_person_id and club_id = v_club) then
    raise exception 'No such person at this club.' using errcode = 'P0002';
  end if;

  -- Re-linking the same account to a different Person is a correction and
  -- is allowed; the unique constraints then refuse the two collisions that
  -- matter. `on conflict` is deliberately *not* used on (club_id,
  -- person_id): a second account claiming an already-claimed Person must
  -- fail loudly rather than quietly do nothing.
  insert into account_person (club_id, user_id, person_id, linked_by)
  values (v_club, p_user_id, p_person_id, auth.uid())
  on conflict (club_id, user_id)
    do update set person_id = excluded.person_id,
                  linked_at = now(),
                  linked_by = excluded.linked_by;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'account.linked', 'account_person', p_user_id, auth.uid(),
          jsonb_build_object('person_id', p_person_id));
end;
$$;

-- ------------------------------------------------------------ unlink_account
-- Removes the link and neither the Person nor the account (BR108).

create or replace function unlink_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club uuid := app_admin_club();
begin
  if v_club is null then
    raise exception 'Only a club administrator may say who an account belongs to.'
      using errcode = '42501';
  end if;

  delete from account_person where club_id = v_club and user_id = p_user_id;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'account.unlinked', 'account_person', p_user_id, auth.uid(),
          jsonb_build_object());
end;
$$;

-- ------------------------------------------------------- app_club_accounts
-- Return type changes, so the old one is dropped explicitly rather than
-- left to fail mid-deploy on "cannot change return type of existing
-- function" — the lesson migration 0017 learned about `platform_clubs()`.
--
-- `person_id` and the two name columns are null when nobody has linked the
-- account, and the screen renders that as "Not linked" rather than falling
-- back to the email address (BR108).

drop function if exists app_club_accounts();

create or replace function app_club_accounts()
returns table (
  user_id        uuid,
  email          text,
  roles          text[],
  granted_at     timestamptz,
  is_self        boolean,
  person_id      uuid,
  legal_name     text,
  preferred_name text
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
         m.user_id = auth.uid(),
         p.id,
         nullif(btrim(p.legal_given_names || ' ' || p.legal_family_name), ''),
         p.preferred_name
  from club_membership m
  join auth.users u on u.id = m.user_id
  left join account_person ap
    on ap.club_id = m.club_id and ap.user_id = m.user_id
  left join person p on p.id = ap.person_id
  where m.club_id = app_admin_club()
    and app_admin_club() is not null
  group by m.user_id, u.email, p.id, p.legal_given_names,
           p.legal_family_name, p.preferred_name
  order by u.email
$$;

-- ------------------------------------------------------------- app_who_am_i
-- The Person the caller is, at a club they are a member of. Null when
-- nobody has linked them, which every caller must render as unlinked
-- rather than guess around (BR108).

create or replace function app_who_am_i(p_club_id uuid)
returns table (
  person_id      uuid,
  legal_name     text,
  preferred_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         nullif(btrim(p.legal_given_names || ' ' || p.legal_family_name), ''),
         p.preferred_name
  from account_person ap
  join person p on p.id = ap.person_id
  where ap.user_id = auth.uid()
    and ap.club_id = p_club_id
    -- Membership is checked rather than assumed: without it this reads a
    -- link at any club whose id a caller can guess, which is a uuid they
    -- may well have seen.
    and ap.club_id in (select app_member_club_ids())
$$;

revoke all on function link_account_to_person(uuid, uuid) from public;
revoke all on function unlink_account(uuid) from public;
revoke all on function app_club_accounts() from public;
revoke all on function app_who_am_i(uuid) from public;

grant execute on function link_account_to_person(uuid, uuid) to authenticated;
grant execute on function unlink_account(uuid) to authenticated;
grant execute on function app_club_accounts() to authenticated;
grant execute on function app_who_am_i(uuid) to authenticated;

comment on function link_account_to_person(uuid, uuid) is
  'Records that an account belongs to a Person, at the calling admin''s own '
  'club. The club is never an argument. BR107: asserted, never inferred.';
