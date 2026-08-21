-- One way to create a registration, and a way to undo a duplicated human.
--
-- Two problems with one cause. Every rule added since 0006 -- the season
-- checklist (BR2), the season fee (BR3), the roles that make P1 true, the
-- shared guardian (BR80) -- went into `submit_public_registration`, and the
-- registrar-assisted form in `src/app/register/actions.ts` built its own
-- registration out of six separate inserts. So the club had two
-- implementations of one business process, and only one of them was
-- correct. Registrations made through the screen the *club* uses came out
-- with no roles, no document checklist, no fee, and a freshly duplicated
-- parent every time.
--
-- The fix is not to copy the rules into the second path. It is to delete the
-- second path: `app_create_registration` holds the process once, and both
-- surfaces call it.
--
--   BR82  a confirmed duplicate is resolved by a human choosing which
--         Person survives. The other is kept as a tombstone pointing at the
--         survivor, never deleted.

-- ------------------------------------------------- the one creation path
--
-- SECURITY INVOKER, deliberately. Called from `submit_public_registration`
-- -- which is SECURITY DEFINER -- it runs as the owner and bypasses RLS,
-- which is what an anonymous family needs. Called by a signed-in registrar
-- it runs as *them*, so every insert below is checked against the policies
-- in 0002. One body, two privilege contexts, and neither can reach another
-- club: the anonymous path takes its club from the invitation, and the
-- club path is held by RLS.

create function app_create_registration(
  p_club_id                   uuid,
  p_season_id                 uuid,
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
  p_consent_publicity         boolean,
  p_actor_user_id             uuid
) returns uuid
language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare
  v_person_id       uuid;
  v_guardian_id     uuid;
  v_consent_by      uuid;
  v_registration_id uuid;
  v_is_minor        boolean;
  v_season          season%rowtype;
  v_doc_type        text;
  v_guardian_email  text;
  v_guardian_reused boolean := false;
begin
  select * into v_season from season where id = p_season_id and club_id = p_club_id;
  if not found then
    raise exception 'season_invalid' using errcode = '22000';
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
  -- document -- and that is true whoever typed it, which is exactly why
  -- this belongs here rather than in one of the two callers.
  insert into person (
    club_id, legal_given_names, legal_family_name, preferred_name,
    date_of_birth, email
  ) values (
    p_club_id,
    btrim(p_legal_given_names),
    btrim(p_legal_family_name),
    nullif(btrim(coalesce(p_preferred_name, '')), ''),
    p_date_of_birth,
    nullif(lower(btrim(coalesce(p_email, ''))), '')
  )
  returning id into v_person_id;

  v_consent_by := v_person_id;

  if v_is_minor then
    v_guardian_email := nullif(lower(btrim(coalesce(p_guardian_email, ''))), '');

    -- BR80: the same adult, registering a second child, is the same Person.
    if v_guardian_email is not null then
      select p.id into v_guardian_id
      from person p
      where p.club_id = p_club_id
        and p.merged_into_person_id is null
        and lower(btrim(p.email)) = v_guardian_email
        and exists (
          select 1 from person_role r
          where r.person_id = p.id and r.role = 'guardian'
        )
      order by p.created_at
      limit 1;
    end if;

    v_guardian_reused := v_guardian_id is not null;

    if v_guardian_id is null then
      insert into person (club_id, legal_given_names, legal_family_name, date_of_birth, email)
      values (
        p_club_id,
        btrim(p_guardian_given_names),
        btrim(p_guardian_family_name),
        date '1900-01-01',
        v_guardian_email
      )
      returning id into v_guardian_id;
    end if;

    -- BR67: two independent flags. Authority ends at 18; contactability
    -- need not, and one boolean cannot express the difference.
    insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact)
    values (p_club_id, v_person_id, v_guardian_id, true, true)
    on conflict do nothing;

    insert into person_role (club_id, person_id, season_id, role)
    values (p_club_id, v_guardian_id, p_season_id, 'guardian')
    on conflict do nothing;

    v_consent_by := v_guardian_id;
  end if;

  -- BR48/BR56/BR57: one row per purpose, and the two optional ones are
  -- written only when actually granted.
  insert into consent (club_id, person_id, purpose, granted_by_person_id)
  values (p_club_id, v_person_id, 'REGISTRATION_COLLECTION_NOTICE', v_consent_by);

  if p_consent_photograph is true then
    insert into consent (club_id, person_id, purpose, granted_by_person_id)
    values (p_club_id, v_person_id, 'IDENTIFICATION_PHOTOGRAPH', v_consent_by);
  end if;

  if p_consent_publicity is true then
    insert into consent (club_id, person_id, purpose, granted_by_person_id)
    values (p_club_id, v_person_id, 'PUBLICITY', v_consent_by);
  end if;

  insert into registration (club_id, person_id, season_id, status, outstanding_amount_cents)
  values (
    p_club_id, v_person_id, p_season_id, 'DRAFT',
    coalesce(v_season.registration_fee_cents, 0)
  )
  returning id into v_registration_id;

  insert into person_role (club_id, person_id, season_id, role)
  values (p_club_id, v_person_id, p_season_id, 'player')
  on conflict do nothing;

  -- BR2 needs rows to check against, or it passes on everything.
  foreach v_doc_type in array coalesce(v_season.required_document_types, '{}'::text[])
  loop
    insert into registration_document (club_id, registration_id, document_type, required)
    values (p_club_id, v_registration_id, v_doc_type, true)
    on conflict do nothing;
  end loop;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (
    p_club_id, p_actor_user_id, 'registration_created', 'registration',
    v_registration_id,
    jsonb_build_object(
      'isMinor', v_is_minor,
      'guardianReused', v_guardian_reused,
      'documentsRequired', coalesce(array_length(v_season.required_document_types, 1), 0),
      'feeCents', coalesce(v_season.registration_fee_cents, 0)
    )
  );

  return v_registration_id;
