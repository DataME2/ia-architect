-- 0077: a committee grants hardship (scope 82; BR79, BR164).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990077-0000-0000-0000-000000000001', 'Hardship FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('99990077-0000-0000-0000-0000000000aa', '99990077-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days');

insert into auth.users (id, email) values
  ('d0077000-0000-0000-0000-000000000001', 'committee@hardship.test'),
  ('d0077000-0000-0000-0000-000000000002', 'mum@hardship.test'),
  ('d0077000-0000-0000-0000-000000000003', 'other@hardship.test');

insert into club_membership (club_id, user_id, role) values
  ('99990077-0000-0000-0000-000000000001', 'd0077000-0000-0000-0000-000000000001', 'committee');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0077000-0000-0000-0000-000000000001', '99990077-0000-0000-0000-000000000001', 'Ten', 'Kid', (current_date - interval '10 years')::date),
  ('b0077000-0000-0000-0000-000000000002', '99990077-0000-0000-0000-000000000001', 'The', 'Mum', '1984-01-01'),
  ('b0077000-0000-0000-0000-000000000003', '99990077-0000-0000-0000-000000000001', 'Some', 'One', '1983-01-01');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99990077-0000-0000-0000-000000000001', 'b0077000-0000-0000-0000-000000000001', 'b0077000-0000-0000-0000-000000000002', true, true);

insert into account_person (club_id, user_id, person_id) values
  ('99990077-0000-0000-0000-000000000001', 'd0077000-0000-0000-0000-000000000002', 'b0077000-0000-0000-0000-000000000002'),
  ('99990077-0000-0000-0000-000000000001', 'd0077000-0000-0000-0000-000000000003', 'b0077000-0000-0000-0000-000000000003');

insert into registration (id, club_id, person_id, season_id, status, outstanding_amount_cents) values
  ('99990077-0000-0000-0000-0000000000e1', '99990077-0000-0000-0000-000000000001', 'b0077000-0000-0000-0000-000000000001',
   '99990077-0000-0000-0000-0000000000aa', 'COMPLETE', 5000);

commit;

do $$
declare
  the_club uuid := '99990077-0000-0000-0000-000000000001';
  kid      uuid := 'b0077000-0000-0000-0000-000000000001';
  mum      uuid := 'b0077000-0000-0000-0000-000000000002';
  someone  uuid := 'b0077000-0000-0000-0000-000000000003';
  reg      uuid := '99990077-0000-0000-0000-0000000000e1';
  req      uuid;
  until_   date;
  owed     boolean;
  n        integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The mother asks.
  perform set_config('request.jwt.claim.sub', 'd0077000-0000-0000-0000-000000000002', true);
  insert into hardship_request (club_id, registration_id, person_id, requested_by_person_id, reason)
  values (the_club, reg, kid, mum, 'Lost work this month.') returning id into req;

  -- 2. A second open request for the same registration is refused.
  begin
    insert into hardship_request (club_id, registration_id, person_id, requested_by_person_id, reason)
    values (the_club, reg, kid, mum, 'Again.');
    failures := array_append(failures, 'a second open hardship request was accepted');
  exception when unique_violation then null;
  end;

  -- 3. Somebody who does not answer for the child cannot ask.
  perform set_config('request.jwt.claim.sub', 'd0077000-0000-0000-0000-000000000003', true);
  begin
    insert into hardship_request (club_id, registration_id, person_id, requested_by_person_id, reason)
    values (the_club, reg, kid, someone, 'On their behalf.');
    failures := array_append(failures, 'an unrelated person asked for hardship');
  exception when insufficient_privilege or unique_violation then null;
  end;

  -- 4. The mother cannot decide her own request.
  perform set_config('request.jwt.claim.sub', 'd0077000-0000-0000-0000-000000000002', true);
  begin
    perform app_decide_hardship(req, true, current_date + 30, null);
    failures := array_append(failures, 'the family approved its own hardship');
  exception when insufficient_privilege then null;
  end;

  -- 5–6. The committee: a decline needs a reason, an approval a future date.
  perform set_config('request.jwt.claim.sub', 'd0077000-0000-0000-0000-000000000001', true);
  begin
    perform app_decide_hardship(req, false, null, '  ');
    failures := array_append(failures, 'a hardship was declined without a reason');
  exception when others then null;
  end;
  begin
    perform app_decide_hardship(req, true, current_date - 1, null);
    failures := array_append(failures, 'a hardship was approved until a date already past');
  exception when others then null;
  end;

  -- 7. Approved for thirty days, recorded with who and an audit line.
  perform app_decide_hardship(req, true, current_date + 30, 'Agreed at the October meeting.');
  if not exists (select 1 from hardship_request where id = req and state = 'approved'
                   and decided_by_user_id = 'd0077000-0000-0000-0000-000000000001') then
    failures := array_append(failures, 'the approval did not record who decided');
  end if;
  perform set_config('role', 'postgres', true);
  select count(*) into n from audit_event where entity = 'hardship_request' and entity_id = req;
  if n <> 1 then
    failures := array_append(failures, format('%s audit lines for the decision, not 1', n));
  end if;

  -- 8. The verdict carries it; the debt stays.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd0077000-0000-0000-0000-000000000002', true);
  select m.hardship_until, m.owes into until_, owed from app_registration_money(array[reg]) m;
  if until_ is distinct from current_date + 30 or owed is distinct from true then
    failures := array_append(failures, format('the verdict read hardship %s / owes %s', until_, owed));
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'A committee grants hardship FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'A committee grants hardship OK — 8 scenarios';
end $$;
