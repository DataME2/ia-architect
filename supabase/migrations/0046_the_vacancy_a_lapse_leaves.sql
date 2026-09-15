-- 0046 — The vacancy a lapse leaves (scope 52).
--
-- BR50's last clause, left open as WP6 of scope 50:
--
--   > ...blocks new ones, and **notifies both the holder and the responsible
--   > coordinator** that the resulting vacancies need re-filling.
--
-- The withdrawal itself has worked since 0044. What has not existed is any
-- record that a withdrawal *happened for this reason* — so nobody could be
-- told about it, and a coordinator found out by looking at the match sheet.
--
-- **A vacancy is a row, not a reason string.** The tempting alternative is
-- to select withdrawn assignments whose `reason` matches the sentence the
-- sweep writes. That makes an English sentence load-bearing: the day
-- somebody improves the wording, the notifications stop, silently, and
-- nothing fails. It also cannot tell a lapse from a coordinator who typed
-- the same words.
--
-- **Idempotence is in the schema, not in the caller.** `unique
-- (appointment_id)` and `unique (team_member_id)` mean the sweep can run
-- every night, and the revocation trigger can fire in the middle of it,
-- without anybody being told twice about one vacancy. 0044's comment
-- promised that a second pass must not re-notify; this is what makes the
-- promise structural rather than a property of the code that happens to
-- call it.
--
-- **The holder and the coordinator are marked separately.** They are two
-- messages to two people, either of which can fail on its own — one
-- suppressed subscriber (BR129) must not suppress the other's notice, and a
-- club with no coordinator recorded must still tell the official they have
-- been withdrawn.
--
-- **Nothing here sends.** The database records that a notice is owed; the
-- nightly route composes and sends it through the same suppression-honouring
-- path every other message takes (BR127–BR129). A trigger that sent email
-- would be a trigger that can fail a transaction because a provider is slow.

create table clearance_lapse_vacancy (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  -- The holder whose card lapsed. Never a child: BR84 asks no card of an
  -- under-18, so `app_withdraw_lapsed_clearances` never withdraws one and
  -- no vacancy here is ever a child's.
  person_id  uuid not null references person(id) on delete cascade,

  kind       text not null check (kind in ('appointment', 'team_role')),
  appointment_id uuid references match_official_appointment(id) on delete cascade,
  team_member_id uuid references team_member(id) on delete cascade,

  -- What was lost, in words, captured **at the time**. A vacancy read six
  -- weeks later must still say "Referee — Rivals, 15 October" even if the
  -- fixture has since been renamed or the team dissolved, because the
  -- notice it justifies said that.
  describes  text not null,
  -- The date the vacancy bites: the fixture's day, or the season's end for
  -- a team role. Soonest first is the only useful order.
  occurs_on  date,

  created_at timestamptz not null default now(),

  holder_notified_at      timestamptz,
  coordinator_notified_at timestamptz,

  check ((kind = 'appointment') = (appointment_id is not null)),
  check ((kind = 'team_role')   = (team_member_id is not null)),

  -- One vacancy per assignment, ever. See the header: this is where the
  -- "never notify twice" guarantee actually lives.
  unique (appointment_id),
  unique (team_member_id),

  foreign key (club_id, person_id) references person (club_id, id) on delete cascade
);

create index clearance_lapse_vacancy_pending_idx
  on clearance_lapse_vacancy (club_id, occurs_on)
  where holder_notified_at is null or coordinator_notified_at is null;

alter table clearance_lapse_vacancy enable row level security;

-- The roles that fill a vacancy are the roles that read it. Narrower than
-- the assignment tables on purpose: a vacancy names a person whose card has
-- lapsed, which is closer to `clearance` than to a match sheet.
create policy clearance_lapse_vacancy_select on clearance_lapse_vacancy
  for select using (app_has_role(club_id, array['admin', 'registrar', 'coordinator']));

-- **No insert or update policy at all.** Rows are written by
-- `app_withdraw_lapsed_clearances`, which is `security definer`, and marked
-- by the scheduled job under the service role. A club officer cannot
-- fabricate a vacancy, and cannot silence one by marking it notified.

comment on table clearance_lapse_vacancy is
  'BR50. An assignment a lapsed Working with Children Check emptied, and '
  'whether the holder and the coordinator have been told. Written only by '
  'app_withdraw_lapsed_clearances; unique per assignment, so nobody is '
  'notified twice about one vacancy.';

-- ------------------------------------ the sweep now records what it emptied
-- Same rule, same two updates, same idempotence — with the `returning` each
-- of them was already discarding put to use.

