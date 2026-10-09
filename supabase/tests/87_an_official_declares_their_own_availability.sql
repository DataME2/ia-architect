-- 0087: an official declares their own availability (scope 90; BR174).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990087-0000-0000-0000-000000000001', 'Declared FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('99990087-0000-0000-0000-0000000000aa', '99990087-0000-0000-0000-000000000001', '2026',
   current_date - 100, current_date + 200);

insert into auth.users (id, email) values
  ('d0087000-0000-0000-0000-000000000001', 'official@declared.test'),
  ('d0087000-0000-0000-0000-000000000002', 'other.official@declared.test'),
  ('d0087000-0000-0000-0000-000000000003', 'player@declared.test'),
  ('d0087000-0000-0000-0000-000000000004', 'coordinator@declared.test');

insert into club_membership (club_id, user_id, role) values
  ('99990087-0000-0000-0000-000000000001', 'd0087000-0000-0000-0000-000000000004', 'coordinator');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0087000-0000-0000-0000-000000000001', '99990087-0000-0000-0000-000000000001', 'Own', 'Official', '1990-01-01'),
  ('b0087000-0000-0000-0000-000000000002', '99990087-0000-0000-0000-000000000001', 'Other', 'Official', '1991-01-01'),
  ('b0087000-0000-0000-0000-000000000003', '99990087-0000-0000-0000-000000000001', 'Just', 'Player', '1992-01-01');

insert into account_person (club_id, user_id, person_id) values
  ('99990087-0000-0000-0000-000000000001', 'd0087000-0000-0000-0000-000000000001', 'b0087000-0000-0000-0000-000000000001'),
  ('99990087-0000-0000-0000-000000000001', 'd0087000-0000-0000-0000-000000000002', 'b0087000-0000-0000-0000-000000000002'),
  ('99990087-0000-0000-0000-000000000001', 'd0087000-0000-0000-0000-000000000003', 'b0087000-0000-0000-0000-000000000003');

insert into referee_profile (club_id, person_id) values
  ('99990087-0000-0000-0000-000000000001', 'b0087000-0000-0000-0000-000000000001'),
  ('99990087-0000-0000-0000-000000000001', 'b0087000-0000-0000-0000-000000000002');

-- The other official's Saturday, declared by the coordinator.
insert into referee_availability (club_id, season_id, person_id, weekday) values
  ('99990087-0000-0000-0000-000000000001', '99990087-0000-0000-0000-0000000000aa', 'b0087000-0000-0000-0000-000000000002', 6);

commit;

do $$
declare
  n        integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd0087000-0000-0000-0000-000000000001', true);

  -- 1. The official declares a week: Saturday all day, Sunday morning.
  n := app_set_my_availability('99990087-0000-0000-0000-000000000001', '99990087-0000-0000-0000-0000000000aa',
    '[{"weekday": 6, "from_time": null, "to_time": null}, {"weekday": 0, "from_time": "06:00", "to_time": "12:00"}]');
  if n <> 2 then
    failures := array_append(failures, format('the week saved %s windows, not 2', n));
  end if;

  -- 2. Saving again replaces the week rather than adding to it.
  n := app_set_my_availability('99990087-0000-0000-0000-000000000001', '99990087-0000-0000-0000-0000000000aa',
    '[{"weekday": 3, "from_time": "17:00", "to_time": "22:00"}]');
  select count(*) into n from referee_availability where person_id = 'b0087000-0000-0000-0000-000000000001';
  if n <> 1 then
    failures := array_append(failures, format('a second save left %s windows, not 1', n));
  end if;

  -- 3. They read their own windows, and not the other official's.
  select count(*) into n from referee_availability;
  if n <> 1 then
    failures := array_append(failures, format('the official read %s windows, not just their 1', n));
  end if;

  -- 4. They record an away period, and remove it.
  insert into referee_unavailability (club_id, person_id, starts_on, ends_on, reason)
  values ('99990087-0000-0000-0000-000000000001', 'b0087000-0000-0000-0000-000000000001',
          current_date + 10, current_date + 12, 'Holiday');
  delete from referee_unavailability where person_id = 'b0087000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then
    failures := array_append(failures, 'the official could not remove their own away period');
  end if;

  -- 5. They cannot record one for another official.
  begin
    insert into referee_unavailability (club_id, person_id, starts_on, ends_on)
    values ('99990087-0000-0000-0000-000000000001', 'b0087000-0000-0000-0000-000000000002', current_date, current_date);
    failures := array_append(failures, 'an official recorded an away period for somebody else');
  exception when insufficient_privilege then null;
  end;

  -- 6. A person with no referee record cannot declare a week.
  perform set_config('request.jwt.claim.sub', 'd0087000-0000-0000-0000-000000000003', true);
  begin
    perform app_set_my_availability('99990087-0000-0000-0000-000000000001', '99990087-0000-0000-0000-0000000000aa',
      '[{"weekday": 6}]');
    failures := array_append(failures, 'a non-official declared availability');
  exception when insufficient_privilege then null;
  end;

  -- 7. The coordinator still reads everybody's.
  perform set_config('request.jwt.claim.sub', 'd0087000-0000-0000-0000-000000000004', true);
  select count(*) into n from referee_availability where club_id = '99990087-0000-0000-0000-000000000001';
  if n <> 2 then
    failures := array_append(failures, format('the coordinator read %s windows, not 2', n));
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'An official declares their own availability FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'An official declares their own availability OK — 7 scenarios';
end $$;
