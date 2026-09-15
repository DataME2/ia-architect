-- 0045 — A child does not answer for themselves (scope 51).
--
-- BR113 has been written since the business layer was drafted and has never
-- had code: *a designation for a match official under 18 is proposed to
-- their Parent/Guardian, who accepts or declines it.* Until now a
-- twelve-year-old's appointment went straight to `accepted` with no adult
-- named and none asked, and nothing in the row recorded whose answer it
-- was. `supabase/tests/46` proved it before this migration was written.
--
-- It is the twin of the exemption 0044 built around. BR84 rightly asks no
-- Working with Children Check of a child — MiniRefs are twelve — and the
-- product then appointed that child to a fixture without asking the adult
-- responsible for them. The card rule and the consent rule point in
-- opposite directions for the same person, and only one of them was coded.
--
-- **The shape is BR33's and BR63's, reused rather than invented.** A minor
-- referee's calendar feed already belongs to their guardian (0035) and a
-- participation response already is the guardian's (0028). This is the same
-- routing at the third place it was owed.
--
-- **Whose answer it is, is a column.** The alternative is a screen that
-- shows the question to the right person, and 0025 gives the reason to
-- reject it: there will be more than one way this row gets written. A
-- record of a decision that does not say who made it is not a record of
-- consent, and safeguarding is exactly where that matters.
--
-- **Measured at the moment the answer is given, not at the fixture.** This
-- is the opposite of BR111's and 0044's line, and deliberately: a card is
-- valid on a day, so it is checked against that day, whereas authority is
-- about who may decide *now*. Someone who is seventeen today cannot consent
-- today because they turn eighteen before the match — and once they have
-- turned eighteen, they answer for themselves without anybody rewriting the
-- row.
--
-- **Adults are untouched.** BR113 is a rule about children, and a rule
-- about children that quietly changed how adults are appointed would be a
-- different rule. An adult official's appointment still needs no responder
-- named; that gap is BR65's, not this one's.

-- ------------------------------------------------------- app_is_adult_on
-- The age arithmetic, once, so that two rules cannot come to disagree about
-- when somebody turned eighteen.
--
-- It returns **null** for a person whose date of birth is not known, rather
-- than guessing, because the two callers need opposite safe defaults from
-- the same fact: BR84 fails closed to *they need a card*, and BR113 fails
-- closed to *ask an adult*. A shared helper that picked one would be wrong
-- for the other, and it would be wrong on the safeguarding side. So each
-- caller states its own default, in one visible place.

create or replace function app_is_adult_on(p_person_id uuid, p_as_of date)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select p.date_of_birth <= (p_as_of - interval '18 years')
    from person p where p.id = p_person_id
$$;

comment on function app_is_adult_on(uuid, date) is
  'Whether this person had turned eighteen on a date. Null when the person '
  'or their date of birth is unknown: BR84 and BR113 need opposite safe '
  'defaults from that, so each caller applies its own.';

-- 0011's function, restated in terms of it. **Its behaviour is unchanged** —
-- an unknown person still needs a clearance — but the arithmetic now lives
-- in one place instead of two.
create or replace function app_needs_clearance(p_person_id uuid, p_as_of date)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(app_is_adult_on(p_person_id, p_as_of), true)
$$;

-- --------------------------------------------- app_may_answer_designation
-- Who may accept or decline this person's designation: themselves if they
-- are an adult, and otherwise every Parent/Guardian holding authority.
--
-- One definition, two callers — the trigger below refuses anybody else, and
-- the screen names the adult the question is going to. A second definition
-- would drift, and it would drift over which adult may consent for a child.
--
-- `is_authority`, not `is_contact`. BR67 keeps the two flags apart for this
-- moment: the grandparent the club rings when nobody answers is not the
-- person who may commit the child to a Sunday morning.

create or replace function app_may_answer_designation(
  p_person_id uuid, p_club_id uuid, p_as_of date)
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

revoke all on function app_may_answer_designation(uuid, uuid, date) from public;
grant execute on function app_may_answer_designation(uuid, uuid, date) to authenticated;