create or replace function app_withdraw_lapsed_clearances(p_club_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_withdrawn integer := 0;
  v_teams     integer := 0;
begin
  with lapsed as (
    update match_official_appointment a
       set state  = 'withdrawn',
           reason = 'Working with Children Check not valid on the day of this fixture (BR50).'
      from fixture f
     where f.id = a.fixture_id
       and a.club_id = p_club_id
       and a.state in ('proposed', 'accepted')
       -- **Future only.** BR50 is explicit that the past is historical
       -- record; a card that lapses in August does not rewrite who
       -- refereed in June.
       and f.played_on >= current_date
       and app_needs_clearance(a.person_id, f.played_on)
       and coalesce(app_clearance_covers(a.person_id, a.club_id), date '0001-01-01') < f.played_on
    returning a.id, a.person_id, a.role, f.opponent, f.played_on
  ), recorded as (
    insert into clearance_lapse_vacancy
      (club_id, person_id, kind, appointment_id, describes, occurs_on)
    select p_club_id, l.person_id, 'appointment', l.id,
           initcap(replace(l.role, '_', ' ')) || ' — ' || l.opponent || ', ' || to_char(l.played_on, 'FMDD Month YYYY'),
           l.played_on
      from lapsed l
    -- A re-appointment that lapses again is the same vacancy to the same
    -- people. They were told once; telling them again is noise.
    on conflict (appointment_id) do nothing
    returning 1
  )
  select count(*) into v_withdrawn from lapsed;

  with lapsed_team as (
    update team_member m
       set withdrawn_at     = now(),
           withdrawn_reason = 'Working with Children Check lapsed (BR50).'
      from team t join season s on s.id = t.season_id
     where t.id = m.team_id
       and m.club_id = p_club_id
       and m.role <> 'player'
       and m.withdrawn_at is null
       and s.ends_on >= current_date
       and app_needs_clearance(m.person_id, s.ends_on)
       and coalesce(app_clearance_covers(m.person_id, m.club_id), date '0001-01-01') < s.ends_on
    returning m.id, m.person_id, m.role, t.name as team_name, s.ends_on
  ), recorded_team as (
    insert into clearance_lapse_vacancy
      (club_id, person_id, kind, team_member_id, describes, occurs_on)
    select p_club_id, l.person_id, 'team_role', l.id,
           initcap(replace(l.role, '_', ' ')) || ' — ' || l.team_name,
           l.ends_on
      from lapsed_team l
    on conflict (team_member_id) do nothing
    returning 1
  )
  select count(*) into v_teams from lapsed_team;

  return v_withdrawn + v_teams;
end;
$$;

revoke all on function app_withdraw_lapsed_clearances(uuid) from public;
grant execute on function app_withdraw_lapsed_clearances(uuid) to authenticated;

comment on function app_withdraw_lapsed_clearances(uuid) is
  'BR50. Withdraws the holder of a lapsed Working with Children Check from '
  'every future assignment, leaving past ones as historical record, and '
  'records each emptied assignment as a vacancy somebody is owed a notice '
  'about. Idempotent twice over: the updates find nothing on a second pass, '
  'and the vacancy table is unique per assignment.';

-- ------------------------- removing somebody is never the moment to refuse
-- **Found while writing suite 47.** 0025's guard fires on update as well as
-- insert — rightly, because promoting a proposal to accepted is the obvious
-- way round a check that only guarded insertion. But it also fires on the
-- update that *removes* an official, and then refuses it: an official who
-- joined the fixture's team after being appointed could not be withdrawn,
-- because BR109 says they should not be there.
--
-- So BR50's sweep could not take an uncleared adult off a children's match
-- on the grounds that a second rule also disapproved of them. 0044 learned
-- this for the card check and skipped `declined` and `withdrawn` for exactly
-- this reason; 0025 predates that lesson.
--
-- Same body, same rules, one early return. A withdrawal and a decline are
-- the removal of an official, and nothing about a conflict argues for
-- keeping them.

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
  if new.state in ('declined', 'withdrawn') then
    return new;
  end if;

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

-- ------------------------------------------ and the same, one table along
-- **Found the same way, and worse.** `assert_official_is_cleared` guards
-- `team_member` and refuses a row whose holder has no valid card — on
-- update as well as insert. So BR50's team half could not write at all: the
-- sweep marks the row withdrawn, the trigger sees a person with no card,
-- and refuses the withdrawal *because* they have no card.
--
-- Scope 50 shipped that function and never exercised it — suite 45's lapse
-- emptied appointments only, so the team half has been dead since 0044. The
-- one place BR50 is about somebody standing next to children every week,
-- rather than for ninety minutes on a Sunday.
--
-- Same body, one early return: a row being withdrawn is being removed, and
-- the lapse that removes it is not a reason to keep it.

create or replace function assert_official_is_cleared() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_season_end date;
  v_expires    date;
begin
  -- Withdrawing is removal. Refusing it for want of a card would refuse
  -- exactly the write BR50 exists to make.
  if new.withdrawn_at is not null then
    return new;
  end if;

  if new.role = 'player' then
    return new;
  end if;

  select s.ends_on into v_season_end
  from team t join season s on s.id = t.season_id
  where t.id = new.team_id;

  -- Under 18: exempt. The MiniRefs case, and the same exemption Queensland
  -- gives every volunteer under 18.
  if not app_needs_clearance(new.person_id, v_season_end) then
    return new;
  end if;

  v_expires := app_clearance_covers(new.person_id, new.club_id);

  if v_expires is null then
    raise exception
      'no verified Working with Children Check for this person -- no card, no start (BR19)'
      using errcode = '23514';
  end if;

  if v_expires < v_season_end then
    raise exception
      'their clearance expires % , before the season ends % (BR54)', v_expires, v_season_end
      using errcode = '23514';
  end if;

  return new;
end;
$$;
