-- 0017 — Who is responsible for a club, and access they claim themselves.
--
-- Two problems, one shape.
--
-- **A club had no responsible person.** `club` held a name and a
-- jurisdiction; who to ring when something is wrong lived in the platform
-- owner's memory. A club must now name a person — with a phone number —
-- and a second person for when the first is unreachable, which is a real
-- operational need and also the insurance against the last-administrator
-- trap that `revoke_club_role` refuses to walk into.
--
-- **Provisioning stopped half way.** `provision_club` could only attach an
-- account that already existed, so the owner created a club, told the
-- customer to sign up, waited, and provisioned again. That is the
-- super-admin support burden this removes.
--
-- The fix is **not** to create accounts from the application. Writing
-- `auth.users` needs the Auth admin API and the service-role key, which
-- bypasses Row-Level Security for every club at once — a key no page and no
-- server action in this repository holds, and this is not the feature to
-- break that for. Instead a contact is recorded as a **pending grant**, the
-- person is emailed a link by Supabase itself (an ordinary anon-key
-- magic-link sign-up, no elevated credential anywhere), and **they claim
-- the access when they arrive**. The club is never waiting on the owner.

-- ------------------------------------------------------------ club_contact

create table club_contact (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  -- 'primary' is the club's main responsible person; 'secondary' is who to
  -- turn to when the first is unavailable. Both become administrators.
  kind       text not null check (kind in ('primary','secondary')),
  full_name  text not null check (btrim(full_name) <> ''),
  email      text not null check (position('@' in email) > 1),
  phone      text,
  invited_at timestamptz,
  -- Null until the person signs in and claims it. This column is the
  -- difference between "we intend you to have access" and "you have it".
  claimed_user_id uuid references auth.users (id) on delete set null,
  claimed_at      timestamptz,
  created_at timestamptz not null default now(),
  -- One primary and one secondary per club. A club with two primaries has
  -- no primary.
  unique (club_id, kind)
);

create index club_contact_email_idx on club_contact (lower(email))
  where claimed_at is null;

alter table club_contact enable row level security;

-- Readable by the club it belongs to, like any other club record. Written
-- only by the provisioning function below, which is why there is no
-- role-based write policy: this is not a screen yet, and a policy that
-- permitted writing without one would be a gap rather than a feature.
create policy club_contact_select on club_contact
  for select using (club_id in (select app_member_club_ids()));

-- ------------------------------------------------------------ provisioning
-- Same function, now recording who is responsible.

create or replace function provision_club(
  p_name             text,
  p_jurisdiction     text,
  p_season_name      text default null,
  p_season_starts    date default null,
  p_season_ends      date default null,
  p_primary_name     text default null,
  p_primary_email    text default null,
  p_primary_phone    text default null,
  p_secondary_name   text default null,
  p_secondary_email  text default null,
  p_secondary_phone  text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if not app_is_platform() then
    raise exception 'Not a platform administrator.' using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'A club needs a name.' using errcode = '22023';
  end if;

  if coalesce(btrim(p_jurisdiction), '') = '' then
    raise exception 'A club needs a jurisdiction (for example AU-QLD).'
      using errcode = '22023';
  end if;

  if v_name like '%(DEMO)%' then
    raise exception 'Demonstration clubs are seeded by supabase/demo/seed.sql, not provisioned here.'
      using errcode = '22023';
  end if;

  -- A club without somebody answerable for it is how a tenant becomes
  -- nobody's problem. Required, unlike the season.
  if coalesce(btrim(p_primary_name), '') = '' or coalesce(btrim(p_primary_email), '') = '' then
    raise exception 'A club needs a responsible person: a name and an email address.'
      using errcode = '22023';
  end if;

  select id into v_club from club
   where lower(name) = lower(v_name) and jurisdiction = p_jurisdiction;

  if v_club is null then
    insert into club (name, jurisdiction) values (v_name, p_jurisdiction)
    returning id into v_club;
  end if;

  if p_season_name is not null and btrim(p_season_name) <> '' then
    if p_season_starts is null or p_season_ends is null then
      raise exception 'A season needs a start and an end date.' using errcode = '22023';
    end if;
    insert into season (club_id, name, starts_on, ends_on)
    select v_club, btrim(p_season_name), p_season_starts, p_season_ends
     where not exists (
       select 1 from season
        where club_id = v_club and lower(name) = lower(btrim(p_season_name)));
  end if;

  insert into club_contact (club_id, kind, full_name, email, phone)
  values (v_club, 'primary', btrim(p_primary_name),
          lower(btrim(p_primary_email)), nullif(btrim(coalesce(p_primary_phone,'')), ''))
  on conflict (club_id, kind) do update
    set full_name = excluded.full_name,
        email     = excluded.email,
        phone     = coalesce(excluded.phone, club_contact.phone)
    -- Never overwrite an access somebody already claimed. Correcting a
    -- typo in a name must not silently revoke a working login.
    where club_contact.claimed_at is null;

  if coalesce(btrim(p_secondary_email), '') <> '' then
    if coalesce(btrim(p_secondary_name), '') = '' then
      raise exception 'A second responsible person needs a name as well as an email.'
        using errcode = '22023';
    end if;
    insert into club_contact (club_id, kind, full_name, email, phone)
    values (v_club, 'secondary', btrim(p_secondary_name),
            lower(btrim(p_secondary_email)), nullif(btrim(coalesce(p_secondary_phone,'')), ''))
    on conflict (club_id, kind) do update
      set full_name = excluded.full_name,
          email     = excluded.email,
          phone     = coalesce(excluded.phone, club_contact.phone)
      where club_contact.claimed_at is null;
  end if;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'club.provisioned', 'club', v_club, auth.uid(),
          jsonb_build_object('name', v_name, 'jurisdiction', p_jurisdiction,
                             'primary_email', lower(btrim(p_primary_email)),
                             'secondary_email', nullif(lower(btrim(coalesce(p_secondary_email,''))), '')));

  return v_club;
