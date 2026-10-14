-- 0091 — The Blue Card administrator stores the scan (scope 96).
--
-- Reported during QA: qa.bluecard could verify a card but could not store
-- its scan — "new row violates row-level security policy for table
-- objects". 0012 created the `clearances` bucket with its policies
-- deliberately "matching the `clearance` table's own policy": admin and
-- registrar. 0051 then widened the table to the two roles whose job it is
-- — the Blue Card Administrator and the IT Manager (scope 62) — and left
-- the bucket where it was. So the role named for this work could write the
-- record and not the file the record points at, and could not open a scan
-- somebody else had stored.
--
-- Both storage policies now name exactly `clearance_manage`'s four roles,
-- so the file and the record cannot disagree again without one of these
-- two lines changing. Still the club's own folder only: the first path
-- segment is the club id, checked by `app_has_role` as before (P5).
--
-- Guarded like 0012, because the throwaway Postgres the RLS suite runs on
-- has no `storage` schema; checked live on the development project instead.

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy if exists clearance_files_read on storage.objects';
    execute 'drop policy if exists clearance_files_write on storage.objects';

    execute $p$
      create policy clearance_files_read on storage.objects
        for select using (
          bucket_id = 'clearances'
          and app_has_role((storage.foldername(name))[1]::uuid,
                           array['admin','registrar','digital_technology_manager','blue_card_administrator'])
        )
    $p$;

    execute $p$
      create policy clearance_files_write on storage.objects
        for insert with check (
          bucket_id = 'clearances'
          and app_has_role((storage.foldername(name))[1]::uuid,
                           array['admin','registrar','digital_technology_manager','blue_card_administrator'])
        )
    $p$;
  end if;
end
$$;

insert into schema_migration_log (version, name) values
  ('0091', '0091_the_blue_card_administrator_stores_the_scan');
