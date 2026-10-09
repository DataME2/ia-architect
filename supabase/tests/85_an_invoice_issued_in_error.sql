-- 0085: an invoice issued in error is deleted, never paid (scope 87; BR171
-- amended).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990085-0000-0000-0000-000000000001', 'Corrected FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('d0085000-0000-0000-0000-000000000001', 'treasurer@corrected.test'),
  ('d0085000-0000-0000-0000-000000000002', 'committee@corrected.test');

insert into club_membership (club_id, user_id, role) values
  ('99990085-0000-0000-0000-000000000001', 'd0085000-0000-0000-0000-000000000001', 'treasurer'),
  ('99990085-0000-0000-0000-000000000001', 'd0085000-0000-0000-0000-000000000002', 'committee');

insert into sponsor_campaign (id, club_id, sponsor_name, headline, link_url, pricing_model, rate_cents, starts_on, ends_on) values
  ('99990085-0000-0000-0000-0000000000c1', '99990085-0000-0000-0000-000000000001', 'Corner Café', 'Coffee',
   'https://cornercafe.example.com', 'cpc', 50, current_date - 30, current_date + 30);

insert into sponsor_tally (club_id, campaign_id, on_day, impressions, clicks) values
  ('99990085-0000-0000-0000-000000000001', '99990085-0000-0000-0000-0000000000c1', current_date - 6, 400, 12),
  ('99990085-0000-0000-0000-000000000001', '99990085-0000-0000-0000-0000000000c1', current_date - 2, 300, 8);

commit;

do $$
declare
  wrong    uuid;
  later    uuid;
  again    uuid;
  paid     uuid;
  num      text;
  n        integer;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'd0085000-0000-0000-0000-000000000001', true);

  -- Two invoices: INV-…-0001 (the wrong one) and INV-…-0002.
  wrong := app_issue_sponsor_invoice('99990085-0000-0000-0000-0000000000c1', current_date - 7, current_date - 4);
  later := app_issue_sponsor_invoice('99990085-0000-0000-0000-0000000000c1', current_date - 3, current_date - 1);

  -- 1. A committee member cannot delete it.
  perform set_config('request.jwt.claim.sub', 'd0085000-0000-0000-0000-000000000002', true);
  begin
    perform app_delete_sponsor_invoice(wrong, 'Wrong period');
    failures := array_append(failures, 'a committee member deleted an invoice');
  exception when insufficient_privilege then null;
  end;

  -- 2. The treasurer cannot delete without a reason; with one, the row goes
  --    and the audit keeps its number.
  perform set_config('request.jwt.claim.sub', 'd0085000-0000-0000-0000-000000000001', true);
  begin
    perform app_delete_sponsor_invoice(wrong, '  ');
    failures := array_append(failures, 'an invoice was deleted without a reason');
  exception when others then null;
  end;
  num := app_delete_sponsor_invoice(wrong, 'Wrong period');
  perform set_config('role', 'postgres', true);
  select count(*) into n from sponsor_invoice where id = wrong;
  if n <> 0 then
    failures := array_append(failures, 'the deleted invoice is still there');
  end if;
  select count(*) into n from audit_event
   where action = 'sponsor_invoice_deleted' and entity_id = wrong
     and detail ->> 'invoice_number' = num and detail ->> 'reason' = 'Wrong period';
  if n <> 1 then
    failures := array_append(failures, 'the deletion left no audit with its number and reason');
  end if;
  perform set_config('role', 'authenticated', true);

  -- 3. Its period is free again, and the new invoice takes a fresh number:
  --    neither the deleted 0001 nor the live 0002.
  again := app_issue_sponsor_invoice('99990085-0000-0000-0000-0000000000c1', current_date - 7, current_date - 4);
  select invoice_number into num from sponsor_invoice where id = again;
  if num not like '%-0003' then
    failures := array_append(failures, format('the reissued invoice was numbered %s, not …-0003', num));
  end if;

  -- 4. A paid invoice is never deleted.
  perform app_simulate_sponsor_payment(later, 'paypal');
  begin
    perform app_delete_sponsor_invoice(later, 'Changed my mind');
    failures := array_append(failures, 'a paid invoice was deleted');
  exception when others then null;
  end;

  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'An invoice issued in error FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;
  raise notice 'An invoice issued in error OK — 4 scenarios';
end $$;