comment on function app_may_answer_designation(uuid, uuid, date) is
  'BR113. The people who may accept or decline a designation: the official '
  'themselves once they are eighteen, and until then every Parent/Guardian '
  'holding authority (BR67''s is_authority, not is_contact).';

-- --------------------------------------------------------- the column
-- Nullable, and deliberately: an adult official answers without anybody
-- recording who they are, which is how every appointment made before this
-- migration was written. Backfilling a responder onto those rows would be
-- inventing a consent nobody gave.

alter table match_official_appointment
  add column responded_by_person_id uuid references person(id),
  add constraint match_official_appointment_responder_is_at_this_club
    foreign key (club_id, responded_by_person_id) references person (club_id, id);

comment on column match_official_appointment.responded_by_person_id is
  'BR113. Whose answer this is. Required for an official under 18, where it '
  'must name a Parent/Guardian holding authority; optional for an adult, '
  'who answers for themselves.';

-- --------------------------------------------------------- the guard
create or replace function assert_designation_is_answered_by_its_adult()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_adult boolean;
begin
  -- A withdrawal is **not a response**. Nobody is being asked: the club is
  -- removing an official, and BR50's nightly sweep writes exactly this row.
  -- It must not be blocked by a guardianship that has since been removed —
  -- 0044 learned the same lesson one trigger along.
  if new.state = 'withdrawn' then
    return new;
  end if;

  v_is_adult := coalesce(app_is_adult_on(new.person_id, current_date), false);
  if v_is_adult then
    return new;
  end if;

  -- A proposal nobody can answer is not a proposal. Refusing the
  -- designation is kinder than creating one that can never leave
  -- `proposed`, and it tells a coordinator the thing they can act on:
  -- the guardianship record is missing.
  if not exists (
    select 1 from app_may_answer_designation(new.person_id, new.club_id, current_date)
  ) then
    raise exception
      'no Parent/Guardian holding authority is recorded for this under-18 official, '
      'so there is nobody to propose the designation to (BR113)'
      using errcode = '23514';
  end if;

  if new.state in ('accepted', 'declined') then
    if new.responded_by_person_id is null then
      raise exception
        'an under-18 official''s designation is answered by their Parent/Guardian -- '
        'record who answered it (BR113)'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
        from app_may_answer_designation(new.person_id, new.club_id, current_date) a
       where a = new.responded_by_person_id
    ) then
      raise exception
        'that person does not hold authority for this under-18 official, so their '
        'answer is not the one BR113 asks for'
        using errcode = '23514';
    end if;

    -- An acceptance nobody can date is not evidence that anybody was asked.
    new.responded_at := coalesce(new.responded_at, now());
  end if;

  return new;
end;
$$;

create trigger designation_is_answered_by_its_adult
  before insert or update on match_official_appointment
  for each row execute function assert_designation_is_answered_by_its_adult();

