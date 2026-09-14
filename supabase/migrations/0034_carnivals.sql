-- 0034 — Carnivals, and the one thing the public may see (scope 40).
--
-- C12, and **the only deliberate exception to P5 in this product**
-- ([decision 3](../../docs/decisions/3_public-event-data-crosses-tenant-isolation.md),
-- P6). Every other migration here has been about keeping one club's data
-- away from another's. This one publishes something on purpose.
--
-- **So the grant is made as narrow as the schema can make it, rather than
-- as narrow as the policies remember to be** (BR139). The tables below have
-- **no `person_id` column**. Not "the policy excludes personal data" —
-- there is no column in which personal data could sit. Read every row of
-- `carnival_fixture` in full and you learn that North Star's under-12s play
-- Coast at 10am on pitch 3, which is what BR26 says a visitor may know.
--
-- The same instinct as `payment` being append-only through the *absence* of
-- an update policy: the property holds because of what is missing, not
-- because of what somebody remembered.
--
-- Note what these tables are **not**: exempt from `check_rls.py`. Each
-- carries the host club's `club_id` and has an ordinary membership policy,
-- with the public read *added* beside it. Unlike 0032's catalogue, no
-- exemption was needed and none was taken.

-- ------------------------------------------------------------ carnival_event

create table carnival_event (
  id        uuid primary key default gen_random_uuid(),
  -- The host. Multi-club by design (BR27), but somebody owns the record.
  club_id   uuid not null references club(id) on delete cascade,
  season_id uuid references season(id) on delete set null,

  name      text not null check (btrim(name) <> ''),
  starts_on date not null,
  ends_on   date not null,
  venue     text,

  -- BR29. The Events Coordinator is *recorded on the event*, and only they
  -- may change its conditions — regardless of whether that Person also
  -- holds Registrar, Secretary or anything else at the club.
  coordinator_user_id uuid references auth.users(id) on delete set null,

  -- BR29's Carnival Conditions. Free text and a points system, because six
  -- formats exist and a constraint listing the ones somebody guessed would
  -- refuse the real ones — `referee_classification.level`'s lesson.
  conditions      text,
  points_for_win  integer not null default 3 check (points_for_win >= 0),
  points_for_draw integer not null default 1 check (points_for_draw >= 0),

  -- BR140. One explicit act, and reversible. Null is invisible outside the
  -- host club; setting it is the whole of P6's exception.
  published_at timestamptz,

  created_at timestamptz not null default now(),

  constraint carnival_event_dates check (ends_on >= starts_on)
);

create index carnival_event_published_idx on carnival_event (published_at)
  where published_at is not null;

comment on column carnival_event.published_at is
  'BR140. The only act that makes anything here public, and reversible: a '
  'coordinator who published a wrong draw takes it down. Nothing recalls '
  'what was already copied — see scope 40''s gap notes.';

-- ------------------------------------------------------------ carnival_entry
-- A club and a team taking part. **No person_id**, by construction (BR139).

create table carnival_entry (
  id        uuid primary key default gen_random_uuid(),
  club_id   uuid not null references club(id) on delete cascade,
  event_id  uuid not null references carnival_event(id) on delete cascade,

  -- The participating club, which is usually *not* the host. Free text as
  -- well as an optional reference, because a carnival's whole point is that
  -- clubs outside this platform take part too.
  entrant_club_id uuid references club(id) on delete set null,
  entrant_name    text not null check (btrim(entrant_name) <> ''),
  team_name       text not null check (btrim(team_name) <> ''),
  age_group       text,

  created_at timestamptz not null default now(),
  unique (event_id, entrant_name, team_name)
);

-- ---------------------------------------------------------- carnival_fixture
-- The draw. **No person_id**, and there is no column here that could hold
-- one: BR26 is club- and team-level, and BR139 makes that structural.

create table carnival_fixture (
  id       uuid primary key default gen_random_uuid(),
  club_id  uuid not null references club(id) on delete cascade,
  event_id uuid not null references carnival_event(id) on delete cascade,

  home_entry_id uuid not null references carnival_entry(id) on delete cascade,
  away_entry_id uuid not null references carnival_entry(id) on delete cascade,

  played_on date not null,
  kick_off  time,
  venue     text,

  home_goals integer check (home_goals is null or home_goals >= 0),
  away_goals integer check (away_goals is null or away_goals >= 0),

  status text not null default 'scheduled'
    check (status in ('scheduled', 'played', 'cancelled', 'abandoned')),

  created_at timestamptz not null default now(),

  -- A team does not play itself, and a draw that says so is a data entry
  -- slip that would otherwise reach four hundred families.
  constraint carnival_fixture_distinct_entries check (home_entry_id <> away_entry_id),
  -- Both goals or neither: half a score is a ladder computed from a guess.
  constraint carnival_fixture_score_complete
    check ((home_goals is null) = (away_goals is null))
);

