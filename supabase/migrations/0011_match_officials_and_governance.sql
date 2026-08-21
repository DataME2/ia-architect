-- Match officials need a clearance too, and the club needs a committee.
--
-- Two things the club asked for, and one correction they did not.
--
--   BR84  a **Match Official** -- a referee -- needs the same verified
--         Working with Children Check a Team Official does. Players never
--         do. Same rule, different surface.
--
--   BR85  a Committee Position is held for exactly one Committee Term,
--         which runs from one Annual General Meeting to the next -- about a
--         year -- and lapses with it rather than being revoked.
--
--   BR86  a Term past its next-AGM date has not been renewed, and every
--         approval that rests on Committee authority (BR21) needs to know
--         which Term granted it.
--
-- The correction: **a person under 18 is exempt.** Queensland exempts
-- volunteers under 18 from the Blue Card, and Football Queensland's referee
-- pathway starts at MiniRefs -- twelve-year-olds officiating under-7s. A
-- rule requiring every match official to hold a card would have made the
-- platform refuse the very people that pathway exists to bring in, and
-- would have been wrong in law as well as in practice. 0010's team trigger
-- had the same latent error and is corrected here.

-- ------------------------------------------------- who actually needs one

/**
 * Whether this person needs a Working with Children Check to hold a
 * child-related role, as at a date.
 *
 * The answer is their age. An adult does; a person under 18 does not, and
 * asking them for a card they cannot hold would exclude every MiniRef in
 * the state.
 */
create function app_needs_clearance(p_person_id uuid, p_as_of date)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.date_of_birth <= (p_as_of - interval '18 years')
       from person p where p.id = p_person_id),
    true  -- unknown person: fail closed
  );
$$;

/**
 * The clearance a person actually holds that reaches furthest ahead, or
 * null. Verified and unrevoked only -- a recorded card number nobody
 * checked is not a clearance (BR19).
 */
create function app_clearance_covers(p_person_id uuid, p_club_id uuid)
returns date
language sql
stable
set search_path = public, pg_temp
as $$
  select max(c.expires_on)
  from clearance c
  where c.person_id = p_person_id
    and c.club_id = p_club_id
    and c.revoked_at is null
    and c.verified_at is not null;
$$;

-- -------------------------------------- 0010's trigger, with the exemption

create or replace function assert_official_is_cleared() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_season_end date;
  v_expires    date;
begin
  if new.role = 'player' then
    return new;
  end if;

  select s.ends_on into v_season_end
  from team t join season s on s.id = t.season_id
  where t.id = new.team_id;

  -- Under 18: exempt. See the header -- this is the MiniRefs case, and the
  -- same exemption Queensland gives every volunteer under 18.
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

