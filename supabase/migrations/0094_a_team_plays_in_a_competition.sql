-- 0094 — A team plays in a competition (scope 102, BR179).
--
-- Scope 101 put Football Queensland's 2027 season in the app as a published
-- calendar, and a club still had no way to say which of its teams plays in
-- which competition. This is that link, and the record of every change to
-- it.
--
--   1. `team_competition` — one row per team per competition entered. A team
--      may hold several (a league and a cup), never the same one twice. Read
--      by any member of the club, because a coach needs to know where their
--      team plays; entered and withdrawn by an administrator, registrar,
--      coordinator or program coordinator.
--   2. `team_competition_change` — who entered or withdrew which team from
--      which competition, and when. **Written by a trigger, not by the
--      application**, so no screen can make a change and forget to say so;
--      read by the same four roles; never changed or removed.
--
-- **The competition is named by the published calendar's ids, not by a row
-- in `competition` (0032).** The season calendar is reference data held in
-- code (`src/web/season-calendars.ts`, BR178), and the shared catalogue
-- ships empty by decision 15. The two ids are checked for shape here and
-- against the calendar by the server action; a ref the calendar no longer
-- knows still reads, as its id, rather than vanishing.

-- --------------------------------------------------------- team_competition

create table team_competition (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references club(id) on delete cascade,
  team_id         uuid not null references team(id) on delete cascade,
  calendar_id     text not null check (calendar_id ~ '^[a-z0-9-]{1,80}$'),
  competition_ref text not null check (competition_ref ~ '^[a-z0-9-]{1,80}$'),
  entered_by      uuid,
  entered_at      timestamptz not null default now(),
  unique (team_id, calendar_id, competition_ref)
);

create index team_competition_club_idx on team_competition (club_id, team_id);

-- The team must be this club's, or a registrar could enter another club's
-- team by naming its id; and who entered it is the caller, not a claim.
create or replace function team_competition_stamp()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from team t where t.id = new.team_id and t.club_id = new.club_id) then
    raise exception 'That team is not this club''s.' using errcode = '42501';
  end if;
  new.entered_by := auth.uid();
  new.entered_at := now();
  return new;
end
$$;

create trigger team_competition_stamp
  before insert on team_competition
  for each row execute function team_competition_stamp();

-- ------------------------------------------------- team_competition_change

create table team_competition_change (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references club(id) on delete cascade,
  -- Not a foreign key: the record of a withdrawal outlives the team.
  team_id         uuid not null,
  team_name       text not null,
  calendar_id     text not null,
  competition_ref text not null,
  action          text not null check (action in ('entered', 'withdrawn')),
  changed_by      uuid,
  changed_at      timestamptz not null default now()
);

create index team_competition_change_club_idx
  on team_competition_change (club_id, changed_at desc);

create or replace function team_competition_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row team_competition;
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;
  insert into team_competition_change
    (club_id, team_id, team_name, calendar_id, competition_ref, action, changed_by)
  values (
    v_row.club_id, v_row.team_id,
    coalesce((select t.name from team t where t.id = v_row.team_id), '(removed team)'),
    v_row.calendar_id, v_row.competition_ref,
    case when tg_op = 'DELETE' then 'withdrawn' else 'entered' end,
    auth.uid()
  );
  return null;
end
$$;

create trigger team_competition_log
  after insert or delete on team_competition
  for each row execute function team_competition_log();

-- ------------------------------------------------------------------ policies

alter table team_competition        enable row level security;
alter table team_competition_change enable row level security;

create policy team_competition_select on team_competition
  for select using (club_id in (select app_member_club_ids()));
create policy team_competition_insert on team_competition
  for insert with check (app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'program_coordinator']));
create policy team_competition_delete on team_competition
  for delete using (app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'program_coordinator']));
-- No update policy: a change of competition is a withdrawal and an entry,
-- two lines in the log rather than one row silently rewritten.

create policy team_competition_change_select on team_competition_change
  for select using (app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'program_coordinator']));
create policy team_competition_change_no_update on team_competition_change
  for update using (false);
create policy team_competition_change_no_delete on team_competition_change
  for delete using (false);

-- ------------------------------------------- app_team_competition_history()
-- The log with each change's author named, for the four roles that read it.
-- A name from the Person the account is linked to (BR108), the account's
-- email where nobody has linked one — "who made which change" must always
-- have an answer, and an unlinked account is ordinary for a long time.

create or replace function app_team_competition_history(p_club_id uuid)
returns table (
  changed_at timestamptz, action text, team_id uuid, team_name text,
  calendar_id text, competition_ref text, changed_by_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.changed_at, c.action, c.team_id, c.team_name, c.calendar_id, c.competition_ref,
         coalesce(
           (select coalesce(p.preferred_name, p.legal_given_names) || ' ' || p.legal_family_name
              from account_person ap
              join person p on p.id = ap.person_id
             where ap.user_id = c.changed_by and ap.club_id = p_club_id
             limit 1),
           (select u.email from auth.users u where u.id = c.changed_by),
           'Unknown account'
         )
    from team_competition_change c
   where c.club_id = p_club_id
     and app_has_role(p_club_id, array['admin', 'registrar', 'coordinator', 'program_coordinator'])
   order by c.changed_at desc
   limit 200
$$;

revoke all on function app_team_competition_history(uuid) from public;
grant execute on function app_team_competition_history(uuid) to authenticated;

comment on table team_competition is
  'BR179: which competition of a published season calendar each team plays in. Entered and withdrawn by admin, registrar, coordinator or program coordinator; every change logged in team_competition_change by trigger.';
comment on table team_competition_change is
  'BR179: who entered or withdrew which team from which competition, and when. Written only by trigger; append-only.';

insert into schema_migration_log (version, name) values
  ('0094', '0094_a_team_plays_in_a_competition');