end;
$$;

-- The old signature took an admin email it could not create. Dropped so no
-- caller can reach the version that made a club with nobody answerable.
drop function if exists provision_club(text, text, text, text, date, date);

-- --------------------------------------------------------- mark_contact_invited
-- Stamps that the invitation email was sent. Separate from provisioning
-- because sending happens in the application (Supabase's own magic-link
-- sign-up, with the anon key) and can fail on its own.

create or replace function mark_contact_invited(p_club_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app_is_platform() then
    raise exception 'Not a platform administrator.' using errcode = '42501';
  end if;
  update club_contact set invited_at = now()
   where club_id = p_club_id and kind = p_kind;
end;
$$;

-- ------------------------------------------------------- claim_club_access
-- The half that removes the owner from the loop.
--
-- Called when somebody arrives — after a password sign-in, and after a
-- magic link. It matches the **verified email on their own session** to any
-- unclaimed contact record and turns it into an administrator membership.
--
-- Note what it cannot do: the email is taken from `auth.users` for
-- `auth.uid()`, never from an argument, so this grants access to the person
-- signing in and to nobody else. A caller cannot claim somebody else's
-- club by naming their address.

create or replace function claim_club_access()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_email text;
  v_row   record;
  v_count integer := 0;
begin
  if v_user is null then return 0; end if;

  select lower(email) into v_email from auth.users where id = v_user;
  if v_email is null or v_email = '' then return 0; end if;

  for v_row in
    select * from club_contact
     where lower(email) = v_email and claimed_at is null
  loop
    insert into club_membership (club_id, user_id, role)
    values (v_row.club_id, v_user, 'admin')
    on conflict do nothing;

    update club_contact
       set claimed_user_id = v_user, claimed_at = now()
     where id = v_row.id;

    insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
    values (v_row.club_id, 'access.claimed', 'club_contact', v_row.id, v_user,
            jsonb_build_object('kind', v_row.kind, 'email', v_email));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ------------------------------------------------------------ platform view
-- Now reports whether each club's responsible people have arrived.

-- The shape of the result changed, and Postgres will not replace a function
-- whose OUT parameters differ. Dropped explicitly rather than left for the
-- next person to discover mid-deploy.
drop function if exists platform_clubs();

create or replace function platform_clubs()
returns table (
  club_id          uuid,
  name             text,
  jurisdiction     text,
  created_at       timestamptz,
  admin_count      integer,
  season_count     integer,
  primary_name     text,
  primary_email    text,
  primary_phone    text,
  primary_claimed  boolean,
  secondary_name   text,
  secondary_email  text,
  secondary_phone  text,
  secondary_claimed boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.jurisdiction, c.created_at,
         (select count(*)::integer from club_membership m
           where m.club_id = c.id and m.role = 'admin'),
         (select count(*)::integer from season s where s.club_id = c.id),
         p.full_name, p.email, p.phone, p.claimed_at is not null,
         s2.full_name, s2.email, s2.phone, s2.claimed_at is not null
  from club c
  left join club_contact p  on p.club_id  = c.id and p.kind  = 'primary'
  left join club_contact s2 on s2.club_id = c.id and s2.kind = 'secondary'
  where app_is_platform()
  order by c.created_at
$$;

revoke all on function provision_club(text, text, text, date, date, text, text, text, text, text, text) from public;
revoke all on function claim_club_access() from public;
revoke all on function mark_contact_invited(uuid, text) from public;

grant execute on function provision_club(text, text, text, date, date, text, text, text, text, text, text) to authenticated;
grant execute on function claim_club_access() to authenticated;
grant execute on function mark_contact_invited(uuid, text) to authenticated;

comment on table club_contact is
  'Who is answerable for a club, and the pending grant of their access. '
  'Access is claimed by the person on sign-in (claim_club_access), never '
  'created for them — creating an account needs the service-role key.';
