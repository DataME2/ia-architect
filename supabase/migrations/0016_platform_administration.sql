-- 0016 — Platform administration: provisioning a tenant from inside the app.
--
-- See docs/decisions/9_platform_administration_provisions_but_never_reads.md.
--
-- The distinction the whole design rests on: **creating a tenant requires no
-- ability to read inside one.** Everything below touches `club`, `season`
-- and `club_membership` and nothing else — no person, no registration, no
-- payment, no consent, no clearance, no audit contents. P5 stays absolute
-- for tenant *data*; the single cross-tenant read granted here is the list
-- of club names, which is metadata about the platform's own customers.

-- ---------------------------------------------------------- platform_admin
-- The allowlist. Membership of this table is the authorisation.

create table platform_admin (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table platform_admin enable row level security;

-- **No policy permits anything.** With RLS on, an operation with no policy
-- is denied — so this table cannot be read or written through the API at
-- all, by anyone, including a platform administrator. Adding one is a
-- deliberate act by the database owner, exactly like the bootstrap it
-- replaces, and that is the point: an allowlist an application can edit is
-- an allowlist an application bug can edit.
create policy platform_admin_no_api_access on platform_admin
  for all using (false) with check (false);

-- --------------------------------------------------------- app_is_platform
-- Whether the caller is a platform administrator.
--
-- `security definer` because the table denies everyone; stable so the
-- planner may cache it within a statement.

create or replace function app_is_platform()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from platform_admin where user_id = auth.uid())
$$;

-- ----------------------------------------------------------- platform_clubs
-- Every club, as metadata only.
--
-- Name, jurisdiction, when it was created, and whether anyone can yet sign
-- in to it. **No counts of people, registrations or money** — those would be
-- a summary of tenant contents rather than metadata about a customer, and
-- decision 9 says that is a separate exception needing its own argument.

create or replace function platform_clubs()
returns table (
  club_id      uuid,
  name         text,
  jurisdiction text,
  created_at   timestamptz,
  admin_count  integer,
  season_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,
         c.name,
         c.jurisdiction,
         c.created_at,
         (select count(*)::integer from club_membership m
           where m.club_id = c.id and m.role = 'admin'),
         (select count(*)::integer from season s where s.club_id = c.id)
  from club c
  where app_is_platform()
  order by c.created_at
$$;

-- --------------------------------------------------------- provision_club
-- The four hand-typed statements of the annex, as one atomic call.
--
-- Idempotent on the club name within a jurisdiction, because the failure
-- this replaces is a half-created tenant: an admin who ran statement one,
-- lost the connection, and re-ran the lot.

create or replace function provision_club(
  p_name          text,
  p_jurisdiction  text,
  p_admin_email   text default null,
  p_season_name   text default null,
  p_season_starts date default null,
  p_season_ends   date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club   uuid;
  v_name   text := btrim(coalesce(p_name, ''));
  v_email  text := lower(btrim(coalesce(p_admin_email, '')));
  v_target uuid;
begin
  if not app_is_platform() then
    raise exception 'Not a platform administrator.' using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'A club needs a name.' using errcode = '22023';
  end if;

  -- BR52: the jurisdiction decides which privacy framework the club
  -- operates under, so it is required rather than defaulted.
  if coalesce(btrim(p_jurisdiction), '') = '' then
    raise exception 'A club needs a jurisdiction (for example AU-QLD).'
      using errcode = '22023';
  end if;

  -- A demonstration club is created by supabase/demo/seed.sql, which is
  -- deliberately not a migration and not this. Refusing the marker here
  -- stops a second one appearing and `enter_demo` silently picking the
  -- older of two.
  if v_name like '%(DEMO)%' then
    raise exception 'Demonstration clubs are seeded by supabase/demo/seed.sql, not provisioned here.'
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

  if v_email <> '' then
    select id into v_target from auth.users where lower(email) = v_email;

    if v_target is null then
      raise exception 'No account exists for %. They must sign up first, then provision again to attach them.', v_email
        using errcode = 'P0002';
    end if;

    -- The bootstrap: the one membership that cannot be created from inside
    -- the application, because creating one requires already being an admin
    -- of the club being joined.
    insert into club_membership (club_id, user_id, role)
    values (v_club, v_target, 'admin')
    on conflict do nothing;
  end if;

  -- Recorded into the club it created, so a club can see how it came to
  -- exist. The platform administrator is the actor; there is no club-side
  -- actor yet, by definition.
  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'club.provisioned', 'club', v_club, auth.uid(),
          jsonb_build_object('name', v_name, 'jurisdiction', p_jurisdiction,
                             'admin_email', nullif(v_email, '')));

  return v_club;
end;
$$;

revoke all on function app_is_platform() from public;
revoke all on function platform_clubs() from public;
revoke all on function provision_club(text, text, text, text, date, date) from public;

grant execute on function app_is_platform() to authenticated;
grant execute on function platform_clubs() to authenticated;
grant execute on function provision_club(text, text, text, text, date, date) to authenticated;

comment on table platform_admin is
  'Allowlist for platform administration (decision 9). Denied to the API in '
  'both directions on purpose: rows are added by the database owner, never '
  'by the application.';

comment on function provision_club(text, text, text, text, date, date) is
  'Creates a club, optionally its first season and first administrator, '
  'atomically and idempotently. Reads no tenant contents.';
