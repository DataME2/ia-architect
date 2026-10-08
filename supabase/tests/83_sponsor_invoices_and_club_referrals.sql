-- 0083: sponsor invoices, and the club advertising elsewhere (scope 85;
-- BR171, BR172).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990083-0000-0000-0000-000000000001', 'Invoicing FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('99990083-0000-0000-0000-0000000000aa', '99990083-0000-0000-0000-000000000001', '2026',
   current_date - 100, current_date + 200);

insert into auth.users (id, email) values
  ('d0083000-0000-0000-0000-000000000001', 'treasurer@invoicing.test'),
  ('d0083000-0000-0000-0000-000000000002', 'committee@invoicing.test');

insert into club_membership (club_id, user_id, role) values
  ('99990083-0000-0000-0000-000000000001', 'd0083000-0000-0000-0000-000000000001', 'treasurer'),
  ('99990083-0000-0000-0000-000000000001', 'd0083000-0000-0000-0000-000000000002', 'committee');

insert into sponsor_campaign (id, club_id, sponsor_name, headline, link_url, pricing_model, rate_cents, starts_on, ends_on) values
  ('99990083-0000-0000-0000-0000000000c1', '99990083-0000-0000-0000-000000000001', 'Corner Café', 'Coffee',
   'https://cornercafe.example.com', 'cpc', 50, current_date - 30, current_date + 30);

-- Twenty clicks over two days of the last week.
insert into sponsor_tally (club_id, campaign_id, on_day, impressions, clicks) values
  ('99990083-0000-0000-0000-000000000001', '99990083-0000-0000-0000-0000000000c1', current_date - 6, 400, 12),
  ('99990083-0000-0000-0000-000000000001', '99990083-0000-0000-0000-0000000000c1', current_date - 5, 300, 8);

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0083000-0000-0000-0000-000000000001', '99990083-0000-0000-0000-000000000001', 'New', 'Kid', (current_date - interval '9 years')::date),
  ('b0083000-0000-0000-0000-000000000002', '99990083-0000-0000-0000-000000000001', 'Old', 'Kid', (current_date - interval '9 years')::date);

insert into registration (id, club_id, person_id, season_id, status, created_at) values
  ('99990083-0000-0000-0000-0000000000e1', '99990083-0000-0000-0000-000000000001', 'b0083000-0000-0000-0000-000000000001',
   '99990083-0000-0000-0000-0000000000aa', 'COMPLETE', now()),
  ('99990083-0000-0000-0000-0000000000e2', '99990083-0000-0000-0000-000000000001', 'b0083000-0000-0000-0000-000000000002',
   '99990083-0000-0000-0000-0000000000aa', 'COMPLETE', now() - interval '2 hours');

insert into referral_partner (id, club_id, name, utm_source, utm_campaign, cpa_rate_cents, starts_on, ends_on,
                              payout_method, paypal_email) values
  ('99990083-0000-0000-0000-0000000000f1', '99990083-0000-0000-0000-000000000001', 'Sports Store', 'sports-store',
   'winter-2027', 1500, current_date - 10, current_date + 90, 'paypal', 'owner@sportsstore.example.com');

commit;

do $$
declare
  inv      uuid;
  ref      text;
  n        integer;
  v_amt    integer;
  v_club   integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The treasurer invoices the week: 20 clicks × 50c = $10, all the club's.
  perform set_config('request.jwt.claim.sub', 'd0083000-0000-0000-0000-000000000001', true);
  inv := app_issue_sponsor_invoice('99990083-0000-0000-0000-0000000000c1', current_date - 7, current_date - 1);
  select amount_cents, club_share_cents into v_amt, v_club from sponsor_invoice where id = inv;
  if v_amt <> 1000 or v_club <> 1000 then
    failures := array_append(failures, format('the invoice read %s / club %s, not 1000 / 1000', v_amt, v_club));
  end if;

  -- 2. An overlapping period is refused.
  begin
    perform app_issue_sponsor_invoice('99990083-0000-0000-0000-0000000000c1', current_date - 3, current_date - 1);
    failures := array_append(failures, 'a period was invoiced twice');
  exception when others then null;
  end;

  -- 3. A committee member cannot record the payment; the treasurer can, once.
  perform set_config('request.jwt.claim.sub', 'd0083000-0000-0000-0000-000000000002', true);
  begin
    perform app_simulate_sponsor_payment(inv, 'paypal');
    failures := array_append(failures, 'a committee member recorded a sponsor payment');
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', 'd0083000-0000-0000-0000-000000000001', true);
  ref := app_simulate_sponsor_payment(inv, 'google_pay');
  if ref not like 'SIM-%' then
    failures := array_append(failures, 'the simulated payment had no SIM reference');
  end if;
  begin
    perform app_simulate_sponsor_payment(inv, 'paypal');
    failures := array_append(failures, 'an invoice was paid twice');
  exception when others then null;
  end;

  -- 4. Attribution: a fresh registration through the partner's link counts;
  --    an old one, or an unknown campaign, does not.
  perform set_config('role', 'anon', true);
  if not app_attribute_registration('99990083-0000-0000-0000-0000000000e1', 'Sports-Store', 'winter-2027') then
    failures := array_append(failures, 'a fresh registration through the partner''s link was not credited');
  end if;
  if app_attribute_registration('99990083-0000-0000-0000-0000000000e2', 'sports-store', 'winter-2027') then
    failures := array_append(failures, 'a two-hour-old registration was credited after the fact');
  end if;
  if app_attribute_registration('99990083-0000-0000-0000-0000000000e1', 'sports-store', 'made-up') then
    failures := array_append(failures, 'an unknown campaign was credited');
  end if;

  -- 5. The treasurer pays the partner for the completed registration, once.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd0083000-0000-0000-0000-000000000001', true);
  n := app_simulate_partner_payout('99990083-0000-0000-0000-0000000000f1', current_date - 1, current_date);
  if n <> 1 then
    failures := array_append(failures, format('the partner was paid for %s registrations, not 1', n));
  end if;
  begin
    perform app_simulate_partner_payout('99990083-0000-0000-0000-0000000000f1', current_date, current_date);
    failures := array_append(failures, 'a partner period was paid twice');
  exception when others then null;
  end;

  -- 6. The committee reads no partner bank details.
  perform set_config('request.jwt.claim.sub', 'd0083000-0000-0000-0000-000000000002', true);
  select count(*) into n from referral_partner;
  if n <> 0 then
    failures := array_append(failures, 'a committee member read a partner''s payout details');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Sponsor invoices and club referrals FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'Sponsor invoices and club referrals OK — 6 scenarios';
end $$;
