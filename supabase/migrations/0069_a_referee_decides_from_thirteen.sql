-- 0069 — A referee decides from thirteen (scope 73; BR113, BR150, BR151; #79).
--
-- The club's answer to #79 draws the line at thirteen:
--
--   * a match is confirmed (BR151) by the guardian holding authority for an
--     official under thirteen on the day, and by the official themself from
--     thirteen, adults included;
--   * a designation (BR113) is answered by the guardian under thirteen, by
--     the official or the guardian from thirteen to seventeen, the first
--     answer standing, and by the official alone from eighteen;
--   * an official of thirteen or over is invited to their own workspace once
--     they hold a referee role in a season that has not ended (BR150).
--
-- `app_may_answer_designation` (0045) is NOT changed. 0054 (availability,
-- BR62) and 0057 (pay or credit, BR152) reuse it, and the club decided
-- designations only. Designations get their own function instead.

-- ------------------------------------------------ app_may_answer_as_official

create or replace function app_may_answer_as_official(
  p_person_id uuid, p_club_id uuid, p_as_of date)
returns setof uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select a from app_may_answer_designation(p_person_id, p_club_id, p_as_of) a
  union
  select p.id
    from person p
   where p.id = p_person_id
     and p.club_id = p_club_id
     and p.date_of_birth is not null
     and extract(year from age(p_as_of, p.date_of_birth))::integer >= 13
$$;

revoke all on function app_may_answer_as_official(uuid, uuid, date) from public;
grant execute on function app_may_answer_as_official(uuid, uuid, date) to authenticated;

comment on function app_may_answer_as_official(uuid, uuid, date) is
  'BR113 restated (scope 73): who may answer a designation. The official '
  'from thirteen, and until eighteen every Parent/Guardian holding authority. '
  'Designations only: BR62 and BR152 still use app_may_answer_designation.';

-- ------------------------------------------- the designation's answerer (BR113)
-- 0045's trigger, with app_may_answer_as_official in place of the shared
-- function, and one addition: from thirteen to seventeen two people may
-- answer, so the first answer stands. Either may change their own answer, as
-- before; neither may overwrite the other's.

create or replace function assert_designation_is_answered_by_its_adult()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_adult boolean;
begin
  -- A withdrawal is not a response (0045): the club is removing an official.
  if new.state = 'withdrawn' then
    return new;
  end if;

  v_is_adult := coalesce(app_is_adult_on(new.person_id, current_date), false);
  if v_is_adult then
    return new;
  end if;

  -- A proposal nobody can answer is not a proposal. From thirteen the
  -- official can always answer for themselves, so this now only refuses an
  -- official under thirteen with no guardian holding authority.
  if not exists (
    select 1 from app_may_answer_as_official(new.person_id, new.club_id, current_date)
  ) then
    raise exception
      'no Parent/Guardian holding authority is recorded for this official under thirteen, '
      'so there is nobody to propose the designation to (BR113)'
      using errcode = '23514';
  end if;

  if new.state in ('accepted', 'declined') then
    if new.responded_by_person_id is null then
      raise exception
        'an under-18 official''s designation must record who answered it -- the official '
        'from thirteen, or a Parent/Guardian holding authority (BR113)'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
        from app_may_answer_as_official(new.person_id, new.club_id, current_date) a
       where a = new.responded_by_person_id
    ) then
      raise exception
        'that person does not hold authority for this under-18 official, so their '
        'answer is not the one BR113 asks for'
        using errcode = '23514';
    end if;

    -- The first answer stands: a guardian does not overwrite the official's
    -- answer, and the official does not overwrite the guardian's.
    if tg_op = 'UPDATE'
       and old.state in ('accepted', 'declined')
       and old.responded_by_person_id is not null
       and new.responded_by_person_id is distinct from old.responded_by_person_id then
      raise exception
        'this designation was already answered by somebody else; the first answer stands (BR113)'
        using errcode = '23514';
    end if;

    new.responded_at := coalesce(new.responded_at, now());
  end if;

  return new;
end;
$$;

-- ------------------------------------------------- the match confirmation (BR151)
-- Under thirteen on the day: the guardian holding authority, as 0055 had it.
-- From thirteen: the official themself and nobody else, and only for a
-- fixture they were appointed to and accepted, once it has been played.
-- (The guardian path does not check the appointment yet: recorded as a gap in
-- scope 73 rather than changed here.)

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
    if new.confirmed_by_person_id is distinct from new.person_id then
      raise exception
        'a guardian confirms only for an official under thirteen on the day of the fixture; '
        'from thirteen the official confirms their own match (BR151)'
        using errcode = '23514';
    end if;
    if v_played_on > current_date then
      raise exception 'a match is confirmed after it is played (BR151)'
        using errcode = '23514';
    end if;
    if not exists (
      select 1 from match_official_appointment
       where club_id = new.club_id
         and fixture_id = new.fixture_id
         and person_id = new.person_id
         and state = 'accepted'
    ) then
      raise exception
        'an official confirms only a match they were appointed to and accepted (BR151)'
        using errcode = '23514';
    end if;
  else
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
  end if;

  new.confirmed_at := coalesce(new.confirmed_at, now());
  return new;
end;
$$;

-- ------------------------------------------------- the own workspace (BR150)
-- A COMPLETE registration, as before, or a referee role in a season that has
-- not ended. Thirteen or over either way.

create or replace function assert_player_invitation_is_eligible()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_age integer;
begin
  select extract(year from age(p.date_of_birth))::integer into v_age
    from person p where p.id = new.person_id;

  if v_age is null or v_age < 13 then
    raise exception 'BR150: invite a player or official only once they are thirteen or over.'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from registration r
     where r.club_id = new.club_id and r.person_id = new.person_id and r.status = 'COMPLETE'
  ) and not exists (
    select 1
      from person_role pr
      join season s on s.id = pr.season_id and s.club_id = pr.club_id
     where pr.club_id = new.club_id
       and pr.person_id = new.person_id
       and pr.role = 'referee'
       and s.ends_on >= current_date
  ) then
    raise exception
      'BR150: invite a player once their registration is COMPLETE, or an official once they '
      'hold a referee role in a season that has not ended.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;
