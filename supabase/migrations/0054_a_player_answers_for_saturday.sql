-- 0054 — A player answers for Saturday (scope 65, BR62/BR63).
--
-- BR62 has been written since the business layer was drafted and has never
-- had a table: "a Player or match official responds to a fixture or
-- appointment as available or not available... the reason is recorded and
-- visible to the responsible coach, technical director, or coordinator only
-- — never to other participants." Both `PlayerWorkspace` and `CoachWorkspace`
-- have carried a `ComingSoon` panel naming exactly this gap since scope 32.
--
-- **The shape is 0045's, reused rather than invented.** BR113 already
-- answered the harder version of this question — who may answer *for* an
-- under-18 — and its own comment names this rule as one of the places that
-- routing was owed: "a participation response already is the guardian's
-- (0028)." `app_may_answer_designation` is generic despite its name (it
-- reads only `guardianship` and `app_is_adult_on`, never
-- `match_official_appointment`), so it is called here directly rather than
-- copied.
--
-- **One row per (fixture, person), not two tables.** 0024's
-- `referee_availability`/`referee_unavailability` split exists because a
-- *season* default of "available" is an assumption the club makes on a
-- referee's behalf, and only an explicit "no" overrides it. A fixture
-- response has no such default — "available" is exactly as much a fact as
-- "not available", and the absence of a row is simply "has not answered
-- yet". One table with a status column says that correctly.
--
-- **`responded_by_person_id` is required even for an adult**, where 0045
-- left it optional. BR62's own object definition names "who gave it" as
-- part of what a Participation Response *is* — unlike BR113, which only
-- started recording a responder the day it needed to name one who was not
-- the official themselves.

create table participation_response (
  id                      uuid primary key default gen_random_uuid(),
  club_id                 uuid not null references club(id),
  fixture_id              uuid not null references fixture(id),
  person_id               uuid not null references person(id),
  status                  text not null check (status in ('available', 'not_available')),
  -- BR62: a negative needs a reason; a positive carries none to write.
  reason                  text,
  responded_by_person_id  uuid not null references person(id),
  responded_at            timestamptz not null default now(),

  constraint participation_response_reason_on_decline
    check (status = 'available' or (reason is not null and btrim(reason) <> '')),

  -- One answer per player per fixture — a second submission changes it,
  -- rather than accumulating a history nobody reads.
  unique (fixture_id, person_id)
);

alter table participation_response
  add constraint participation_response_person_is_at_this_club
    foreign key (club_id, person_id) references person (club_id, id),
  add constraint participation_response_responder_is_at_this_club
    foreign key (club_id, responded_by_person_id) references person (club_id, id);

create index participation_response_fixture_idx on participation_response (club_id, fixture_id);

comment on table participation_response is
  'BR62/BR63. A Player''s available/not-available answer to a fixture, with '
  'who actually gave it — the Player themselves once adult, otherwise the '
  'Parent/Guardian holding authority (BR113''s shape, reused).';

-- --------------------------------------------------------------- the guard
-- Mirrors 0045's `assert_designation_is_answered_by_its_adult`: who may
-- answer is `app_may_answer_designation`'s question regardless of which
-- table is asking it.

create or replace function assert_participation_is_answered_by_its_family()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from app_may_answer_designation(new.person_id, new.club_id, current_date)
  ) then
    raise exception
      'no Parent/Guardian holding authority is recorded for this under-18 player, '
      'so there is nobody who can answer for Saturday (BR62/BR63)'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
      from app_may_answer_designation(new.person_id, new.club_id, current_date) a
     where a = new.responded_by_person_id
  ) then
    raise exception
      'that person does not hold authority to answer for this player (BR62/BR63)'
      using errcode = '23514';
  end if;

  new.responded_at := coalesce(new.responded_at, now());
  return new;
end;
$$;

create trigger participation_is_answered_by_its_family
  before insert or update on participation_response
  for each row execute function assert_participation_is_answered_by_its_family();

-- A family may only change the answer, the same restriction 0045 puts on
-- answering a designation — not which fixture or which player it is about.
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
     or new.person_id is distinct from old.person_id then
    raise exception
      'answering for Saturday changes the answer and nothing else (BR62)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger participation_family_only_answers
  before update on participation_response
  for each row execute function assert_a_family_only_answers_participation();

-- ----------------------------------------------------------------- the RLS
-- BR62: "visible to the responsible coach, technical director, or
-- coordinator only — never to other participants." A player and a guardian
-- deliberately hold no club_membership row (decision 11), so
-- `app_has_role` already excludes every other participant on its own —
-- this is the same shape 0045 uses for `match_official_appointment`.

alter table participation_response enable row level security;

create policy participation_response_select_officers on participation_response
  for select using (app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'coach']));

create policy participation_response_select_family on participation_response
  for select using (person_id in (select app_my_family_person_ids(club_id)));

-- Officers may record an answer that came in by phone — the same latitude
-- `appearance_manage`/`fixture_manage` already give this role set elsewhere.
create policy participation_response_manage_officers on participation_response
  for all using (app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'coach']))
  with check (app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'coach']));

create policy participation_response_answer_family on participation_response
  for insert with check (
    person_id in (select app_my_family_person_ids(club_id))
    -- The answer is the answerer's own; a guardian cannot record somebody
    -- else's as if it were theirs.
    and responded_by_person_id in (select app_my_person_ids())
  );

create policy participation_response_update_family on participation_response
  for update using (person_id in (select app_my_family_person_ids(club_id)))
  with check (
    person_id in (select app_my_family_person_ids(club_id))
    and responded_by_person_id in (select app_my_person_ids())
  );
