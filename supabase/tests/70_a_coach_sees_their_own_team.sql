-- 0070: a coach sees their own team, and never the balance
-- (scope 74; #78b B, #73; BR78, BR79).
--
--   * a coach reads the people, guardians, consents and registrations of
--     their own team this season, and none of another team's (BR122: proved
--     by a test that fails when it is widened),
--   * a coach reads no login links or invitations,
--   * an officer (the committee) still reads club-wide,
--   * nobody selects the balance column; `app_registration_money()` gives
--     the figure to the treasurer and a guardian, and only the verdict
--     (`owes`) to the committee, the coach and a player under 18 about
--     themself; another team's registration is not returned to the coach.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990070-0000-0000-0000-000000000001', 'Own Team FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e0070000-0000-0000-0000-000000000001', 'admin@ownteam.test'),
  ('e0070000-0000-0000-0000-000000000002', 'treasurer@ownteam.test'),
  ('e0070000-0000-0000-0000-000000000003', 'committee@ownteam.test'),
  ('e0070000-0000-0000-0000-000000000004', 'coach@ownteam.test'),
  ('e0070000-0000-0000-0000-000000000005', 'parent@ownteam.test'),
  ('e0070000-0000-0000-0000-000000000006', 'teen@ownteam.test');

insert into club_membership (club_id, user_id, role) values
  ('99990070-0000-0000-0000-000000000001', 'e0070000-0000-0000-0000-000000000001', 'admin'),
  ('99990070-0000-0000-0000-000000000001', 'e0070000-0000-0000-0000-000000000002', 'treasurer'),
  ('99990070-0000-0000-0000-000000000001', 'e0070000-0000-0000-0000-000000000003', 'committee'),
  ('99990070-0000-0000-0000-000000000001', 'e0070000-0000-0000-0000-000000000004', 'coach');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  -- 1 coach, 2 own-team child, 3 their parent, 4 own-team teen,
  -- 5 other-team child, 6 their parent.
  ('b0070000-0000-0000-0000-000000000001', '99990070-0000-0000-0000-000000000001', 'Carla', 'Coach', '1980-01-01'),
  ('b0070000-0000-0000-0000-000000000002', '99990070-0000-0000-0000-000000000001', 'Ana', 'Own', current_date - interval '10 years'),
  ('b0070000-0000-0000-0000-000000000003', '99990070-0000-0000-0000-000000000001', 'Pia', 'Own', '1984-01-01'),
  ('b0070000-0000-0000-0000-000000000004', '99990070-0000-0000-0000-000000000001', 'Tom', 'Teen', current_date - interval '15 years'),
  ('b0070000-0000-0000-0000-000000000005', '99990070-0000-0000-0000-000000000001', 'Ben', 'Other', current_date - interval '11 years'),
  ('b0070000-0000-0000-0000-000000000006', '99990070-0000-0000-0000-000000000001', 'Oli', 'Other', '1983-01-01');

insert into account_person (club_id, user_id, person_id) values
  ('99990070-0000-0000-0000-000000000001', 'e0070000-0000-0000-0000-000000000004', 'b0070000-0000-0000-0000-000000000001'),
  ('99990070-0000-0000-0000-000000000001', 'e0070000-0000-0000-0000-000000000005', 'b0070000-0000-0000-0000-000000000003'),
  ('99990070-0000-0000-0000-000000000001', 'e0070000-0000-0000-0000-000000000006', 'b0070000-0000-0000-0000-000000000004');

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99990070-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000002', 'b0070000-0000-0000-0000-000000000003', true, true),
  ('99990070-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000005', 'b0070000-0000-0000-0000-000000000006', true, true);

insert into consent (club_id, person_id, purpose, granted_by_person_id) values
  ('99990070-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000002', 'IDENTIFICATION_PHOTOGRAPH', 'b0070000-0000-0000-0000-000000000003'),
  ('99990070-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000005', 'IDENTIFICATION_PHOTOGRAPH', 'b0070000-0000-0000-0000-000000000006');

insert into clearance (club_id, person_id, kind, identifier, expires_on, verified_by_user_id, verified_at) values
  ('99990070-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000001', 'WWCC', 'BC-70-0001',
   current_date + 3650, 'e0070000-0000-0000-0000-000000000001', now());

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a0070000-0000-0000-0000-000000000001', '99990070-0000-0000-0000-000000000001', 'This season',
   current_date - 100, current_date + 200);

insert into registration (id, club_id, person_id, season_id, status, outstanding_amount_cents) values
  ('c0070000-0000-0000-0000-000000000002', '99990070-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000002', 'a0070000-0000-0000-0000-000000000001', 'COMPLETE', 5000),
  ('c0070000-0000-0000-0000-000000000004', '99990070-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000004', 'a0070000-0000-0000-0000-000000000001', 'COMPLETE', 2000),
  ('c0070000-0000-0000-0000-000000000005', '99990070-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000005', 'a0070000-0000-0000-0000-000000000001', 'COMPLETE', 3000);

insert into team (id, club_id, season_id, name, age_group) values
  ('7e070000-0000-0000-0000-000000000001', '99990070-0000-0000-0000-000000000001', 'a0070000-0000-0000-0000-000000000001', 'Under 10 Red', 'U10'),
  ('7e070000-0000-0000-0000-000000000002', '99990070-0000-0000-0000-000000000001', 'a0070000-0000-0000-0000-000000000001', 'Under 12 Blue', 'U12');

