-- 0083 — Sponsor invoices, and the club advertising elsewhere
-- (scope 85; BR171, BR172, decision 17 extended).
--
-- A. **Invoicing a sponsor.** A campaign's counts become an invoice for a
--    period: the counts and the amount are frozen at issue, numbered per club
--    and year, and a period is never invoiced twice. Payment from the sponsor
--    — PayPal, Google Pay or an online bank transfer — is **simulated**, as
--    the referee payouts are (0072): no provider is connected and no money
--    moves; recording it records the **split** between the club and
--    Let'sDataTalk (BR171).
--
-- B. **The club advertising in somebody else's business (CPA).** A referral
--    partner — a café, a sports store — promotes the club with a link carrying
--    its own UTM pair. A family that registers through it is attributed to
--    the partner; a **COMPLETE** registration is an acquisition, paid to the
--    partner at its rate, simulated likewise (BR172). The UTM names the
--    partner and the campaign, never the family.

-- ------------------------------------------------------------ A. invoices

create table sponsor_invoice (
  id                   uuid primary key default gen_random_uuid(),
  club_id              uuid not null references club(id) on delete cascade,
  campaign_id          uuid not null references sponsor_campaign(id) on delete cascade,
  invoice_number       text not null,
  period_from          date not null,
  period_to            date not null,
  impressions          integer not null,
  clicks               integer not null,
  acquisitions         integer not null,
  amount_cents         integer not null check (amount_cents >= 0),
  club_share_cents     integer not null check (club_share_cents >= 0),
  platform_share_cents integer not null check (platform_share_cents >= 0),
  status               text not null default 'issued' check (status in ('issued', 'paid')),
  issued_by            uuid,
  issued_at            timestamptz not null default now(),
  payment_method       text check (payment_method in ('paypal', 'google_pay', 'bank_transfer')),
  payment_provider     text check (payment_provider in ('simulation', 'paypal', 'stripe', 'bank')),
  payment_reference    text,
  paid_at              timestamptz,
  paid_recorded_by     uuid,
  unique (club_id, invoice_number),
  check (period_to >= period_from),
  check (club_share_cents + platform_share_cents = amount_cents),
  check ((status = 'paid') = (paid_at is not null))
);

alter table sponsor_invoice enable row level security;

create policy sponsor_invoice_select on sponsor_invoice
  for select using (app_has_role(club_id, array['admin', 'treasurer']) or app_is_platform());
-- No write policy: invoices are issued and paid through the functions below.

-- Who bills a campaign: the club for its own, the platform for its own.
create or replace function app_may_bill_campaign(p_campaign sponsor_campaign)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case when p_campaign.owner = 'club' then app_has_role(p_campaign.club_id, array['admin', 'treasurer'])
              else app_is_platform() end
$$;

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

  select count(*) + 1 into v_seq from sponsor_invoice
   where club_id = v_c.club_id and extract(year from issued_at) = extract(year from now());

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

-- Collecting from the sponsor: simulated until a provider is connected
-- (docs/annexes/payout-providers.md, "Collecting from sponsors").
create or replace function app_simulate_sponsor_payment(p_invoice_id uuid, p_method text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_i   sponsor_invoice;
  v_c   sponsor_campaign;
  v_ref text := 'SIM-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 10));
begin
  select * into v_i from sponsor_invoice where id = p_invoice_id;
  if v_i.id is null then
    raise exception 'No such invoice.';
  end if;
  select * into v_c from sponsor_campaign where id = v_i.campaign_id;
  if not app_may_bill_campaign(v_c) then
    raise exception 'Only whoever issued it records the payment (BR171).' using errcode = '42501';
  end if;
  if v_i.status = 'paid' then
    raise exception 'That invoice is already paid.';
  end if;
  if p_method not in ('paypal', 'google_pay', 'bank_transfer') then
    raise exception 'PayPal, Google Pay or a bank transfer.';
  end if;

  update sponsor_invoice
     set status = 'paid', payment_method = p_method, payment_provider = 'simulation',
         payment_reference = v_ref, paid_at = now(), paid_recorded_by = auth.uid()
   where id = p_invoice_id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_i.club_id, auth.uid(), 'sponsor_payment_simulated', 'sponsor_invoice', p_invoice_id,
          jsonb_build_object('method', p_method, 'club_share_cents', v_i.club_share_cents,
                             'platform_share_cents', v_i.platform_share_cents));
  return v_ref;
end;
$$;

revoke all on function app_may_bill_campaign(sponsor_campaign) from public;
revoke all on function app_issue_sponsor_invoice(uuid, date, date) from public;
revoke all on function app_simulate_sponsor_payment(uuid, text) from public;
grant execute on function app_issue_sponsor_invoice(uuid, date, date) to authenticated;
grant execute on function app_simulate_sponsor_payment(uuid, text) to authenticated;

-- ------------------------------------------- B. the club advertises (CPA)

