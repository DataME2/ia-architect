-- Season registration configuration, and roles written at intake.
--
-- Fixes a silent pass. BR2 ("every required document is attached") is
-- evaluated against the `registration_document` rows for a registration,
-- and nothing in the system has ever created one -- so `required` was
-- always the empty list, `missing` was always empty, and the rule reported
-- *pass* on every registration ever made. A safeguarding check that cannot
-- fail is worse than an absent one, because the queue says it was checked.
--
-- Same shape for BR3: `outstanding_amount_cents` defaulted to zero and was
-- never set, so "no outstanding payment" was equally vacuous.
--
-- The fix belongs at the point registrations are created, not in each
-- screen that reads them, so it goes into the one function that creates
-- them. The same edit closes a second gap: `person_role` had a table and
-- policies since 0001 and no code at all, which left P1 -- one Person,
-- many roles -- unrepresented in the running system.
--
-- Realises docs/ea/3_information/1_data-objects.md (Season, Person Role).

-- ------------------------------------------------- season configuration

-- Which documents a registration in this season must carry, and what it
-- costs. On the season rather than the club because both change year to
-- year, and a registration is always for one season.
alter table season
  add column required_document_types text[] not null default '{}',
  add column registration_fee_cents  integer not null default 0
    check (registration_fee_cents >= 0);

comment on column season.required_document_types is
  'BR2: the document checklist copied onto every registration in this season.';
comment on column season.registration_fee_cents is
  'BR3: the opening outstanding amount for a registration in this season.';

-- ------------------------------------------------- backfill what exists

-- Registrations created before this migration have no checklist. They are
-- left with none rather than being given one retrospectively: inventing a
-- requirement a family was never told about would turn a complete
-- registration into a blocked one overnight. New seasons configure
-- forward; the existing rows keep the history they actually have.

-- The roles, though, are a statement about records that already exist and
-- can be derived without inventing anything: every registration is a
-- player role, every guardianship is a guardian role.
insert into person_role (club_id, person_id, season_id, role)
select r.club_id, r.person_id, r.season_id, 'player'
from registration r
on conflict do nothing;

insert into person_role (club_id, person_id, season_id, role)
select distinct g.club_id, g.guardian_person_id, r.season_id, 'guardian'
from guardianship g
join registration r on r.person_id = g.person_id
on conflict do nothing;

-- --------------------------------------- the public write surface, again
-- Replaced rather than edited: 0005 has been applied, and a migration that
-- has run is never rewritten. Everything below is 0005's function with the
-- season lookup, the two role writes, the fee, and the document checklist
-- added. Its security properties are unchanged -- still SECURITY DEFINER
-- with a pinned search_path, still taking no club or season argument.

create or replace function submit_public_registration(
  p_token                     text,
  p_legal_given_names         text,
  p_legal_family_name         text,
  p_preferred_name            text,
  p_date_of_birth             date,
  p_email                     text,
  p_guardian_given_names      text,
  p_guardian_family_name      text,
  p_guardian_email            text,
  p_consent_collection_notice boolean,
  p_consent_photograph        boolean,
  p_consent_publicity         boolean
) returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_invitation registration_invitation%rowtype;
  v_person_id  uuid;
  v_guardian_id uuid;
  v_consent_by uuid;
  v_registration_id uuid;
  v_is_minor boolean;
  v_season     season%rowtype;
  v_doc_type   text;
