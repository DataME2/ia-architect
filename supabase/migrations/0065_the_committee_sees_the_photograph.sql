-- 0065 — The committee sees the photograph on the player record (scope 70, BR157).
--
-- BR100 lets the identification photograph be shown "to club staff on a
-- player record". Migration 0021 read "club staff" as the four roles that
-- identify players on match day (admin, registrar, coordinator, coach), so
-- a committee member opening a player record whose photograph was on file
-- saw "No photo". The club reads BR100's club staff as including the
-- committee (BR157). The read policy gains that one role and nothing else:
-- writing, replacing and removing stay with the admin and registrar, and a
-- treasurer or viewer still reads no photograph.
--
-- Guarded like 0021, because the local test Postgres has no `storage` schema.

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute 'drop policy if exists photo_files_read on storage.objects';
    execute $p$
      create policy photo_files_read on storage.objects
        for select using (
          bucket_id = 'photos'
          and app_has_role((storage.foldername(name))[1]::uuid,
                           array['admin','registrar','coordinator','coach','committee'])
        )
    $p$;
  end if;
end
$$;