create table referral_partner (
  id                uuid primary key default gen_random_uuid(),
  club_id           uuid not null references club(id) on delete cascade,
  name              text not null check (btrim(name) <> ''),
  utm_source        text not null check (utm_source ~ '^[a-z0-9][a-z0-9_-]{1,40}$'),
  utm_medium        text not null default 'referral' check (utm_medium ~ '^[a-z0-9][a-z0-9_-]{1,40}$'),
  utm_campaign      text not null check (utm_campaign ~ '^[a-z0-9][a-z0-9_-]{1,40}$'),
  cpa_rate_cents    integer not null check (cpa_rate_cents > 0),
  starts_on         date not null,
  ends_on           date not null,
  status            text not null default 'active' check (status in ('active', 'paused', 'ended')),
  -- Where the partner is paid: PayPal or a bank account, as a referee is (BR161).
  payout_method     text not null check (payout_method in ('paypal', 'bank_transfer')),
  paypal_email      text,
  account_name      text,
  bsb               text,
  account_number    text,
  created_by        uuid,
  created_at        timestamptz not null default now(),
  unique (club_id, utm_source, utm_campaign),
  check (ends_on >= starts_on),
  check (
    (payout_method = 'paypal' and paypal_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      and bsb is null and account_number is null)
    or (payout_method = 'bank_transfer' and btrim(coalesce(account_name, '')) <> ''
      and bsb ~ '^[0-9]{6}$' and account_number ~ '^[0-9]{5,10}$' and paypal_email is null)
  )
);

alter table referral_partner enable row level security;

create policy referral_partner_select on referral_partner
  for select using (app_has_role(club_id, array['admin', 'treasurer']));
create policy referral_partner_manage on referral_partner
  for all using (app_has_role(club_id, array['admin', 'treasurer']))
  with check (app_has_role(club_id, array['admin', 'treasurer']));

create table referral_attribution (
  registration_id uuid primary key references registration(id) on delete cascade,
  club_id         uuid not null references club(id) on delete cascade,
  partner_id      uuid not null references referral_partner(id) on delete cascade,
  attributed_at   timestamptz not null default now()
);

alter table referral_attribution enable row level security;

create policy referral_attribution_select on referral_attribution
  for select using (app_has_role(club_id, array['admin', 'treasurer', 'registrar']));

-- A registration made through a partner's link names the partner. Called by
-- the public registration path right after the registration is saved, so it
-- accepts only a registration minutes old and not yet attributed, and only a
-- UTM pair that is an active partner of that registration's club.
create or replace function app_attribute_registration(
  p_registration_id uuid, p_utm_source text, p_utm_campaign text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club    uuid;
  v_created timestamptz;
  v_partner uuid;
begin
  select club_id, created_at into v_club, v_created from registration where id = p_registration_id;
  if v_club is null or v_created < now() - interval '15 minutes' then
    return false;
  end if;
  select id into v_partner from referral_partner
   where club_id = v_club and utm_source = lower(btrim(p_utm_source)) and utm_campaign = lower(btrim(p_utm_campaign))
     and status = 'active' and current_date between starts_on and ends_on;
  if v_partner is null then
    return false;
  end if;
  insert into referral_attribution (registration_id, club_id, partner_id)
  values (p_registration_id, v_club, v_partner)
  on conflict do nothing;
  return true;
end;
$$;

revoke all on function app_attribute_registration(uuid, text, text) from public;
grant execute on function app_attribute_registration(uuid, text, text) to anon, authenticated;

create table referral_payout (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references club(id) on delete cascade,
  partner_id      uuid not null references referral_partner(id) on delete cascade,
  period_from     date not null,
  period_to       date not null,
  acquisitions    integer not null check (acquisitions > 0),
  amount_cents    integer not null check (amount_cents > 0),
  method          text not null,
  provider        text not null check (provider in ('simulation', 'paypal', 'bank_file')),
  reference       text not null,
  paid_at         timestamptz not null default now(),
  paid_by         uuid,
  check (period_to >= period_from)
);

alter table referral_payout enable row level security;

create policy referral_payout_select on referral_payout
  for select using (app_has_role(club_id, array['admin', 'treasurer']));

-- Pay a partner for the COMPLETE registrations it brought in a period —
-- simulated. A period is paid once.
create or replace function app_simulate_partner_payout(p_partner_id uuid, p_from date, p_to date)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_p   referral_partner;
  v_n   integer;
  v_ref text := 'SIM-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 10));
begin
  select * into v_p from referral_partner where id = p_partner_id;
  if v_p.id is null then
    raise exception 'No such partner.';
  end if;
  if not app_has_role(v_p.club_id, array['admin', 'treasurer']) then
    raise exception 'Only the club''s admin or treasurer pays a partner (BR172).' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to > current_date then
    raise exception 'Pay for a period that has already happened.';
  end if;
  if exists (select 1 from referral_payout r where r.partner_id = p_partner_id
                and daterange(r.period_from, r.period_to, '[]') && daterange(p_from, p_to, '[]')) then
    raise exception 'Part of that period is already paid (BR172).';
  end if;

  select count(*) into v_n
    from referral_attribution a join registration r on r.id = a.registration_id
   where a.partner_id = p_partner_id and r.status = 'COMPLETE'
     and a.attributed_at::date between p_from and p_to;
  if v_n = 0 then
    raise exception 'No completed registration came through this partner in that period.';
  end if;

  insert into referral_payout (club_id, partner_id, period_from, period_to, acquisitions, amount_cents,
                               method, provider, reference, paid_by)
  values (v_p.club_id, p_partner_id, p_from, p_to, v_n, v_n * v_p.cpa_rate_cents,
          v_p.payout_method, 'simulation', v_ref, auth.uid());

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_p.club_id, auth.uid(), 'referral_payout_simulated', 'referral_partner', p_partner_id,
          jsonb_build_object('acquisitions', v_n, 'amount_cents', v_n * v_p.cpa_rate_cents));
  return v_n;
end;
$$;

revoke all on function app_simulate_partner_payout(uuid, date, date) from public;
grant execute on function app_simulate_partner_payout(uuid, date, date) to authenticated;
