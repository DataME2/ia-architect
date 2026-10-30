-- Does a registration open owing what the club's schedule says? (0100,
-- scope 130, BR195)
--
--   * a player not yet in a team is charged the standard line for their age,
--     the governing body's fee for that age, and the levy,
--   * a sibling in another team is charged their own team's line, less the
--     club's discount on that line only,
--   * a club with no schedule keeps the season's own fee,
--   * only the admin and the treasurer may preview or re-price a season,
--   * re-pricing applies a changed discount, and never touches a
--     registration on a payment plan.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('98c00000-0000-0000-0000-000000000001', 'Priced FC', 'AU-QLD'),
  ('98c00000-0000-0000-0000-000000000002', 'Old Fee FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on, registration_fee_cents) values
  ('98c00000-0000-0000-0000-0000000000a1', '98c00000-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31', 12050),
  ('98c00000-0000-0000-0000-0000000000a2', '98c00000-0000-0000-0000-000000000002', '2026', '2026-01-01', '2026-12-31', 12050);

insert into auth.users (id, email) values
  ('d98c0000-0000-0000-0000-000000000001', 'treasurer@priced.test'),
  ('d98c0000-0000-0000-0000-000000000002', 'registrar@priced.test');

insert into club_membership (club_id, user_id, role) values
  ('98c00000-0000-0000-0000-000000000001', 'd98c0000-0000-0000-0000-000000000001', 'treasurer'),
  ('98c00000-0000-0000-0000-000000000001', 'd98c0000-0000-0000-0000-000000000002', 'registrar');

-- The schedule. Ages are the age a player turns this season.
insert into fee_line (id, club_id, season_id, kind, name, amount_cents, min_age, max_age, standard) values
  ('98f00000-0000-0000-0000-000000000001', '98c00000-0000-0000-0000-000000000001', '98c00000-0000-0000-0000-0000000000a1', 'club', 'MiniRoos U8 to U12', 53000, 7, 11, true),
  ('98f00000-0000-0000-0000-000000000002', '98c00000-0000-0000-0000-000000000001', '98c00000-0000-0000-0000-0000000000a1', 'club', 'Advanced U9', 120000, 8, 8, false),
  ('98f00000-0000-0000-0000-000000000003', '98c00000-0000-0000-0000-000000000001', '98c00000-0000-0000-0000-0000000000a1', 'governing', 'FQ MiniRoos', 5000, 7, 10, true),
  ('98f00000-0000-0000-0000-000000000004', '98c00000-0000-0000-0000-000000000001', '98c00000-0000-0000-0000-0000000000a1', 'levy', 'Volunteer levy', 5000, null, null, false);

insert into team (id, club_id, season_id, name, age_group) values
  ('98e00000-0000-0000-0000-000000000001', '98c00000-0000-0000-0000-000000000001', '98c00000-0000-0000-0000-0000000000a1', 'Advanced U9', 'U9');
insert into team_fee_line (club_id, team_id, fee_line_id) values
  ('98c00000-0000-0000-0000-000000000001', '98e00000-0000-0000-0000-000000000001', '98f00000-0000-0000-0000-000000000002');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('98b00000-0000-0000-0000-000000000001', '98c00000-0000-0000-0000-000000000001', 'Guardian', 'Priced', '1985-01-01'),
  ('98b00000-0000-0000-0000-000000000002', '98c00000-0000-0000-0000-000000000001', 'Elder', 'Priced', '2015-06-01'),
  ('98b00000-0000-0000-0000-000000000003', '98c00000-0000-0000-0000-000000000001', 'Younger', 'Priced', '2018-06-01'),
  ('98b00000-0000-0000-0000-000000000004', '98c00000-0000-0000-0000-000000000002', 'Only', 'Child', '2016-06-01');

insert into guardianship (club_id, person_id, guardian_person_id) values
  ('98c00000-0000-0000-0000-000000000001', '98b00000-0000-0000-0000-000000000002', '98b00000-0000-0000-0000-000000000001'),
  ('98c00000-0000-0000-0000-000000000001', '98b00000-0000-0000-0000-000000000003', '98b00000-0000-0000-0000-000000000001');

-- The younger one plays in the Advanced team; the elder is in no team yet.
insert into team_member (club_id, team_id, person_id, role) values
  ('98c00000-0000-0000-0000-000000000001', '98e00000-0000-0000-0000-000000000001', '98b00000-0000-0000-0000-000000000003', 'player');

-- Opened in this order, as app_create_registration opens them: with the
-- season's fee, which the schedule replaces.
insert into registration (id, club_id, person_id, season_id, status, outstanding_amount_cents, created_at) values
  ('98a00000-0000-0000-0000-000000000001', '98c00000-0000-0000-0000-000000000001', '98b00000-0000-0000-0000-000000000002', '98c00000-0000-0000-0000-0000000000a1', 'DRAFT', 12050, '2026-02-01 09:00+10'),
  ('98a00000-0000-0000-0000-000000000002', '98c00000-0000-0000-0000-000000000001', '98b00000-0000-0000-0000-000000000003', '98c00000-0000-0000-0000-0000000000a1', 'DRAFT', 12050, '2026-02-01 09:05+10'),
  ('98a00000-0000-0000-0000-000000000003', '98c00000-0000-0000-0000-000000000002', '98b00000-0000-0000-0000-000000000004', '98c00000-0000-0000-0000-0000000000a2', 'DRAFT', 12050, '2026-02-01 09:00+10');

commit;

do $$
declare
  elder     uuid := '98a00000-0000-0000-0000-000000000001';
  younger   uuid := '98a00000-0000-0000-0000-000000000002';
  old_fee   uuid := '98a00000-0000-0000-0000-000000000003';
  the_club  uuid := '98c00000-0000-0000-0000-000000000001';
  season    uuid := '98c00000-0000-0000-0000-0000000000a1';
  treasurer uuid := 'd98c0000-0000-0000-0000-000000000001';
  registrar uuid := 'd98c0000-0000-0000-0000-000000000002';
  v         integer;
  n         integer;
  failures  text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- 1. No team yet: the standard line for eleven, no governing fee fits an
  --    eleven-year-old here (MiniRoos is 7 to 10), and the levy.
  select outstanding_amount_cents into v from registration where id = elder;
  if v is distinct from 58000 then
    failures := array_append(failures, 'the elder opened owing ' || coalesce(v::text, 'null') || ' rather than 58000 (530 + 50 levy)');
  end if;

  -- 2. The sibling in another team: that team's line, less 15% of it only.
  select outstanding_amount_cents into v from registration where id = younger;
  if v is distinct from 112000 then
    failures := array_append(failures,
      'the younger sibling opened owing ' || coalesce(v::text, 'null') || ' rather than 112000 (1200 + 50 + 50 - 15% of 1200)');
  end if;
  select count(*) into n from registration_price where registration_id in (elder, younger) and reason = 'opened';
  if n <> 2 then
    failures := array_append(failures, n || ' pricings were kept for the two openings rather than 2');
  end if;

  -- 3. A club with no schedule keeps the season's fee.
  select outstanding_amount_cents into v from registration where id = old_fee;
  if v is distinct from 12050 then
    failures := array_append(failures, 'a club with no schedule was repriced to ' || coalesce(v::text, 'null'));
  end if;

  -- 4. The registrar may not preview or re-price (BR196).
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  begin
    perform * from app_preview_season_prices(the_club, season);
    failures := array_append(failures, 'the registrar previewed the season''s re-pricing (BR196)');
  exception when others then null;
  end;
  begin
    perform app_reprice_season(the_club, season, true);
    failures := array_append(failures, 'the registrar re-priced the season (BR196)');
  exception when others then null;
  end;

  -- 5. The treasurer sees both, then a changed discount is applied.
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  select count(*) into n from app_preview_season_prices(the_club, season);
  if n <> 2 then
    failures := array_append(failures, 'the treasurer''s preview showed ' || n || ' registrations rather than 2');
  end if;
  update fee_settings set sibling_discount_bps = 2000 where club_id = the_club;
  if not found then
    insert into fee_settings (club_id, sibling_discount_bps) values (the_club, 2000);
  end if;
  select app_reprice_season(the_club, season, true) into n;
  perform set_config('role', 'postgres', true);
  select outstanding_amount_cents into v from registration where id = younger;
  if v is distinct from 106000 then
    failures := array_append(failures, 'after a 20% discount the sibling owes ' || coalesce(v::text, 'null') || ' rather than 106000');
  end if;

  -- 6. A registration on a payment plan is never re-priced.
  insert into payment_plan (club_id, registration_id, total_cents, cadence, created_by_user_id)
  values (the_club, elder, 58000, 'monthly', treasurer);
  update fee_line set amount_cents = 60000 where id = '98f00000-0000-0000-0000-000000000001';
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  perform app_reprice_season(the_club, season, true);
  perform set_config('role', 'postgres', true);
  select outstanding_amount_cents into v from registration where id = elder;
  if v is distinct from 58000 then
    failures := array_append(failures, 'a registration on a payment plan was re-priced to ' || coalesce(v::text, 'null'));
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'A registration is priced from the schedule FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A registration is priced from the schedule OK — 9 scenarios; a player with no team pays the standard line for their age, a sibling in another team pays their team''s line less the discount on it alone, a club with no schedule keeps its season fee, only the admin and treasurer preview or re-price, a changed discount is applied, and a payment plan is never re-priced';
end
$$;
