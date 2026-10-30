-- Who may set a club's fees? (0099, scope 130, BR196)
--
-- The fee schedule's screen offers its forms to the admin and the treasurer
-- only. **That offer being absent is not a control**, so the refusals live
-- here:
--
--   * a treasurer writes a line, the sibling discount and the terms,
--   * a registrar reads them and cannot change them,
--   * a coach sees none of it,
--   * another club's treasurer reads nothing and writes nothing here (P5),
--   * and the schedule refuses what cannot be a price: a negative amount, a
--     deposit larger than its line, a discount over 100%, ages backwards.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('97c00000-0000-0000-0000-000000000001', 'Fees FC', 'AU-QLD'),
  ('97c00000-0000-0000-0000-000000000002', 'Other FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('97c00000-0000-0000-0000-0000000000a1', '97c00000-0000-0000-0000-000000000001', '2027', '2027-01-01', '2027-12-31');

insert into auth.users (id, email) values
  ('d97c0000-0000-0000-0000-000000000001', 'treasurer@fees.test'),
  ('d97c0000-0000-0000-0000-000000000002', 'registrar@fees.test'),
  ('d97c0000-0000-0000-0000-000000000003', 'coach@fees.test'),
  ('d97c0000-0000-0000-0000-000000000004', 'treasurer@other.test');

insert into club_membership (club_id, user_id, role) values
  ('97c00000-0000-0000-0000-000000000001', 'd97c0000-0000-0000-0000-000000000001', 'treasurer'),
  ('97c00000-0000-0000-0000-000000000001', 'd97c0000-0000-0000-0000-000000000002', 'registrar'),
  ('97c00000-0000-0000-0000-000000000001', 'd97c0000-0000-0000-0000-000000000003', 'coach'),
  ('97c00000-0000-0000-0000-000000000002', 'd97c0000-0000-0000-0000-000000000004', 'treasurer');

commit;

do $$
declare
  the_club  uuid := '97c00000-0000-0000-0000-000000000001';
  season    uuid := '97c00000-0000-0000-0000-0000000000a1';
  treasurer uuid := 'd97c0000-0000-0000-0000-000000000001';
  registrar uuid := 'd97c0000-0000-0000-0000-000000000002';
  coach     uuid := 'd97c0000-0000-0000-0000-000000000003';
  outsider  uuid := 'd97c0000-0000-0000-0000-000000000004';
  n         integer;
  v         integer;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The treasurer sets the schedule.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  begin
    insert into fee_line (club_id, season_id, kind, name, amount_cents, deposit_cents, min_age, max_age)
    values (the_club, season, 'club', 'MiniRoos U8 to U12', 53000, null, 8, 12);
    insert into fee_line (club_id, season_id, kind, name, amount_cents)
    values (the_club, season, 'levy', 'Volunteer levy', 5000);
    insert into fee_settings (club_id, sibling_discount_bps) values (the_club, 1500);
    insert into registration_terms (club_id, body, placeholder_values)
    values (the_club, 'By registering with {club} you accept its Codes of Conduct.', '{"club": "Fees FC"}');
  exception when others then
    failures := array_append(failures, 'the treasurer could not set the schedule: ' || sqlerrm);
  end;

  -- 2. What cannot be a price is refused, whoever asks.
  begin
    insert into fee_line (club_id, season_id, kind, name, amount_cents) values (the_club, season, 'club', 'Negative', -1);
    failures := array_append(failures, 'a negative fee was accepted');
  exception when others then null;
  end;
  begin
    insert into fee_line (club_id, season_id, kind, name, amount_cents, deposit_cents) values (the_club, season, 'club', 'Big deposit', 1000, 2000);
    failures := array_append(failures, 'a deposit larger than its line was accepted');
  exception when others then null;
  end;
  begin
    insert into fee_line (club_id, season_id, kind, name, amount_cents, min_age, max_age) values (the_club, season, 'club', 'Backwards', 1000, 12, 8);
    failures := array_append(failures, 'an age range running backwards was accepted');
  exception when others then null;
  end;
  begin
    update fee_settings set sibling_discount_bps = 12000 where club_id = the_club;
    failures := array_append(failures, 'a sibling discount over 100% was accepted');
  exception when others then null;
  end;

  -- 3. The registrar reads it and cannot change it (BR196).
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  select count(*) into n from fee_line where club_id = the_club;
  if n <> 2 then
    failures := array_append(failures, 'the registrar read ' || n || ' fee lines rather than 2');
  end if;
  begin
    insert into fee_line (club_id, season_id, kind, name, amount_cents) values (the_club, season, 'club', 'By the registrar', 100);
    failures := array_append(failures, 'the registrar added a fee line (BR196)');
  exception when others then null;
  end;
  update fee_settings set sibling_discount_bps = 5000 where club_id = the_club;
  update fee_line set amount_cents = 1 where club_id = the_club;

  perform set_config('role', 'postgres', true);
  select sibling_discount_bps into v from fee_settings where club_id = the_club;
  if v is distinct from 1500 then
    failures := array_append(failures, 'the registrar changed the sibling discount to ' || coalesce(v::text, 'null') || ' (BR196)');
  end if;
  select count(*) into n from fee_line where club_id = the_club and amount_cents = 1;
  if n <> 0 then
    failures := array_append(failures, 'the registrar repriced ' || n || ' fee lines (BR196)');
  end if;
  perform set_config('role', 'authenticated', true);

  -- 4. A coach sees none of it.
  perform set_config('request.jwt.claim.sub', coach::text, true);
  select count(*) into n from fee_line;
  if n <> 0 then
    failures := array_append(failures, 'a coach read ' || n || ' fee lines');
  end if;
  select count(*) into n from registration_terms;
  if n <> 0 then
    failures := array_append(failures, 'a coach read the registration terms');
  end if;

  -- 5. Another club's treasurer reads nothing here and writes nothing here (P5).
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select count(*) into n from fee_line where club_id = the_club;
  if n <> 0 then
    failures := array_append(failures, 'another club''s treasurer read ' || n || ' of this club''s fee lines (P5)');
  end if;
  begin
    insert into fee_line (club_id, season_id, kind, name, amount_cents) values (the_club, season, 'club', 'Planted', 100);
    failures := array_append(failures, 'another club''s treasurer added a line to this club''s schedule (P5)');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'A club sets its own fees FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A club sets its own fees OK — 11 scenarios; the treasurer sets the lines, the discount and the terms, the registrar reads and cannot change them, a coach and another club see none of it, and a negative fee, an oversized deposit, a backwards age range and a discount over 100%% are refused';
end
$$;
