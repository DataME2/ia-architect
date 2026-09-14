-- 0033 — Asking at the door whether they also officiate (scope 39).
--
-- A club's referees are mostly its own players and their parents, and
-- nothing has ever asked. Three questions on the registration form: would
-- they like to officiate, have they before, and at what accreditation
-- number and level.
--
-- **The questions are easy. What they produce is not.**
--
-- A parent typing "Level 4" must not become a `referee_classification`,
-- because BR8 now *refuses* designations against a competition's minimum
-- (0032). A declaration flowing straight into that table would put an
-- unchecked answer into the comparison BR8 exists to make, and the
-- consequence is not an untidy record — it is a child appointed to a match
-- they are not qualified for. So a declaration is a **claim** (BR136),
-- reviewed before it becomes anything.
--
-- BR138 closed the other half of that in the same change: `loadCandidates`
-- now reads only a *sighted* classification, which this table's sibling has
-- asked for in a comment since it was written.

create table officiating_interest (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  person_id   uuid not null references person(id) on delete cascade,
  -- The registration that asked. Null once that registration is gone: the
  -- declaration is about the Person, and outlives the form that captured it.
  registration_id uuid references registration(id) on delete set null,

  wants_to_officiate  boolean not null default false,
  has_officiated_before boolean not null default false,

  -- Self-declared, and named so nobody reads them as verified. A
  -- coordinator checks them against the register exactly as they would a
  -- Working with Children Check.
  declared_accreditation_number text,
  declared_level                text,
  -- Where the declared level happens to match something catalogued (0032).
  -- Optional on purpose: a parent's answer often matches nothing, and
  -- refusing the declaration for that would lose the recruit.
  declared_level_id uuid references classification_level(id) on delete set null,

  -- BR137. Who said it — the guardian, or the person themselves.
  declared_by_person_id uuid references person(id) on delete set null,
  declared_at timestamptz not null default now(),

  -- BR136. Nothing exists until this is decided.
  state text not null default 'pending'
    check (state in ('pending', 'accepted', 'declined')),
  reviewed_at      timestamptz,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  -- #79: a decline is recorded rather than deleted. A family that declared
  -- twice and was declined twice is something a coordinator should see, and
  -- a deletion would make the second declaration look like the first.
  review_note text,

  constraint officiating_interest_reviewed_together
    check ((state = 'pending') = (reviewed_at is null))
);

create index officiating_interest_club_state_idx
  on officiating_interest (club_id, state, declared_at desc);

-- One live declaration per person: a family re-registering next season
-- should update their answer, not queue a second identical one.
create unique index officiating_interest_pending_idx
  on officiating_interest (club_id, person_id) where state = 'pending';

comment on column officiating_interest.declared_level is
  'BR136. What somebody typed. It becomes a referee_classification only '
  'when a coordinator accepts the declaration, and even then as an '
  'unsighted row that BR138 refuses to count until it is checked.';

