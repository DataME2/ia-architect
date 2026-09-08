-- Vouchers attached for manual verification, and one guardian per family.
--
-- Two things, both driven by the same population: MiniRoos. Most MiniRoos
-- families arrive with a government voucher (Queensland Play On!, the
-- pilot club's Committee-approved program under BR21), and most of them
-- have more than one child.
--
--   BR80  a family registering a second child shares the guardian they
--         already have, rather than acquiring a second copy of themselves.
--   BR81  attaching a voucher changes nothing until a club officer
--         verifies it. The balance stands, so BR3 keeps failing and BR79
--         keeps the player off the field.
--
-- Realises the voucher application and claim process
-- (docs/ea/2_business/3_business-processes.md#voucher-application-and-claim-process),
-- as far as the manual half of it goes.

-- --------------------------------------------------------------- vouchers

create table registration_voucher (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references club(id) on delete cascade,
  registration_id     uuid not null references registration(id) on delete cascade,
  -- The program is configuration, never code (BR21) -- six state schemes
  -- exist and a club may be approved for more than one.
  program             text not null check (length(btrim(program)) > 0),
  code                text not null check (length(btrim(code)) > 0),
  -- What the family says it is worth. Applied only on verification.
  face_value_cents    integer not null check (face_value_cents > 0),
  state               text not null default 'ATTACHED'
    check (state in ('ATTACHED','VERIFIED','REJECTED','CLAIMED')),
  -- Path in Storage. Null where a code was recorded without the document.
  file_path           text,
  attached_by_user_id uuid not null,
  attached_at         timestamptz not null default now(),
  verified_by_user_id uuid,
  verified_at         timestamptz,
  rejection_reason    text,
  -- BR81's other half: the receipt that carries the relief. Set when the
  -- voucher is verified, so the discount lives in the same ledger as every
  -- other payment rather than in a column of its own.
  relief_payment_id   uuid references payment(id),
  -- One code per club: a government voucher is single-use, and the same
  -- code appearing on two children is either a mistake or a duplicate
  -- claim. Either way a human should see it rather than the club
  -- discovering it when the reimbursement is refused.
  unique (club_id, code)
);
create index registration_voucher_registration_idx
  on registration_voucher (registration_id, state);

comment on table registration_voucher is
  'BR81: ATTACHED changes nothing. Only VERIFIED reduces what a family owes, and it does so by recording a payment of method voucher.';

-- A verified voucher must carry the receipt that applied it, and an
-- unverified one must not. Without this a voucher could be marked verified
-- with no money moving, which is a discount nobody can trace.
alter table registration_voucher
  add constraint registration_voucher_relief_matches_state
  check (
    (state in ('VERIFIED','CLAIMED') and relief_payment_id is not null)
    or (state in ('ATTACHED','REJECTED') and relief_payment_id is null)
  );

alter table registration_voucher enable row level security;

-- Any club member may see that a voucher is waiting -- a registrar chasing
-- BR3 needs to know a family has already done their part. Attaching is
-- open to the registrar too, because collecting the document is
-- registration work; only admin or treasurer may *verify*, because that is
-- the act that moves money (BR22, BR78).
create policy registration_voucher_select on registration_voucher
  for select using (club_id in (select app_member_club_ids()));

create policy registration_voucher_attach on registration_voucher
  for insert with check (
    app_has_role(club_id, array['admin','registrar','treasurer'])
    and state = 'ATTACHED'
    and relief_payment_id is null
  );

create policy registration_voucher_decide on registration_voucher
  for update using (app_has_role(club_id, array['admin','treasurer']))
  with check (app_has_role(club_id, array['admin','treasurer']));

-- No delete policy, deliberately. A voucher that was attached and rejected
-- is the evidence that the club looked -- deleting it loses the fact that
-- a family ever claimed one.

-- ---------------------------------------------------------------- storage
-- The bucket lives in Supabase's `storage` schema, which the local test
-- Postgres does not have. Guarded so the migration applies to both; the
-- consequence is that these policies are NOT covered by
-- supabase/tests/*.sql, and that is recorded in the scope document rather
-- than left to be discovered.

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('vouchers', 'vouchers', false)
    on conflict (id) do nothing;

    -- Private in both directions. The path is `<club_id>/<registration_id>/<file>`,
    -- and the first segment is what the policy checks -- so a member of one
    -- club cannot read or write another club's folder even knowing the path.
    execute $p$
      create policy voucher_files_read on storage.objects
        for select using (
          bucket_id = 'vouchers'
          and (storage.foldername(name))[1]::uuid in (select app_member_club_ids())
        )
    $p$;

    execute $p$
      create policy voucher_files_write on storage.objects
        for insert with check (
          bucket_id = 'vouchers'
          and app_has_role((storage.foldername(name))[1]::uuid,
                           array['admin','registrar','treasurer'])
        )
    $p$;
  end if;
end
$$;

-- ------------------------------------------- BR80: one guardian per family
-- Replaced rather than edited: 0006 has been applied.
--
-- The bug this fixes is quiet and common. The guardian insert was
-- unconditional, so a parent registering a second child got a *second*
-- Person record -- and a third for the third child. P1 says a guardian is
-- one Person holding a role, and the running system was manufacturing
-- copies of the most common family shape in the club. BR5 would eventually
-- flag them as duplicates, which means the club's reward for having two
-- children was a duplicate-resolution task.
--
-- The match is by email, normalised, within the club, and only against
-- someone who already holds a guardian role. That is not the silent merge
-- BR5 forbids: nothing existing is combined, a second copy is simply not
-- created. Where no email is given the old behaviour stands and BR5 does
-- its job.

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
  v_guardian_email text;
  v_guardian_reused boolean := false;
begin
  if p_token is null or length(btrim(p_token)) = 0 then
    raise exception 'invitation_invalid' using errcode = '28000';
  end if;

  select * into v_invitation
  from registration_invitation
  where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  if not found
     or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= now() then
    raise exception 'invitation_invalid' using errcode = '28000';
  end if;

  select * into v_season from season where id = v_invitation.season_id;

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

  if v_is_minor and (
       length(btrim(coalesce(p_guardian_given_names, ''))) = 0
       or length(btrim(coalesce(p_guardian_family_name, ''))) = 0
     ) then
    raise exception 'guardian_required' using errcode = '22000';
  end if;

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
    v_guardian_email := nullif(lower(btrim(coalesce(p_guardian_email, ''))), '');

    -- BR80: the same adult, registering a second child, is the same Person.
    if v_guardian_email is not null then
      select p.id into v_guardian_id
      from person p
      where p.club_id = v_invitation.club_id
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
        v_invitation.club_id,
        btrim(p_guardian_given_names),
        btrim(p_guardian_family_name),
        date '1900-01-01',
        v_guardian_email
      )
      returning id into v_guardian_id;
    end if;

    insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact)
    values (v_invitation.club_id, v_person_id, v_guardian_id, true, true)
    on conflict do nothing;

    insert into person_role (club_id, person_id, season_id, role)
    values (v_invitation.club_id, v_guardian_id, v_invitation.season_id, 'guardian')
    on conflict do nothing;

    v_consent_by := v_guardian_id;
  end if;

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

  foreach v_doc_type in array coalesce(v_season.required_document_types, '{}'::text[])
  loop
    insert into registration_document (club_id, registration_id, document_type, required)
    values (v_invitation.club_id, v_registration_id, v_doc_type, true)
    on conflict do nothing;
  end loop;

  update registration_invitation
     set use_count = use_count + 1
   where id = v_invitation.id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (
    v_invitation.club_id, null, 'public_registration_submitted', 'registration',
    v_registration_id,
    jsonb_build_object(
      'invitationId', v_invitation.id,
      'isMinor', v_is_minor,
      'guardianReused', v_guardian_reused
    )
  );

  return v_registration_id;
end;
$$;
