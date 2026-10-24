-- 0095 — Training nights, attendance and positions played (scope 112, WP1–WP3).
--
-- North Star FC's athlete management proposal, the half that carries no
-- health data: who trains, who said why not, and how long each player spent
-- in each position. Five things, each the smallest the request needs:
--
--   1. **Technical Leads** (#104): the Technical Director, the Director of
--      Football and the Head of Performance, asked through one function.
--      They enter game days (`fixture_manage`) and training nights.
--   2. **A team manager records** attendance and game time for their own
--      team (#112), so BR158's own function gains `manager`.
--   3. **`training_session`**: a team's training night. Not personal, so
--      read by the club's members and by the families of the team's players.
--   4. **A player answers a training night as they answer a fixture** (BR62,
--      #114). `participation_response` gains `training_session_id` rather
--      than a second table, so 0054's routing (who answers for an under-18),
--      its reason rule and its policies apply unchanged. The coach's own
--      record of who came is `training_attendance`, written only by the
--      team's staff, a Technical Lead, the admin or the coordinator.
--   5. **`appearance_position`**: minutes in each position, never more in
--      total than the appearance's minutes. Written by whoever BR158 lets
--      record the appearance. And a family now reads its own appearances:
--      the player workspace has shown "Minutes" since scope 32, and with no
--      family policy on `appearance` a player always read zero.

-- ------------------------------------------------------- 1. Technical Leads

create or replace function app_is_technical_lead(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_has_role(p_club_id, array['technical_director', 'director_of_football', 'head_of_performance'])
$$;

revoke all on function app_is_technical_lead(uuid) from public;
grant execute on function app_is_technical_lead(uuid) to authenticated;

comment on function app_is_technical_lead(uuid) is
  '#104 (scope 112): whether the caller is one of the club''s Technical Leads: '
  'the Technical Director, the Director of Football or the Head of Performance.';

-- Game days entered by Technical Leads. 0058's list, plus them.
drop policy fixture_manage on fixture;
create policy fixture_manage on fixture
  for all
  using (
    app_has_role(club_id, array['admin','registrar','coordinator','coach','digital_technology_manager','secretary'])
    or app_is_technical_lead(club_id)
  )
  with check (
    app_has_role(club_id, array['admin','registrar','coordinator','coach','digital_technology_manager','secretary'])
    or app_is_technical_lead(club_id)
  );

-- ---------------------------------------------- 2. the manager records too
-- 0066's body with `manager` added (#112). A migration once applied is
-- never edited, so the function is replaced here.

create or replace function app_coaches_registration(p_registration_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from registration r
      join team t
        on t.club_id = r.club_id and t.season_id = r.season_id
      join team_member player
        on player.team_id = t.id
       and player.person_id = r.person_id
       and player.role = 'player'
       and player.withdrawn_at is null
      join team_member coach
        on coach.team_id = t.id
       and coach.role in ('coach', 'assistant-coach', 'manager')
       and coach.withdrawn_at is null
     where r.id = p_registration_id
       and coach.person_id in (select app_my_person_ids())
  )
$$;

comment on function app_coaches_registration(uuid) is
  'BR158 (extended by #112, scope 112): whether the caller is a coach, '
  'assistant coach or manager on a team the registration''s player is on, '
  'in that registration''s season.';

-- ------------------------------------------------------ 3. training_session

alter table team add constraint team_club_id_key unique (club_id, id);

create table training_session (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references club(id) on delete cascade,
  team_id      uuid not null,
  held_on      date not null,
  starts_at    time not null,
  ends_at      time,
  venue        text check (venue is null or btrim(venue) <> ''),
  -- Kept, not deleted: the answers and the marks hang off it.
  cancelled_at timestamptz,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),

  foreign key (club_id, team_id) references team (club_id, id) on delete cascade,
  unique (club_id, id),
  unique (team_id, held_on, starts_at),
  check (ends_at is null or ends_at > starts_at)
);

create index training_session_team_idx on training_session (club_id, team_id, held_on);

alter table training_session enable row level security;

create policy training_session_select on training_session
  for select using (club_id in (select app_member_club_ids()));

-- A family reads its own teams' nights, as `fixture_select_family` (0028).
create policy training_session_select_family on training_session
  for select using (
    team_id in (
      select team_id from team_member where person_id in (select app_my_family_person_ids(club_id))
    )
  );

create policy training_session_manage on training_session
  for all
  using (app_has_role(club_id, array['admin', 'coordinator']) or app_is_technical_lead(club_id))
  with check (app_has_role(club_id, array['admin', 'coordinator']) or app_is_technical_lead(club_id));

comment on table training_session is
  'Scope 112: a team''s training night, entered by a Technical Lead (#114), '
  'the admin or the coordinator. Cancelled rather than deleted once answered.';

-- ----------------------------------- 4a. a training night is answered (BR62)

alter table participation_response
  add column training_session_id uuid,
  alter column fixture_id drop not null,
  add constraint participation_response_answers_one_thing
    check (num_nonnulls(fixture_id, training_session_id) = 1),
  add constraint participation_response_session_is_at_this_club
    foreign key (club_id, training_session_id) references training_session (club_id, id) on delete cascade,
  add constraint participation_response_training_session_id_person_id_key
    unique (training_session_id, person_id);

create index participation_response_session_idx
  on participation_response (club_id, training_session_id) where training_session_id is not null;

-- 0054's guard, now covering what a family may not move for a night too.
create or replace function assert_a_family_only_answers_participation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if app_has_role(new.club_id, array['admin', 'registrar', 'coordinator', 'coach']) then
    return new;
  end if;

  if new.fixture_id is distinct from old.fixture_id
     or new.training_session_id is distinct from old.training_session_id
     or new.person_id is distinct from old.person_id then
    raise exception
      'answering changes the answer and nothing else (BR62)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- BR62's readers, with every Technical Lead (0093 named only the TD).
drop policy if exists participation_response_select_officers on participation_response;
create policy participation_response_select_officers on participation_response
  for select using (
    app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'coach', 'technical_director'])
    or app_is_technical_lead(club_id)
  );

-- ------------------------------------------- 4b. who came: training_attendance

create or replace function app_runs_training_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from training_session s
      join team_member staff
        on staff.team_id = s.team_id
       and staff.role in ('coach', 'assistant-coach', 'manager')
       and staff.withdrawn_at is null
     where s.id = p_session_id
       and staff.person_id in (select app_my_person_ids())
  )