begin
  if p_token is null or length(btrim(p_token)) = 0 then
    raise exception 'invitation_invalid' using errcode = '28000';
  end if;

  select * into v_invitation
  from registration_invitation
  where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  -- One message for every rejection. Distinguishing "no such link" from
  -- "expired" tells a prober which guesses were close.
  if not found
     or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= now() then
    raise exception 'invitation_invalid' using errcode = '28000';
  end if;

  -- The season carries the club's registration configuration: which
  -- documents this season requires (BR2) and what it costs (BR3). Read
  -- here rather than taken as an argument -- an anonymous caller must not
  -- be able to choose which documents their own registration requires.
  select * into v_season from season where id = v_invitation.season_id;

  -- BR48: the collection notice is the lawful basis for holding any of
  -- this. Without it there is nothing to save.
  if p_consent_collection_notice is not true then
    raise exception 'collection_notice_required' using errcode = '22000';
  end if;

  if p_date_of_birth is null or p_date_of_birth > current_date then
    raise exception 'date_of_birth_invalid' using errcode = '22000';
  end if;

  if length(btrim(coalesce(p_legal_given_names, ''))) = 0
     or length(btrim(coalesce(p_legal_family_name, ''))) = 0 then
    raise exception 'legal_name_required' using errcode = '22000';
  end if;

  v_is_minor := p_date_of_birth > (current_date - interval '18 years');

  -- BR1: a minor's registration needs a guardian holding authority.
  if v_is_minor and (
       length(btrim(coalesce(p_guardian_given_names, ''))) = 0
       or length(btrim(coalesce(p_guardian_family_name, ''))) = 0
     ) then
    raise exception 'guardian_required' using errcode = '22000';
  end if;

  -- BR55: legal_name_verified_at stays null. A family can state a legal
  -- name; only a club officer can record that one was checked against a
  -- document, and that difference is what survives contact with the
  -- federation.
  insert into person (
    club_id, legal_given_names, legal_family_name, preferred_name,
    date_of_birth, email
  ) values (
    v_invitation.club_id,
    btrim(p_legal_given_names),
    btrim(p_legal_family_name),
    nullif(btrim(coalesce(p_preferred_name, '')), ''),
    p_date_of_birth,
    nullif(lower(btrim(coalesce(p_email, ''))), '')
  )
  returning id into v_person_id;

  v_consent_by := v_person_id;

  if v_is_minor then
    insert into person (club_id, legal_given_names, legal_family_name, date_of_birth, email)
    values (
      v_invitation.club_id,
      btrim(p_guardian_given_names),
      btrim(p_guardian_family_name),
      date '1900-01-01',
      nullif(lower(btrim(coalesce(p_guardian_email, ''))), '')
    )
    returning id into v_guardian_id;

    -- BR67: two independent flags. Authority ends at 18; contactability
    -- need not, and one boolean cannot express the difference.
    insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact)
    values (v_invitation.club_id, v_person_id, v_guardian_id, true, true);

    -- P1: the guardian is a Person holding a role, never a separate kind of
    -- record. Writing the role here is what makes them findable in the
    -- people directory rather than existing only as the far end of a
    -- foreign key.
    insert into person_role (club_id, person_id, season_id, role)
    values (v_invitation.club_id, v_guardian_id, v_invitation.season_id, 'guardian')
    on conflict do nothing;

    v_consent_by := v_guardian_id;
  end if;

  -- BR48/BR56/BR57: one row per purpose, and the two optional ones are
  -- written only when actually granted.
  insert into consent (club_id, person_id, purpose, granted_by_person_id)
  values (v_invitation.club_id, v_person_id, 'REGISTRATION_COLLECTION_NOTICE', v_consent_by);

  if p_consent_photograph is true then
    insert into consent (club_id, person_id, purpose, granted_by_person_id)
    values (v_invitation.club_id, v_person_id, 'IDENTIFICATION_PHOTOGRAPH', v_consent_by);
  end if;

  if p_consent_publicity is true then
    insert into consent (club_id, person_id, purpose, granted_by_person_id)
    values (v_invitation.club_id, v_person_id, 'PUBLICITY', v_consent_by);
  end if;

  insert into registration (club_id, person_id, season_id, status, outstanding_amount_cents)
  values (
    v_invitation.club_id, v_person_id, v_invitation.season_id, 'DRAFT',
    coalesce(v_season.registration_fee_cents, 0)
  )
  returning id into v_registration_id;

  insert into person_role (club_id, person_id, season_id, role)
  values (v_invitation.club_id, v_person_id, v_invitation.season_id, 'player')
  on conflict do nothing;

  -- BR2 asks which required documents are missing. With no rows there was
  -- nothing to miss, so the rule passed for every registration ever made --
  -- silently, on a safeguarding check. The checklist is created here, at
  -- the moment the registration is, so the question always has an answer.
  foreach v_doc_type in array coalesce(v_season.required_document_types, '{}'::text[])
  loop
    insert into registration_document (club_id, registration_id, document_type, required)
    values (v_invitation.club_id, v_registration_id, v_doc_type, true)
    on conflict do nothing;
  end loop;

  -- BR73: every use is recorded against the invitation.
  update registration_invitation
     set use_count = use_count + 1
   where id = v_invitation.id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (
    v_invitation.club_id, null, 'public_registration_submitted', 'registration',
    v_registration_id,
    jsonb_build_object('invitationId', v_invitation.id, 'isMinor', v_is_minor)
  );

  return v_registration_id;
end;
$$;
