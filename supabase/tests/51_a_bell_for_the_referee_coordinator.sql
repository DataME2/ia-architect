-- Does declaring officiating interest actually tell anybody? (0050, BR148)
--
-- BR136 already made a declaration a claim nobody acts on unreviewed.
-- What this proves is the other half: that the accounts able to review it
-- — admin and coordinator, exactly who `officiating_interest_select`
-- already grants read access to — are told a claim exists, that nobody
-- else's inbox gains a row, that an inbox is read only by the account it
-- names, and that marking one read is that account's own act on its own
-- row.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('deeeeeee-0051-0000-0000-000000000001', 'admin.51@northstar.test'),
  ('deeeeeee-0051-0000-0000-000000000002', 'coordinator.51@northstar.test'),
  ('deeeeeee-0051-0000-0000-000000000003', 'registrar.51@northstar.test'),
  ('deeeeeee-0051-0000-0000-000000000004', 'coach.51@northstar.test'),
  ('deeeeeee-0051-0000-0000-000000000005', 'rival.admin.51@rival.test');

insert into club_membership (club_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'deeeeeee-0051-0000-0000-000000000001', 'admin'),
  ('11111111-1111-1111-1111-111111111111', 'deeeeeee-0051-0000-0000-000000000002', 'coordinator'),
  ('11111111-1111-1111-1111-111111111111', 'deeeeeee-0051-0000-0000-000000000003', 'registrar'),
  ('11111111-1111-1111-1111-111111111111', 'deeeeeee-0051-0000-0000-000000000004', 'coach'),
  ('22222222-2222-2222-2222-222222222222', 'deeeeeee-0051-0000-0000-000000000005', 'admin');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0510000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Whistling', 'Rookie', '2011-01-01');

insert into registration (id, club_id, person_id, season_id, status) values
  ('c0510000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'b0510000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'PENDING_DOCUMENTS');

commit;

do $$
declare
  north_star  uuid := '11111111-1111-1111-1111-111111111111';
  suite_admin uuid := 'deeeeeee-0051-0000-0000-000000000001';
  coordinator uuid := 'deeeeeee-0051-0000-0000-000000000002';
  registrar   uuid := 'deeeeeee-0051-0000-0000-000000000003';
  coach       uuid := 'deeeeeee-0051-0000-0000-000000000004';
  rival_admin uuid := 'deeeeeee-0051-0000-0000-000000000005';
  reg         uuid := 'c0510000-0000-0000-0000-000000000001';
  child       uuid := 'b0510000-0000-0000-0000-000000000001';
  n           integer;
  got_headline text;
  admin_note  uuid;
  failures    text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', registrar::text, true);

  -- 1. The declaration itself, from the registrar's side of the door.
  perform app_declare_interest(reg, true, true, 'FQ-1', 'Level 5', child);

  -- 2. Admin and coordinator each got exactly one, naming the child.
  perform set_config('request.jwt.claim.sub', suite_admin::text, true);
  select count(*), min(headline) into n, got_headline
    from notification where club_id = north_star and recipient_user_id = suite_admin
     and kind = 'officiating_interest_declared';
  if n <> 1 then failures := array_append(failures, 'admin did not get exactly one notification'); end if;
  if got_headline not like '%Whistling Rookie%' then
    failures := array_append(failures, 'the notification did not name the child');
  end if;
  select id into admin_note from notification
   where club_id = north_star and recipient_user_id = suite_admin
     and kind = 'officiating_interest_declared';

  perform set_config('request.jwt.claim.sub', coordinator::text, true);
  select count(*) into n from notification
   where club_id = north_star and recipient_user_id = coordinator
     and kind = 'officiating_interest_declared';
  if n <> 1 then failures := array_append(failures, 'the coordinator did not get exactly one notification'); end if;

  -- 3. Registrar and coach — who can also read the queue, or cannot at
  --    all — get nothing. This is deliberately narrower than
  --    officiating_interest_select: BR148 asks admin and coordinator
  --    specifically, not everyone who could technically look.
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  select count(*) into n from notification where recipient_user_id = registrar;
  if n <> 0 then failures := array_append(failures, 'the registrar was notified — BR148 names admin and coordinator only'); end if;

  perform set_config('request.jwt.claim.sub', coach::text, true);
  select count(*) into n from notification where recipient_user_id = coach;
  if n <> 0 then failures := array_append(failures, 'a coach was notified of an officiating declaration'); end if;

  -- 4. An inbox is read only by the account it names — not even another
  --    club's admin, and not the coordinator reading the admin's copy.
  perform set_config('request.jwt.claim.sub', rival_admin::text, true);
  select count(*) into n from notification where club_id = north_star;
  if n <> 0 then failures := array_append(failures, 'a rival club''s admin read North Star''s inbox'); end if;

  perform set_config('request.jwt.claim.sub', coordinator::text, true);
  select count(*) into n from notification where id = admin_note;
  if n <> 0 then failures := array_append(failures, 'the coordinator read a notification addressed to admin'); end if;

  -- 5. Marking read is the recipient's own act on their own row. RLS with
  --    no visible matching row is a silent no-op, not an exception — the
  --    assertion is on the effect, the same shape scenario 7's delete uses.
  perform set_config('request.jwt.claim.sub', coordinator::text, true);
  update notification set read_at = now() where id = admin_note;
  perform set_config('role', 'postgres', true);
  select count(*) into n from notification where id = admin_note and read_at is not null;
  if n <> 0 then failures := array_append(failures, 'admin''s notification was marked read by somebody else'); end if;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', suite_admin::text, true);
  update notification set read_at = now() where id = admin_note;
  select count(*) into n from notification where id = admin_note and read_at is not null;
  if n <> 1 then failures := array_append(failures, 'admin could not mark their own notification read'); end if;

  -- 6. No client may insert a row directly — only the security-definer
  --    function that has already verified the event.
  begin
    insert into notification (club_id, recipient_user_id, kind, headline)
    values (north_star, suite_admin, 'forged', 'Not really from the platform');
    failures := array_append(failures, 'a client inserted a notification directly');
  exception when others then null;
  end;

  -- 7. Nor delete one. RLS with no delete policy matches zero rows rather
  --    than raising, so the row surviving is the assertion, not an
  --    exception being thrown.
  delete from notification where id = admin_note;
  perform set_config('role', 'postgres', true);
  select count(*) into n from notification where id = admin_note;
  if n <> 1 then failures := array_append(failures, 'a client deleted its own notification'); end if;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', suite_admin::text, true);

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'A bell for the Referee Coordinator FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A bell for the Referee Coordinator OK — 11 scenarios; admin and coordinator are told a claim exists, nobody else is, an inbox is read only by the account it names, marking read is that account''s own act, and no client inserts or deletes a row directly';
end
$$;
