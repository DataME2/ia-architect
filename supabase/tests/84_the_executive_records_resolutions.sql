-- 0084: the Secretary and Treasurer record committee resolutions (scope 86;
-- BR123 amended).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990084-0000-0000-0000-000000000001', 'Resolved FC', 'AU-QLD');

insert into committee_term (id, club_id, name, starts_on, next_agm_due_on) values
  ('99990084-0000-0000-0000-0000000000aa', '99990084-0000-0000-0000-000000000001', '2026–27',
   current_date - 30, current_date + 330);

insert into auth.users (id, email) values
  ('d0084000-0000-0000-0000-000000000001', 'secretary@resolved.test'),
  ('d0084000-0000-0000-0000-000000000002', 'treasurer@resolved.test'),
  ('d0084000-0000-0000-0000-000000000003', 'registrar@resolved.test');

insert into club_membership (club_id, user_id, role) values
  ('99990084-0000-0000-0000-000000000001', 'd0084000-0000-0000-0000-000000000001', 'secretary'),
  ('99990084-0000-0000-0000-000000000001', 'd0084000-0000-0000-0000-000000000002', 'treasurer'),
  ('99990084-0000-0000-0000-000000000001', 'd0084000-0000-0000-0000-000000000003', 'registrar');

commit;

do $$
declare
  n        integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The Secretary records a resolution.
  perform set_config('request.jwt.claim.sub', 'd0084000-0000-0000-0000-000000000001', true);
  begin
    insert into committee_resolution (club_id, term_id, decided_on, summary, category)
    values ('99990084-0000-0000-0000-000000000001', '99990084-0000-0000-0000-0000000000aa', current_date,
            'Minutes of the July meeting adopted', 'general');
  exception when insufficient_privilege then
    failures := array_append(failures, 'the Secretary could not record a resolution');
  end;

  -- 2. So does the Treasurer.
  perform set_config('request.jwt.claim.sub', 'd0084000-0000-0000-0000-000000000002', true);
  begin
    insert into committee_resolution (club_id, term_id, decided_on, summary, category)
    values ('99990084-0000-0000-0000-000000000001', '99990084-0000-0000-0000-0000000000aa', current_date,
            'Budget adopted', 'general');
  exception when insufficient_privilege then
    failures := array_append(failures, 'the Treasurer could not record a resolution');
  end;

  -- 3. A registrar still cannot.
  perform set_config('request.jwt.claim.sub', 'd0084000-0000-0000-0000-000000000003', true);
  begin
    insert into committee_resolution (club_id, term_id, decided_on, summary, category)
    values ('99990084-0000-0000-0000-000000000001', '99990084-0000-0000-0000-0000000000aa', current_date,
            'Not theirs to record', 'general');
    failures := array_append(failures, 'a registrar recorded a committee resolution');
  exception when insufficient_privilege then null;
  end;

  -- 4. Still append-only: the Secretary cannot edit what was recorded.
  perform set_config('request.jwt.claim.sub', 'd0084000-0000-0000-0000-000000000001', true);
  update committee_resolution set summary = 'Rewritten'
   where club_id = '99990084-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then
    failures := array_append(failures, 'a recorded resolution was edited');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'The executive records resolutions FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'The executive records resolutions OK — 4 scenarios';
end $$;
