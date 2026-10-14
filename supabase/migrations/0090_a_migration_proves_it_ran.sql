-- 0090 — A migration proves it ran (scope 94).
--
-- Twice now a migration merged to `main` and never reached the connected
-- Supabase project's schema cache — `committee_resolution` (scope 57,
-- found in scope 61) and `person_role_select_family` (scope 93) — and the
-- first anyone knew was a registrar's crash or a QA tester's missing role,
-- sometimes days later. Migrations here apply through Supabase's own
-- GitHub integration, with no second confirmation and nothing this
-- application could check against.
--
-- `schema_migration_log` is that check, owned entirely by this repository
-- rather than inferred from Supabase's own `supabase_migrations` schema —
-- whose exact shape (column names, whether it is exposed to PostgREST at
-- all) this codebase has no way to verify from outside a live project, and
-- building an alert on an assumption about it would be exactly the kind of
-- unverified claim this whole incident was about. Every migration from
-- this one onward ends with one `insert` naming itself (`scripts/check_migration_receipt.py`
-- fails the build if it does not); `/api/cron/migration-drift` compares the
-- newest row here against the version the deployed build expects, hourly,
-- and alerts the platform's own operators (`PLATFORM_ALERT_TO`, BR146) the
-- moment the two disagree.

create table schema_migration_log (
  version    text primary key,
  name       text not null,
  applied_at timestamptz not null default now()
);

alter table schema_migration_log enable row level security;

-- No policy permits anything through the API, in either direction — the
-- same isolation `platform_admin` uses (0016). The cron job reads it with
-- the service-role client, which bypasses RLS entirely; nothing else
-- should ever touch this table, and a policy an application could satisfy
-- would defeat the point of an independent receipt.
create policy schema_migration_log_no_api_access on schema_migration_log
  for all using (false) with check (false);

insert into schema_migration_log (version, name) values
  ('0090', '0090_a_migration_proves_it_ran');
