-- Does an appointment really carry its access, and only through the people
-- allowed to confirm it? (scope 68, BR153/BR154)
--
--   * an admin confirming an unlinked person's function records an
--     invitation and grants nothing yet,
--   * following the link (claim_staff_access) links the account to that
--     Person and grants the mapped access,
--   * the current President — not an admin — may confirm; a treasurer
--     may not,
--   * a person whose account is already linked is granted at once,
--   * an ended appointment and a person with no email are refused,
--   * a claim never attaches an office to an account already linked to
--     somebody else,
--   * ending an appointment does not revoke its access (BR154).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99995900-0000-0000-0000-000000000001', 'Appointments Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e5900000-0000-0000-0000-000000000001', 'admin@appt.test'),
  ('e5900000-0000-0000-0000-000000000002', 'president@appt.test'),
  ('e5900000-0000-0000-0000-000000000003', 'treasurer@appt.test'),
  ('e5900000-0000-0000-0000-000000000004', 'someone.else@appt.test');

insert into club_membership (club_id, user_id, role) values
  ('99995900-0000-0000-0000-000000000001', 'e5900000-0000-0000-0000-000000000001', 'admin'),
  ('99995900-0000-0000-0000-000000000001', 'e5900000-0000-0000-0000-000000000002', 'committee'),
  ('99995900-0000-0000-0000-000000000001', 'e5900000-0000-0000-0000-000000000003', 'treasurer');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b5900000-0000-0000-0000-000000000001', '99995900-0000-0000-0000-000000000001', 'Pita', 'President',  '1980-01-01', 'president@appt.test'),
  ('b5900000-0000-0000-0000-000000000002', '99995900-0000-0000-0000-000000000001', 'Ira',  'Manager',    '1985-01-01', 'it.manager@appt.test'),
  ('b5900000-0000-0000-0000-000000000003', '99995900-0000-0000-0000-000000000001', 'Tia',  'Treasurer',  '1982-01-01', 'treasurer@appt.test'),
  ('b5900000-0000-0000-0000-000000000004', '99995900-0000-0000-0000-000000000001', 'Noe',  'Mail',       '1983-01-01', null),
  ('b5900000-0000-0000-0000-000000000005', '99995900-0000-0000-0000-000000000001', 'Taken','Already',    '1984-01-01', 'taken@appt.test');

insert into account_person (club_id, user_id, person_id) values
  ('99995900-0000-0000-0000-000000000001', 'e5900000-0000-0000-0000-000000000002', 'b5900000-0000-0000-0000-000000000001'),
  ('99995900-0000-0000-0000-000000000001', 'e5900000-0000-0000-0000-000000000003', 'b5900000-0000-0000-0000-000000000003'),
  ('99995900-0000-0000-0000-000000000001', 'e5900000-0000-0000-0000-000000000004', 'b5900000-0000-0000-0000-000000000005');

insert into committee_term (id, club_id, name, starts_on, next_agm_due_on) values
  ('f5900000-0000-0000-0000-000000000001', '99995900-0000-0000-0000-000000000001', '2026–27',
   current_date - 30, current_date + 300);

insert into committee_position (id, club_id, term_id, person_id, position) values
  ('c5900000-0000-0000-0000-000000000001', '99995900-0000-0000-0000-000000000001',
   'f5900000-0000-0000-0000-000000000001', 'b5900000-0000-0000-0000-000000000001', 'president'),
  ('c5900000-0000-0000-0000-000000000002', '99995900-0000-0000-0000-000000000001',
   'f5900000-0000-0000-0000-000000000001', 'b5900000-0000-0000-0000-000000000003', 'treasurer');

insert into club_function_appointment (id, club_id, person_id, kind, starts_on, ends_on) values
  ('d5900000-0000-0000-0000-000000000001', '99995900-0000-0000-0000-000000000001',
   'b5900000-0000-0000-0000-000000000002', 'it_manager', current_date - 1, null),
  ('d5900000-0000-0000-0000-000000000002', '99995900-0000-0000-0000-000000000001',
   'b5900000-0000-0000-0000-000000000002', 'coach', current_date - 90, current_date - 10),
  ('d5900000-0000-0000-0000-000000000003', '99995900-0000-0000-0000-000000000001',
   'b5900000-0000-0000-0000-000000000004', 'coach', current_date - 1, null),
  ('d5900000-0000-0000-0000-000000000004', '99995900-0000-0000-0000-000000000001',
   'b5900000-0000-0000-0000-000000000005', 'program_coordinator', current_date - 1, null);

commit;

