-- 0025 — Designating an official, and the conflicts that refuse it
-- (scope 33, WP3).
--
-- BR6 to BR11 have been written since the first bootstrap and have never
-- been evaluated, because nothing recorded that anybody was appointed to
-- anything. This is the table that makes them real, and the triggers that
-- make the blocking half of them true rather than merely displayed.
--
-- **Which rules live in the database, and why.**
--
-- The engine in `src/domain/officiating/` computes every conflict for the
-- screen, so a coordinator is never offered somebody the platform will
-- refuse. That is where BR8's competency and BR11's four warnings belong:
-- they are judgment presented to a human.
--
-- Three are here instead, in triggers, because their failure mode is not a
-- tidy screen — it is a person on a pitch who should not be there, and
-- there will be more than one surface that appoints:
--
--   BR6    a referee is a player in this match
--   BR9    the referee is suspended on the day
--   BR109  the referee holds another role in this fixture
--
-- BR83 set this precedent for team officials: enforced in the database, not
-- in the screen, because the screen is not the last thing that will ever
-- write these tables.

-- The key the appointment's composite foreign key needs, so a fixture at
-- another club cannot be appointed into. Migration 0022 added the same to
-- `person` for the same reason.
alter table fixture add constraint fixture_club_id_key unique (club_id, id);

-- ------------------------------------------------------- referee_suspension
-- BR9. A suspension is a period, not a flag: "was this person suspended on
-- the day of that match" has to stay answerable after it ends, because an
-- appointment made during one is a fact somebody will ask about later.

create table referee_suspension (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  person_id  uuid not null references person(id) on delete cascade,

  starts_on  date not null,
  -- Null is an indefinite suspension — pending a hearing, most often. It
  -- is a real state and not a missing end date.
  ends_on    date,
  reason     text,

  recorded_by uuid,
  created_at  timestamptz not null default now(),

  check (ends_on is null or ends_on >= starts_on),
  foreign key (club_id, person_id) references person (club_id, id) on delete cascade
);

create index referee_suspension_person_idx
  on referee_suspension (club_id, person_id, starts_on);

alter table referee_suspension enable row level security;

-- Narrower than the rest of the referee record: a disciplinary history is
-- not something a coordinator needs to read to fill a match sheet — they
-- need the *answer*, which the trigger gives them by refusing.
create policy referee_suspension_select on referee_suspension
  for select using (app_has_role(club_id, array['admin','registrar']));
create policy referee_suspension_manage on referee_suspension
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- ------------------------------------------- match_official_appointment
create table match_official_appointment (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  fixture_id  uuid not null references fixture(id) on delete cascade,
  person_id   uuid not null references person(id) on delete cascade,

  role        text not null default 'referee'
    check (role in ('referee','assistant_referee','fourth_official')),

  state       text not null default 'proposed'
    check (state in ('proposed','accepted','declined','withdrawn')),

  -- BR114, from the club's own answer (September 2026): the club appoints,
  -- Football Queensland appoints for senior grades, and where FQ cannot
  -- fill a senior fixture the club appoints a backup. **Stored, never
  -- derived from the grade** — the backup case makes the same fixture
  -- payable by a different party depending on who ended up filling it, and
  -- deriving it would be right most weekends and wrong exactly on the one
  -- somebody remembers.
  appointed_by text not null default 'club'
    check (appointed_by in ('club','association')),

  -- BR42 and BR112: a decline or a withdrawal carries its reason, and
  -- **is not recorded at all without one**. A decline rate computed over
  -- reasonless declines measures availability and lateness together, then
  -- penalises the referee for the difference.
  reason      text,

  proposed_at  timestamptz not null default now(),
  proposed_by  uuid,
  responded_at timestamptz,

  -- One appointment per person per fixture. A person is not two officials
  -- at one game.
  unique (club_id, fixture_id, person_id),

  check (state not in ('declined','withdrawn')
         or btrim(coalesce(reason, '')) <> ''),

  foreign key (club_id, person_id)  references person  (club_id, id) on delete cascade,
  foreign key (club_id, fixture_id) references fixture (club_id, id) on delete cascade
);

