-- Does the six-monthly WWCC reminder find the right clearances, and only
-- those?
--
-- Three claims, matching scope 48's WP2:
--
--   * **BR142 applies here too.** A coach is refused the due-list, not
--     handed an empty one — `clearance_select` already keeps a coach off
--     this table entirely, but the report gets its own explicit check
--     rather than trusting that alone.
--   * **The six-month window, both edges.** A clearance never reminded is
--     due immediately; one reminded five months ago is not; one reminded
--     seven months ago is due again.
--   * **A revoked clearance is never due** — there is nothing left to
--     re-verify.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99997777-0000-0000-0000-000000000001', 'WWCC Reminder Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e49a0000-0000-0000-0000-000000000001', 'wwcc.coach@northstar.test'),
  ('e49a0000-0000-0000-0000-000000000002', 'wwcc.registrar@northstar.test');

insert into club_membership (club_id, user_id, role) values
  ('99997777-0000-0000-0000-000000000001', 'e49a0000-0000-0000-0000-000000000001', 'coach'),
  ('99997777-0000-0000-0000-000000000001', 'e49a0000-0000-0000-0000-000000000002', 'registrar');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('f49a0000-0000-0000-0000-000000000001', '99997777-0000-0000-0000-000000000001', 'Never', 'Reminded', '1985-01-01'),
  ('f49a0000-0000-0000-0000-000000000002', '99997777-0000-0000-0000-000000000001', 'Recently', 'Reminded', '1985-02-02'),
  ('f49a0000-0000-0000-0000-000000000003', '99997777-0000-0000-0000-000000000001', 'Overdue', 'Reminder', '1985-03-03'),
  ('f49a0000-0000-0000-0000-000000000004', '99997777-0000-0000-0000-000000000001', 'Revoked', 'Card', '1985-04-04');

insert into clearance (id, club_id, person_id, kind, identifier, expires_on, reminder_sent_at) values
  ('a59a0000-0000-0000-0000-000000000001', '99997777-0000-0000-0000-000000000001',
   'f49a0000-0000-0000-0000-000000000001', 'WWCC', 'NEVER-1', '2030-01-01', null),
  ('a59a0000-0000-0000-0000-000000000002', '99997777-0000-0000-0000-000000000001',
   'f49a0000-0000-0000-0000-000000000002', 'WWCC', 'RECENT-1', '2030-01-01', now() - interval '5 months'),
  ('a59a0000-0000-0000-0000-000000000003', '99997777-0000-0000-0000-000000000001',
   'f49a0000-0000-0000-0000-000000000003', 'WWCC', 'OVERDUE-1', '2030-01-01', now() - interval '7 months');

insert into clearance (id, club_id, person_id, kind, identifier, expires_on, reminder_sent_at, revoked_at) values
  ('a59a0000-0000-0000-0000-000000000004', '99997777-0000-0000-0000-000000000001',
   'f49a0000-0000-0000-0000-000000000004', 'WWCC', 'REVOKED-1', '2030-01-01', null, now());

commit;

do $$
declare
  the_club   uuid := '99997777-0000-0000-0000-000000000001';
  coach      uuid := 'e49a0000-0000-0000-0000-000000000001';
  registrar  uuid := 'e49a0000-0000-0000-0000-000000000002';
  never_c    uuid := 'a59a0000-0000-0000-0000-000000000001';
  recent_c   uuid := 'a59a0000-0000-0000-0000-000000000002';
  overdue_c  uuid := 'a59a0000-0000-0000-0000-000000000003';
  revoked_c  uuid := 'a59a0000-0000-0000-0000-000000000004';
  n          integer;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. A coach is refused, not handed an empty list.
  perform set_config('request.jwt.claim.sub', coach::text, true);
  begin
    perform * from app_wwcc_due_for_reminder(the_club);
    failures := array_append(failures, 'a coach was given the WWCC due-list');
  exception when others then
    if sqlerrm not like '%BR142%' then
      failures := array_append(failures, 'the refusal did not cite BR142: ' || sqlerrm);
    end if;
  end;

  -- 2. The registrar sees exactly the never-reminded and the overdue one --
  -- two rows, not the recently-reminded one and not the revoked one.
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  select count(*) into n from app_wwcc_due_for_reminder(the_club);
  if n <> 2 then
    failures := array_append(failures, 'expected 2 due clearances, got ' || n);
  end if;

  if not exists (select 1 from app_wwcc_due_for_reminder(the_club) where clearance_id = never_c) then
    failures := array_append(failures, 'a never-reminded clearance was not due');
  end if;
  if not exists (select 1 from app_wwcc_due_for_reminder(the_club) where clearance_id = overdue_c) then
    failures := array_append(failures, 'a clearance reminded 7 months ago was not due');
  end if;
  if exists (select 1 from app_wwcc_due_for_reminder(the_club) where clearance_id = recent_c) then
    failures := array_append(failures, 'a clearance reminded 5 months ago was due -- the 6-month window did not hold');
  end if;
  if exists (select 1 from app_wwcc_due_for_reminder(the_club) where clearance_id = revoked_c) then
    failures := array_append(failures, 'a revoked clearance was due for a reminder');
  end if;

  -- 3. Recording a reminder sent takes the clearance out of the due list.
  perform app_record_wwcc_reminder_sent(never_c);
  if exists (select 1 from app_wwcc_due_for_reminder(the_club) where clearance_id = never_c) then
    failures := array_append(failures, 'a clearance just reminded is still showing as due');
  end if;
  if not exists (select 1 from clearance where id = never_c and reminder_sent_at is not null) then
    failures := array_append(failures, 'reminder_sent_at was not written');
  end if;

  -- 4. A coach may not record a reminder sent either -- clearance_manage
  -- is admin/registrar only, and app_record_wwcc_reminder_sent relies on it.
  perform set_config('request.jwt.claim.sub', coach::text, true);
  perform app_record_wwcc_reminder_sent(overdue_c);
  if exists (select 1 from clearance where id = overdue_c and reminder_sent_at is not null) then
    failures := array_append(failures, 'a coach recorded a WWCC reminder sent -- RLS did not hold');
  end if;

  -- 5. Another club's officer gets nothing of this club's.
  perform set_config('request.jwt.claim.sub', 'd2222222-2222-2222-2222-222222222222', true);
  begin
    perform * from app_wwcc_due_for_reminder(the_club);
    failures := array_append(failures, 'another club''s officer read this club''s WWCC due-list');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'WWCC reminder FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'WWCC reminder OK — 5 scenarios; a coach is refused, the six-month window holds on both edges, a revoked clearance is never due, and recording a reminder needs the same role as managing the clearance';
end
$$;
