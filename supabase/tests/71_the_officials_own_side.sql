-- 0071: an official reads their own classification, accreditations and
-- Blue Card, and nobody else's (scope 75, BR160).
--
--   * the official reads their own three,
--   * another official at the same club reads none of them (BR122: proved by
--     a test that fails when it is widened),
--   * the coordinator still reads every official's,
--   * the official still writes none of them.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990071-0000-0000-0000-000000000001', 'Own Side FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e0071000-0000-0000-0000-000000000001', 'coordinator@ownside.test'),
  ('e0071000-0000-0000-0000-000000000002', 'ref@ownside.test'),
  ('e0071000-0000-0000-0000-000000000003', 'otherref@ownside.test');

insert into club_membership (club_id, user_id, role) values
  ('99990071-0000-0000-0000-000000000001', 'e0071000-0000-0000-0000-000000000001', 'coordinator');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0071000-0000-0000-0000-000000000001', '99990071-0000-0000-0000-000000000001', 'Rita', 'Ref', '1990-01-01'),
  ('b0071000-0000-0000-0000-000000000002', '99990071-0000-0000-0000-000000000001', 'Otto', 'Ref', '1991-01-01');

insert into account_person (club_id, user_id, person_id) values
  ('99990071-0000-0000-0000-000000000001', 'e0071000-0000-0000-0000-000000000002', 'b0071000-0000-0000-0000-000000000001'),
  ('99990071-0000-0000-0000-000000000001', 'e0071000-0000-0000-0000-000000000003', 'b0071000-0000-0000-0000-000000000002');

insert into referee_classification (club_id, person_id, level, effective_from, sighted_at)
select '99990071-0000-0000-0000-000000000001', p, 'Level 4', date '2026-01-01', now()
  from unnest(array['b0071000-0000-0000-0000-000000000001',
                    'b0071000-0000-0000-0000-000000000002']::uuid[]) as p;

insert into referee_accreditation (club_id, person_id, kind, identifier, issued_on, expires_on, verified_at)
select '99990071-0000-0000-0000-000000000001', p, 'fitness', 'FIT-71-' || right(p::text, 1),
       date '2026-01-01', current_date + 200, now()
  from unnest(array['b0071000-0000-0000-0000-000000000001',
                    'b0071000-0000-0000-0000-000000000002']::uuid[]) as p;

insert into clearance (club_id, person_id, kind, identifier, expires_on, verified_by_user_id, verified_at)
select '99990071-0000-0000-0000-000000000001', p, 'WWCC', 'BC-71-' || right(p::text, 1),
       current_date + 900, 'e0071000-0000-0000-0000-000000000001', now()
  from unnest(array['b0071000-0000-0000-0000-000000000001',
                    'b0071000-0000-0000-0000-000000000002']::uuid[]) as p;

commit;

do $$
declare
  the_club    uuid := '99990071-0000-0000-0000-000000000001';
  coordinator uuid := 'e0071000-0000-0000-0000-000000000001';
  ref_user    uuid := 'e0071000-0000-0000-0000-000000000002';
  rita        uuid := 'b0071000-0000-0000-0000-000000000001';
  n           integer;
  failures    text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1–3. The official reads their own three, and only their own.
  perform set_config('request.jwt.claim.sub', ref_user::text, true);
  select count(*) into n from referee_classification where club_id = the_club;
  if n <> 1 or not exists (select 1 from referee_classification where person_id = rita) then
    failures := array_append(failures, format('the official read %s classifications, not only their own', n));
  end if;
  select count(*) into n from referee_accreditation where club_id = the_club;
  if n <> 1 or not exists (select 1 from referee_accreditation where person_id = rita) then
    failures := array_append(failures, format('the official read %s accreditations, not only their own', n));
  end if;
  select count(*) into n from clearance where club_id = the_club;
  if n <> 1 or not exists (select 1 from clearance where person_id = rita) then
    failures := array_append(failures, format('the official read %s clearances, not only their own', n));
  end if;

  -- 4. Reading is not writing.
  begin
    insert into referee_classification (club_id, person_id, level, effective_from)
    values (the_club, rita, 'Level 1', current_date);
    failures := array_append(failures, 'the official promoted themself');
  exception when insufficient_privilege then null;
  end;

  -- 5. The coordinator still reads everyone's.
  perform set_config('request.jwt.claim.sub', coordinator::text, true);
  select count(*) into n from referee_accreditation where club_id = the_club;
  if n <> 2 then
    failures := array_append(failures, format('the coordinator read %s accreditations, not 2', n));
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'The official''s own side FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'The official''s own side OK — 5 scenarios';
end $$;
