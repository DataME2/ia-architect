-- 0086: share of voice, and the record of a removed invoice (scope 88;
-- BR173, BR171).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990086-0000-0000-0000-000000000001', 'Rotating FC', 'AU-QLD'),
  ('99990086-0000-0000-0000-000000000002', 'Other FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('d0086000-0000-0000-0000-000000000001', 'treasurer@rotating.test'),
  ('d0086000-0000-0000-0000-000000000002', 'committee@rotating.test'),
  ('d0086000-0000-0000-0000-000000000003', 'treasurer@other.test');

insert into club_membership (club_id, user_id, role) values
  ('99990086-0000-0000-0000-000000000001', 'd0086000-0000-0000-0000-000000000001', 'treasurer'),
  ('99990086-0000-0000-0000-000000000001', 'd0086000-0000-0000-0000-000000000002', 'committee'),
  ('99990086-0000-0000-0000-000000000002', 'd0086000-0000-0000-0000-000000000003', 'treasurer');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, preferred_name) values
  ('b0086000-0000-0000-0000-000000000001', '99990086-0000-0000-0000-000000000001', 'Patricia', 'Treasurer', '1980-01-01', 'Pat');

insert into account_person (club_id, user_id, person_id) values
  ('99990086-0000-0000-0000-000000000001', 'd0086000-0000-0000-0000-000000000001', 'b0086000-0000-0000-0000-000000000001');

insert into sponsor_campaign (id, club_id, sponsor_name, headline, link_url, pricing_model, rate_cents, starts_on, ends_on) values
  ('99990086-0000-0000-0000-0000000000c1', '99990086-0000-0000-0000-000000000001', 'Corner Café', 'Coffee',
   'https://cornercafe.example.com', 'cpc', 50, current_date - 30, current_date + 30);

insert into sponsor_tally (club_id, campaign_id, on_day, impressions, clicks) values
  ('99990086-0000-0000-0000-000000000001', '99990086-0000-0000-0000-0000000000c1', current_date - 6, 400, 12);

commit;

do $$
declare
  inv      uuid;
  w        smallint;
  r        record;
  n        integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd0086000-0000-0000-0000-000000000001', true);

  -- 1. A new campaign is Standard; the treasurer can make it Premium.
  select rotation_weight into w from sponsor_campaign where id = '99990086-0000-0000-0000-0000000000c1';
  if w <> 1 then
    failures := array_append(failures, format('a new campaign had weight %s, not 1', w));
  end if;
  update sponsor_campaign set rotation_weight = 3 where id = '99990086-0000-0000-0000-0000000000c1';
  select rotation_weight into w from sponsor_campaign where id = '99990086-0000-0000-0000-0000000000c1';
  if w <> 3 then
    failures := array_append(failures, 'the treasurer could not make a campaign Premium');
  end if;

  -- 2. Nothing above Premium.
  begin
    update sponsor_campaign set rotation_weight = 9 where id = '99990086-0000-0000-0000-0000000000c1';
    failures := array_append(failures, 'a campaign was given weight 9');
  exception when check_violation then null;
  end;

  -- 3. The treasurer reads back the invoice they removed, with the reason
  --    and their own name.
  inv := app_issue_sponsor_invoice('99990086-0000-0000-0000-0000000000c1', current_date - 7, current_date - 1);
  perform app_delete_sponsor_invoice(inv, 'Issued to the wrong sponsor');
  select * into r from app_deleted_sponsor_invoices('99990086-0000-0000-0000-000000000001');
  if r.reason is distinct from 'Issued to the wrong sponsor' or r.deleted_by is distinct from 'Pat Treasurer'
     or r.amount_cents is distinct from 600 then
    failures := array_append(failures, format('the removed-invoice record read %s / %s / %s', r.reason, r.deleted_by, r.amount_cents));
  end if;

  -- 4. A committee member, and another club's treasurer, read none of it.
  perform set_config('request.jwt.claim.sub', 'd0086000-0000-0000-0000-000000000002', true);
  select count(*) into n from app_deleted_sponsor_invoices('99990086-0000-0000-0000-000000000001');
  if n <> 0 then
    failures := array_append(failures, 'a committee member read the removed invoices');
  end if;
  perform set_config('request.jwt.claim.sub', 'd0086000-0000-0000-0000-000000000003', true);
  select count(*) into n from app_deleted_sponsor_invoices('99990086-0000-0000-0000-000000000001');
  if n <> 0 then
    failures := array_append(failures, 'another club''s treasurer read the removed invoices');
  end if;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Sponsor share of voice FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'Sponsor share of voice OK — 4 scenarios';
end $$;
