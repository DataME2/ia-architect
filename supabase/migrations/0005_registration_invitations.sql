-- BR72/BR73: let a family register without an account, without opening a
-- hole in P5.
--
-- Every policy in this schema keys off auth.uid() resolving to a
-- club_membership row, so an anonymous guardian following a link has no
-- policy that would let them insert. The alternatives and why they lose are
-- in docs/decisions/6_public-registration-through-a-scoped-function.md; the
-- short version is that a service-role write from the application would make
-- P5 depend on application code being correct, which is the property this
-- stack was chosen to avoid.
--
-- So: one narrow security definer function is the entire public write
-- surface, and the tenant it writes to is not one of its arguments.

-- ------------------------------------------------------ the invitation

create table registration_invitation (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references club(id) on delete cascade,
  season_id          uuid not null references season(id) on delete cascade,
  -- BR73: the hash, never the token. Anyone holding the link can submit
  -- through it, so it is a credential and is stored like one -- a database
  -- copy is otherwise one leaked backup away from an open write path.
  token_hash         text not null unique,
  -- What the club called it, e.g. "U12s, 2026". Never the token.
  label              text not null,
  expires_at         timestamptz not null,
  revoked_at         timestamptz,
  use_count          integer not null default 0,
  created_by_user_id uuid not null,
  created_at         timestamptz not null default now()
);

create index registration_invitation_club_idx
  on registration_invitation (club_id, season_id);

alter table registration_invitation enable row level security;

-- Club officers manage their own invitations. `anon` gets nothing at all --
-- not even select -- so tokens cannot be enumerated even one row at a time.
create policy registration_invitation_select on registration_invitation
  for select using (club_id in (select app_member_club_ids()));

create policy registration_invitation_manage on registration_invitation
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- ------------------------------------------- the one public write surface

-- SECURITY DEFINER: runs as the owner, so it is not subject to RLS. That is
-- the point and the risk, and three things bound it.
--
--   1. The club_id and season_id written come from the invitation the token
--      resolves to. There is no argument a caller can set to reach another
--      club.
--   2. search_path is pinned. A security definer function that resolves
--      unqualified names through the caller's search_path is a standard
--      privilege-escalation route. `extensions` is included because that is
--      where Supabase installs pgcrypto, and digest() below lives in it --
--      a search_path of `public` alone resolves nothing and every link
--      fails. A non-existent schema in the list is ignored, so the same
--      pin works against the local test Postgres, which has pgcrypto in
--      public.
--   3. It enforces the rules it is the boundary for. The form's checks are a
--      courtesy to the family; an anonymous caller can skip the form
--      entirely, so BR1 and BR48 are re-checked here.
--
-- It writes and never reads: the return value is an identifier, and anon
-- holds no select grant on any table. There is no cross-tenant visibility
-- here, which is why this is not an exception to P5 the way P6 is.
create function submit_public_registration(
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

  insert into registration (club_id, person_id, season_id, status)
  values (v_invitation.club_id, v_person_id, v_invitation.season_id, 'DRAFT')
  returning id into v_registration_id;

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

-- Nobody by default; anon and authenticated explicitly. `public` would
-- include future roles nobody has thought about yet.
revoke all on function submit_public_registration(
  text, text, text, text, date, text, text, text, text, boolean, boolean, boolean
) from public;

grant execute on function submit_public_registration(
  text, text, text, text, date, text, text, text, text, boolean, boolean, boolean
) to anon, authenticated;
