-- 0052 — A player may propose their own correction (scope 63, BR148).
--
-- The player workspace has said "yours only" since it was built and never
-- let a player change any of it. BR148: an adult player may propose a
-- correction to six self-describing fields; nobody sees it, and nothing
-- changes, until a coach, coordinator, registrar or admin confirms it.
--
-- **A separate table, not shadow columns on the real ones.** Writing the
-- proposed value straight into `person`/`player_profile` behind a flag
-- puts the unconfirmed guess in the same row as the confirmed fact — the
-- exact confusion BR148 exists to prevent. `player_record_correction` is a
-- claim in `officiating_interest`'s shape (0033): recorded, reviewed,
-- and only *then* does it become the real thing.
--
-- **Six fields, not "the player record."** `person.preferred_name`,
-- `person.email`, and `player_profile`'s `preferred_position`,
-- `secondary_position`, `preferred_foot`, `squad_number`. Never the legal
-- name or date of birth (BR55 — the latter drives every age-gated rule in
-- this schema), the photograph (BR56's own consent), or height and weight
-- (BR125 names the coach or Technical Director specifically as the
-- recorder, not self-report). See scope 63 and open question #77.
--
-- **Propose: the player, eighteen or over, about themselves only.** Not a
-- guardian on a minor's behalf — BR148 is narrower than decision 11's
-- family reads on purpose. Enforced twice, the way every age-gated rule
-- here is: the application resolves the caller from their own session
-- (never a form field naming who), and a trigger checks it again.

create table player_record_correction (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  registration_id uuid not null references registration(id) on delete cascade,
  person_id   uuid not null references person(id) on delete cascade,

  proposed_by_user_id uuid not null references auth.users(id) on delete cascade,
  proposed_at timestamptz not null default now(),

  -- All nullable: a proposal touches only the fields the player actually
  -- wants to change, the same "everything optional" shape 0020 gives
  -- player_profile itself.
  preferred_name     text,
  email              text check (email is null or position('@' in email) > 1),
  preferred_position text check (preferred_position is null or preferred_position in (
    'goalkeeper','defender','midfielder','forward','utility')),
  secondary_position text check (secondary_position is null or secondary_position in (
    'goalkeeper','defender','midfielder','forward','utility')),
  preferred_foot     text check (preferred_foot is null or preferred_foot in ('left','right','both')),
  squad_number       integer check (squad_number is null or squad_number between 1 and 99),

  state text not null default 'pending' check (state in ('pending','confirmed','declined')),
  reviewed_at         timestamptz,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  review_note         text,

  foreign key (club_id, person_id) references person (club_id, id) on delete cascade,

  constraint player_record_correction_reviewed_together
    check ((state = 'pending') = (reviewed_at is null)),
  -- A proposal that changes nothing is not a proposal.
  constraint player_record_correction_proposes_something check (
    preferred_name is not null or email is not null or preferred_position is not null
    or secondary_position is not null or preferred_foot is not null or squad_number is not null
  )
);

-- One live proposal per registration — a second one supersedes waiting for
-- the first to be answered, the same shape officiating_interest_pending_idx
-- (0033) uses.
create unique index player_record_correction_pending_idx
  on player_record_correction (registration_id) where state = 'pending';

comment on table player_record_correction is
  'BR148: a player''s claim about their own preferred name, email, '
  'position, foot or squad number. Nothing is real until '
  'app_review_player_record_correction() confirms it into person/player_profile.';

-- --------------------------------------------------- the registration matches
-- registration_id, person_id and club_id have to agree, or a caller could
-- propose a correction to one player against another's registration.

create or replace function assert_correction_matches_its_registration()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_reg registration;
begin
  select * into v_reg from registration where id = new.registration_id;
  if v_reg is null or v_reg.person_id <> new.person_id or v_reg.club_id <> new.club_id then
    raise exception 'that registration does not belong to this person and club'
      using errcode = '23514';
  end if;

  -- BR148: the proposer must be the player themselves, eighteen or over.
  -- app_is_adult_on (0045) already answers this for BR113's guardian gate;
  -- reused here for the opposite direction — an adult acting for themselves
  -- rather than a guardian acting for a child.
  if not coalesce(app_is_adult_on(new.person_id, current_date), false) then
    raise exception
      'BR148: only a player of eighteen or over may propose a correction to their own record'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger player_record_correction_matches_its_registration
  before insert on player_record_correction
  for each row execute function assert_correction_matches_its_registration();

-- ------------------------------------------------------------------ policies

alter table player_record_correction enable row level security;

-- The player reads their own claim and its outcome — app_my_person_ids()
-- (0043), not the family functions: BR148 is self-only, never a guardian
-- reading on a minor's behalf.
create policy player_record_correction_select_own on player_record_correction
  for select using (person_id in (select app_my_person_ids()));

-- BR125's own five: the roles trusted with a player's physique are trusted
-- to confirm a position, a foot or a squad number too.
create policy player_record_correction_select_officer on player_record_correction
  for select using (
    app_has_role(club_id, array['admin','registrar','coordinator','coach','technical_director'])
  );

-- Propose: the player's own row, and the row must say it is their own
-- account making the claim — the trigger above then checks the age.
create policy player_record_correction_propose on player_record_correction
  for insert with check (
    person_id in (select app_my_person_ids())
    and proposed_by_user_id = auth.uid()
  );

-- No update policy. A claim is reviewed through
-- app_review_player_record_correction() or not at all — the same door
-- officiating_interest and erasure_request each have exactly one of.

-- ------------------------------------------------- app_review_player_record_correction
-- BR148's confirmation. Recomputes nothing — there is no verdict to
-- recompute, only a decision to record and, if accepted, to apply.

create or replace function app_review_player_record_correction(
  p_correction_id uuid,
  p_accept boolean,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c player_record_correction;
begin
  select * into v_c from player_record_correction where id = p_correction_id;
  if v_c is null then
    raise exception 'No such correction.';
  end if;
  if not app_has_role(v_c.club_id, array['admin','registrar','coordinator','coach','technical_director']) then
    raise exception 'Not permitted to review a player record at this club.';
  end if;
  if v_c.state <> 'pending' then
    raise exception 'That correction has already been reviewed.';
  end if;

  update player_record_correction
     set state = case when p_accept then 'confirmed' else 'declined' end,
         reviewed_at = now(),
         reviewed_by_user_id = auth.uid(),
         review_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_correction_id;

  if not p_accept then
    return 'declined';
  end if;

  if v_c.preferred_name is not null or v_c.email is not null then
    update person
       set preferred_name = coalesce(v_c.preferred_name, preferred_name),
           email           = coalesce(v_c.email, email)
     where id = v_c.person_id;
  end if;

  if v_c.preferred_position is not null or v_c.secondary_position is not null
     or v_c.preferred_foot is not null or v_c.squad_number is not null then
    update player_profile
       set preferred_position = coalesce(v_c.preferred_position, preferred_position),
           secondary_position = coalesce(v_c.secondary_position, secondary_position),
           preferred_foot     = coalesce(v_c.preferred_foot, preferred_foot),
           squad_number       = coalesce(v_c.squad_number, squad_number)
     where registration_id = v_c.registration_id;

    -- A registration with no player_profile row yet (physique was never
    -- recorded) gets one, carrying only the fields this claim proposed.
    if not found then
      insert into player_profile (club_id, registration_id, preferred_position, secondary_position, preferred_foot, squad_number)
      values (v_c.club_id, v_c.registration_id, v_c.preferred_position, v_c.secondary_position, v_c.preferred_foot, v_c.squad_number);
    end if;
  end if;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_c.club_id, auth.uid(), 'player_record_correction.confirmed',
          'player_record_correction', p_correction_id, jsonb_build_object('personId', v_c.person_id));

  return 'confirmed';
end;
$$;

revoke all on function app_review_player_record_correction(uuid, boolean, text) from public;
grant execute on function app_review_player_record_correction(uuid, boolean, text) to authenticated;

comment on function app_review_player_record_correction(uuid, boolean, text) is
  'BR148. Confirms or declines a player''s proposed correction. Only on '
  'confirm does person/player_profile actually change -- declined and '
  'pending claims never touch the real record.';
