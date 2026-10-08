-- 0081: sponsors in the workspace (scope 84; BR169, BR170, decision 17).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990081-0000-0000-0000-000000000001', 'Sponsored FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('d0081000-0000-0000-0000-000000000001', 'treasurer@sponsored.test'),
  ('d0081000-0000-0000-0000-000000000002', 'committee@sponsored.test'),
  ('d0081000-0000-0000-0000-000000000003', 'parent@sponsored.test'),
  ('d0081000-0000-0000-0000-000000000004', 'teen@sponsored.test'),
  ('d0081000-0000-0000-0000-000000000005', 'stranger@sponsored.test'),
  ('d0081000-0000-0000-0000-000000000006', 'owner@platform.test');

insert into platform_admin (user_id) values ('d0081000-0000-0000-0000-000000000006');

insert into club_membership (club_id, user_id, role) values
  ('99990081-0000-0000-0000-000000000001', 'd0081000-0000-0000-0000-000000000001', 'treasurer'),
  ('99990081-0000-0000-0000-000000000001', 'd0081000-0000-0000-0000-000000000002', 'committee');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0081000-0000-0000-0000-000000000003', '99990081-0000-0000-0000-000000000001', 'The', 'Parent', '1984-01-01'),
  ('b0081000-0000-0000-0000-000000000004', '99990081-0000-0000-0000-000000000001', 'Fifteen', 'Teen', (current_date - interval '15 years')::date);

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99990081-0000-0000-0000-000000000001', 'b0081000-0000-0000-0000-000000000004', 'b0081000-0000-0000-0000-000000000003', true, true);

insert into account_person (club_id, user_id, person_id) values
  ('99990081-0000-0000-0000-000000000001', 'd0081000-0000-0000-0000-000000000003', 'b0081000-0000-0000-0000-000000000003'),
  ('99990081-0000-0000-0000-000000000001', 'd0081000-0000-0000-0000-000000000004', 'b0081000-0000-0000-0000-000000000004');

commit;

do $$
declare
  the_club uuid := '99990081-0000-0000-0000-000000000001';
  camp     uuid;
  plat     uuid;
  ok_      boolean;
  n        integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The treasurer creates a CPC campaign; a committee member cannot.
  perform set_config('request.jwt.claim.sub', 'd0081000-0000-0000-0000-000000000001', true);
  insert into sponsor_campaign (club_id, sponsor_name, headline, link_url, pricing_model, rate_cents, starts_on, ends_on)
  values (the_club, 'Corner Café', 'Free coffee for parents', 'https://cornercafe.example.com.au', 'cpc', 50,
          current_date - 1, current_date + 30)
  returning id into camp;
  perform set_config('request.jwt.claim.sub', 'd0081000-0000-0000-0000-000000000002', true);
  begin
    insert into sponsor_campaign (club_id, sponsor_name, headline, link_url, pricing_model, rate_cents, starts_on, ends_on)
    values (the_club, 'X', 'Y', 'https://x.example.com', 'cpm', 100, current_date, current_date + 1);
    failures := array_append(failures, 'a committee member created a sponsor campaign');
  exception when insufficient_privilege then null;
  end;

  -- 2. An adult parent's impression counts once a day, however many times.
  perform set_config('request.jwt.claim.sub', 'd0081000-0000-0000-0000-000000000003', true);
  ok_ := app_record_sponsor_event(camp, 'impression');
  ok_ := app_record_sponsor_event(camp, 'impression');
  ok_ := app_record_sponsor_event(camp, 'click');

  -- 3. A 15-year-old's own account and a stranger are never counted (BR169).
  perform set_config('request.jwt.claim.sub', 'd0081000-0000-0000-0000-000000000004', true);
  if app_record_sponsor_event(camp, 'impression') then
    failures := array_append(failures, 'a 15-year-old''s impression was counted');
  end if;
  perform set_config('request.jwt.claim.sub', 'd0081000-0000-0000-0000-000000000005', true);
  if app_record_sponsor_event(camp, 'click') then
    failures := array_append(failures, 'a stranger''s click was counted');
  end if;

  perform set_config('role', 'postgres', true);
  select impressions + clicks * 100 into n from sponsor_tally where campaign_id = camp and on_day = current_date;
  if n is distinct from 101 then
    failures := array_append(failures, format('tally read %s, not 1 impression and 1 click', n));
  end if;
  perform set_config('role', 'authenticated', true);

  -- 4. Nobody reads who was counted.
  perform set_config('request.jwt.claim.sub', 'd0081000-0000-0000-0000-000000000001', true);
  select count(*) into n from sponsor_seen;
  if n <> 0 then
    failures := array_append(failures, 'the treasurer read the viewer hashes');
  end if;

  -- 5. Acquisitions: the treasurer records them; the committee cannot.
  perform app_record_sponsor_acquisitions(camp, current_date, 3);
  perform set_config('request.jwt.claim.sub', 'd0081000-0000-0000-0000-000000000002', true);
  begin
    perform app_record_sponsor_acquisitions(camp, current_date, 99);
    failures := array_append(failures, 'a committee member recorded acquisitions');
  exception when insufficient_privilege then null;
  end;

  -- 6. The club opts in but cannot set its own share; the platform places.
  perform set_config('request.jwt.claim.sub', 'd0081000-0000-0000-0000-000000000001', true);
  insert into club_sponsor_settings (club_id, accepts_platform_campaigns, platform_share_bps)
  values (the_club, true, 9900);
  select platform_share_bps into n from club_sponsor_settings where club_id = the_club;
  if n <> 3000 then
    failures := array_append(failures, format('the club set its own share to %s', n));
  end if;
  begin
    perform app_platform_place_campaign(the_club, 'Brand', 'Headline', null, 'https://brand.example.com', 'cpm', 800,
                                        null, current_date, current_date + 10);
    failures := array_append(failures, 'a club treasurer placed a platform campaign');
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', 'd0081000-0000-0000-0000-000000000006', true);
  plat := app_platform_place_campaign(the_club, 'Brand', 'Headline', null, 'https://brand.example.com', 'cpm', 800,
                                      null, current_date, current_date + 10);

  -- 7. The club cannot change the platform's campaign.
  perform set_config('request.jwt.claim.sub', 'd0081000-0000-0000-0000-000000000001', true);
  update sponsor_campaign set status = 'paused' where id = plat;
  get diagnostics n = row_count;
  if n <> 0 then
    failures := array_append(failures, 'the club paused a platform campaign');
  end if;
  perform set_config('role', 'postgres', true);
  if not exists (select 1 from sponsor_campaign where id = plat and owner = 'platform' and club_share_bps = 3000) then
    failures := array_append(failures, 'the platform campaign did not record the club''s share');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Sponsors in the workspace FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'Sponsors in the workspace OK — 7 scenarios';
end $$;
