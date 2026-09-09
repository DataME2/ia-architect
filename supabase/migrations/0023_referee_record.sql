-- 0023 — The referee's own record (scope 33, WP1).
--
-- C4 has been in the capability model since the first bootstrap with no
-- code, and its rules were written long before anything could evaluate
-- them. BR8 asks whether a referee's classification meets a competition's
-- minimum; BR10 asks whether a mandatory accreditation has expired. Neither
-- can be asked at all today: `person_role` carries `referee` as one of five
-- values and the schema knows nothing else about them.
--
-- This is the half that has to exist before the appointment screen, and the
-- ordering is deliberate. A conflict engine built first would have every
-- check pass vacuously — which is BR2's failure repeated: a check that
-- cannot fail, displayed as a check that passed.
--
-- Three tables, and one shape borrowed from `clearance`: **what the club
-- has sighted is recorded separately from what somebody claimed.** Holding
-- a number is not the same as having checked it, and collapsing the two is
-- how a typed digit clears a referee.

-- --------------------------------------------------------- referee_profile
-- One per person per club. The club's own record of somebody it uses as a
-- match official.
--
-- **Tenant-scoped, like every other table here** — and this is the one
-- place that costs something real. A referee who officiates for four clubs
-- is four rows, and a classification issued by Football Queensland is then
-- recorded four times and can disagree with itself four ways. That is P5
-- working as designed rather than a defect: cross-tenant identity is
-- scope 33's open question #69 and belongs with the association tier
-- (#31), not with a patch here.

create table referee_profile (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  person_id   uuid not null references person(id) on delete cascade,

  -- The Football Queensland official number, where the club has seen one.
  -- Nullable: a MiniRef in their first season may not have been issued one,
  -- and refusing the record until they are would mean the club keeps the
  -- roster somewhere else.
  official_number text,

  started_on  date,
  -- Retirement rather than deletion. Who officiated in 2025 stays
  -- answerable after somebody stops in 2026.
  retired_on  date,
  notes       text,
  created_at  timestamptz not null default now(),

  unique (club_id, person_id),
  check (retired_on is null or started_on is null or retired_on >= started_on),

  -- The Person belongs to the club the record is held at. Enforced by the
  -- database rather than by the screen, on the key migration 0022 added.
  foreign key (club_id, person_id) references person (club_id, id) on delete cascade
);

-- -------------------------------------------------- referee_classification
-- BR110: a classification is a **history, not a column**.
--
-- The pathway is a progression, and BR8 asks whether somebody was qualified
-- *for a match* — a question about the date the match was played, not about
-- today. Overwriting a level makes every past appointment unauditable, and
-- a promotion mid-season would retrospectively justify a designation that
-- was wrong when it was made.

create table referee_classification (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  person_id   uuid not null references person(id) on delete cascade,

  -- **Free text, deliberately.** Only two levels of the Football Queensland
  -- pathway are recorded anywhere in this repository — MiniRef 5.0 and Club
  -- Based Match Official 4.5 — because the pathway is an external reference
  -- document nobody has catalogued. A check constraint listing the levels
  -- somebody guessed would refuse the real ones, which is worse than no
  -- constraint at all. `fixture.competition` is free text for the same
  -- reason, and becomes a reference when C11 exists.
  level       text not null check (btrim(level) <> ''),

  effective_from date not null,

  -- Where the club saw it, and when they saw it. Same separation as
  -- `clearance.verified_at`: a level somebody stated on a form and a level
  -- the club checked against the register are different claims, and only
  -- the second should carry weight in BR8.
  source      text,
  sighted_at  timestamptz,

  recorded_by uuid,
  created_at  timestamptz not null default now(),

  -- One standing per person per date. A correction replaces the row for
  -- that date rather than adding a second contradictory one.
  unique (club_id, person_id, effective_from),

  foreign key (club_id, person_id) references person (club_id, id) on delete cascade
);

create index referee_classification_current_idx
  on referee_classification (club_id, person_id, effective_from desc);

-- --------------------------------------------------- referee_accreditation
-- Fitness tests, training modules, courses — whatever a classification or a
-- competition requires (BR10).

create table referee_accreditation (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  person_id   uuid not null references person(id) on delete cascade,

  kind        text not null check (btrim(kind) <> ''),
  identifier  text,
  issued_on   date,
  expires_on  date,

  -- Separate from the identifier, for the reason BR19 gives about a
  -- Working with Children Check: null means somebody typed a number and
  -- nobody checked it.
  verified_at timestamptz,

  recorded_by uuid,
  created_at  timestamptz not null default now(),

  check (expires_on is null or issued_on is null or expires_on >= issued_on),

  foreign key (club_id, person_id) references person (club_id, id) on delete cascade
);

create index referee_accreditation_person_idx
  on referee_accreditation (club_id, person_id);

-- ------------------------------------------------------------------ policies
-- **Narrowed on read**, in the pattern `clearance` and `player_profile`
-- established.
--
-- A referee's classification history is a record of somebody's professional
-- standing and, for the MiniRefs the pathway starts with, of a child's. The
-- schema's default — any member of the club reads everything — would hand a
-- treasurer the progression history of every twelve-year-old who blows a
-- whistle on a Sunday. The roles kept are the ones that appoint: admin,
-- registrar, and the coordinator the Referee Coordinator maps to.

alter table referee_profile enable row level security;
alter table referee_classification enable row level security;
alter table referee_accreditation enable row level security;

create policy referee_profile_select on referee_profile
  for select using (app_has_role(club_id, array['admin','registrar','coordinator']));
create policy referee_profile_manage on referee_profile
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));

