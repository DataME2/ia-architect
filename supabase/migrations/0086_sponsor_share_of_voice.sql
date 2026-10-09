-- 0086 — Sponsor share of voice, and the record of a removed invoice
-- (scope 88; BR173 added, BR171 amended).
--
-- A. **Share of voice.** With several live sponsors, the slot rotates. A
--    sponsor that wants to appear more often buys a higher tier: Standard
--    (1), Featured (2) or Premium (3). Each view picks a campaign with
--    probability weight ÷ total weight, so with two Standard sponsors and one
--    Premium, the Premium one has 60% of the views and each Standard one 20%.
--    Nothing is stored per viewer. Decision 17 holds: the rotation needs no
--    memory of who saw what. The cap of 3 keeps every sponsor visible.
--
-- B. **Why an invoice was removed.** 0085 kept the deletion in
--    audit_event, which only an admin reads (0002). The treasurer who
--    removed it could not see their own reason. This function returns the
--    club's removed invoices to whoever may bill, and nothing else from the
--    audit.

-- ------------------------------------------------------ A. share of voice

alter table sponsor_campaign
  add column rotation_weight smallint not null default 1 check (rotation_weight between 1 and 3);

comment on column sponsor_campaign.rotation_weight is
  'BR173: share-of-voice tier. 1 Standard, 2 Featured, 3 Premium. Picked in proportion to weight among live campaigns.';

-- ------------------------------------------- B. the removed-invoice record

create or replace function app_deleted_sponsor_invoices(p_club_id uuid)
returns table (
  invoice_number text,
  campaign_id    uuid,
  period_from    date,
  period_to      date,
  amount_cents   integer,
  reason         text,
  deleted_at     timestamptz,
  deleted_by     text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.detail ->> 'invoice_number',
         (a.detail ->> 'campaign_id')::uuid,
         (a.detail ->> 'from')::date,
         (a.detail ->> 'to')::date,
         (a.detail ->> 'amount_cents')::integer,
         a.detail ->> 'reason',
         a.occurred_at,
         coalesce(
           (select coalesce(p.preferred_name, p.legal_given_names) || ' ' || p.legal_family_name
              from account_person ap join person p on p.id = ap.person_id
             where ap.user_id = a.actor_user_id and ap.club_id = a.club_id
             limit 1),
           'A club officer')
    from audit_event a
   where a.club_id = p_club_id
     and a.action = 'sponsor_invoice_deleted'
     and (app_has_role(p_club_id, array['admin', 'treasurer']) or app_is_platform())
   order by a.occurred_at desc
$$;

revoke all on function app_deleted_sponsor_invoices(uuid) from public;
grant execute on function app_deleted_sponsor_invoices(uuid) to authenticated;
