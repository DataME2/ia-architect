-- 0024 — When an official can officiate (scope 33, WP2).
--
-- The process diagram has always started with "referee declares
-- availability", and the platform has never had anywhere to put it. A
-- coordinator proposes designations from memory and a WhatsApp group.
--
-- **Windows, not answers.** The tempting model is a row per referee per
-- fixture — available, yes or no. It is wrong for the way a season works: a
-- referee says "Saturday mornings" once in February, and a fixture list
-- that gains forty rows would need forty answers from them, most of which
-- they would never give. So availability is a *standing* declaration, and
-- the exceptions are recorded against it.
--
-- Two tables, because they are two different facts a person states at two
-- different times: what they can usually do, and the weekend they cannot.
-- One table with a nullable weekday and a nullable date range would be the
-- clever version, and the one somebody decodes at 3am.

-- ----------------------------------------------------- referee_availability
-- The standing pattern, per season — because availability is a thing people
-- change between seasons and rarely within one, and every other
-- person-scoped record here is season-scoped for the same reason.

create table referee_availability (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  season_id  uuid not null references season(id) on delete cascade,
  person_id  uuid not null references person(id) on delete cascade,

  -- Postgres' own `extract(dow from date)`: 0 is Sunday, 6 is Saturday.
  -- Matching the database's convention rather than inventing a second one
  -- means the availability check is a comparison and not a translation.
  weekday    smallint not null check (weekday between 0 and 6),

  -- Null means the whole day. A referee who says "Saturdays" has said
  -- something complete, and demanding times would make them invent them.
  from_time  time,
  to_time    time,

  note       text,
  created_at timestamptz not null default now(),

  check (from_time is null or to_time is null or to_time > from_time),
  -- One window per person per weekday per start time. Two identical
  -- windows are not two facts.
  unique (club_id, season_id, person_id, weekday, from_time),

  foreign key (club_id, person_id) references person (club_id, id) on delete cascade
);

create index referee_availability_lookup_idx
  on referee_availability (club_id, season_id, weekday);

-- --------------------------------------------------- referee_unavailability
-- The exceptions: a holiday, an exam block, a wedding. Dated ranges rather
-- than a weekday, because that is the shape of the fact.
--
-- **Not season-scoped**, deliberately. Somebody away for three weeks in
-- January does not know or care which season the club considers that, and a
-- range that had to name one would be entered against the wrong season
-- exactly when it crossed a boundary.

create table referee_unavailability (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  person_id  uuid not null references person(id) on delete cascade,

  starts_on  date not null,
  ends_on    date not null,
  reason     text,
  created_at timestamptz not null default now(),

  check (ends_on >= starts_on),

  foreign key (club_id, person_id) references person (club_id, id) on delete cascade
);

create index referee_unavailability_person_idx
  on referee_unavailability (club_id, person_id, starts_on);

-- ------------------------------------------------------------------ policies
-- The same narrowing 0023 established: the roles that appoint. Availability
-- is less sensitive than a classification history, but it is still a record
-- of where a person — often a child — is on a Saturday morning, which is
-- the reasoning decision 4 gives about calendar feeds.

alter table referee_availability enable row level security;
alter table referee_unavailability enable row level security;

create policy referee_availability_select on referee_availability
  for select using (app_has_role(club_id, array['admin','registrar','coordinator']));
create policy referee_availability_manage on referee_availability
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));

create policy referee_unavailability_select on referee_unavailability
  for select using (app_has_role(club_id, array['admin','registrar','coordinator']));
create policy referee_unavailability_manage on referee_unavailability
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));

-- ------------------------------------------------------------- the question
/**
 * Is this official available for a game on this date, at this time?
 *
 * Three properties are deliberate.
 *
 * **An unavailability beats an availability.** Somebody who said "Saturday
 * mornings" in February and "away all July" in June meant the second, and
 * the order the two rows were written in must not decide it.
 *
 * **No declared window means not available, not available-by-default.**
 * The alternative reads silence as consent and puts somebody on a match
 * sheet who never said they could do it. A coordinator seeing an empty
 * availability list knows to ask; a coordinator seeing everybody available
 * learns nothing.
 *
 * **A null kick-off matches any window.** A fixture whose time nobody has
 * entered should not silently exclude every referee with a time-bounded
 * window — the missing datum is the fixture's, and the honest answer is to
 * fall back to the day.
 *
 * `stable`, not `security definer`, for the reason 0023 gives: a definer
 * function would make a narrowed table readable through a call.
 */
create or replace function app_referee_available_on(
  p_person_id uuid,
  p_season_id uuid,
  p_on        date,
  p_kick_off  time default null
)
returns boolean
language sql
stable
as $$
  select exists (
           select 1
           from referee_availability a
           where a.person_id = p_person_id
             and a.season_id = p_season_id
             and a.weekday = extract(dow from p_on)::smallint
             and (p_kick_off is null
                  or a.from_time is null
                  or p_kick_off >= a.from_time)
             and (p_kick_off is null
                  or a.to_time is null
                  or p_kick_off <= a.to_time)
         )
     and not exists (
           select 1
           from referee_unavailability u
           where u.person_id = p_person_id
             and p_on between u.starts_on and u.ends_on
         )
$$;

revoke all on function app_referee_available_on(uuid, uuid, date, time) from public;
grant execute on function app_referee_available_on(uuid, uuid, date, time) to authenticated;

comment on function app_referee_available_on(uuid, uuid, date, time) is
  'Whether an official declared themselves available for this date and '
  'time. Silence is not availability: an official with no declared window '
  'is not available, because the alternative puts somebody on a match '
  'sheet who never said they could do it.';