do $$
declare
  the_club     uuid := '99995900-0000-0000-0000-000000000001';
  admin_user   uuid := 'e5900000-0000-0000-0000-000000000001';
  president_u  uuid := 'e5900000-0000-0000-0000-000000000002';
  treasurer_u  uuid := 'e5900000-0000-0000-0000-000000000003';
  it_person    uuid := 'b5900000-0000-0000-0000-000000000002';
  it_manager_f uuid := 'd5900000-0000-0000-0000-000000000001';
  ended_f      uuid := 'd5900000-0000-0000-0000-000000000002';
  no_email_f   uuid := 'd5900000-0000-0000-0000-000000000003';
  taken_f      uuid := 'd5900000-0000-0000-0000-000000000004';
  treasurer_o  uuid := 'c5900000-0000-0000-0000-000000000002';
  new_user     uuid := 'e5900000-0000-0000-0000-000000000009';
  outcome_     text;
  n            integer;
  failures     text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. An admin confirms an unlinked person's function: an invitation, no access yet.
  perform set_config('request.jwt.claim.sub', admin_user::text, true);
  select outcome into outcome_ from confirm_appointment_access(null, it_manager_f);
  if outcome_ is distinct from 'invited' then
    failures := array_append(failures, 'an unlinked person was not invited: ' || coalesce(outcome_, 'null'));
  end if;

  -- 2. A treasurer who is neither admin nor President may not confirm.
  perform set_config('request.jwt.claim.sub', treasurer_u::text, true);
  begin
    perform confirm_appointment_access(null, it_manager_f);
    failures := array_append(failures, 'a treasurer confirmed an appointment (BR153)');
  exception when others then
    if sqlerrm not like '%BR153%' then
      failures := array_append(failures, 'the treasurer refusal did not cite BR153: ' || sqlerrm);
    end if;
  end;

  -- 3. The current President — holding only `committee` access — may confirm,
  --    and a person already linked is granted at once.
  perform set_config('request.jwt.claim.sub', president_u::text, true);
  select outcome into outcome_ from confirm_appointment_access(treasurer_o, null);
  if outcome_ is distinct from 'granted' then
    failures := array_append(failures, 'the President could not grant a linked treasurer: ' || coalesce(outcome_, 'null'));
  end if;

  -- 4. An ended appointment carries nothing to confirm.
  begin
    perform confirm_appointment_access(null, ended_f);
    failures := array_append(failures, 'an ended appointment was confirmed');
  exception when others then null;
  end;

  -- 5. No email on record, no link to send.
  begin
    perform confirm_appointment_access(null, no_email_f);
    failures := array_append(failures, 'a person with no email was confirmed');
  exception when others then
    if sqlerrm not like '%no email%' then
      failures := array_append(failures, 'the no-email refusal was unclear: ' || sqlerrm);
    end if;
  end;

  -- 6. Confirm an appointment whose Person already belongs to another account.
  perform confirm_appointment_access(null, taken_f);

  perform set_config('role', 'postgres', true);

  select count(*) into n from club_membership where club_id = the_club and role = 'treasurer'
     and user_id = treasurer_u;
  if n <> 1 then
    failures := array_append(failures, 'the linked treasurer does not hold treasurer access');
  end if;

  -- The invited IT Manager arrives through the link.
  insert into auth.users (id, email) values (new_user, 'it.manager@appt.test');

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', new_user::text, true);
  select claim_staff_access() into n;
  if n <> 1 then
    failures := array_append(failures, 'claim_staff_access claimed ' || n || ' rows, expected 1');
  end if;

  perform set_config('role', 'postgres', true);

  select count(*) into n from account_person
   where club_id = the_club and user_id = new_user and person_id = it_person;
  if n <> 1 then
    failures := array_append(failures, 'the claim did not link the account to the named Person');
  end if;

  select count(*) into n from club_membership
   where club_id = the_club and user_id = new_user and role = 'digital_technology_manager';
  if n <> 1 then
    failures := array_append(failures, 'the claim did not grant the IT Manager''s mapped access');
  end if;

  -- 7. BR154: ending the appointment does not revoke the access.
  update club_function_appointment set ends_on = current_date where id = it_manager_f;
  select count(*) into n from club_membership
   where club_id = the_club and user_id = new_user and role = 'digital_technology_manager';
  if n <> 1 then
    failures := array_append(failures, 'ending an appointment removed its access (BR154 keeps it)');
  end if;

  -- 8. The Person already linked elsewhere: signing in as a fresh account with
  --    that email must not receive program_coordinator access.
  update person set email = 'taken@appt.test' where id = 'b5900000-0000-0000-0000-000000000005';
  insert into auth.users (id, email) values ('e5900000-0000-0000-0000-00000000000a', 'taken@appt.test')
    on conflict do nothing;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'e5900000-0000-0000-0000-00000000000a', true);
  perform claim_staff_access();
  perform set_config('role', 'postgres', true);
  select count(*) into n from club_membership
   where club_id = the_club and user_id = 'e5900000-0000-0000-0000-00000000000a';
  if n <> 0 then
    failures := array_append(failures, 'a claim granted access for a Person already linked to another account');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Appointment access FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Appointment access OK — 8 scenarios';
end
$$;