create index carnival_fixture_event_idx on carnival_fixture (event_id, played_on, kick_off);

-- ------------------------------------------------------------------ policies

alter table carnival_event   enable row level security;
alter table carnival_entry   enable row level security;
alter table carnival_fixture enable row level security;

-- The host club's own read, as for any tenant table. #81: before
-- publication an event is the host club's data and nobody else's, which
-- keeps P5 intact right up to the moment P6 is deliberately invoked.
create policy carnival_event_select on carnival_event
  for select using (club_id in (select app_member_club_ids()));
create policy carnival_entry_select on carnival_entry
  for select using (club_id in (select app_member_club_ids()));
create policy carnival_fixture_select on carnival_fixture
  for select using (club_id in (select app_member_club_ids()));

-- **P6's exception, and the whole of it.** Additive: Postgres combines
-- permissive policies with `or`, so this can never narrow what a member of
-- the host club already sees. Granted `to anon, authenticated` because a
-- visitor with no account is precisely who it exists for (BR27).
create policy carnival_event_select_public on carnival_event
  for select to anon, authenticated
  using (published_at is not null);

create policy carnival_entry_select_public on carnival_entry
  for select to anon, authenticated
  using (exists (
    select 1 from carnival_event e
     where e.id = carnival_entry.event_id and e.published_at is not null
  ));

create policy carnival_fixture_select_public on carnival_fixture
  for select to anon, authenticated
  using (exists (
    select 1 from carnival_event e
     where e.id = carnival_fixture.event_id and e.published_at is not null
  ));

-- Writes are the host club's, and never the public's.
create policy carnival_event_write on carnival_event
  for all using (app_has_role(club_id, array['admin','registrar','coordinator','committee']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator','committee']));
create policy carnival_entry_write on carnival_entry
  for all using (app_has_role(club_id, array['admin','registrar','coordinator','committee']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator','committee']));
create policy carnival_fixture_write on carnival_fixture
  for all using (app_has_role(club_id, array['admin','registrar','coordinator','committee']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator','committee']));

-- -------------------------------------------------- BR29, as a constraint
-- Only the recorded Events Coordinator may change an event's **conditions**
-- — the points system, the written rules — regardless of what else they
-- hold at the club. Everything else about the event stays an ordinary club
-- officer's work, because BR29 is about the conditions specifically.

create or replace function enforce_conditions_are_the_coordinators()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.conditions is not distinct from old.conditions
     and new.points_for_win = old.points_for_win
     and new.points_for_draw = old.points_for_draw then
    return new;
  end if;

  if old.coordinator_user_id is null then
    return new;  -- Nobody is recorded yet; recording one is the fix.
  end if;

  if auth.uid() is distinct from old.coordinator_user_id then
    raise exception
      'BR29: only the Events Coordinator recorded on this carnival may change its conditions';
  end if;

  return new;
end
$$;

create trigger carnival_event_conditions_are_the_coordinators
  before update on carnival_event
  for each row execute function enforce_conditions_are_the_coordinators();

-- --------------------------------------------------------- app_publish_event
-- BR140. One act, reversible, audited — because making children's club
-- affiliations publicly readable, even without names, is worth a record of
-- who decided to.

create or replace function app_publish_event(p_event_id uuid, p_publish boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e carnival_event;
begin
  select * into v_e from carnival_event where id = p_event_id;
  if v_e is null then raise exception 'No such event.'; end if;
  if not app_has_role(v_e.club_id, array['admin','coordinator','committee']) then
    raise exception 'Not permitted at this club.';
  end if;

  update carnival_event
     set published_at = case when p_publish then coalesce(published_at, now()) else null end
   where id = p_event_id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_e.club_id, auth.uid(),
          case when p_publish then 'carnival.published' else 'carnival.unpublished' end,
          'carnival_event', p_event_id,
          jsonb_build_object('name', v_e.name));
end
$$;

revoke all on function app_publish_event(uuid, boolean) from public;
grant execute on function app_publish_event(uuid, boolean) to authenticated;
