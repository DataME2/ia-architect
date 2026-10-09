-- 0085 — An invoice issued in error is deleted, never paid (scope 87; BR171
-- amended).
--
-- A wrong period or a wrong campaign meant the invoice stood forever, and
-- its period could never be invoiced again. Now whoever may bill the
-- campaign deletes an **unpaid** invoice with a reason. The row goes, which
-- frees its period, and the audit keeps the number, amount, period, who and
-- why. A paid invoice is never deleted: money has moved.
--
-- Numbering changes with it. 0083 numbered by counting the year's invoices,
-- so deleting one would hand its successor a number already in use. The
-- number now counts the year's *issue* audit rows, which are append-only, so
-- a number is never reused, including a deleted invoice's.

create or replace function app_issue_sponsor_invoice(p_campaign_id uuid, p_from date, p_to date)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_c    sponsor_campaign;
  v_imp  integer;
  v_clk  integer;
  v_acq  integer;
  v_amt  integer;
  v_club integer;
  v_seq  integer;
  v_id   uuid;
begin
  select * into v_c from sponsor_campaign where id = p_campaign_id;
  if v_c.id is null then
    raise exception 'No such campaign.';
  end if;
  if not app_may_bill_campaign(v_c) then
    raise exception 'Only the club''s admin or treasurer invoices its campaigns; the platform invoices its own (BR171).'
      using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to > current_date then
    raise exception 'Invoice a period that has already happened.';
  end if;
  if exists (select 1 from sponsor_invoice i where i.campaign_id = p_campaign_id
                and daterange(i.period_from, i.period_to, '[]') && daterange(p_from, p_to, '[]')) then
    raise exception 'Part of that period is already invoiced; a period is invoiced once (BR171).';
  end if;

  select coalesce(sum(impressions), 0), coalesce(sum(clicks), 0), coalesce(sum(acquisitions), 0)
    into v_imp, v_clk, v_acq
    from sponsor_tally where campaign_id = p_campaign_id and on_day between p_from and p_to;

  v_amt := case v_c.pricing_model
             when 'cpc' then v_clk * v_c.rate_cents
             when 'cpa' then v_acq * v_c.rate_cents
             else round(v_imp::numeric * v_c.rate_cents / 1000)::integer end;
  v_club := round(v_amt::numeric * v_c.club_share_bps / 10000)::integer;

  -- Never reused: the year's issue audit rows survive a deletion.
  select greatest(
           (select count(*) from audit_event
             where club_id = v_c.club_id and action = 'sponsor_invoice_issued'
               and extract(year from occurred_at) = extract(year from now())),
           (select coalesce(max(substring(invoice_number from '[0-9]+$')::integer), 0) from sponsor_invoice
             where club_id = v_c.club_id and invoice_number like 'INV-' || extract(year from now()) || '-%')
         ) + 1
    into v_seq;

  insert into sponsor_invoice (club_id, campaign_id, invoice_number, period_from, period_to,
                               impressions, clicks, acquisitions, amount_cents, club_share_cents,
                               platform_share_cents, issued_by)
  values (v_c.club_id, p_campaign_id, 'INV-' || extract(year from now()) || '-' || lpad(v_seq::text, 4, '0'),
          p_from, p_to, v_imp, v_clk, v_acq, v_amt, v_club, v_amt - v_club, auth.uid())
  returning id into v_id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_c.club_id, auth.uid(), 'sponsor_invoice_issued', 'sponsor_invoice', v_id,
          jsonb_build_object('amount_cents', v_amt, 'from', p_from, 'to', p_to));
  return v_id;
end;
$$;

create or replace function app_delete_sponsor_invoice(p_invoice_id uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_i sponsor_invoice;
  v_c sponsor_campaign;
begin
  select * into v_i from sponsor_invoice where id = p_invoice_id;
  if v_i.id is null then
    raise exception 'No such invoice.';
  end if;
  select * into v_c from sponsor_campaign where id = v_i.campaign_id;
  if not app_may_bill_campaign(v_c) then
    raise exception 'Only whoever may bill the campaign deletes its invoice (BR171).' using errcode = '42501';
  end if;
  if v_i.status = 'paid' then
    raise exception 'A paid invoice is never deleted: the money has moved (BR171).';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'Say why the invoice is being deleted.';
  end if;

  delete from sponsor_invoice where id = p_invoice_id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_i.club_id, auth.uid(), 'sponsor_invoice_deleted', 'sponsor_invoice', p_invoice_id,
          jsonb_build_object('invoice_number', v_i.invoice_number, 'campaign_id', v_i.campaign_id,
                             'from', v_i.period_from, 'to', v_i.period_to,
                             'amount_cents', v_i.amount_cents, 'reason', btrim(p_reason)));
  return v_i.invoice_number;
end;
$$;

revoke all on function app_delete_sponsor_invoice(uuid, text) from public;
grant execute on function app_delete_sponsor_invoice(uuid, text) to authenticated;
