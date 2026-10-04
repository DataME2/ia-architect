-- 0079: the committee confirms its own (scope 80; BR166, BR167).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990079-0000-0000-0000-000000000001', 'Confirmed FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('d0079000-0000-0000-0000-000000000001', 'admin@confirmed.test'),
  ('d0079000-0000-0000-0000-000000000002', 'president@confirmed.test'),
  ('d0079000-0000-0000-0000-000000000003', 'treasurer@confirmed.test'),
  ('d0079000-0000-0000-0000-000000000004', 'secretary@confirmed.test'),
  ('d0079000-0000-0000-0000-000000000005', 'member@confirmed.test');

insert into club_membership (club_id, user_id, role) values
  ('99990079-0000-0000-0000-000000000001', 'd0079000-0000-0000-0000-000000000001', 'admin');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0079000-0000-0000-0000-000000000002', '99990079-0000-0000-0000-000000000001', 'Pat', 'President', '1970-01-01'),
  ('b0079000-0000-0000-0000-000000000003', '99990079-0000-0000-0000-000000000001', 'Tess', 'Treasurer', '1971-01-01'),
  ('b0079000-0000-0000-0000-000000000004', '99990079-0000-0000-0000-000000000001', 'Sam', 'Secretary', '1972-01-01'),
  ('b0079000-0000-0000-0000-000000000005', '99990079-0000-0000-0000-000000000001', 'Mo', 'Member', '1973-01-01'),
  ('b0079000-0000-0000-0000-000000000006', '99990079-0000-0000-0000-000000000001', 'Ian', 'ITManager', '1974-01-01'),
  ('b0079000-0000-0000-0000-000000000007', '99990079-0000-0000-0000-000000000001', 'Second', 'President', '1975-01-01');

insert into account_person (club_id, user_id, person_id) values
  ('99990079-0000-0000-0000-000000000001', 'd0079000-0000-0000-0000-000000000002', 'b0079000-0000-0000-0000-000000000002'),
  ('99990079-0000-0000-0000-000000000001', 'd0079000-0000-0000-0000-000000000003', 'b0079000-0000-0000-0000-000000000003'),
  ('99990079-0000-0000-0000-000000000001', 'd0079000-0000-0000-0000-000000000004', 'b0079000-0000-0000-0000-000000000004'),
  ('99990079-0000-0000-0000-000000000001', 'd0079000-0000-0000-0000-000000000005', 'b0079000-0000-0000-0000-000000000005');

insert into committee_term (id, club_id, name, agm_held_on, starts_on, next_agm_due_on) values
  ('99990079-0000-0000-0000-0000000000aa', '99990079-0000-0000-0000-000000000001', '2026-27',
   current_date - 30, current_date - 30, current_date + 330);

insert into committee_position (id, club_id, term_id, person_id, position) values
  ('99990079-0000-0000-0000-0000000000c2', '99990079-0000-0000-0000-000000000001', '99990079-0000-0000-0000-0000000000aa', 'b0079000-0000-0000-0000-000000000002', 'president'),
  ('99990079-0000-0000-0000-0000000000c3', '99990079-0000-0000-0000-000000000001', '99990079-0000-0000-0000-0000000000aa', 'b0079000-0000-0000-0000-000000000003', 'treasurer'),
  ('99990079-0000-0000-0000-0000000000c4', '99990079-0000-0000-0000-000000000001', '99990079-0000-0000-0000-0000000000aa', 'b0079000-0000-0000-0000-000000000004', 'secretary'),
  ('99990079-0000-0000-0000-0000000000c6', '99990079-0000-0000-0000-000000000001', '99990079-0000-0000-0000-0000000000aa', 'b0079000-0000-0000-0000-000000000006', 'it-manager'),
  ('99990079-0000-0000-0000-0000000000c5', '99990079-0000-0000-0000-000000000001', '99990079-0000-0000-0000-0000000000aa', 'b0079000-0000-0000-0000-000000000005', 'committee-member'),
  -- A second live President, the North Star shape.
  ('99990079-0000-0000-0000-0000000000c7', '99990079-0000-0000-0000-000000000001', '99990079-0000-0000-0000-0000000000aa', 'b0079000-0000-0000-0000-000000000007', 'president');

