-- 0072 — A referee is paid online (scope 76; BR118 restated, BR161, BR162).
--
-- Until now the platform only *recorded* that a batch was paid elsewhere
-- (BR118). The club asked, October 2026, for the money to move through an
-- online option the treasurer does not have to key in by hand: a nominated
-- bank account, PayPal or Stripe. Two tables and one function:
--
--   * `payout_nomination` — where an official is to be paid (BR161). Made by
--     whoever chooses pay-or-credit under BR152 (`app_may_answer_designation`:
--     the official from eighteen, a guardian with authority before), read by
--     that same person and by the admin and treasurer, and by nobody else. A
--     new nomination supersedes the old one; the history is kept.
--   * `referee_payout` — one row per claim paid online (BR162). Written only
--     by `app_simulate_batch_payout()`, never by a client, so a provider
--     reference cannot be typed in.
--   * `app_simulate_batch_payout(batch)` — the treasurer's "Pay online" for a
--     closed batch, **simulated**: no provider is connected, no money moves,
--     and every row says `simulation`. Connecting Stripe or PayPal replaces
--     this one step (see docs/annexes/payout-providers.md); the nomination,
--     the record and the screens stay as they are.
--
-- Bank details are personal information (APP 11). They are shown masked on
-- every screen; encryption at rest beyond Supabase's disk encryption is a
-- named follow-up, not done here.

-- ------------------------------------------------------- payout_nomination

create table payout_nomination (
  id                     uuid primary key default gen_random_uuid(),
  club_id                uuid not null references club(id) on delete cascade,
  person_id              uuid not null references person(id) on delete cascade,
  method                 text not null check (method in ('bank_transfer', 'paypal', 'stripe')),
  account_name           text,
  bsb                    text,
  account_number         text,
  paypal_email           text,
  stripe_account_id      text,
  nominated_by_person_id uuid not null references person(id),
  nominated_at           timestamptz not null default now(),
  superseded_at          timestamptz,

  -- Exactly the fields the method needs, and none of the others.
  check (
    (method = 'bank_transfer'
      and btrim(coalesce(account_name, '')) <> ''
      and bsb ~ '^[0-9]{6}$'
      and account_number ~ '^[0-9]{5,10}$'
      and paypal_email is null and stripe_account_id is null)
    or (method = 'paypal'
      and paypal_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      and account_name is null and bsb is null and account_number is null and stripe_account_id is null)
    or (method = 'stripe'
      and stripe_account_id ~ '^acct_[A-Za-z0-9]+$'
      and account_name is null and bsb is null and account_number is null and paypal_email is null)
  )
);

create unique index payout_nomination_one_live
  on payout_nomination (club_id, person_id) where superseded_at is null;

alter table payout_nomination enable row level security;

-- Who may nominate is who chooses pay or credit (BR152): the same function,
-- reused rather than redefined, so the two can never disagree.
create policy payout_nomination_select on payout_nomination
  for select using (
    app_has_role(club_id, array['admin', 'treasurer'])
    or exists (
      select 1 from app_may_answer_designation(person_id, club_id, current_date) a
       where a in (select app_my_person_ids()))
  );

create policy payout_nomination_nominate on payout_nomination
  for insert with check (
    nominated_by_person_id in (select app_my_person_ids())
    and nominated_by_person_id in (select app_may_answer_designation(person_id, club_id, current_date))
  );

-- No update or delete policy: a nomination is replaced, never edited. The
-- trigger below closes the previous live one.

create or replace function payout_nomination_supersedes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update payout_nomination
     set superseded_at = now()
   where club_id = new.club_id
     and person_id = new.person_id
     and superseded_at is null;
  new.nominated_at := now();
  new.superseded_at := null;
  return new;
end;
$$;

create trigger payout_nomination_supersedes
  before insert on payout_nomination
  for each row execute function payout_nomination_supersedes();

-- ---------------------------------------------------------- referee_payout