-- ------------------------------------------------- BR84: match officials
--
-- `person_role` carries the season roles, and two of them put an adult in
-- front of children: referee and coach. Player, guardian and committee do
-- not -- a committee member governs, and whether that alone should require
-- a card is open (question #55) rather than assumed here.

create function assert_season_role_is_cleared() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_season_end date;
  v_expires    date;
begin
  if new.role not in ('referee', 'coach') then
    return new;
  end if;

  select s.ends_on into v_season_end from season s where s.id = new.season_id;

  if not app_needs_clearance(new.person_id, v_season_end) then
    return new;
  end if;

  v_expires := app_clearance_covers(new.person_id, new.club_id);

  if v_expires is null then
    raise exception
      'no verified Working with Children Check for this % -- no card, no start (BR19/BR84)', new.role
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

create trigger person_role_official_is_cleared
  before insert or update on person_role
  for each row execute function assert_season_role_is_cleared();

-- --------------------------------------------------- club governance

-- The governance year. A club's committee is elected at an Annual General
-- Meeting and serves until the next one -- about a year, but the date that
-- matters is the meeting, not the anniversary.
create table committee_term (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references club(id) on delete cascade,
  -- '2026-27', as the club would say it.
  name          text not null check (length(btrim(name)) > 0),
  -- The AGM that elected this committee. Null while a term is being
  -- prepared before the meeting happens.
  agm_held_on   date,
  starts_on     date not null,
  -- When the next AGM is due. BR86 measures against this, not against a
  -- year from the start: a club that holds its AGM late has a committee
  -- whose authority is a real question, and hiding that behind arithmetic
  -- would answer it wrongly.
  next_agm_due_on date not null,
  created_at    timestamptz not null default now(),
  unique (club_id, name),
  check (next_agm_due_on > starts_on)
);
create index committee_term_club_idx on committee_term (club_id, starts_on desc);

create table committee_position (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  term_id     uuid not null references committee_term(id) on delete cascade,
  person_id   uuid not null references person(id) on delete cascade,
  -- Free-ish text within a checked set: clubs invent positions, but the
  -- office-bearer four are constitutionally distinct and worth naming.
  position    text not null check (position in (
    'president','vice-president','secretary','treasurer',
    'registrar','committee-member','subcommittee-member'
  )),
  elected_on  date,
  -- BR85: a position lapses with its term. This records an *early* exit --
  -- a resignation -- which is a different fact from the term ending.
  resigned_on date,
  created_at  timestamptz not null default now(),
  unique (term_id, person_id, position)
);
create index committee_position_term_idx on committee_position (term_id);

comment on table committee_term is
  'BR85: one governance year, AGM to AGM. Positions are held for exactly one of these.';

-- ------------------------------------------------------------------- RLS
-- Who the committee is, is club information -- a registrar needs to know
-- who may approve a voucher program (BR21). Changing it is governance, so
-- only an admin.

alter table committee_term     enable row level security;
alter table committee_position enable row level security;

create policy committee_term_select on committee_term
  for select using (club_id in (select app_member_club_ids()));

create policy committee_term_manage on committee_term
  for all using (app_has_role(club_id, array['admin']))
  with check (app_has_role(club_id, array['admin']));

create policy committee_position_select on committee_position
  for select using (club_id in (select app_member_club_ids()));

create policy committee_position_manage on committee_position
  for all using (app_has_role(club_id, array['admin']))
  with check (app_has_role(club_id, array['admin']));

-- ------------------------------------------ merge_person, now that BR84 exists
--
-- Found by `supabase/tests/16` failing the moment BR84's trigger existed,
-- which is exactly the interaction scope 24's gap note predicted and had no
-- way to force anyone to notice:
--
--   "the next table added to this schema needs to be considered against
--    merge_person, and there is nothing that forces that consideration yet."
--
-- Two tables were added since and neither was repointed. `team_member` left
-- a merged-away record holding a team place. Worse, `clearance` did too --
-- so merging a coach into their duplicate moved the *role* and stripped the
-- *card*, and the new trigger then rejected the survivor's own role. A
-- clearance belongs to a human, and a merge is a statement that these two
-- records are one human, so it moves with them.
--
-- Clearances are repointed FIRST, before the roles that depend on them.

create or replace function merge_person(
  p_survivor_id  uuid,
  p_duplicate_id uuid
) returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid;
  v_dup_club uuid;
  v_moved integer := 0;
  v_n integer;
begin
  if p_survivor_id = p_duplicate_id then
    raise exception 'a person cannot be merged into themselves' using errcode = '22000';
  end if;

  select club_id into v_club_id from person where id = p_survivor_id;
  select club_id into v_dup_club from person where id = p_duplicate_id;

  if v_club_id is null or v_dup_club is null then
    raise exception 'person_not_found' using errcode = '22000';
  end if;
  if v_club_id <> v_dup_club then
    raise exception 'cannot merge people from different clubs' using errcode = '42501';
  end if;

  -- First, because the roles below are validated against them (BR83/BR84).
  update clearance set person_id = p_survivor_id where person_id = p_duplicate_id;
  get diagnostics v_n = row_count; v_moved := v_moved + v_n;

  update registration set person_id = p_survivor_id where person_id = p_duplicate_id;
  get diagnostics v_n = row_count; v_moved := v_moved + v_n;

  update consent set person_id = p_survivor_id where person_id = p_duplicate_id;
  get diagnostics v_n = row_count; v_moved := v_moved + v_n;

  update consent set granted_by_person_id = p_survivor_id
   where granted_by_person_id = p_duplicate_id;

  update submission_record set person_id = p_survivor_id where person_id = p_duplicate_id;

  delete from person_role dup
   where dup.person_id = p_duplicate_id
     and exists (
       select 1 from person_role keep
       where keep.person_id = p_survivor_id
         and keep.season_id = dup.season_id
         and keep.role = dup.role
     );
  update person_role set person_id = p_survivor_id where person_id = p_duplicate_id;

  delete from team_member dup
   where dup.person_id = p_duplicate_id
     and exists (
       select 1 from team_member keep
       where keep.person_id = p_survivor_id
         and keep.team_id = dup.team_id
         and keep.role = dup.role
     );
  update team_member set person_id = p_survivor_id where person_id = p_duplicate_id;
  get diagnostics v_n = row_count; v_moved := v_moved + v_n;

  -- Vouchers, documents and payments hang off a registration rather than a
  -- person, and the registration has already moved.

  delete from guardianship dup
   where dup.guardian_person_id = p_duplicate_id
     and exists (
       select 1 from guardianship keep
       where keep.guardian_person_id = p_survivor_id
         and keep.person_id = dup.person_id
     );
  update guardianship set guardian_person_id = p_survivor_id
   where guardian_person_id = p_duplicate_id;

  delete from guardianship dup
   where dup.person_id = p_duplicate_id
     and exists (
       select 1 from guardianship keep
       where keep.person_id = p_survivor_id
         and keep.guardian_person_id = dup.guardian_person_id
     );
  update guardianship set person_id = p_survivor_id where person_id = p_duplicate_id;

  update committee_position set person_id = p_survivor_id where person_id = p_duplicate_id;

  update person s
     set email = coalesce(s.email, d.email),
         preferred_name = coalesce(s.preferred_name, d.preferred_name),
         legal_name_verified_at = coalesce(s.legal_name_verified_at, d.legal_name_verified_at)
    from person d
   where s.id = p_survivor_id and d.id = p_duplicate_id;

  update person
     set merged_into_person_id = p_survivor_id
   where id = p_duplicate_id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (
    v_club_id, auth.uid(), 'person_merged', 'person', p_survivor_id,
    jsonb_build_object(
      'survivorId', p_survivor_id,
      'duplicateId', p_duplicate_id,
      'recordsMoved', v_moved,
      'rules', array['BR5', 'BR82']
    )
  );
end;
$$;
