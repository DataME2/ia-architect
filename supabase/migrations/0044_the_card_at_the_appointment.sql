-- 0044 — The card is checked where it matters (scope 50).
--
-- Two halves of one question: is a Working with Children Check checked at
-- the moment it matters, and does it stop mattering when it lapses?
--
-- **The first half is a hole, found while building the second.** An adult
-- with no clearance and no referee role could be inserted straight into
-- `match_official_appointment` for a fixture thirty days out. BR84 is
-- enforced — on `person_role`, by `assert_season_role_is_cleared`. The
-- appointment had no clearance check at all: 0025's guard is *the three
-- refusals* in its own comment, and BR6, BR9, BR109 and BR11 are conflicts
-- and double-booking, not cards. R20.4 has claimed this was implemented
-- since it was written.
--
-- It is reachable through the product's own flow rather than only through
-- SQL. The screens list officials from `referee_profile`, and 0033 creates
-- that profile **even when BR84 refuses the season role** — the
-- `accepted_without_role` outcome, added so a coordinator's decision is not
-- lost to a trigger they cannot argue with. Right locally; the consequence
-- was never followed through to this table.
--
-- **The check goes on the appointment rather than on a required role.** The
-- tempting alternative is to demand the `referee` season role and let
-- BR84's existing trigger do the work. Rejected for the reason 0010 gives
-- for putting BR83 in the database rather than the screen: there will be
-- more than one way this row gets written, and a rule enforced by a second
-- rule enforced elsewhere is two hops a future migration can break without
-- touching either.
--
-- **Measured against the fixture's date, not the season's end.** BR54 draws
-- its line at the season because a season role lasts a season; an
-- appointment is one afternoon, and BR111 already measures a referee's
-- accreditation against the date of the fixture for exactly this reason. A
-- card expiring in July does not disqualify somebody from a match in June.
--
-- **The second half is BR50**, written since the business layer was drafted
-- and never coded: expiry or revocation withdraws the holder from every
-- *future* assignment, leaves past ones as historical record, and tells the
-- coordinator there is a vacancy.
--
-- Revocation is a write and fires immediately; expiry is the passage of
-- time and fires on the nightly sweep. **Both call the same function**, so
-- the two paths cannot come to disagree about what a lapse means.
--
-- Carnival fixtures are named in BR50 and have nobody to withdraw: 0034
-- built those tables with no `person_id` column at all (BR139) and BR28's
-- official path is unwired. Nothing to sweep, said here rather than left
-- for a reader to assume it was missed.

-- ------------------------------------------- BR84, at the appointment
-- Uses the same two functions `assert_season_role_is_cleared` uses, and
-- deliberately: a second definition of "holds a valid card" would drift,
-- and it would drift on the safeguarding side.

create or replace function assert_official_holds_a_card()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_played_on date;
  v_expires   date;
begin
  -- A withdrawal or a decline is the *removal* of an official, and must not
  -- be blocked by the very lapse that prompts it — otherwise the sweep
  -- below could not write its own outcome.
  if new.state in ('declined', 'withdrawn') then
    return new;
  end if;

  select played_on into v_played_on from fixture where id = new.fixture_id;

  -- BR84: a person under 18 is exempt from all of it. MiniRefs are
  -- children, and the pathway's lowest classification exists for them.
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

create trigger match_official_appointment_holds_a_card
  before insert or update on match_official_appointment
  for each row execute function assert_official_holds_a_card();

-- ------------------------------------------------- a team role can lapse
-- BR50 keeps past assignments as historical record, so a lapse marks the
-- row rather than deleting it. `team_member` had no state to mark, unlike
-- an appointment, which has carried a `withdrawn` state since 0025.

alter table team_member
  add column withdrawn_at     timestamptz,
  add column withdrawn_reason text,

  -- The pair 0025 requires of an appointment, for the same reason: a
  -- withdrawal nobody can explain is not a record of anything.
  add constraint team_member_withdrawal_carries_its_reason
    check ((withdrawn_at is null) = (withdrawn_reason is null));

comment on column team_member.withdrawn_at is
  'BR50. When a lapsed Working with Children Check removed this person from '
  'the team. The row stays: who coached in June is answerable after their '
  'card expires in August.';

-- --------------------------------------- app_withdraw_lapsed_clearances()
-- The sweep. Idempotent, because it runs nightly and because a second pass
-- that re-withdrew would re-notify a coordinator about a vacancy they have
-- already been told about.
--
-- `security definer` for the same reason the reminder job's functions are:
-- it is called by a scheduled route with no signed-in user, and by the
-- revocation trigger, which runs as whoever revoked.

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
  -- Appointments: future fixtures only, and only where the person both
  -- needs a card (BR84's exemption) and does not have one covering the day.
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
    returning 1
  )
  select count(*) into v_withdrawn from lapsed;

  -- Team roles: every non-playing role, in a season that has not ended.
  -- Players are never asked for a card and are never withdrawn by this.
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
  'every future assignment, leaving past ones as historical record. '
  'Idempotent: it runs nightly, and a second pass must not re-notify a '
  'coordinator about a vacancy they already know about.';

-- ---------------------------------------------- revocation, immediately
-- The half a nightly sweep is too slow for. A revoked card is not a card
-- that will lapse tonight; it is one that is gone now.

create or replace function withdraw_on_clearance_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Only when the change could remove cover. A clearance being *extended*
  -- or verified calls the sweep for nothing, and the sweep reads every
  -- future fixture in the club.
  if new.revoked_at is not null and old.revoked_at is null
     or new.expires_on < old.expires_on
     or (old.verified_at is not null and new.verified_at is null) then
    perform app_withdraw_lapsed_clearances(new.club_id);
  end if;
  return new;
end;
$$;

create trigger clearance_withdraws_on_lapse
  after update on clearance
  for each row execute function withdraw_on_clearance_change();