$$;

revoke all on function app_runs_training_session(uuid) from public;
grant execute on function app_runs_training_session(uuid) to authenticated;

comment on function app_runs_training_session(uuid) is
  'Scope 112: whether the caller is a coach, assistant coach or manager of the team training that night.';

create table training_attendance (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references club(id) on delete cascade,
  training_session_id uuid not null,
  person_id           uuid not null,
  mark                text not null check (mark in ('present', 'late', 'absent')),
  -- Optional: a coach may not know why somebody did not come, and a
  -- required reason would be invented.
  reason              text check (reason is null or char_length(btrim(reason)) between 1 and 300),
  marked_by           uuid,
  marked_at           timestamptz not null default now(),

  foreign key (club_id, training_session_id) references training_session (club_id, id) on delete cascade,
  foreign key (club_id, person_id) references person (club_id, id) on delete cascade,
  unique (training_session_id, person_id)
);

create index training_attendance_person_idx on training_attendance (club_id, person_id);

-- The database names who marked and when (BR101's shape), and refuses a
-- mark for somebody who is not a player on that team.
create or replace function training_attendance_is_coherent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
      from training_session s
      join team_member tm on tm.team_id = s.team_id and tm.role = 'player'
     where s.id = new.training_session_id
       and tm.person_id = new.person_id
  ) then
    raise exception 'that person is not a player on this team (scope 112)'
      using errcode = '23514';
  end if;

  if auth.uid() is not null then
    new.marked_by := auth.uid();
  end if;
  new.marked_at := now();
  return new;
