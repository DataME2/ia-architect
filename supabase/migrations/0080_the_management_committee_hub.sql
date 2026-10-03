-- 0080 — The Management Committee Hub (scope 81; BR168).
--
-- The committee's minutes (its "acts"), agendas and reports had nowhere to
-- live. The club asked, October 2026, for one place per club, controlled by
-- the IT Manager, with SharePoint for the clubs that run Microsoft 365.
--
--   * `committee_hub_settings` — where this club keeps its hub: the platform's
--     own private store, or the club's SharePoint library. Only the IT Manager
--     (or an admin) changes it.
--   * `committee_document` — one row per document: minutes, agenda, report,
--     constitution or other; optionally tied to a term and a resolution. It
--     points either at a file in the private `committee-hub` bucket, or at a
--     SharePoint URL — exactly one.
--
-- Who reads: the committee — admin, committee, secretary, treasurer, IT
-- manager, and anyone holding a live committee position. Who files: the
-- Secretary (who keeps the minutes), an admin or the IT Manager. Who removes:
-- the IT Manager or an admin.

create or replace function app_reads_committee_hub(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_has_role(p_club_id, array['admin', 'committee', 'secretary', 'treasurer', 'digital_technology_manager'])
      or exists (
        select 1 from committee_position cp
          join account_person ap on ap.club_id = cp.club_id and ap.person_id = cp.person_id
         where cp.club_id = p_club_id and cp.resigned_on is null and ap.user_id = auth.uid())
$$;

create or replace function app_files_committee_hub(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_has_role(p_club_id, array['admin', 'secretary', 'digital_technology_manager'])
$$;

create or replace function app_controls_committee_hub(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_has_role(p_club_id, array['admin', 'digital_technology_manager'])
$$;

revoke all on function app_reads_committee_hub(uuid) from public;
revoke all on function app_files_committee_hub(uuid) from public;
revoke all on function app_controls_committee_hub(uuid) from public;
grant execute on function app_reads_committee_hub(uuid) to authenticated;
grant execute on function app_files_committee_hub(uuid) to authenticated;
grant execute on function app_controls_committee_hub(uuid) to authenticated;

-- ---------------------------------------------------------------- settings

create table committee_hub_settings (
  club_id               uuid primary key references club(id) on delete cascade,
  storage               text not null default 'platform' check (storage in ('platform', 'sharepoint')),
  sharepoint_site_url   text check (sharepoint_site_url is null or sharepoint_site_url ~* '^https://[a-z0-9-]+\.sharepoint\.com/'),
  sharepoint_library_url text check (sharepoint_library_url is null or sharepoint_library_url ~* '^https://[a-z0-9-]+\.sharepoint\.com/'),
  updated_by_user_id    uuid,
  updated_at            timestamptz not null default now(),
  check (storage = 'platform' or sharepoint_library_url is not null)
);

alter table committee_hub_settings enable row level security;

create policy committee_hub_settings_select on committee_hub_settings
  for select using (app_reads_committee_hub(club_id));
create policy committee_hub_settings_manage on committee_hub_settings
  for all using (app_controls_committee_hub(club_id))
  with check (app_controls_committee_hub(club_id));

-- --------------------------------------------------------------- documents

create table committee_document (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references club(id) on delete cascade,
  term_id            uuid references committee_term(id) on delete set null,
  resolution_id      uuid references committee_resolution(id) on delete set null,
  kind               text not null check (kind in ('minutes', 'agenda', 'report', 'constitution', 'other')),
  title              text not null check (btrim(title) <> ''),
  meeting_on         date,
  storage_path       text,
  external_url       text check (external_url is null or external_url ~* '^https://[a-z0-9-]+\.sharepoint\.com/'),
  filed_by_user_id   uuid,
  filed_at           timestamptz not null default now(),
  check (num_nonnulls(storage_path, external_url) = 1),
  check (storage_path is null or storage_path like club_id::text || '/%')
);

create index committee_document_club_idx on committee_document (club_id, meeting_on desc nulls last);

alter table committee_document enable row level security;

create policy committee_document_select on committee_document
  for select using (app_reads_committee_hub(club_id));
create policy committee_document_file on committee_document
  for insert with check (app_files_committee_hub(club_id) and filed_by_user_id = auth.uid());
create policy committee_document_remove on committee_document
  for delete using (app_controls_committee_hub(club_id));

-- Filing and removing are audited by the database, not left to a screen.
create or replace function committee_document_is_audited()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r committee_document;
begin
  if tg_op = 'INSERT' then r := new; else r := old; end if;
  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (r.club_id, auth.uid(),
          case when tg_op = 'INSERT' then 'committee_document_filed' else 'committee_document_removed' end,
          'committee_document', r.id,
          jsonb_build_object('kind', r.kind, 'title', r.title, 'meeting_on', r.meeting_on));
  return r;
end;
$$;

create trigger committee_document_is_audited
  after insert or delete on committee_document
  for each row execute function committee_document_is_audited();

-- -------------------------------------------------------------------- storage

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('committee-hub', 'committee-hub', false)
    on conflict (id) do nothing;

    execute $p$
      create policy committee_hub_files_read on storage.objects
        for select using (bucket_id = 'committee-hub'
          and app_reads_committee_hub((storage.foldername(name))[1]::uuid))
    $p$;
    execute $p$
      create policy committee_hub_files_write on storage.objects
        for insert with check (bucket_id = 'committee-hub'
          and app_files_committee_hub((storage.foldername(name))[1]::uuid))
    $p$;
    execute $p$
      create policy committee_hub_files_remove on storage.objects
        for delete using (bucket_id = 'committee-hub'
          and app_controls_committee_hub((storage.foldername(name))[1]::uuid))
    $p$;
  end if;
end
$$;