insert into team_member (club_id, team_id, person_id, role) values
  ('99990070-0000-0000-0000-000000000001', '7e070000-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000001', 'coach'),
  ('99990070-0000-0000-0000-000000000001', '7e070000-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000002', 'player'),
  ('99990070-0000-0000-0000-000000000001', '7e070000-0000-0000-0000-000000000001', 'b0070000-0000-0000-0000-000000000004', 'player'),
  ('99990070-0000-0000-0000-000000000001', '7e070000-0000-0000-0000-000000000002', 'b0070000-0000-0000-0000-000000000005', 'player');

commit;

do $$
declare
  the_club  uuid := '99990070-0000-0000-0000-000000000001';
  treasurer uuid := 'e0070000-0000-0000-0000-000000000002';
  committee uuid := 'e0070000-0000-0000-0000-000000000003';
  coach     uuid := 'e0070000-0000-0000-0000-000000000004';
  parent    uuid := 'e0070000-0000-0000-0000-000000000005';
  teen      uuid := 'e0070000-0000-0000-0000-000000000006';
  own_child uuid := 'b0070000-0000-0000-0000-000000000002';
  other_kid uuid := 'b0070000-0000-0000-0000-000000000005';
  own_reg   uuid := 'c0070000-0000-0000-0000-000000000002';
  teen_reg  uuid := 'c0070000-0000-0000-0000-000000000004';
  other_reg uuid := 'c0070000-0000-0000-0000-000000000005';
  regs      uuid[] := array['c0070000-0000-0000-0000-000000000002',
                            'c0070000-0000-0000-0000-000000000004',
                            'c0070000-0000-0000-0000-000000000005']::uuid[];
  n         integer;
  cents     integer;
  owed      boolean;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The coach reads their own team: the coach, two players, one parent.
  perform set_config('request.jwt.claim.sub', coach::text, true);
  select count(*) into n from person where club_id = the_club;
  if n <> 4 then
    failures := array_append(failures, format('the coach read %s people, not their own team''s 4', n));
  end if;
  if exists (select 1 from person where id in (other_kid, 'b0070000-0000-0000-0000-000000000006')) then
    failures := array_append(failures, 'the coach read another team''s child or parent');
  end if;

  -- 2. ...and only their own team's guardianships, consents and registrations.
  if exists (select 1 from guardianship where person_id = other_kid)
     or not exists (select 1 from guardianship where person_id = own_child) then
    failures := array_append(failures, 'the coach''s guardianship read is not their own team''s');
  end if;
  if exists (select 1 from consent where person_id = other_kid)
     or not exists (select 1 from consent where person_id = own_child) then
    failures := array_append(failures, 'the coach''s consent read is not their own team''s');
  end if;
  if exists (select 1 from registration where id = other_reg)
     or not exists (select 1 from registration where id = own_reg) then
    failures := array_append(failures, 'the coach''s registration read is not their own team''s');
  end if;

  -- 3. No other account's login link.
  select count(*) into n from account_person where club_id = the_club;
  if n <> 1 then
    failures := array_append(failures, format('the coach read %s login links, not only their own', n));
  end if;

  -- 4. The verdict, never the figure, and nothing for another team.
  select m.outstanding_amount_cents, m.owes into cents, owed from app_registration_money(array[own_reg]) m;
  if cents is not null or owed is distinct from true then
    failures := array_append(failures, format('the coach got %s / %s, not null / owes', cents, owed));
  end if;
  select count(*) into n from app_registration_money(array[other_reg]);
  if n <> 0 then
    failures := array_append(failures, 'the coach got money for another team''s registration');
  end if;

  -- 5. The column itself is not selectable, by anyone signed in.
  begin
    perform outstanding_amount_cents from registration limit 1;
    failures := array_append(failures, 'the coach selected the balance column');
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', treasurer::text, true);
  begin
    perform outstanding_amount_cents from registration limit 1;
    failures := array_append(failures, 'the treasurer selected the balance column directly');
  exception when insufficient_privilege then null;
  end;

  -- 6. The treasurer gets every figure through the function.
  select coalesce(sum(m.outstanding_amount_cents), -1) into n from app_registration_money(regs) m;
  if n <> 10000 then
    failures := array_append(failures, format('the treasurer''s figures summed to %s, not 10000', n));
  end if;

  -- 7. The committee reads club-wide, and gets the verdict without the figure.
  perform set_config('request.jwt.claim.sub', committee::text, true);
  select count(*) into n from person where club_id = the_club;
  if n <> 6 then
    failures := array_append(failures, format('the committee read %s people, not all 6', n));
  end if;
  select count(*) into n from app_registration_money(regs) m where m.outstanding_amount_cents is null and m.owes;
  if n <> 3 then
    failures := array_append(failures, format('the committee got %s verdicts without a figure, not 3', n));
  end if;

  -- 8. A guardian with authority sees their child's figure, and only theirs.
  perform set_config('request.jwt.claim.sub', parent::text, true);
  select m.outstanding_amount_cents into cents from app_registration_money(array[own_reg]) m;
  if cents is distinct from 5000 then
    failures := array_append(failures, format('the parent saw %s for their child, not 5000', cents));
  end if;
  select count(*) into n from app_registration_money(array[other_reg]);
  if n <> 0 then
    failures := array_append(failures, 'the parent got money for another family''s registration');
  end if;

  -- 9. A player under 18 learns only that money is owed (BR78).
  perform set_config('request.jwt.claim.sub', teen::text, true);
  select m.outstanding_amount_cents, m.owes into cents, owed from app_registration_money(array[teen_reg]) m;
  if cents is not null or owed is distinct from true then
    failures := array_append(failures, format('the 15-year-old got %s / %s about themself, not null / owes', cents, owed));
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'A coach sees their own team FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'A coach sees their own team OK — 9 scenarios';
end $$;