-- ------------------------------------------- the family reads and answers
-- BR113 puts a question to the guardian, and a question she cannot read has
-- not been put to her. These sit **beside** the officer policies rather than
-- instead of them: permissive policies combine with `or`, so admitting a
-- family to their own row can never narrow what a coordinator already sees
-- (0028's shape, reused in 0043 and again here).
--
-- `app_my_family_person_ids` already means *me and the children I hold
-- authority over*, which is precisely the set BR113 describes. The adult
-- official reached by its first half is a deliberate second gain: the
-- referee workspace has said "not yet visible to you" since C4, and BR65
-- was always owed it.

create policy match_official_appointment_select_family on match_official_appointment
  for select using (person_id in (select app_my_family_person_ids(club_id)));

create policy match_official_appointment_answer on match_official_appointment
  for update using (person_id in (select app_my_family_person_ids(club_id)))
  with check (
    person_id in (select app_my_family_person_ids(club_id))
    and state in ('accepted', 'declined')
    -- The answer is the answerer's own. A guardian cannot record somebody
    -- else's consent, which is what makes the column evidence.
    and responded_by_person_id in (select app_my_person_ids())
  );

-- A `with check` can say what the new row must look like; it cannot say
-- which columns were allowed to change. Answering is all a family may do
-- here — not re-role themselves onto a different match, and not rewrite who
-- appointed them, which decides who pays (BR114).
create or replace function assert_a_family_only_answers()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if app_has_role(new.club_id, array['admin', 'registrar', 'coordinator']) then
    return new;
  end if;

  if new.fixture_id   is distinct from old.fixture_id
     or new.person_id is distinct from old.person_id
     or new.role      is distinct from old.role
     or new.appointed_by is distinct from old.appointed_by
     or new.proposed_by  is distinct from old.proposed_by then
    raise exception
      'answering a designation changes the answer and nothing else (BR113)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger designation_family_only_answers
  before update on match_official_appointment
  for each row execute function assert_a_family_only_answers();

-- ------------------------------- the guards stop depending on who is writing
-- **Found by suite 46, not reasoned about in advance.** The moment a
-- guardian could update this table, a rule that had been enforced for six
-- migrations stopped being enforced — silently, and in the direction that
-- lets somebody onto a pitch.
--
-- Both existing triggers read other tables with the **writer's** visibility.
-- 0044's card check reads `fixture` to find the date; 0025's three refusals
-- read `appearance`, `team_member`, `guardianship` and `referee_suspension`.
-- Every one of those is club-officer information, so under a guardian's
-- session they return nothing at all:
--
--   * the fixture's date comes back null, so the clearance comparison is
--     null, and the card check either refuses a child it should exempt (how
--     this was found) or, with the coalesce the other way, waves through an
--     adult with no card;
--   * `appearance` comes back empty, so BR6 — the referee played in this
--     match — quietly passes;
--   * `team_member` and the guardian join come back empty, so BR109 passes;
--   * `referee_suspension` is admin-and-registrar only by 0025's own
--     deliberate choice, so BR9 passes for **every** caller who is not one.
--
-- A safeguarding rule whose answer depends on who is asking is not a rule.
-- These are the same function bodies, marked `security definer` so they
-- answer the same question for a coordinator, a guardian, and a scheduled
-- job. The bodies are untouched: this migration is not the place to change
-- what BR6, BR9 and BR109 mean, only to stop them being optional.

create or replace function assert_official_holds_a_card()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_played_on date;
  v_expires   date;
begin
  if new.state in ('declined', 'withdrawn') then
    return new;
  end if;

  select played_on into v_played_on from fixture where id = new.fixture_id;

  if not app_needs_clearance(new.person_id, v_played_on) then
    return new;
  end if;

  v_expires := app_clearance_covers(new.person_id, new.club_id);

  if v_expires is null then
    raise exception
      'no verified Working with Children Check for this official -- no card, no match (BR19/BR84)'
      using errcode = '23514';
  end if;

  if v_expires < v_played_on then
    raise exception
      'their clearance expires %, before this fixture on % (BR84/BR111)', v_expires, v_played_on
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function assert_appointment_is_permitted()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_played_on date;
  v_kick_off  time;
  v_team_id   uuid;
begin
  select played_on, kick_off, team_id
    into v_played_on, v_kick_off, v_team_id
  from fixture where id = new.fixture_id;

  -- BR6 — a referee cannot officiate a match they played in.
  if exists (select 1 from appearance
             where fixture_id = new.fixture_id and person_id = new.person_id) then
    raise exception 'That person played in this fixture (BR6).'
      using errcode = '23514';
  end if;

  -- BR109 — any other role in the same fixture, within this club. The
  -- cross-club half remains unenforceable while `person` is tenant-scoped;
  -- scope 33's open question #69 still records it.
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

  -- BR9 — suspended on the date of the match, not of the appointment.
  if exists (
       select 1 from referee_suspension s
       where s.person_id = new.person_id
         and s.starts_on <= v_played_on
         and (s.ends_on is null or s.ends_on >= v_played_on)) then
    raise exception 'That person is suspended on the date of this fixture (BR9).'
      using errcode = '23514';
  end if;

  -- BR7 — two simultaneous designations.
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