end
$$;

create trigger training_attendance_is_coherent
  before insert or update on training_attendance
  for each row execute function training_attendance_is_coherent();

alter table training_attendance enable row level security;

-- BR62's readers, and the family for their own marks.
create policy training_attendance_select on training_attendance
  for select using (
    app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'coach'])
    or app_is_technical_lead(club_id)
    or person_id in (select app_my_family_person_ids(club_id))
  );

create policy training_attendance_manage on training_attendance
  for all
  using (
    app_has_role(club_id, array['admin', 'coordinator'])
    or app_is_technical_lead(club_id)
    or app_runs_training_session(training_session_id)
  )
  with check (
    app_has_role(club_id, array['admin', 'coordinator'])
    or app_is_technical_lead(club_id)
    or app_runs_training_session(training_session_id)
  );

comment on table training_attendance is
  'Scope 112: whether a player came to a training night (present, late or absent, with an optional reason), '
  'marked by the team''s coach, assistant coach or manager, a Technical Lead, the admin or the coordinator.';

-- ----------------------------------------------- 5. positions played

alter table appearance add constraint appearance_club_id_key unique (club_id, id);

create table appearance_position (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references club(id) on delete cascade,
  appearance_id uuid not null,
  -- `player_profile`'s positions (0020), without `utility`, which is a kind
  -- of player and not a place on the pitch.
  position      text not null check (position in ('goalkeeper', 'defender', 'midfielder', 'forward')),
  minutes       integer not null check (minutes between 1 and 200),
  recorded_by   uuid,
  recorded_at   timestamptz not null default now(),

  foreign key (club_id, appearance_id) references appearance (club_id, id) on delete cascade,
  unique (appearance_id, position)
);

-- Never more minutes in positions than the appearance has. Lowering the
-- appearance's minutes afterwards is not re-checked here.
-- ponytail: checked on the position row only; a trigger on appearance if a
-- correction ever leaves positions over the total.
create or replace function appearance_position_fits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_used  integer;
begin
  select minutes_played into v_total from appearance where id = new.appearance_id;
  select coalesce(sum(minutes), 0) into v_used
    from appearance_position
   where appearance_id = new.appearance_id
     and id is distinct from new.id;

  if v_used + new.minutes > v_total then
    raise exception 'the positions add up to more minutes than the appearance (% of %)', v_used + new.minutes, v_total
      using errcode = '23514';
  end if;

  if auth.uid() is not null then
    new.recorded_by := auth.uid();
  end if;
  new.recorded_at := now();
  return new;
end
$$;

create trigger appearance_position_fits
  before insert or update on appearance_position
  for each row execute function appearance_position_fits();

alter table appearance_position enable row level security;

create policy appearance_position_select on appearance_position
  for select using (club_id in (select app_member_club_ids()));

create policy appearance_position_select_family on appearance_position
  for select using (
    appearance_id in (
      select id from appearance where person_id in (select app_my_family_person_ids(club_id))
    )
  );

-- Whoever BR158 lets record the appearance records where it was played.
create policy appearance_position_manage on appearance_position
  for all
  using (exists (
    select 1 from appearance a
     where a.id = appearance_id
       and (app_has_role(a.club_id, array['admin', 'registrar', 'coordinator'])
            or app_coaches_registration(a.registration_id))
  ))
  with check (exists (
    select 1 from appearance a
     where a.id = appearance_id
       and (app_has_role(a.club_id, array['admin', 'registrar', 'coordinator'])
            or app_coaches_registration(a.registration_id))
  ));

comment on table appearance_position is
  'Scope 112: minutes an appearance spent in each position, live or entered after the game; '
  'never more in total than the appearance''s minutes.';

-- A player, and their guardian, read the player's own appearances.
create policy appearance_select_family on appearance
  for select using (person_id in (select app_my_family_person_ids(club_id)));

insert into schema_migration_log (version, name) values
  ('0095', '0095_training_nights_attendance_and_positions_played');
