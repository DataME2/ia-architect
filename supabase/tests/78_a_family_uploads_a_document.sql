-- 0078: a family uploads a document (scope 83; BR2, BR165). The bucket is
-- not in the local test database; the submission function is what is proved.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990078-0000-0000-0000-000000000001', 'Upload FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('99990078-0000-0000-0000-0000000000aa', '99990078-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days');

insert into auth.users (id, email) values
  ('d0078000-0000-0000-0000-000000000001', 'registrar@upload.test'),
  ('d0078000-0000-0000-0000-000000000002', 'mum@upload.test'),
  ('d0078000-0000-0000-0000-000000000003', 'other@upload.test');

insert into club_membership (club_id, user_id, role) values
  ('99990078-0000-0000-0000-000000000001', 'd0078000-0000-0000-0000-000000000001', 'registrar');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0078000-0000-0000-0000-000000000001', '99990078-0000-0000-0000-000000000001', 'Nine', 'Kid', (current_date - interval '9 years')::date),
  ('b0078000-0000-0000-0000-000000000002', '99990078-0000-0000-0000-000000000001', 'The', 'Mum', '1984-01-01'),
  ('b0078000-0000-0000-0000-000000000003', '99990078-0000-0000-0000-000000000001', 'Some', 'One', '1983-01-01');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99990078-0000-0000-0000-000000000001', 'b0078000-0000-0000-0000-000000000001', 'b0078000-0000-0000-0000-000000000002', true, true);

insert into account_person (club_id, user_id, person_id) values
  ('99990078-0000-0000-0000-000000000001', 'd0078000-0000-0000-0000-000000000002', 'b0078000-0000-0000-0000-000000000002'),
  ('99990078-0000-0000-0000-000000000001', 'd0078000-0000-0000-0000-000000000003', 'b0078000-0000-0000-0000-000000000003');

insert into registration (id, club_id, person_id, season_id, status) values
  ('99990078-0000-0000-0000-0000000000e1', '99990078-0000-0000-0000-000000000001', 'b0078000-0000-0000-0000-000000000001',
   '99990078-0000-0000-0000-0000000000aa', 'PENDING_DOCUMENTS');

insert into registration_document (id, club_id, registration_id, document_type, required) values
  ('99990078-0000-0000-0000-0000000000d1', '99990078-0000-0000-0000-000000000001',
   '99990078-0000-0000-0000-0000000000e1', 'Birth certificate', true);

commit;

do $$
declare
  doc      uuid := '99990078-0000-0000-0000-0000000000d1';
  good     text := '99990078-0000-0000-0000-000000000001/99990078-0000-0000-0000-0000000000e1/birth-certificate-1.pdf';
  v_sub    timestamptz;
  v_prov   timestamptz;
  v_by     uuid;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. Somebody who does not answer for the child cannot submit.
  perform set_config('request.jwt.claim.sub', 'd0078000-0000-0000-0000-000000000003', true);
  begin
    perform app_submit_registration_document(doc, good);
    failures := array_append(failures, 'an unrelated person submitted a child''s document');
  exception when insufficient_privilege then null;
  end;

  -- 2. The mother cannot file it under somebody else's registration.
  perform set_config('request.jwt.claim.sub', 'd0078000-0000-0000-0000-000000000002', true);
  begin
    perform app_submit_registration_document(doc, '99990078-0000-0000-0000-000000000001/somewhere-else/x.pdf');
    failures := array_append(failures, 'a file outside this registration''s folder was accepted');
  exception when others then null;
  end;

  -- 3. She submits it: submitted, by her, and NOT received (BR2).
  perform app_submit_registration_document(doc, good);
  perform set_config('role', 'postgres', true);
  select submitted_at, provided_at, submitted_by_person_id into v_sub, v_prov, v_by
    from registration_document where id = doc;
  if v_sub is null or v_by is distinct from 'b0078000-0000-0000-0000-000000000002'::uuid then
    failures := array_append(failures, 'the submission did not record when and by whom');
  end if;
  if v_prov is not null then
    failures := array_append(failures, 'an upload marked the document received (BR2 is the registrar''s)');
  end if;

  -- 4. The registrar still marks it received.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd0078000-0000-0000-0000-000000000001', true);
  update registration_document set provided_at = now() where id = doc;
  perform set_config('role', 'postgres', true);
  if not exists (select 1 from registration_document where id = doc and provided_at is not null) then
    failures := array_append(failures, 'the registrar could not mark the submitted document received');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'A family uploads a document FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'A family uploads a document OK — 4 scenarios';
end $$;
