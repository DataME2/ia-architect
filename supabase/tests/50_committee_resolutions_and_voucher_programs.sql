-- Can the Committee actually record a decision, and can BR21's gate be
-- walked around?
--
-- BR123: *the Committee records its own decisions — a dated resolution
-- naming what was decided, who moved it, and which Committee Term it
-- belongs to.* Nothing wrote one before this (scope 57); `committee` — the
-- role Q59 answered may write something — could write nothing at all.
--
-- BR21: *a Voucher Program cannot be applied to a club's invoices until the
-- club's Committee approves it.* Found completely unenforced while BR123
-- was being built: `registration_voucher.program` has been free text since
-- migration 0008.
--
--   * `committee` and `admin` may record a resolution; no lesser role may,
--   * a resolution is append-only — no update, no delete, through the API,
--   * a resolution cannot be filed against another club's Committee Term,
--   * enabling a Voucher Program requires citing a resolution recorded with
--     category `voucher_program` — a `general` one is refused,
--   * an enablement cannot cite another club's resolution,
--   * once enabled, `registration_voucher` accepts that program — matched
--     case-insensitively and trimmed, the way `rateFor` matches a
--     competition — and refuses every other program string,
--   * and P5 holds throughout: another club reads none of this, and anon
--     reads none of it either.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('50c00000-0000-0000-0000-000000000001', 'Resolutions FC', 'AU-QLD'),
  ('50c00000-0000-0000-0000-000000000002', 'Rival Resolutions FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('50c00000-0000-0000-0000-0000000000aa', '50c00000-0000-0000-0000-000000000001',
   '2031', '2031-01-01', '2031-12-01');

insert into auth.users (id, email) values
  ('d50c0000-0000-0000-0000-000000000001', 'admin@resolutions.test'),
  ('d50c0000-0000-0000-0000-000000000002', 'committee@resolutions.test'),
  ('d50c0000-0000-0000-0000-000000000003', 'registrar@resolutions.test'),
  ('d50c0000-0000-0000-0000-000000000004', 'treasurer@resolutions.test'),
  ('d50c0000-0000-0000-0000-000000000005', 'rival.admin@resolutions.test');

insert into club_membership (club_id, user_id, role) values
  ('50c00000-0000-0000-0000-000000000001', 'd50c0000-0000-0000-0000-000000000001', 'admin'),
  ('50c00000-0000-0000-0000-000000000001', 'd50c0000-0000-0000-0000-000000000002', 'committee'),
  ('50c00000-0000-0000-0000-000000000001', 'd50c0000-0000-0000-0000-000000000003', 'registrar'),
  ('50c00000-0000-0000-0000-000000000001', 'd50c0000-0000-0000-0000-000000000004', 'treasurer'),
  ('50c00000-0000-0000-0000-000000000002', 'd50c0000-0000-0000-0000-000000000005', 'admin');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b50c0000-0000-0000-0000-000000000001', '50c00000-0000-0000-0000-000000000001',
   'Mover', 'One', '1980-01-01');

insert into registration (id, club_id, person_id, season_id, status) values
  ('c50c0000-0000-0000-0000-000000000001', '50c00000-0000-0000-0000-000000000001',
   'b50c0000-0000-0000-0000-000000000001', '50c00000-0000-0000-0000-0000000000aa',
   'PENDING_PAYMENT');

commit;

do $$
declare
  the_club     uuid := '50c00000-0000-0000-0000-000000000001';
  rival        uuid := '50c00000-0000-0000-0000-000000000002';
  the_reg      uuid := 'c50c0000-0000-0000-0000-000000000001';
  admin_u      uuid := 'd50c0000-0000-0000-0000-000000000001';
  committee_u  uuid := 'd50c0000-0000-0000-0000-000000000002';
  registrar_u  uuid := 'd50c0000-0000-0000-0000-000000000003';
  treasurer_u  uuid := 'd50c0000-0000-0000-0000-000000000004';
  rival_admin  uuid := 'd50c0000-0000-0000-0000-000000000005';
  mover        uuid := 'b50c0000-0000-0000-0000-000000000001';
  term_id      uuid;
  rival_term   uuid;
  general_id   uuid;
  voucher_res  uuid;
  rival_res    uuid;
  seen         int;
  failures     text[] := array[]::text[];