-- ---------------------------------------------------- BR137, as a constraint
-- Who may declare: the person themselves if they are thirteen or over
-- (BR63's threshold, reused rather than reinvented), or a guardian holding
-- authority over them (BR48).
--
-- Note what this does *not* restrict: who may be **declared**. A MiniRef is
-- a child, the pathway's lowest classification exists for them, and BR84
-- already exempts an under-18 from the card a Match Official otherwise
-- needs (#80).

create or replace function enforce_declaration_authority()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_declarer_age integer;
begin
  if new.declared_by_person_id is null then
    return new;  -- Recorded by a club officer on someone's behalf.
  end if;

  if new.declared_by_person_id = new.person_id then
    select extract(year from age(date_of_birth))::integer into v_declarer_age
      from person where id = new.person_id;
    if v_declarer_age is null or v_declarer_age < 13 then
      raise exception
        'BR137: a person under thirteen cannot declare their own officiating interest';
    end if;
    return new;
  end if;

  if not exists (
    select 1 from guardianship g
     where g.club_id = new.club_id
       and g.person_id = new.person_id
       and g.guardian_person_id = new.declared_by_person_id
       and g.is_authority
  ) then
    raise exception
      'BR137: only the person themselves or a guardian with authority may declare an officiating interest';
  end if;

  return new;
end
$$;

create trigger officiating_interest_authority
  before insert or update on officiating_interest
  for each row execute function enforce_declaration_authority();

-- ------------------------------------------------------------------ policies
-- BR120. An accreditation number is a personal identifier, and the roles
-- that act on a declaration are the ones that read it — not every member of
-- the club, and not the player record, where it would be visible to more
-- people for no purpose.

alter table officiating_interest enable row level security;

create policy officiating_interest_select on officiating_interest
  for select using (app_has_role(club_id, array['admin','registrar','coordinator']));

create policy officiating_interest_insert on officiating_interest
  for insert with check (app_has_role(club_id, array['admin','registrar','coordinator']));

-- A family reads their own declaration, the same way they read the rest of
-- their household (decision 11) — but never anybody else's, and they may
-- not review it.
create policy officiating_interest_select_family on officiating_interest
  for select using (person_id in (select app_my_family_person_ids(club_id)));

-- No update policy. A declaration is reviewed through app_review_interest()
-- or not at all, so every state change passes one audited door — the same
-- shape suppression has in 0030.

-- ----------------------------------------------------- app_declare_interest
-- Reached by the public registration path as well as the registrar's, so it
-- is `security definer` with the club taken from the registration rather
-- than from the caller — decision 6's sentence, again.

create or replace function app_declare_interest(
  p_registration_id uuid,
  p_wants boolean,
  p_before boolean,
  p_number text,
  p_level text,
  p_declared_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg registration;
  v_id  uuid;
begin
  select * into v_reg from registration where id = p_registration_id;
  if v_reg is null then
    raise exception 'No such registration.';
  end if;

  -- Nothing to record. Said plainly rather than writing a row of falses
  -- that a coordinator then has to read and dismiss.
  if not coalesce(p_wants, false) and not coalesce(p_before, false) then
    return null;
  end if;

  insert into officiating_interest (
    club_id, person_id, registration_id,
    wants_to_officiate, has_officiated_before,
    declared_accreditation_number, declared_level,
    -- Matched against the catalogue where it happens to match, by name,
    -- case-insensitively. A miss is ordinary and costs nothing.
    declared_level_id,
    declared_by_person_id
  )
  values (
    v_reg.club_id, v_reg.person_id, p_registration_id,
    coalesce(p_wants, false), coalesce(p_before, false),
    nullif(btrim(coalesce(p_number, '')), ''),
    nullif(btrim(coalesce(p_level, '')), ''),
    (select cl.id from classification_level cl
      where lower(cl.name) = lower(btrim(coalesce(p_level, '')))
      limit 1),
    p_declared_by
  )
  on conflict (club_id, person_id) where state = 'pending'
  do update set
    wants_to_officiate = excluded.wants_to_officiate,
    has_officiated_before = excluded.has_officiated_before,
    declared_accreditation_number = excluded.declared_accreditation_number,
    declared_level = excluded.declared_level,
    declared_level_id = excluded.declared_level_id,
    declared_at = now()
  returning id into v_id;

  return v_id;
end
$$;

-- ------------------------------------------------------ app_review_interest
-- BR136's door. Accepting creates the referee profile and the season role,
-- and records the declared level as an **unsighted** classification — which
-- BR138 then refuses to count until somebody checks it against the
-- register. That is the whole design in one statement: the club gains a
-- referee, and gains nothing it has not verified.

create or replace function app_review_interest(
  p_interest_id uuid,
  p_accept boolean,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i officiating_interest;
  v_season uuid;
  v_role_note text := 'accepted';
begin
  select * into v_i from officiating_interest where id = p_interest_id;
  if v_i is null then raise exception 'No such declaration.'; end if;
  if not app_has_role(v_i.club_id, array['admin','coordinator']) then
    raise exception 'Only an administrator or the referee coordinator may review a declaration.';
  end if;
  if v_i.state <> 'pending' then raise exception 'That declaration has already been reviewed.'; end if;

  update officiating_interest
     set state = case when p_accept then 'accepted' else 'declined' end,
         reviewed_at = now(),
         reviewed_by_user_id = auth.uid(),
         review_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_interest_id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_i.club_id, auth.uid(),
          case when p_accept then 'officiating_interest.accepted' else 'officiating_interest.declined' end,
          'officiating_interest', p_interest_id,
          jsonb_build_object('personId', v_i.person_id, 'declaredLevel', v_i.declared_level));

  if not p_accept then return 'declined'; end if;

  insert into referee_profile (club_id, person_id)
  values (v_i.club_id, v_i.person_id)
  on conflict do nothing;

  -- **The season the registration was for**, not "the latest".
  --
  -- The first version took the most recent season by start date, which is
  -- wrong in a way a test caught: BR84's exemption is measured against the
  -- season's *end*, so guessing the season guesses whether a fourteen-year-
  -- old needs a Working with Children Check. The declaration knows which
  -- registration it came from; that registration knows its season.
  select r.season_id into v_season
    from registration r where r.id = v_i.registration_id;

  if v_season is null then
    select id into v_season from season
     where club_id = v_i.club_id and ends_on >= current_date
     order by starts_on asc
     limit 1;
  end if;

  -- BR84 may refuse the role — an adult with no verified card cannot hold
  -- it, and that trigger is not this function's to argue with.
  --
  -- But it must not lose the decision. The coordinator's review is the
  -- thing that had to be recorded; the role is what follows from it, and a
  -- club that accepted somebody and then has to chase a card is in a better
  -- state than one whose accept silently failed.
  if v_season is not null then
    begin
      insert into person_role (club_id, person_id, season_id, role)
      values (v_i.club_id, v_i.person_id, v_season, 'referee')
      on conflict do nothing;
    exception when others then
      v_role_note := 'accepted_without_role';
    end;
  else
    v_role_note := 'accepted_without_season';
  end if;

  -- Unsighted, deliberately. `sighted_at` stays null, so BR138 treats this
  -- as no comparable classification until a coordinator checks it.
  if v_i.declared_level is not null then
    insert into referee_classification (club_id, person_id, level, effective_from, source, recorded_by)
    values (v_i.club_id, v_i.person_id, v_i.declared_level, current_date,
            'Declared at registration', auth.uid())
    on conflict (club_id, person_id, effective_from) do nothing;
  end if;

  return v_role_note;
end
$$;

revoke all on function app_declare_interest(uuid, boolean, boolean, text, text, uuid) from public;
revoke all on function app_review_interest(uuid, boolean, text) from public;
grant execute on function app_declare_interest(uuid, boolean, boolean, text, text, uuid) to anon, authenticated;
grant execute on function app_review_interest(uuid, boolean, text) to authenticated;
