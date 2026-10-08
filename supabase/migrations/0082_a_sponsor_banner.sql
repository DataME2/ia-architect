-- 0082 — A sponsor banner (scope 84 extended; BR169, BR170, decision 17).
--
-- A campaign was text only. Clubs sell banners — the 728×90 leaderboard most
-- sponsors already have — so a campaign may carry one image.
--
-- **The image is ours to serve, never the sponsor's.** A banner hot-linked
-- from the sponsor's server would hand the sponsor every viewer's IP address
-- and browser on every view: exactly the tracking decision 17 rules out. So
-- the club uploads it to `sponsor-creatives`, a public bucket on the
-- platform's own storage (a banner is public material by nature), filed under
-- `<club_id>/…`; the click still goes through the platform's redirect.

alter table sponsor_campaign
  add column image_path text check (image_path is null or image_path like club_id::text || '/%');

comment on column sponsor_campaign.image_path is
  'Decision 17: a banner in the platform''s public sponsor-creatives bucket, never a sponsor-hosted URL.';

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('sponsor-creatives', 'sponsor-creatives', true, 1048576,
            array['image/png', 'image/jpeg', 'image/webp'])
    on conflict (id) do nothing;

    -- Public read comes from the bucket being public; only the club's admin
    -- or treasurer (or the platform) uploads or removes under its own folder.
    execute $p$
      create policy sponsor_creatives_write on storage.objects
        for insert with check (bucket_id = 'sponsor-creatives'
          and (app_has_role((storage.foldername(name))[1]::uuid, array['admin', 'treasurer']) or app_is_platform()))
    $p$;
    execute $p$
      create policy sponsor_creatives_remove on storage.objects
        for delete using (bucket_id = 'sponsor-creatives'
          and (app_has_role((storage.foldername(name))[1]::uuid, array['admin', 'treasurer']) or app_is_platform()))
    $p$;
  end if;
end
$$;
