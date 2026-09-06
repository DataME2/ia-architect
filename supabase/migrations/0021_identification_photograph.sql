-- 0021 — The identification photograph: a bucket, and the consent BR56
-- has always required and nothing has ever checked.
--
-- `person.photo_path` has existed since the first migration. Nothing wrote
-- it, so nothing needed to check anything — and BR56's requirement that a
-- minor's photograph be held only under a consent recorded *for that
-- purpose* has been documented and unenforced the whole time.
--
-- Adding the uploader without the check is how that stays true. So the
-- check goes in first, in the database, where a second screen cannot get it
-- wrong later.

alter table person
  -- When the photograph was last replaced. Cache-busting is the small
  -- reason; the real one is that "how old is this picture of this child"
  -- is a question a club will eventually ask, and a storage path cannot
  -- answer it.
  add column photo_updated_at timestamptz;

-- ------------------------------------------------- the consent BR56 needs

create or replace function assert_photograph_is_consented()
returns trigger
language plpgsql
as $$
begin
  -- Only the transition *into* holding a photograph is checked. Clearing
  -- one is always allowed: a consent being withdrawn must never leave the
  -- club unable to remove the picture it covered.
  if new.photo_path is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.photo_path is not distinct from new.photo_path then
    return new;
  end if;

  if not exists (
    select 1 from consent
     where person_id = new.id
       and purpose = 'IDENTIFICATION_PHOTOGRAPH'
       and revoked_at is null
  ) then
    raise exception
      'no unrevoked identification-photograph consent for this person (BR56)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger person_photograph_is_consented
  before insert or update on person
  for each row execute function assert_photograph_is_consented();

comment on function assert_photograph_is_consented() is
  'BR56 — a photograph is held only under a consent recorded for that '
  'purpose. Checked on the way in; removal is always permitted, because a '
  'withdrawn consent must not trap the picture it covered.';

-- ---------------------------------------------------------------- storage
-- A third private bucket. Same club-scoped path convention as vouchers and
-- clearances -- the club id is the first path segment and the policy checks
-- exactly that segment.
--
-- Read reaches the roles that need to identify a player: admin, registrar,
-- coordinator and coach, matching `player_profile`. Write is narrower --
-- admin and registrar -- because collecting and attaching identity material
-- is registration work, and a coach uploading a photograph of a child is
-- not a workflow anybody asked for.
--
-- Guarded, because the local test Postgres has no `storage` schema.

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('photos', 'photos', false)
    on conflict (id) do nothing;

    execute $p$
      create policy photo_files_read on storage.objects
        for select using (
          bucket_id = 'photos'
          and app_has_role((storage.foldername(name))[1]::uuid,
                           array['admin','registrar','coordinator','coach'])
        )
    $p$;

    execute $p$
      create policy photo_files_write on storage.objects
        for insert with check (
          bucket_id = 'photos'
          and app_has_role((storage.foldername(name))[1]::uuid, array['admin','registrar'])
        )
    $p$;

    -- Replacing a photograph is an update to the same object, and removing
    -- one has to be possible when a consent is withdrawn (BR48) or an
    -- erasure is honoured (BR49). Both stay with the roles that may write.
    execute $p$
      create policy photo_files_replace on storage.objects
        for update using (
          bucket_id = 'photos'
          and app_has_role((storage.foldername(name))[1]::uuid, array['admin','registrar'])
        )
        with check (
          bucket_id = 'photos'
          and app_has_role((storage.foldername(name))[1]::uuid, array['admin','registrar'])
        )
    $p$;

    execute $p$
      create policy photo_files_remove on storage.objects
        for delete using (
          bucket_id = 'photos'
          and app_has_role((storage.foldername(name))[1]::uuid, array['admin','registrar'])
        )
    $p$;
  end if;
end
$$;
