-- 0020 — The player record: physique, fixtures, appearances.
--
-- Twenty-eight tables and not one of them knew a game had happened. There
-- was no fixture, no result, no appearance — so "games played", "minutes"
-- and "goals" could not be read, derived or estimated from anything stored.
-- A player statistic is therefore not a screen; it is a match model, and
-- this is the smallest honest one.
--
-- Two tables carry it: a fixture, and one row per player per fixture. What
-- they deliberately do **not** carry is events — a goal is a count on an
-- appearance, not a row with a minute and a pitch coordinate. That line is
-- exactly where the paid data tier starts
-- (docs/scope/30_the-player-record-and-what-a-statistic-costs.md §5).

-- ----------------------------------------------------------- player_profile
-- The static half of a player's card.

create table player_profile (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references club(id) on delete cascade,
  -- Hangs off the registration, which is already the per-season record.
  -- BR99: a twelve-year-old's height in 2026 and 2027 are different facts,
  -- and overwriting one with the other destroys the only interesting thing
  -- about them.
  registration_id uuid not null references registration(id) on delete cascade,

  -- Optional, all of it. A registration that cannot complete without a
  -- child's weight is a registration somebody completes with a guess.
  height_cm       integer check (height_cm is null or height_cm between 50 and 250),
  weight_kg       numeric(5,2) check (weight_kg is null or weight_kg between 10 and 200),

  preferred_position  text check (preferred_position is null or preferred_position in (
    'goalkeeper','defender','midfielder','forward',
    -- Kept coarse on purpose. A club that wants "inverted left wing-back"
    -- is describing a system, not a player, and the system changes.
    'utility')),
  secondary_position  text check (secondary_position is null or secondary_position in (
    'goalkeeper','defender','midfielder','forward','utility')),
  preferred_foot      text check (preferred_foot is null or preferred_foot in ('left','right','both')),
  squad_number        integer check (squad_number is null or squad_number between 1 and 99),

  recorded_on     date not null default current_date,
  recorded_by     uuid,
  updated_at      timestamptz not null default now(),

  unique (registration_id)
);

alter table player_profile enable row level security;

-- **Narrowed on read, like `clearance` is.** BR99: a height and a weight
-- are measurements of a child, closer to health data than to ordinary club
-- information — so they reach the roles that pick teams and nobody else. A
-- treasurer has no use for a child's weight, and the default in this schema
-- (any member reads everything) would have given them one.
create policy player_profile_select on player_profile
  for select using (app_has_role(club_id, array['admin','registrar','coordinator','coach']));

create policy player_profile_manage on player_profile
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));

-- ------------------------------------------------------------------ fixture
-- A game the club played.

create table fixture (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  season_id   uuid not null references season(id) on delete cascade,
  -- Nullable: a club records a friendly or a trial before the team exists,
  -- and refusing that would mean the game is not recorded at all.
  team_id     uuid references team(id) on delete set null,

  played_on   date not null,
  kick_off    time,
  opponent    text not null check (btrim(opponent) <> ''),
  home_away   text not null check (home_away in ('home','away','neutral')),

  -- Free text, because C11 does not exist. When an association's competition
  -- catalogue is modelled this becomes a reference; until then, forcing a
  -- club to pick from a list nobody has entered would just leave it blank.
  competition text,
  venue       text,

  goals_for     integer check (goals_for is null or goals_for >= 0),
  goals_against integer check (goals_against is null or goals_against >= 0),

  status      text not null default 'played'
    check (status in ('scheduled','played','cancelled','abandoned','forfeited')),

  notes       text,
  recorded_by uuid,
  created_at  timestamptz not null default now(),

  -- A club does not play the same opponent twice on one day at one venue.
  -- Loose enough for a carnival's multiple fixtures, tight enough to catch
  -- the same result entered twice.
  unique (club_id, season_id, played_on, opponent, home_away)
);

create index fixture_season_idx on fixture (club_id, season_id, played_on desc);

alter table fixture enable row level security;

create policy fixture_select on fixture
  for select using (club_id in (select app_member_club_ids()));

