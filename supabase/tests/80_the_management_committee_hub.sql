-- 0080: the Management Committee Hub (scope 81; BR168).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990080-0000-0000-0000-000000000001', 'Hub FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('d0080000-0000-0000-0000-000000000001', 'secretary@hub.test'),
  ('d0080000-0000-0000-0000-000000000002', 'treasurer@hub.test'),
  ('d0080000-0000-0000-0000-000000000003', 'it@hub.test'),
  ('d0080000-0000-0000-0000-000000000004', 'coach@hub.test');

insert into club_membership (club_id, user_id, role) values
  ('99990080-0000-0000-0000-000000000001', 'd0080000-0000-0000-0000-000000000001', 'secretary'),
  ('99990080-0000-0000-0000-000000000001', 'd0080000-0000-0000-0000-000000000002', 'treasurer'),
  ('99990080-0000-0000-0000-000000000001', 'd0080000-0000-0000-0000-000000000003', 'digital_technology_manager'),
  ('99990080-0000-0000-0000-000000000001', 'd0080000-0000-0000-0000-000000000004', 'coach');

commit;

do $$
declare
  the_club uuid := '99990080-0000-0000-0000-000000000001';
  doc      uuid;
  n        integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The Secretary files the minutes (a SharePoint link: the local test
  --    database has no storage).
  perform set_config('request.jwt.claim.sub', 'd0080000-0000-0000-0000-000000000001', true);
  insert into committee_document (club_id, kind, title, meeting_on, external_url, filed_by_user_id)
  values (the_club, 'minutes', 'Minutes, October', current_date,
          'https://hubfc.sharepoint.com/sites/Committee/Minutes/october.docx', 'd0080000-0000-0000-0000-000000000001')
  returning id into doc;

  -- 2. A link that is not the club's SharePoint is refused.
  begin
    insert into committee_document (club_id, kind, title, external_url, filed_by_user_id)
    values (the_club, 'agenda', 'Elsewhere', 'https://example.test/x.pdf', 'd0080000-0000-0000-0000-000000000001');
    failures := array_append(failures, 'a non-SharePoint link was filed');
  exception when check_violation then null;
  end;

  -- 3. The treasurer reads it but does not file.
  perform set_config('request.jwt.claim.sub', 'd0080000-0000-0000-0000-000000000002', true);
  select count(*) into n from committee_document where club_id = the_club;
  if n <> 1 then
    failures := array_append(failures, format('the treasurer read %s committee documents, not 1', n));
  end if;
  begin
    insert into committee_document (club_id, kind, title, external_url, filed_by_user_id)
    values (the_club, 'report', 'Treasurer report', 'https://hubfc.sharepoint.com/r.pdf', 'd0080000-0000-0000-0000-000000000002');
    failures := array_append(failures, 'the treasurer filed a committee document');
  exception when insufficient_privilege then null;
  end;
  delete from committee_document where id = doc;
  get diagnostics n = row_count;
  if n <> 0 then
    failures := array_append(failures, 'the treasurer removed a committee document');
  end if;

  -- 4. A coach reads nothing and configures nothing.
  perform set_config('request.jwt.claim.sub', 'd0080000-0000-0000-0000-000000000004', true);
  select count(*) into n from committee_document where club_id = the_club;
  if n <> 0 then
    failures := array_append(failures, 'a coach read the committee''s minutes');
  end if;
  begin
    insert into committee_hub_settings (club_id, storage, sharepoint_library_url)
    values (the_club, 'sharepoint', 'https://hubfc.sharepoint.com/sites/Committee/Shared%20Documents');
    failures := array_append(failures, 'a coach configured the hub');
  exception when insufficient_privilege then null;
  end;

  -- 5. The IT Manager configures SharePoint and removes the document.
  perform set_config('request.jwt.claim.sub', 'd0080000-0000-0000-0000-000000000003', true);
  insert into committee_hub_settings (club_id, storage, sharepoint_library_url)
  values (the_club, 'sharepoint', 'https://hubfc.sharepoint.com/sites/Committee/Shared%20Documents');
  delete from committee_document where id = doc;
  get diagnostics n = row_count;
  if n <> 1 then
    failures := array_append(failures, 'the IT Manager could not remove a committee document');
  end if;

  -- 6. Filing and removing are both audited.
  perform set_config('role', 'postgres', true);
  select count(*) into n from audit_event where entity = 'committee_document' and entity_id = doc;
  if n <> 2 then
    failures := array_append(failures, format('%s audit lines for filing and removing, not 2', n));
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'The Management Committee Hub FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'The Management Committee Hub OK — 6 scenarios';
end $$;
