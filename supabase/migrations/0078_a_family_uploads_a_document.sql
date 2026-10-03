-- 0078 — A family uploads a document (scope 83; BR2, BR165).
--
-- The guardian workspace has said since scope 35 that a missing document
-- "will be uploadable here", while the registrar recorded what the family
-- brought in person. Built October 2026 at the club's request.
--
-- **Uploading is submitting, not providing.** BR2 asks whether the club has
-- the document; a file a family sent is a claim that it does, exactly as a
-- voucher PDF is (BR81). So a family upload records `submitted_at` and who
-- sent it; `provided_at` stays the registrar's, set when they have looked
-- (the existing "Mark received"). A registration is never completed by an
-- upload nobody opened.
--
-- Who may submit is who answers for the player (`app_may_answer_designation`,
-- 0075): an authority guardian, or the player from thirteen. Files live in a
-- private bucket under `<club_id>/<registration_id>/…`, and the policies check
-- both segments.

alter table registration_document
  add column submitted_at           timestamptz,
  add column submitted_by_person_id uuid references person(id);

comment on column registration_document.submitted_at is
  'BR165: when a family uploaded the file. Not provided_at, which stays the '
  'registrar''s statement that the club has looked at it (BR2).';

-- -------------------------------------------- who may submit for a registration

create or replace function app_may_submit_for_registration(p_club_id uuid, p_registration_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from registration r
     where r.id = p_registration_id
       and r.club_id = p_club_id
       and exists (
         select 1 from app_may_answer_designation(r.person_id, r.club_id, current_date) a
          where a in (select app_my_person_ids()))
  )
$$;

revoke all on function app_may_submit_for_registration(uuid, uuid) from public;
grant execute on function app_may_submit_for_registration(uuid, uuid) to authenticated;

-- ------------------------------------------------------------ the submission

create or replace function app_submit_registration_document(p_document_id uuid, p_storage_path text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_doc    registration_document;
  v_person uuid;
begin
  select * into v_doc from registration_document where id = p_document_id;
  if v_doc.id is null then
    raise exception 'No such document.';
  end if;
  if not app_may_submit_for_registration(v_doc.club_id, v_doc.registration_id) then
    raise exception 'Only whoever answers for this player may send their documents (BR165).'
      using errcode = '42501';
  end if;
  if p_storage_path is null
     or p_storage_path not like v_doc.club_id::text || '/' || v_doc.registration_id::text || '/%' then
    raise exception 'That file is not filed under this registration.';
  end if;

  -- The submitter is the caller's own Person that answers for the player.
  select a into v_person
    from registration r, app_may_answer_designation(r.person_id, r.club_id, current_date) a
   where r.id = v_doc.registration_id and a in (select app_my_person_ids())
   limit 1;

  update registration_document
     set storage_path = p_storage_path,
         submitted_at = now(),
         submitted_by_person_id = v_person
   where id = p_document_id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_doc.club_id, auth.uid(), 'registration_document_submitted', 'registration_document', p_document_id,
          jsonb_build_object('document_type', v_doc.document_type));
end;
$$;

revoke all on function app_submit_registration_document(uuid, text) from public;
grant execute on function app_submit_registration_document(uuid, text) to authenticated;

-- -------------------------------------------------------------------- storage
-- Guarded: the local test Postgres has no `storage` schema.

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('registration-documents', 'registration-documents', false)
    on conflict (id) do nothing;

    execute $p$
      create policy registration_document_files_read on storage.objects
        for select using (
          bucket_id = 'registration-documents'
          and (app_has_role((storage.foldername(name))[1]::uuid, array['admin', 'registrar'])
               or app_may_submit_for_registration((storage.foldername(name))[1]::uuid, (storage.foldername(name))[2]::uuid))
        )
    $p$;

    execute $p$
      create policy registration_document_files_write on storage.objects
        for insert with check (
          bucket_id = 'registration-documents'
          and (app_has_role((storage.foldername(name))[1]::uuid, array['admin', 'registrar'])
               or app_may_submit_for_registration((storage.foldername(name))[1]::uuid, (storage.foldername(name))[2]::uuid))
        )
    $p$;

    execute $p$
      create policy registration_document_files_remove on storage.objects
        for delete using (
          bucket_id = 'registration-documents'
          and app_has_role((storage.foldername(name))[1]::uuid, array['admin', 'registrar'])
        )
    $p$;
  end if;
end
$$;