create policy fixture_manage on fixture
  for all using (app_has_role(club_id, array['admin','registrar','coordinator','coach']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator','coach']));

-- --------------------------------------------------------------- appearance
-- One row per player per fixture. The whole statistical base.

create table appearance (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references club(id) on delete cascade,
  fixture_id      uuid not null references fixture(id) on delete cascade,
  person_id       uuid not null references person(id) on delete cascade,
  -- The registration this appearance counts toward. Carried explicitly so a
  -- season total is a lookup rather than a join through dates, and so an
  -- appearance is anchored to the enrolment that made it legitimate.
  registration_id uuid not null references registration(id) on delete cascade,

  -- 200 rather than 90: MiniRoos formats are shorter, senior matches go to
  -- extra time, and a bound that refuses a real match is a bound that gets
  -- worked around by entering nothing.
  minutes_played  integer not null default 0
    check (minutes_played between 0 and 200),
  started         boolean not null default true,

  -- **Counts, not events.** A goal here is an integer, not a row with a
  -- minute and a coordinate. That is the difference between a manager
  -- filling in four boxes after the game and a match-event system, and it
  -- is where the premium tier begins (BR102, BR104).
  goals           integer not null default 0 check (goals >= 0),
  assists         integer not null default 0 check (assists >= 0),

  -- BR101: a statistic here is one person's recollection. Recording whose
  -- is what stops it hardening into fact, and what makes a correction
  -- possible because somebody can be asked.
  recorded_by     uuid,
  recorded_at     timestamptz not null default now(),

  -- A player appears once in a fixture. Two rows would double every total
  -- they contribute to, silently.
  unique (fixture_id, person_id)
);

create index appearance_registration_idx on appearance (registration_id);

alter table appearance enable row level security;

create policy appearance_select on appearance
  for select using (club_id in (select app_member_club_ids()));

create policy appearance_manage on appearance
  for all using (app_has_role(club_id, array['admin','registrar','coordinator','coach']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator','coach']));

-- ------------------------------------------------------- consistency guards
-- Every row belongs to one club, and the schema says so rather than trusting
-- three screens to agree.

create or replace function assert_appearance_is_coherent()
returns trigger
language plpgsql
as $$
declare
  v_fixture_club uuid;
  v_fixture_season uuid;
  v_reg_club uuid;
  v_reg_season uuid;
  v_reg_person uuid;
begin
  select club_id, season_id into v_fixture_club, v_fixture_season
    from fixture where id = new.fixture_id;
  select club_id, season_id, person_id into v_reg_club, v_reg_season, v_reg_person
    from registration where id = new.registration_id;

  if v_fixture_club is distinct from new.club_id
     or v_reg_club is distinct from new.club_id then
    raise exception 'an appearance, its fixture and its registration must belong to one club'
      using errcode = '23514';
  end if;

  -- The registration must be for the season the fixture was played in,
  -- otherwise last year's enrolment silently accumulates this year's games.
  if v_reg_season is distinct from v_fixture_season then
    raise exception 'this registration is not for the season this fixture was played in'
      using errcode = '23514';
  end if;

  if v_reg_person is distinct from new.person_id then
    raise exception 'the appearance names a different person than its registration'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger appearance_is_coherent
  before insert or update on appearance
  for each row execute function assert_appearance_is_coherent();

-- BR103 is deliberately **not** enforced here. An appearance by a player who
-- owed money (BR79) or was not yet confirmed by the federation (BR43) is
-- recorded and flagged, never refused: blocking the entry would not un-play
-- the match, it would only mean the club stops recording games. The flag is
-- computed on read by the application, where it can be shown to the people
-- who need to act on it.

comment on table appearance is
  'One row per player per fixture. Counts rather than events: a goal is an '
  'integer, not a row with a minute and a coordinate. BR101 — every row '
  'records who entered it, because there is no verified match data.';

comment on table player_profile is
  'Physique, position and squad number, season-scoped (BR99). Read is '
  'narrowed to the roles that pick teams: these are measurements of a child.';
