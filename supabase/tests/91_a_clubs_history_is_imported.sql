-- Is a club's imported history history, and is each row the right Person?
-- (0101, scope 132, BR90, BR197)
--
--   * an imported registration arrives COMPLETE, owing nothing, and is never
--     priced, previewed or re-priced from the schedule,
--   * nothing changes its status or balance afterwards, and only an import
--     marks a registration as imported,
--   * a second season finds last season's people by FFA number, by email
--     and name, or by name, birth date and a shared guardian, and creates a
--     new Person for a name and birth date alone,
--   * a match fills what the Person lacks and overwrites nothing,
--   * a season is imported once, and no club user may run an import,
--   * the history and the emergency contacts are the club's alone.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('91c00000-0000-0000-0000-000000000001', 'Imported FC', 'AU-QLD'),
  ('91c00000-0000-0000-0000-000000000002', 'Elsewhere FC', 'AU-QLD');

-- 2026 exists already, with a schedule; 2025 is created by its import.
insert into season (id, club_id, name, starts_on, ends_on) values
  ('91c00000-0000-0000-0000-0000000000a6', '91c00000-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31');
insert into fee_line (club_id, season_id, kind, name, amount_cents, standard) values
  ('91c00000-0000-0000-0000-000000000001', '91c00000-0000-0000-0000-0000000000a6', 'club', 'Everyone', 50000, true);

insert into auth.users (id, email) values
  ('d91c0000-0000-0000-0000-000000000001', 'registrar@imported.test'),
  ('d91c0000-0000-0000-0000-000000000002', 'treasurer@imported.test'),
  ('d91c0000-0000-0000-0000-000000000003', 'coach@imported.test'),
  ('d91c0000-0000-0000-0000-000000000004', 'registrar@elsewhere.test');

insert into club_membership (club_id, user_id, role) values
  ('91c00000-0000-0000-0000-000000000001', 'd91c0000-0000-0000-0000-000000000001', 'registrar'),
  ('91c00000-0000-0000-0000-000000000001', 'd91c0000-0000-0000-0000-000000000002', 'treasurer'),
  ('91c00000-0000-0000-0000-000000000001', 'd91c0000-0000-0000-0000-000000000003', 'coach'),
  ('91c00000-0000-0000-0000-000000000002', 'd91c0000-0000-0000-0000-000000000004', 'registrar');

-- Already in the club: an adult whose birth date nobody had entered.
insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email, gender) values
  ('91b00000-0000-0000-0000-000000000001', '91c00000-0000-0000-0000-000000000001', 'Dan', 'Solo', '1900-01-01', 'dan@imported.test', 'not-stated');

commit;