create index match_official_appointment_fixture_idx
  on match_official_appointment (club_id, fixture_id);
create index match_official_appointment_person_idx
  on match_official_appointment (club_id, person_id);

alter table match_official_appointment enable row level security;

create policy match_official_appointment_select on match_official_appointment
  for select using (app_has_role(club_id, array['admin','registrar','coordinator']));
create policy match_official_appointment_manage on match_official_appointment
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));

-- --------------------------------------------------------------- the guard
/**
 * The three refusals that must not depend on a screen.
 *
 * BR109 is enforced **within the club only**, and that is a known gap
 * rather than an oversight. The rule says the check is made against the one
 * `Person` across every club — the parent who referees the junior grades at
 * one club and coaches at another — but `person` is tenant-scoped, so those
 * are two rows and the platform cannot know they are one human. Scope 33's
 * open question #69 records it. The half that can be enforced is, and the
 * half that cannot is not claimed: a safeguarding-shaped rule documented
 * and unchecked is exactly the BR56 failure.
 */
create or replace function assert_appointment_is_permitted()
returns trigger
language plpgsql
as $$
declare
  v_played_on date;
  v_kick_off  time;
  v_team_id   uuid;
begin
  select played_on, kick_off, team_id
    into v_played_on, v_kick_off, v_team_id
  from fixture where id = new.fixture_id;

  -- BR6 — a referee cannot officiate a match they played in. The one
  -- conflict nobody would attempt, and the cheapest to be certain of.
  if exists (select 1 from appearance
             where fixture_id = new.fixture_id and person_id = new.person_id) then
    raise exception 'That person played in this fixture (BR6).'
      using errcode = '23514';
  end if;

  -- BR109 — any other role in the same fixture. The one that actually
  -- happens: the parent who referees the junior grades and coaches a side
  -- in them, or whose child is on the field.
  if v_team_id is not null and exists (
       select 1 from team_member
       where team_id = v_team_id and person_id = new.person_id) then
    raise exception 'That person is a member of a team in this fixture (BR109).'
      using errcode = '23514';
  end if;

  if exists (
       select 1
       from appearance a
       join guardianship g on g.person_id = a.person_id
       where a.fixture_id = new.fixture_id
         and g.guardian_person_id = new.person_id) then
    raise exception 'That person is the guardian of a player in this fixture (BR109).'
      using errcode = '23514';
  end if;

  -- BR9 — suspended on the day of the match, not on the day of the
  -- appointment. An indefinite suspension (no end date) covers everything
  -- from its start.
  if exists (
       select 1 from referee_suspension s
       where s.person_id = new.person_id
         and s.starts_on <= v_played_on
         and (s.ends_on is null or s.ends_on >= v_played_on)) then
    raise exception 'That person is suspended on the date of this fixture (BR9).'
      using errcode = '23514';
  end if;

  -- BR7 — two simultaneous designations. Same day *and* same kick-off:
  -- officiating two games in a day is ordinary, being in two places at once
  -- is not. A fixture with no kick-off recorded cannot be compared, so it
  -- is left to the coordinator rather than guessed at.
  if v_kick_off is not null and new.state in ('proposed','accepted') and exists (
       select 1
       from match_official_appointment m
       join fixture f on f.id = m.fixture_id
       where m.person_id = new.person_id
         and m.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
         and m.state in ('proposed','accepted')
         and f.played_on = v_played_on
         and f.kick_off  = v_kick_off) then
    raise exception 'That person already has a designation at that time (BR7).'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Fires on update as well as insert: promoting a proposal to accepted is
-- the obvious way round a check that only guarded insertion, and BR83's
-- trigger learned the same lesson about a player row becoming a coach row.
create trigger appointment_is_permitted
before insert or update on match_official_appointment
for each row execute function assert_appointment_is_permitted();

comment on table match_official_appointment is
  'A designation of a match official to a fixture the club records (BR20 as '
  'restated by scope 33). `appointed_by` is stored rather than derived from '
  'the grade (BR114), because the club-backup case makes the same fixture '
  'payable by a different party depending on who filled it.';