begin
  set local role postgres;

  insert into committee_term (club_id, name, starts_on, next_agm_due_on)
  values (the_club, '2031', date '2031-01-01', date '2032-01-01')
  returning id into term_id;

  insert into committee_term (club_id, name, starts_on, next_agm_due_on)
  values (rival, '2031', date '2031-01-01', date '2032-01-01')
  returning id into rival_term;

  -- ---------------------------------------------------- BR123, who may write

  set local role authenticated;

  -- 1. A registrar may not record a resolution -- Q59 answered committee and
  --    admin, not every officer.
  perform set_config('request.jwt.claim.sub', registrar_u::text, true);
  begin
    insert into committee_resolution (club_id, term_id, decided_on, summary, category)
    values (the_club, term_id, current_date, 'Registrar tries to decide something.', 'general');
    failures := array_append(failures, 'a registrar recorded a Committee resolution');
  exception when insufficient_privilege then null;
       when others then null;
  end;

  -- 2. Nor a treasurer.
  perform set_config('request.jwt.claim.sub', treasurer_u::text, true);
  begin
    insert into committee_resolution (club_id, term_id, decided_on, summary, category)
    values (the_club, term_id, current_date, 'Treasurer tries to decide something.', 'general');
    failures := array_append(failures, 'a treasurer recorded a Committee resolution');
  exception when insufficient_privilege then null;
       when others then null;
  end;

  -- 3. `committee` may -- the first thing that role has ever been able to
  --    write (scope 29's finding, made real).
  perform set_config('request.jwt.claim.sub', committee_u::text, true);
  begin
    insert into committee_resolution
      (club_id, term_id, decided_on, summary, moved_by_person_id, category)
    values (the_club, term_id, current_date, 'Buy new training goals.', mover, 'general')
    returning id into general_id;
  exception when others then
    failures := array_append(failures, 'committee could not record a resolution: ' || sqlerrm);
  end;

  -- 4. And `admin` may, the ordinary escape hatch every governance table
  --    here has, for the club with no separate committee account.
  perform set_config('request.jwt.claim.sub', admin_u::text, true);
  begin
    insert into committee_resolution (club_id, term_id, decided_on, summary, category)
    values (the_club, term_id, current_date, 'Approve Play On! as a Voucher Program.', 'voucher_program')
    returning id into voucher_res;
  exception when others then
    failures := array_append(failures, 'admin could not record a resolution: ' || sqlerrm);
  end;

  -- 5. A resolution cannot be filed against another club's Committee Term.
  begin
    insert into committee_resolution (club_id, term_id, decided_on, summary, category)
    values (the_club, rival_term, current_date, 'Filed against the wrong club''s term.', 'general');
    failures := array_append(failures, 'a resolution was filed against another club''s Committee Term');
  exception when check_violation then null;
       when others then null;
  end;

  -- ------------------------------------------------------- BR123, append-only

  -- 6. No update policy -- the write matches no row rather than erroring.
  update committee_resolution set summary = 'Rewritten.' where id = general_id;
  select count(*) into seen
    from committee_resolution where id = general_id and summary = 'Buy new training goals.';
  if seen <> 1 then
    failures := array_append(failures, 'a Committee resolution was rewritten (BR123)');
  end if;

  -- 7. Nor deleted.
  delete from committee_resolution where id = general_id;
  select count(*) into seen from committee_resolution where id = general_id;
  if seen <> 1 then
    failures := array_append(failures, 'a Committee resolution was deleted (BR123)');
  end if;

  -- --------------------------------------------------------------- BR21

  -- 8. Enabling a program against a `general` resolution is refused -- the
  --    resolution has to actually be about this.
  begin
    insert into club_voucher_program_enablement (club_id, program, resolution_id)
    values (the_club, 'Kickstart', general_id);
    failures := array_append(failures, 'a Voucher Program was enabled citing a general resolution');
  exception when check_violation then null;
       when others then null;
  end;

  -- 9. `committee` may enable the program once the right resolution exists.
  perform set_config('request.jwt.claim.sub', committee_u::text, true);
  begin
    insert into club_voucher_program_enablement (club_id, program, resolution_id)
    values (the_club, 'Play On!', voucher_res);
  exception when others then
    failures := array_append(failures, 'committee could not enable a Voucher Program: ' || sqlerrm);
  end;

  -- 10. A registrar may not.
  perform set_config('request.jwt.claim.sub', registrar_u::text, true);
  begin
    insert into club_voucher_program_enablement (club_id, program, resolution_id)
    values (the_club, 'Kickstart', voucher_res);
    failures := array_append(failures, 'a registrar enabled a Voucher Program');
  exception when insufficient_privilege then null;
       when others then null;
  end;

  set local role postgres;

  -- 11. A rival club's own voucher_program resolution cannot be cited by
  --     this club -- the trigger checks the club, not just the category.
  insert into committee_resolution (club_id, term_id, decided_on, summary, category)
  values (rival, rival_term, current_date, 'Rival approves its own program.', 'voucher_program')
  returning id into rival_res;

  begin
    insert into club_voucher_program_enablement (club_id, program, resolution_id)
    values (the_club, 'RivalProgram', rival_res);
    failures := array_append(failures, 'an enablement cited another club''s resolution');
  exception when check_violation then null;
       when others then null;
  end;

  -- 12. The gate itself: this club's registration accepts "Play On!" now
  --     that it is enabled...
  begin
    insert into registration_voucher (club_id, registration_id, program, code, face_value_cents, attached_by_user_id)
    values (the_club, the_reg, 'Play On!', 'RES-1', 10000, registrar_u);
  exception when others then
    failures := array_append(failures, 'an enabled Voucher Program was refused: ' || sqlerrm);
  end;

  -- 13. ...matched trimmed and case-insensitively, the way `rateFor`
  --     compares a competition...
  begin
    insert into registration_voucher (club_id, registration_id, program, code, face_value_cents, attached_by_user_id)
    values (the_club, the_reg, '  play on!  ', 'RES-2', 10000, registrar_u);
  exception when others then
    failures := array_append(failures, 'a differently-cased, padded program name was refused: ' || sqlerrm);
  end;

  -- 14. ...and refuses any program this club has not enabled.
  begin
    insert into registration_voucher (club_id, registration_id, program, code, face_value_cents, attached_by_user_id)
    values (the_club, the_reg, 'Kickstart', 'RES-3', 10000, registrar_u);
    failures := array_append(failures, 'a voucher was attached for an unapproved Voucher Program (BR21)');
  exception when check_violation then null;
       when others then null;
  end;

  -- --------------------------------------------------------------------- P5

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', rival_admin::text, true);

  select count(*) into seen from committee_resolution where club_id = the_club;
  if seen <> 0 then
    failures := array_append(failures, 'another club read this club''s Committee resolutions');
  end if;

  select count(*) into seen from club_voucher_program_enablement where club_id = the_club;
  if seen <> 0 then
    failures := array_append(failures, 'another club read this club''s Voucher Program enablements');
  end if;

  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);

  select count(*) into seen from committee_resolution;
  if seen <> 0 then failures := array_append(failures, 'anon read Committee resolutions'); end if;

  select count(*) into seen from club_voucher_program_enablement;
  if seen <> 0 then failures := array_append(failures, 'anon read Voucher Program enablements'); end if;

  set local role postgres;

  if array_length(failures, 1) > 0 then
    raise exception E'Committee resolutions and Voucher Programs FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Committee resolutions and Voucher Programs OK — 14 scenarios; committee and admin may record a resolution and nobody lesser may, a resolution is append-only and cannot be filed against another club''s term, a Voucher Program requires a resolution of its own category from its own club, and BR21''s gate matches a program the way rateFor matches a competition';
end
$$;