end;
$$;

-- Only signed-in club officers. `anon` reaches it solely through
-- submit_public_registration below, which runs as the owner, so the inner
-- call needs no grant of its own.
revoke all on function app_create_registration(
  uuid, uuid, text, text, text, date, text, text, text, text,
  boolean, boolean, boolean, uuid
) from public;

grant execute on function app_create_registration(
  uuid, uuid, text, text, text, date, text, text, text, text,
  boolean, boolean, boolean, uuid
) to authenticated;

-- ------------------------------------------- the two surfaces, both thin

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
  v_registration_id uuid;
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

  -- The tenant is still not an argument: it comes from the invitation the
  -- token resolved to, so nothing a caller can set reaches another club.
  v_registration_id := app_create_registration(
    v_invitation.club_id, v_invitation.season_id,
    p_legal_given_names, p_legal_family_name, p_preferred_name,
    p_date_of_birth, p_email,
    p_guardian_given_names, p_guardian_family_name, p_guardian_email,
    p_consent_collection_notice, p_consent_photograph, p_consent_publicity,
    null
  );

  -- BR73: every use is recorded against the invitation.
  update registration_invitation
     set use_count = use_count + 1
   where id = v_invitation.id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (
    v_invitation.club_id, null, 'public_registration_submitted', 'registration',
    v_registration_id, jsonb_build_object('invitationId', v_invitation.id)
  );

  return v_registration_id;
end;
$$;

-- The registrar-assisted surface. SECURITY INVOKER: the club is an
-- argument, and RLS is what proves the caller may write there. A registrar
-- passing another club's id inserts nothing.
create function submit_club_registration(
  p_club_id                   uuid,
  p_season_id                 uuid,
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
set search_path = public, extensions, pg_temp
as $$
begin
  return app_create_registration(
    p_club_id, p_season_id,
    p_legal_given_names, p_legal_family_name, p_preferred_name,
    p_date_of_birth, p_email,
    p_guardian_given_names, p_guardian_family_name, p_guardian_email,
    p_consent_collection_notice, p_consent_photograph, p_consent_publicity,
    auth.uid()
  );
end;
$$;

revoke all on function submit_club_registration(
  uuid, uuid, text, text, text, date, text, text, text, text, boolean, boolean, boolean
) from public;

grant execute on function submit_club_registration(
  uuid, uuid, text, text, text, date, text, text, text, text, boolean, boolean, boolean
) to authenticated;

-- --------------------------------------------------- BR82: merging a human

-- A tombstone, not a delete. The duplicate row stays and points at the
-- survivor, so a stale link still resolves, the merge is auditable, and
-- nothing can re-create the same duplicate silently.
alter table person
  add column merged_into_person_id uuid references person(id),
  add constraint person_not_merged_into_itself
    check (merged_into_person_id is null or merged_into_person_id <> id);

create index person_merged_idx on person (club_id) where merged_into_person_id is null;

comment on column person.merged_into_person_id is
  'BR82: set when a human confirmed this record duplicates another. The row is kept; the survivor is the one it points at.';

/**
 * Fold one Person into another.
 *
 * SECURITY INVOKER, so RLS decides whether the caller may touch these rows,
 * and both must be in the same club -- checked explicitly as well, because
 * a cross-club merge would be the single most damaging thing this schema
 * could be asked to do.
 *
 * Never automatic. BR5 has always said a duplicate is surfaced for a human
 * and never silently merged; this is the function that human's decision
 * calls, and the audit event records which record they chose to keep.
 */
create function merge_person(
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

  -- Repoint everything that references the duplicate. `on conflict do
  -- nothing` throughout: where the survivor already holds the same role or
  -- guardianship, the duplicate's copy is simply dropped.
  update registration set person_id = p_survivor_id where person_id = p_duplicate_id;
  get diagnostics v_n = row_count; v_moved := v_moved + v_n;

  update consent set person_id = p_survivor_id where person_id = p_duplicate_id;
  get diagnostics v_n = row_count; v_moved := v_moved + v_n;

  update consent set granted_by_person_id = p_survivor_id
   where granted_by_person_id = p_duplicate_id;

  update submission_record set person_id = p_survivor_id where person_id = p_duplicate_id;

  -- Roles and guardianships can collide with the survivor's own, so move
  -- what does not and delete what does.
  delete from person_role dup
   where dup.person_id = p_duplicate_id
     and exists (
       select 1 from person_role keep
       where keep.person_id = p_survivor_id
         and keep.season_id = dup.season_id
         and keep.role = dup.role
     );
  update person_role set person_id = p_survivor_id where person_id = p_duplicate_id;

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

  -- The survivor keeps any contact detail it was missing, rather than the
  -- club losing an email because the duplicate happened to be the one with
  -- it.
  update person s
     set email = coalesce(s.email, d.email),
         preferred_name = coalesce(s.preferred_name, d.preferred_name),
         legal_name_verified_at = coalesce(s.legal_name_verified_at, d.legal_name_verified_at)
    from person d
   where s.id = p_survivor_id and d.id = p_duplicate_id;

  -- The tombstone keeps its own details. They are what the club recorded at
  -- the time, and blanking them to stop the row matching again would throw
  -- away the evidence that the merge was right. Every lookup filters on
  -- `merged_into_person_id is null` instead.
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

revoke all on function merge_person(uuid, uuid) from public;
grant execute on function merge_person(uuid, uuid) to authenticated;
