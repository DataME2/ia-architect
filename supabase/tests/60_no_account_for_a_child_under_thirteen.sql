-- BR63 on account_person (0060): no path links a login to a child under 13.
--
--   * link_account_to_person refuses a twelve-year-old, naming BR63,
--   * the same login links to the parent,
--   * an adult whose birth date is the 1900-01-01 placeholder is allowed,
--   * re-pointing an existing link at a child is refused too.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99996000-0000-0000-0000-000000000001', 'Child Link Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e6000000-0000-0000-0000-000000000001', 'admin@childlink.test'),
  ('e6000000-0000-0000-0000-000000000002', 'mum@childlink.test'),
  ('e6000000-0000-0000-0000-000000000003', 'imported@childlink.test');

insert into club_membership (club_id, user_id, role) values
  ('99996000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000001', 'admin'),
  ('99996000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000002', 'committee'),
  ('99996000-0000-0000-0000-000000000001', 'e6000000-0000-0000-0000-000000000003', 'committee');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b6000000-0000-0000-0000-000000000001', '99996000-0000-0000-0000-000000000001', 'Karen', 'Alfonso', current_date - interval '39 years'),
  ('b6000000-0000-0000-0000-000000000002', '99996000-0000-0000-0000-000000000001', 'Sebastian', 'Alfonso', current_date - interval '12 years'),
  ('b6000000-0000-0000-0000-000000000003', '99996000-0000-0000-0000-000000000001', 'Imported', 'Parent', '1900-01-01');

commit;

do $$
declare
  admin_user uuid := 'e6000000-0000-0000-0000-000000000001';
  mum_login  uuid := 'e6000000-0000-0000-0000-000000000002';
  imported   uuid := 'e6000000-0000-0000-0000-000000000003';
  mum        uuid := 'b6000000-0000-0000-0000-000000000001';
  son        uuid := 'b6000000-0000-0000-0000-000000000002';
  parent_1900 uuid := 'b6000000-0000-0000-0000-000000000003';
  n          integer;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_user::text, true);

  -- 1. The mistake that happened: a mother's login linked to her son.
  begin
    perform link_account_to_person(mum_login, son);
    failures := array_append(failures, 'a login was linked to a twelve-year-old (BR63)');
  exception when others then
    if sqlerrm not like '%BR63%' then
      failures := array_append(failures, 'the refusal did not cite BR63: ' || sqlerrm);
    end if;
  end;

  -- 2. The same login links to the parent.
  begin
    perform link_account_to_person(mum_login, mum);
  exception when others then
    failures := array_append(failures, 'the parent could not be linked: ' || sqlerrm);
  end;

  -- 3. An adult with the 1900-01-01 placeholder is not treated as a child.
  begin
    perform link_account_to_person(imported, parent_1900);
  exception when others then
    failures := array_append(failures, 'an unrecorded birth date was refused as a child: ' || sqlerrm);
  end;

  -- 4. Re-pointing an existing link at the child is refused as well.
  begin
    perform link_account_to_person(mum_login, son);
    failures := array_append(failures, 'an existing link was re-pointed at a child');
  exception when others then null;
  end;

  perform set_config('role', 'postgres', true);
  select count(*) into n from account_person where user_id = mum_login and person_id = mum;
  if n <> 1 then
    failures := array_append(failures, 'the parent''s link did not survive the refused re-point');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'No account for a child FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'No account for a child OK — 4 scenarios';
end
$$;