create policy referee_classification_select on referee_classification
  for select using (app_has_role(club_id, array['admin','registrar','coordinator']));
create policy referee_classification_manage on referee_classification
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));

create policy referee_accreditation_select on referee_accreditation
  for select using (app_has_role(club_id, array['admin','registrar','coordinator']));
create policy referee_accreditation_manage on referee_accreditation
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));

comment on table referee_classification is
  'A match official''s standing on the Football Queensland pathway, held as '
  'a dated history rather than a current value (BR110): BR8 asks what they '
  'were on the day of the match, not what they are today.';

-- ------------------------------------------------------------- the questions
-- Two functions the appointment engine (WP3) will ask, written here because
-- they are properties of the record rather than of the appointment — and
-- because a question answered in one place cannot be answered two ways by
-- two screens.

/**
 * What this official was classified as on a given date, or null.
 *
 * `stable`, not `security definer`: it reads through the caller's own
 * policies deliberately. A function that bypassed them would make a
 * narrowed table readable through a function call, which is the leak the
 * narrowing exists to prevent.
 */
create or replace function app_classification_on(p_person_id uuid, p_as_of date)
returns text
language sql
stable
as $$
  select level
  from referee_classification
  where person_id = p_person_id
    and effective_from <= p_as_of
  order by effective_from desc
  limit 1
$$;

/**
 * Whether every accreditation of a named kind is valid on a date (BR111).
 *
 * **Measured against the fixture, never against today**, the way BR54
 * already measures a Working with Children Check against the end of the
 * season. A certificate expiring in three weeks does not disqualify
 * somebody from Saturday, and one that lapsed last month does not become
 * valid because the coordinator happens to be looking on a Tuesday.
 *
 * An unverified accreditation does not count: `verified_at` null means
 * somebody typed it and nobody checked.
 */
create or replace function app_accreditation_valid_on(
  p_person_id uuid,
  p_kind      text,
  p_as_of     date
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from referee_accreditation
    where person_id = p_person_id
      and kind = p_kind
      and verified_at is not null
      and (issued_on is null or issued_on <= p_as_of)
      and (expires_on is null or expires_on >= p_as_of)
  )
$$;

revoke all on function app_classification_on(uuid, date) from public;
revoke all on function app_accreditation_valid_on(uuid, text, date) from public;
grant execute on function app_classification_on(uuid, date) to authenticated;
grant execute on function app_accreditation_valid_on(uuid, text, date) to authenticated;