do $$
declare
  the_club   uuid := '91c00000-0000-0000-0000-000000000001';
  season26   uuid := '91c00000-0000-0000-0000-0000000000a6';
  dan        uuid := '91b00000-0000-0000-0000-000000000001';
  registrar  uuid := 'd91c0000-0000-0000-0000-000000000001';
  treasurer  uuid := 'd91c0000-0000-0000-0000-000000000002';
  coach      uuid := 'd91c0000-0000-0000-0000-000000000003';
  elsewhere  uuid := 'd91c0000-0000-0000-0000-000000000004';
  b2025      jsonb := $j${
    "season": {"name": "2025", "startsOn": "2025-01-01", "endsOn": "2025-12-31"},
    "source": "Registrations_2025Season-Test.csv", "masked": true, "rowsRead": 2,
    "people": [
      {"key": "g1", "kind": "guardian", "given": "Ada", "family": "Example", "email": "ada@imported.test", "mobile": "0491570006"},
      {"key": "p1", "kind": "player", "given": "Ben", "family": "Example", "dob": "2015-05-01", "gender": "male", "ffa": "11112222", "guardian": "g1"},
      {"key": "p2", "kind": "player", "given": "Cara Jane", "family": "Example", "dob": "2017-07-07", "gender": "female", "guardian": "g1"},
      {"key": "p3", "kind": "player", "given": "Dan", "family": "Solo", "dob": "1990-01-01", "gender": "male", "email": "dan@imported.test"}],
    "registrations": [
      {"person": "p1", "registeredAt": "2025-02-01T09:30:00+10:00", "playingGroup": "MiniRoos - Mixed - Under 10"},
      {"person": "p2", "registeredAt": "2025-02-01T09:30:00+10:00", "playingGroup": "MiniRoos - Girls - Under 8"},
      {"person": "p3", "registeredAt": "2025-02-02T10:00:00+10:00", "playingGroup": "Senior Men Metro League"}],
    "emergencyContacts": [],
    "teams": [{"name": "U10 Blue", "ageGroup": "U10", "category": "Miniroos"}],
    "teamMembers": [{"team": "U10 Blue", "person": "p1"}],
    "invoices": [{"reference": "MASK0000001", "invoicedOn": "2025-02-01", "payer": "g1",
                  "invoiceCents": 100000, "paidCents": 90000, "creditCents": 0, "outstandingCents": 10000,
                  "payments": 2, "lastPaidOn": "2025-03-01",
                  "lines": [{"registration": "p1", "category": "club", "description": "Player Fee - MiniRoos", "cents": 53000},
                            {"registration": "p2", "category": "discount", "description": "Sibling Discount - 2nd Child", "cents": -5000},
                            {"registration": null, "category": "adjustment", "description": "Adjustment (note removed)", "cents": 52000}]}]
  }$j$;
  b2026      jsonb := $j${
    "season": {"name": "2026", "startsOn": "2026-01-01", "endsOn": "2026-12-31"},
    "source": "Registrations_2026Season-Test.csv", "masked": true, "rowsRead": 3,
    "people": [
      {"key": "g1", "kind": "guardian", "given": "Ada", "family": "Example", "email": "ada@imported.test", "mobile": "0491570006"},
      {"key": "g2", "kind": "guardian", "given": "Eve", "family": "Other", "email": "eve@imported.test"},
      {"key": "p1", "kind": "player", "given": "Benjamin", "family": "Example", "dob": "2015-05-01", "gender": "male", "ffa": "11112222", "guardian": "g1"},
      {"key": "p2", "kind": "player", "given": "Cara", "family": "Example", "dob": "2017-07-07", "gender": "female", "guardian": "g1"},
      {"key": "p4", "kind": "player", "given": "Cara", "family": "Example", "dob": "2017-07-07", "gender": "female", "guardian": "g2"},
      {"key": "p3", "kind": "player", "given": "Dan", "family": "Solo", "dob": "1990-01-01", "email": "dan@imported.test"}],
    "registrations": [
      {"person": "p1", "registeredAt": "2026-01-05T08:00:00+10:00", "playingGroup": "MiniRoos - Mixed - Under 11"},
      {"person": "p2", "registeredAt": "2026-01-05T08:00:00+10:00", "playingGroup": null},
      {"person": "p4", "registeredAt": "2026-01-06T08:00:00+10:00", "playingGroup": null},
      {"person": "p3", "registeredAt": null, "playingGroup": null}],
    "emergencyContacts": [{"person": "p1", "name": "Fay Example", "mobile": "0491570006", "email": null}],
    "teams": [], "teamMembers": [], "invoices": []
  }$j$;
  r          jsonb;
  v          integer;
  n          integer;
  t          text;
  failures   text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- 1. The first season: a season, three new people and the adult already here.
  r := import_history_season(the_club, b2025);
  if (r->>'peopleCreated')::integer <> 3 or (r->>'peopleMatched')::integer <> 1 or (r->>'registrations')::integer <> 3 then
    failures := array_append(failures, '2025 imported as ' || r::text || ' rather than 3 created, 1 matched, 3 registrations');
  end if;
  select count(*) into n from registration
   where club_id = the_club and imported_from is not null and status = 'COMPLETE' and outstanding_amount_cents = 0;
  if n <> 3 then
    failures := array_append(failures, n || ' imported registrations are COMPLETE and owe nothing, rather than 3 (BR90)');
  end if;
  select count(*) into n from season where club_id = the_club and name = '2025';
  if n <> 1 then
    failures := array_append(failures, 'the 2025 season was not created by its import');
  end if;

  -- 2. A match fills what is missing and overwrites nothing.
  select count(*) into n from person
   where id = dan and date_of_birth = '1990-01-01' and gender = 'not-stated';
  if n <> 1 then
    failures := array_append(failures, 'the adult already here lost his gender or kept the placeholder birth date');
  end if;

  -- 3. Into a season with a schedule: still never priced.
  r := import_history_season(the_club, b2026);
  select count(*) into n from registration_price rp join registration g on g.id = rp.registration_id
   where g.imported_from is not null;
  if n <> 0 then
    failures := array_append(failures, n || ' imported registrations were priced from the schedule (BR90)');
  end if;
  select coalesce(sum(outstanding_amount_cents), -1) into v from registration where season_id = season26;
  if v <> 0 then
    failures := array_append(failures, 'imported 2026 registrations owe ' || v || ' rather than 0');
  end if;

  -- 4. Last season's people are found; a name and birth date alone are not enough.
  if (r->>'peopleCreated')::integer <> 2 or (r->>'peopleMatched')::integer <> 4 then
    failures := array_append(failures, '2026 matched ' || (r->>'peopleMatched') || ' and created ' || (r->>'peopleCreated')
                                       || ' rather than 4 and 2 (BR197)');
  end if;
  select count(*) into n from person where club_id = the_club and legal_family_name = 'Example' and date_of_birth = '2017-07-07';
  if n <> 2 then
    failures := array_append(failures, n || ' Persons named Cara Example rather than 2: a different guardian''s child was merged (BR5)');
  end if;
  select count(*) into n from person where club_id = the_club and ffa_number = '11112222';
  if n <> 1 then
    failures := array_append(failures, 'the same FFA number and birth date made ' || n || ' Persons');
  end if;
  select count(*) into n from guardianship g join person c on c.id = g.person_id where c.ffa_number = '11112222';
  if n <> 1 then
    failures := array_append(failures, 'the matched child has ' || n || ' guardianships rather than 1');
  end if;

  -- 5. A season is imported once.
  begin
    perform import_history_season(the_club, b2025);
    failures := array_append(failures, '2025 was imported twice');
  exception when others then null;
  end;

  -- 6. History stays put, and only an import makes it.
  begin
    update registration set status = 'PENDING_DOCUMENTS' where club_id = the_club and imported_from is not null;
    failures := array_append(failures, 'an imported registration was sent back to the queue (BR90)');
  exception when others then null;
  end;
  begin
    update registration set outstanding_amount_cents = 100 where club_id = the_club and imported_from is not null;
    failures := array_append(failures, 'an imported registration was given a balance to chase (BR90)');
  exception when others then null;
  end;
  begin
    insert into person (club_id, legal_given_names, legal_family_name, date_of_birth)
    values (the_club, 'Gus', 'Live', '2016-01-01');
    insert into registration (club_id, person_id, season_id, status, imported_from)
    select the_club, p.id, season26, 'COMPLETE', h.id
      from person p, historical_import h where p.legal_given_names = 'Gus' and h.club_id = the_club limit 1;
    failures := array_append(failures, 'a registration was marked as imported outside an import (BR90)');
  exception when others then null;
  end;

  -- 7. The schedule's preview and re-pricing pass history by.
  insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth)
  values ('91b00000-0000-0000-0000-000000000002', the_club, 'Hal', 'Live', '2016-01-01');
  insert into registration (club_id, person_id, season_id, status)
  values (the_club, '91b00000-0000-0000-0000-000000000002', season26, 'DRAFT');
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  select count(*) into n from app_preview_season_prices(the_club, season26);
  if n <> 1 then
    failures := array_append(failures, 'the preview showed ' || n || ' registrations rather than the 1 that is not history');
  end if;
  update fee_line set amount_cents = 60000 where club_id = the_club;
  perform app_reprice_season(the_club, season26, true);
  perform set_config('role', 'postgres', true);
  select coalesce(sum(outstanding_amount_cents), -1) into v from registration where season_id = season26 and imported_from is not null;
  if v <> 0 then
    failures := array_append(failures, 're-pricing gave imported registrations ' || v || ' to owe (BR90)');
  end if;

  -- 8. No club user runs an import.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  begin
    perform import_history_season(the_club, b2025 || '{"season": {"name": "2024", "startsOn": "2024-01-01", "endsOn": "2024-12-31"}}');
    failures := array_append(failures, 'the registrar ran an import');
  exception when insufficient_privilege then null;
  end;

  -- 9. The club's own read its history and contacts; nobody else does.
  select count(*) into n from historical_invoice;
  select n * 10 + count(*) into n from historical_invoice_line;
  select n * 10 + count(*) into n from emergency_contact;
  if n <> 131 then
    failures := array_append(failures, 'the registrar read invoices, lines and contacts as ' || n || ' rather than 1, 3 and 1');
  end if;
  foreach t in array array[coach::text, elsewhere::text] loop
    perform set_config('request.jwt.claim.sub', t, true);
    select count(*) into n from historical_invoice;
    select n + count(*) into n from historical_invoice_line;
    select n + count(*) into n from historical_import;
    select n + count(*) into n from emergency_contact;
    if n <> 0 then
      failures := array_append(failures, (case when t = coach::text then 'a coach' else 'another club''s registrar' end)
                                         || ' read ' || n || ' rows of history or emergency contacts');
    end if;
  end loop;
  perform set_config('role', 'anon', true);
  select count(*) into n from historical_invoice;
  select n + count(*) into n from emergency_contact;
  if n <> 0 then
    failures := array_append(failures, 'an anonymous caller read ' || n || ' rows');
  end if;

  -- 10. The new columns hold only what they say.
  perform set_config('role', 'postgres', true);
  begin
    update person set gender = 'unknown' where id = dan;
    failures := array_append(failures, 'a gender outside the four was stored');
  exception when check_violation then null;
  end;
  select count(*) into n from team where club_id = the_club and name = 'U10 Blue' and category = 'Miniroos';
  select n + count(*) into n from team_member tm join person p on p.id = tm.person_id where p.ffa_number = '11112222';
  if n <> 2 then
    failures := array_append(failures, 'the team, its category or its player was not imported');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception 'A club''s history is imported FAILED:%', E'\n  - ' || array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A club''s history is imported OK — 10 scenarios; history arrives complete and owing nothing, is never priced or re-priced and never changes, last season''s people are found by FFA number, email and name, or a shared guardian and never by a name and birth date alone, a match overwrites nothing, a season imports once, no club user imports, and only the club''s registrar reads the history and its contacts';
end
$$;