create table referee_payout (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references club(id) on delete cascade,
  batch_id           uuid not null references referee_payment_batch(id),
  claim_id           uuid not null unique references referee_payment_claim(id),
  nomination_id      uuid not null references payout_nomination(id),
  method             text not null,
  amount_cents       integer not null check (amount_cents > 0),
  provider           text not null check (provider in ('simulation', 'stripe', 'paypal', 'bank_file')),
  provider_reference text not null,
  status             text not null check (status in ('simulated', 'sent', 'failed')),
  created_by         uuid,
  created_at         timestamptz not null default now()
);

alter table referee_payout enable row level security;

-- The treasurer and admin, and the official's own family (the claim's read,
-- 0057's shape). No write policy at all: only the function below writes.
create policy referee_payout_select on referee_payout
  for select using (
    app_has_role(club_id, array['admin', 'treasurer'])
    or exists (
      select 1
        from referee_payment_claim c
        join match_official_appointment moa on moa.id = c.appointment_id
       where c.id = referee_payout.claim_id
         and moa.person_id in (select app_my_family_person_ids(referee_payout.club_id)))
  );

-- ---------------------------------------------- app_simulate_batch_payout
-- Every approved claim in a closed, unpaid batch that is to be paid (not
-- credited, BR152) gets a simulated payout to its official's live
-- nomination, and the batch is recorded paid with a SIMULATED reference.
-- All or nothing: one official without a nomination stops the whole run and
-- is named, so the treasurer never half-pays a batch.

create or replace function app_simulate_batch_payout(p_batch_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_batch   referee_payment_batch;
  v_missing text;
  v_ref     text := 'SIM-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 10));
  v_count   integer;
begin
  select * into v_batch from referee_payment_batch where id = p_batch_id;
  if v_batch.id is null then
    raise exception 'No such payment run.';
  end if;
  if not app_has_role(v_batch.club_id, array['admin', 'treasurer']) then
    raise exception 'Only the treasurer or an admin pays a payment run (BR78).' using errcode = '42501';
  end if;
  if v_batch.closed_at is null then
    raise exception 'Close the payment run before paying it (BR117).';
  end if;
  if v_batch.paid_at is not null then
    raise exception 'That payment run is already paid.';
  end if;

  -- Who has nowhere to be paid?
  select string_agg(distinct coalesce(p.preferred_name, p.legal_given_names) || ' ' || p.legal_family_name, ', ')
    into v_missing
    from referee_payment_claim c
    join match_official_appointment moa on moa.id = c.appointment_id
    join person p on p.id = moa.person_id
   where c.batch_id = p_batch_id
     and c.state = 'approved'
     and coalesce(c.settlement, 'pay') = 'pay'
     and not exists (
       select 1 from payout_nomination n
        where n.club_id = c.club_id and n.person_id = moa.person_id and n.superseded_at is null);
  if v_missing is not null then
    raise exception 'No payout nomination for: %. Ask them (or their guardian) to nominate where to be paid (BR161).', v_missing;
  end if;

  insert into referee_payout
    (club_id, batch_id, claim_id, nomination_id, method, amount_cents, provider, provider_reference, status, created_by)
  select c.club_id, p_batch_id, c.id, n.id, n.method, c.amount_cents, 'simulation',
         v_ref || '-' || row_number() over (order by c.id), 'simulated', auth.uid()
    from referee_payment_claim c
    join match_official_appointment moa on moa.id = c.appointment_id
    join payout_nomination n
      on n.club_id = c.club_id and n.person_id = moa.person_id and n.superseded_at is null
   where c.batch_id = p_batch_id
     and c.state = 'approved'
     and coalesce(c.settlement, 'pay') = 'pay';
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'Nothing in this payment run is to be paid: every claim was credited or none was approved.';
  end if;

  update referee_payment_batch
     set paid_at = now(), paid_by = auth.uid(), paid_reference = 'SIMULATED ' || v_ref
   where id = p_batch_id;

  return v_count;
end;
$$;

revoke all on function app_simulate_batch_payout(uuid) from public;
grant execute on function app_simulate_batch_payout(uuid) to authenticated;

comment on function app_simulate_batch_payout(uuid) is
  'BR162: pay a closed batch online, simulated. No provider is connected and '
  'no money moves; every payout row says provider = simulation.';