commit;

do $$
declare
  the_club uuid := '99990079-0000-0000-0000-000000000001';
  the_term uuid := '99990079-0000-0000-0000-0000000000aa';
  member_pos uuid := '99990079-0000-0000-0000-0000000000c5';
  n        integer;
  result   text;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd0079000-0000-0000-0000-000000000001', true);

  -- 1. Two live Presidents: the AGM election is refused, naming the office.
  begin
    insert into committee_resolution (club_id, term_id, decided_on, summary, category)
    values (the_club, the_term, current_date - 30, 'AGM election', 'agm_election');
    failures := array_append(failures, 'an AGM election confirmed a term with two Presidents');
  exception when check_violation then
    if sqlerrm not like '%president%' then
      failures := array_append(failures, 'the refusal did not name the doubled office: ' || sqlerrm);
    end if;
  end;

  -- 2. With one President, it confirms the four officers and not the member.
  perform set_config('role', 'postgres', true);
  update committee_position set resigned_on = current_date where id = '99990079-0000-0000-0000-0000000000c7';
  perform set_config('role', 'authenticated', true);
  insert into committee_resolution (club_id, term_id, decided_on, summary, category)
  values (the_club, the_term, current_date - 30, 'AGM election', 'agm_election');
  select count(*) into n from committee_position where term_id = the_term and confirmed_at is not null;
  if n <> 4 then
    failures := array_append(failures, format('the AGM election confirmed %s positions, not the 4 officers', n));
  end if;

  -- 3. A committee member cannot confirm a position.
  perform set_config('request.jwt.claim.sub', 'd0079000-0000-0000-0000-000000000005', true);
  begin
    perform app_confirm_committee_position(member_pos);
    failures := array_append(failures, 'a committee member confirmed a position');
  exception when insufficient_privilege then null;
  end;

  -- 4. President, then the same President again (refused), then Treasurer
  --    and Secretary: the third confirms it.
  perform set_config('request.jwt.claim.sub', 'd0079000-0000-0000-0000-000000000002', true);
  result := app_confirm_committee_position(member_pos);
  begin
    perform app_confirm_committee_position(member_pos);
    failures := array_append(failures, 'the President confirmed the same position twice');
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', 'd0079000-0000-0000-0000-000000000003', true);
  result := app_confirm_committee_position(member_pos);
  perform set_config('role', 'postgres', true);
  if exists (select 1 from committee_position where id = member_pos and confirmed_at is not null) then
    failures := array_append(failures, 'two of three confirmations confirmed the position');
  end if;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd0079000-0000-0000-0000-000000000004', true);
  result := app_confirm_committee_position(member_pos);
  perform set_config('role', 'postgres', true);
  if result <> 'confirmed' or not exists (select 1 from committee_position where id = member_pos and confirmed_at is not null) then
    failures := array_append(failures, 'the third confirmation did not confirm the position');
  end if;

  -- 5. An officer is never confirmed by the executive.
  perform set_config('role', 'authenticated', true);
  begin
    perform app_confirm_committee_position('99990079-0000-0000-0000-0000000000c6');
    failures := array_append(failures, 'the executive confirmed an officer');
  exception when others then null;
  end;

  -- 6. The committee heard about it, and it is audited.
  perform set_config('role', 'postgres', true);
  select count(*) into n from notification where club_id = the_club and kind = 'committee_confirmation';
  if n = 0 then
    failures := array_append(failures, 'no committee member was notified');
  end if;
  select count(*) into n from audit_event where club_id = the_club and action = 'committee_position_confirmation';
  if n <> 3 then
    failures := array_append(failures, format('%s confirmation audit lines, not 3', n));
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'The committee confirms its own FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'The committee confirms its own OK — 6 scenarios';
end $$;
