-- 0055 — A MiniRef's guardian confirms the match (scope 66, BR151).
--
-- A registrar reported a real gap while looking at the referee workspace:
-- nothing anywhere lets a match official under thirteen — the youngest half
-- of the Football Queensland pathway, MiniRefs — or the guardian who
-- answers everything else on their behalf (BR113) say that a fixture they
-- were appointed to actually happened. `/registrar/verification` (BR119)
-- exists, but it is deliberately the **club officer's** act, kept apart
-- from the appointed official for the same separation of duties a
-- coordinator refereeing their own match would otherwise let them skip.
-- That separation is about who unlocks a payment claim, not about whether
-- a twelve-year-old's Saturday actually went ahead — a different question,
-- asked of a different person, and this is that question.
--
-- **Not the same shape as BR113's designation answer, on purpose.** BR113
-- lets a guardian answer for any official under 18; this exists only under
-- thirteen. A referee of thirteen to seventeen gets neither a self-report
-- nor a guardian confirmation yet — no such capability exists for any
-- referee of any age today, adult included, and building the adult half of
-- that is a different, larger piece of work than the one this closes.
--
-- **Informational, not evidentiary.** No club rule turns on this row: it
-- does not feed BR119's payment verification, does not touch
-- `fixture.goals_for`/`goals_against` (the club's own score of record,
-- written by a coordinator), and unlocks nothing. A guardian's own
-- recollection of the score is kept separate, for statistics only, so it
-- can never silently overwrite what the club recorded.

create table referee_match_confirmation (
  id                     uuid primary key default gen_random_uuid(),
  club_id                uuid not null references club(id),
  fixture_id             uuid not null references fixture(id),
  -- The match official (BR151's "referee under thirteen") — appointed
  -- because a confirmation should be about a match they were actually on,
  -- not any fixture a guardian happens to pick.
  person_id              uuid not null references person(id),
  confirmed_by_person_id uuid not null references person(id),
  confirmed_at           timestamptz not null default now(),

  -- Statistics only (the guardian's own recollection, not the club's
  -- record) — both null, or both present, or either alone; a guardian who
  -- remembers the scoreline but not which end scored first is not asked to
  -- guess the rest.
  home_score             integer check (home_score is null or home_score >= 0),
  away_score             integer check (away_score is null or away_score >= 0),

  unique (fixture_id, person_id)
);

alter table referee_match_confirmation
  add constraint referee_match_confirmation_person_is_at_this_club
    foreign key (club_id, person_id) references person (club_id, id),
  add constraint referee_match_confirmation_confirmer_is_at_this_club
    foreign key (club_id, confirmed_by_person_id) references person (club_id, id);

create index referee_match_confirmation_fixture_idx
  on referee_match_confirmation (club_id, fixture_id);

comment on table referee_match_confirmation is
  'BR151. A guardian confirming a match their under-13 official officiated '
  'actually happened and their child was there. Informational only -- '
  'never feeds BR119''s payment verification, and the optional score is '
  'the guardian''s own recollection, kept apart from fixture.goals_for/'
  'goals_against, the club''s own record.';

-- --------------------------------------------------------------- the guard
-- The official's age **on the day of the fixture**, not today: the
-- question is whether they were a MiniRef for *that match*, the same line
-- BR8, BR10 and BR84 already draw for a classification or a card. This is
-- deliberately not BR113's "measured now" rule (0045's own comment
-- explains why that one differs) — there is no decision being made here
-- that authority could shift under; it is a fact about a Saturday that
-- already happened.

create or replace function assert_match_confirmed_by_a_minirefs_guardian()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_played_on date;
  v_dob       date;
begin
  select played_on into v_played_on from fixture where id = new.fixture_id and club_id = new.club_id;
  select date_of_birth into v_dob from person where id = new.person_id and club_id = new.club_id;

  if v_played_on is null or v_dob is null then
    raise exception 'cannot confirm a match without a known fixture date and date of birth'
      using errcode = '23514';
  end if;

  if extract(year from age(v_played_on, v_dob))::integer >= 13 then
    raise exception
      'this confirmation is for a match official under thirteen on the day of the fixture (BR151) -- '
      'no self-report or guardian confirmation exists yet for an older official'
      using errcode = '23514';
  end if;

  if not exists (
    select 1 from guardianship
     where club_id = new.club_id
       and person_id = new.person_id
       and guardian_person_id = new.confirmed_by_person_id
       and is_authority
  ) then
    raise exception
      'that person does not hold authority for this match official (BR151)'
      using errcode = '23514';
  end if;

  new.confirmed_at := coalesce(new.confirmed_at, now());
  return new;
end;
$$;

create trigger match_confirmed_by_a_minirefs_guardian
  before insert or update on referee_match_confirmation
  for each row execute function assert_match_confirmed_by_a_minirefs_guardian();

-- ----------------------------------------------------------------- the RLS
alter table referee_match_confirmation enable row level security;

create policy referee_match_confirmation_select_officers on referee_match_confirmation
  for select using (app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'coach']));

create policy referee_match_confirmation_select_family on referee_match_confirmation
  for select using (person_id in (select app_my_family_person_ids(club_id)));

-- Officers keep the ordinary escape hatch every table like this has —
-- correcting a mistyped score, or recording one that came in by phone.
create policy referee_match_confirmation_manage_officers on referee_match_confirmation
  for all using (app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'coach']))
  with check (app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'coach']));

-- The guardian may confirm, once — no update policy for the family side.
-- A wrong score is low-stakes enough that a correction goes through the
-- club, the same way a typo in anything else club officers keep does.
create policy referee_match_confirmation_confirm_family on referee_match_confirmation
  for insert with check (
    person_id in (select app_my_family_person_ids(club_id))
    and confirmed_by_person_id in (select app_my_person_ids())
  );
