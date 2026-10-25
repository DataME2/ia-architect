-- 0096 — The daily check-in, and academy teams (scope 113; BR184–BR187).
--
-- The half of North Star FC's athlete management proposal that carries
-- health information: five wellbeing scores a day and how hard each session
-- felt. Health information about children, so it is collected only under its
-- own consent and read by few people. Four things:
--
--   1. **Academy teams** (BR184, #105): a Technical Lead marks a team. The
--      check-in reaches its players of U13 or older, and nobody else.
--   2. **The consent** (BR185, #106): `ATHLETE_WELLBEING`, given by the
--      player from 18 and by a guardian holding authority until then.
--   3. **`wellbeing_entry` and `rpe_entry`** (BR186): written only by the
--      player, under that consent, on the day.
--   4. **Who reads them** (BR186, #107, #112): the player, their guardian,
--      the coaches and assistant coaches of their current teams, and the
--      Technical Leads. Not a manager, the committee, the admin or a
--      teammate.

-- ---------------------------------------------------- 1. academy teams

alter table team add column academy boolean not null default false;

comment on column team.academy is
  'BR184 (scope 113): marked by a Technical Lead. Its players of U13 or older are asked to check in.';

-- Only a Technical Lead marks a team. A service-side write (no auth.uid())
-- is the platform's own, as in seeds and tests.
create or replace function assert_a_technical_lead_marks_academy()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null
     and (tg_op = 'INSERT' and new.academy or tg_op = 'UPDATE' and new.academy is distinct from old.academy)
     and not app_is_technical_lead(new.club_id) then
    raise exception 'only a Technical Lead marks an academy team (BR184)'
      using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger team_academy_is_a_technical_leads
  before insert or update of academy on team
  for each row execute function assert_a_technical_lead_marks_academy();

-- A Technical Lead has no `team_manage` rights, and should gain only this
-- one column, so the switch goes through a function; the trigger decides.
create or replace function app_set_team_academy(p_team_id uuid, p_academy boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update team set academy = p_academy where id = p_team_id
$$;

revoke all on function app_set_team_academy(uuid, boolean) from public;
grant execute on function app_set_team_academy(uuid, boolean) to authenticated;

-- Age groups are free text. `U<n>` (or `Under n`) counts from 13; an
-- open-age group such as "Senior Men" counts; an unknown one does not.
create or replace function app_age_group_is_u13_plus(p_age_group text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_age_group is null or btrim(p_age_group) = '' then false
    when lower(p_age_group) ~ '^\s*u(nder)?\s*-?\s*\d+'
      then substring(lower(p_age_group) from '^\s*u(?:nder)?\s*-?\s*(\d+)')::integer >= 13
    else true
  end
$$;

-- ---------------------------------------------------------- 4a. readers

-- A coach or assistant coach (not a manager, #112) of a current team the
-- person plays on.
create or replace function app_coaches_player(p_club_id uuid, p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from team_member coach
      join team_member player
        on player.team_id = coach.team_id
       and player.person_id = p_person_id
       and player.role = 'player'
       and player.withdrawn_at is null
      join team t on t.id = coach.team_id
      join season s on s.id = t.season_id
     where coach.club_id = p_club_id
       and coach.role in ('coach', 'assistant-coach')
       and coach.withdrawn_at is null
       and coach.person_id in (select app_my_person_ids())
       and s.ends_on >= current_date
  )
$$;

revoke all on function app_coaches_player(uuid, uuid) from public;
grant execute on function app_coaches_player(uuid, uuid) to authenticated;

-- ---------------------------------------------------------- 2. consent

alter table consent drop constraint consent_purpose_check;
alter table consent add constraint consent_purpose_check
  check (purpose in ('REGISTRATION_COLLECTION_NOTICE', 'IDENTIFICATION_PHOTOGRAPH', 'PUBLICITY', 'ATHLETE_WELLBEING'));

-- Who may agree: the person from 18, and a guardian holding authority until
-- then. Eighteen, not BR113's thirteen: this is a consent to collect health
-- information, not an answer about a Saturday.
create or replace function app_may_consent_to_check_in(p_person_id uuid, p_club_id uuid, p_as_of date)
returns setof uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select p_person_id
   where coalesce(app_is_adult_on(p_person_id, p_as_of), false)
  union
  select g.guardian_person_id
    from guardianship g
   where g.club_id = p_club_id
     and g.person_id = p_person_id
     and g.is_authority
     and not coalesce(app_is_adult_on(p_person_id, p_as_of), false)
$$;

-- BR184 and BR185 in one place: the players the check-in applies to, when
-- their consent was given (null without one), limited to the players the
-- caller may read a check-in for (BR186). The write guard, the consent
-- functions and the Technical Director's counts all ask this.
--
-- A guardian's grant stops counting at 18, when the player decides.
create or replace function app_check_in_players(p_club_id uuid)
returns table (person_id uuid, team_id uuid, consented_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select tm.person_id,
         t.id,
         (select max(c.granted_at)
            from consent c
           where c.club_id = p_club_id
             and c.person_id = tm.person_id
             and c.purpose = 'ATHLETE_WELLBEING'
             and c.revoked_at is null
             and (c.granted_by_person_id = tm.person_id
                  or not coalesce(app_is_adult_on(tm.person_id, current_date), false)))
    from team_member tm
    join team t on t.id = tm.team_id
    join season s on s.id = t.season_id
   where tm.club_id = p_club_id
     and tm.role = 'player'
     and tm.withdrawn_at is null
     and t.academy
     and s.ends_on >= current_date
     and app_age_group_is_u13_plus(t.age_group)
     and (app_is_technical_lead(p_club_id)
          or app_coaches_player(p_club_id, tm.person_id)
          or tm.person_id in (select app_my_family_person_ids(p_club_id)))
$$;

revoke all on function app_check_in_players(uuid) from public;
grant execute on function app_check_in_players(uuid) to authenticated;

comment on function app_check_in_players(uuid) is
  'BR184–BR186 (scope 113): the players asked to check in, with when their consent was given, '
  'limited to those the caller may read a check-in for.';

create or replace function app_grant_check_in_consent(p_club_id uuid, p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_by uuid;
begin
  select m into v_by
    from app_my_person_ids() m
   where m in (select app_may_consent_to_check_in(p_person_id, p_club_id, current_date))
   limit 1;
  if v_by is null then
    raise exception 'only the player from 18, or a guardian holding authority, agrees to the check-in (BR185)'
      using errcode = '42501';
  end if;
  if not exists (select 1 from app_check_in_players(p_club_id) p where p.person_id = p_person_id) then
    raise exception 'the check-in does not apply to this player (BR184)'
      using errcode = '23514';
  end if;
  if exists (select 1 from app_check_in_players(p_club_id) p
              where p.person_id = p_person_id and p.consented_at is not null) then
    return;
  end if;
  insert into consent (club_id, person_id, purpose, granted_by_person_id)
  values (p_club_id, p_person_id, 'ATHLETE_WELLBEING', v_by);
end
$$;

create or replace function app_withdraw_check_in_consent(p_club_id uuid, p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from app_my_person_ids() m
     where m in (select app_may_consent_to_check_in(p_person_id, p_club_id, current_date))
  ) then
    raise exception 'only the player from 18, or a guardian holding authority, withdraws the check-in (BR185)'
      using errcode = '42501';
  end if;
  update consent
     set revoked_at = now()
   where club_id = p_club_id
     and person_id = p_person_id
     and purpose = 'ATHLETE_WELLBEING'
     and revoked_at is null;
end
$$;

revoke all on function app_grant_check_in_consent(uuid, uuid) from public;
revoke all on function app_withdraw_check_in_consent(uuid, uuid) from public;
grant execute on function app_grant_check_in_consent(uuid, uuid) to authenticated;
grant execute on function app_withdraw_check_in_consent(uuid, uuid) to authenticated;

-- ---------------------------------------------------- 3. the entries

create table wellbeing_entry (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references club(id) on delete cascade,
  person_id     uuid not null,
  entered_on    date not null,
  motivation    smallint not null check (motivation between 1 and 10),
  mood          smallint not null check (mood between 1 and 10),
  sleep_quality smallint not null check (sleep_quality between 1 and 10),
  stress        smallint not null check (stress between 1 and 10),
  soreness      smallint not null check (soreness between 1 and 10),
  entered_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  foreign key (club_id, person_id) references person (club_id, id) on delete cascade,
  unique (person_id, entered_on)
);

create index wellbeing_entry_club_day_idx on wellbeing_entry (club_id, entered_on);

create table rpe_entry (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  person_id  uuid not null,
  done_on    date not null,
  kind       text not null check (kind in ('team_training', 'gym', 'individual_training', 'other_sport')),
  -- Modified Borg CR-10 (#109), from 1: a session entered was done.
  rpe        smallint not null check (rpe between 1 and 10),
  entered_at timestamptz not null default now(),

  foreign key (club_id, person_id) references person (club_id, id) on delete cascade
);

create index rpe_entry_club_day_idx on rpe_entry (club_id, done_on);

-- Under consent, for a player it applies to, inside its window. A day's
-- wellbeing is entered on that day and a session up to seven days later,
-- each with a day's grace either side: `current_date` is UTC, and the
-- club's day is not.
create or replace function assert_check_in_is_allowed()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_day date;
begin
  if tg_op = 'UPDATE' and (new.person_id is distinct from old.person_id or new.club_id is distinct from old.club_id) then
    raise exception 'a check-in stays with its player (BR186)' using errcode = '42501';
  end if;

  if not exists (
    select 1 from app_check_in_players(new.club_id) p
     where p.person_id = new.person_id and p.consented_at is not null
  ) then
    raise exception 'no check-in consent for this player, or the check-in does not apply to them (BR184, BR185)'
      using errcode = '42501';
  end if;

  if tg_table_name = 'wellbeing_entry' then
    v_day := new.entered_on;
    if v_day not between current_date - 1 and current_date + 1 then
      raise exception 'a day''s check-in is entered on that day (BR186)' using errcode = '23514';
    end if;
    new.updated_at := now();
  else
    v_day := new.done_on;
    if v_day not between current_date - 7 and current_date + 1 then
      raise exception 'a session is entered within seven days of it (BR186)' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;

create trigger wellbeing_entry_is_allowed
  before insert or update on wellbeing_entry
  for each row execute function assert_check_in_is_allowed();

create trigger rpe_entry_is_allowed
  before insert or update on rpe_entry
  for each row execute function assert_check_in_is_allowed();

-- ---------------------------------------------------------- 4b. policies

alter table wellbeing_entry enable row level security;
alter table rpe_entry enable row level security;

-- The player and their guardian (#107), the coaches of their current teams,
-- and the Technical Leads. A manager, the committee and the admin are not
-- named, so they read nothing.
create policy wellbeing_entry_select on wellbeing_entry
  for select using (
    person_id in (select app_my_family_person_ids(club_id))
    or app_is_technical_lead(club_id)
    or app_coaches_player(club_id, person_id)
  );

-- Written, changed and removed by the player alone. Removing needs no
-- consent: a withdrawn player can always take their own entries away.
create policy wellbeing_entry_own on wellbeing_entry
  for all
  using (person_id in (select app_my_person_ids()))
  with check (person_id in (select app_my_person_ids()));

create policy rpe_entry_select on rpe_entry
  for select using (
    person_id in (select app_my_family_person_ids(club_id))
    or app_is_technical_lead(club_id)
    or app_coaches_player(club_id, person_id)
  );

create policy rpe_entry_own on rpe_entry
  for all
  using (person_id in (select app_my_person_ids()))
  with check (person_id in (select app_my_person_ids()));

comment on table wellbeing_entry is
  'BR186 (scope 113): a player''s own daily check-in, five scores from 1 to 10. Health information; '
  'Regulated — children for a minor. Kept for the current and previous season (#115).';
comment on table rpe_entry is
  'BR186 (scope 113): a session the player did and how hard it felt (modified Borg CR-10, 1 to 10).';

insert into schema_migration_log (version, name) values
  ('0096', '0096_the_daily_check_in');
