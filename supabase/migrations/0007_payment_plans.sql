-- Payment plans, instalments, and what the club has actually received.
--
-- Realises the payment plan process
-- (docs/ea/2_business/3_business-processes.md#payment-plan-process) and the
-- Payment Plan / Installment business object. This is the first piece of
-- C3 to exist; it deliberately stops short of a payment *provider*. What a
-- family owes and what the club received are recorded here. How the money
-- moved -- Square, a bank transfer, a note in a drawer -- is a reference
-- string, because the club's own books have to be right whether or not an
-- integration ever exists.
--
-- Three rules are enforced by the database rather than by whoever writes
-- the next screen:
--
--   BR74  instalments sum to exactly the plan total -- by trigger, below.
--   BR77  payments are append-only -- by the absence of an update or
--         delete policy, the same way audit_event is.
--   BR22-style separation: only admin or treasurer may touch money.

-- ------------------------------------------------------------ the tables

create table payment_plan (
  id                   uuid primary key default gen_random_uuid(),
  club_id              uuid not null references club(id) on delete cascade,
  -- One live plan per registration. A second plan for the same fee is two
  -- answers to "what does this family owe", and the family gets whichever
  -- one the screen happened to load.
  registration_id      uuid not null references registration(id) on delete cascade,
  total_cents          integer not null check (total_cents > 0),
  cadence              text not null check (cadence in ('weekly','fortnightly','monthly')),
  created_by_user_id   uuid not null,
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now()
);

-- Partial: a cancelled plan stays for the history, and does not stop a
-- replacement being agreed.
create unique index payment_plan_one_live_per_registration
  on payment_plan (registration_id) where cancelled_at is null;

create table payment_installment (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references club(id) on delete cascade,
  payment_plan_id uuid not null references payment_plan(id) on delete cascade,
  -- 1-based and stable: it is how a family refers to one on the phone.
  sequence        integer not null check (sequence >= 1),
  due_on          date not null,
  amount_cents    integer not null check (amount_cents > 0),
  unique (payment_plan_id, sequence)
);
create index payment_installment_plan_idx on payment_installment (payment_plan_id, sequence);

-- BR77: append-only. A correction is a reversing entry, never an edit --
-- a receipt that can be quietly changed is not a record of anything.
create table payment (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references club(id) on delete cascade,
  registration_id     uuid not null references registration(id) on delete cascade,
  -- Negative is legitimate: a refund, or the reversal of a mistake.
  amount_cents        integer not null check (amount_cents <> 0),
  received_on         date not null,
  method              text not null
    check (method in ('card','bank-transfer','cash','voucher','adjustment')),
  -- Whatever ties this row to reality outside the platform.
  reference           text,
  reverses_payment_id uuid references payment(id),
  recorded_by_user_id uuid not null,
  created_at          timestamptz not null default now()
);
create index payment_registration_idx on payment (registration_id, received_on);

comment on table payment is
  'BR77: append-only. There is no update or delete policy; corrections are reversing entries.';

-- --------------------------------------------------------- BR74, by trigger
-- The instalments must sum to exactly the plan total. Enforced here because
-- the alternative is trusting every future writer to get it right, and the
-- failure mode is silent: a plan that sums to a cent under its total leaves
-- a family owing money no instalment will ever ask for, which surfaces as a
-- dispute at the end of a season rather than as an error.
--
-- DEFERRED, so a plan and its instalments can be inserted in one
-- transaction in whichever order the caller finds convenient.

create function assert_plan_totals() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid := coalesce(new.payment_plan_id, old.payment_plan_id);
  v_total   integer;
  v_sum     integer;
begin
  select total_cents into v_total from payment_plan where id = v_plan_id;
  if not found then
    return null;  -- the plan itself was deleted; nothing left to constrain
  end if;

  select coalesce(sum(amount_cents), 0) into v_sum
  from payment_installment where payment_plan_id = v_plan_id;

  if v_sum <> v_total then
    raise exception
      'instalments sum to % but the plan total is % (BR74)', v_sum, v_total
      using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger payment_installment_sums_to_total
  after insert or update or delete on payment_installment
  deferrable initially deferred
  for each row execute function assert_plan_totals();

-- And the same check from the plan's side, so raising a total without
-- rescheduling is caught too.
create function assert_plan_total_matches() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_sum integer;
begin
  select coalesce(sum(amount_cents), 0) into v_sum
  from payment_installment where payment_plan_id = new.id;

  -- Zero means the instalments have not been written yet, which is the
  -- normal state mid-transaction; the trigger above catches it at commit.
  if v_sum <> 0 and v_sum <> new.total_cents then
    raise exception
      'instalments sum to % but the plan total is % (BR74)', v_sum, new.total_cents
      using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger payment_plan_total_matches
  after insert or update on payment_plan
  deferrable initially deferred
  for each row execute function assert_plan_total_matches();

-- ------------------------------------------------------------------- RLS
-- Enabled in the same migration that creates the tables, so none of them
-- exists for a moment without it.

alter table payment_plan         enable row level security;
alter table payment_installment  enable row level security;
alter table payment              enable row level security;

-- Any club member may see what a family owes -- a registrar chasing BR3
-- needs to know why a registration is blocked. Only admin or treasurer may
-- change it, which is the BR22 separation applied to plans: the people who
-- run registration are not the people who move money.

create policy payment_plan_select on payment_plan
  for select using (club_id in (select app_member_club_ids()));

create policy payment_plan_manage on payment_plan
  for all using (app_has_role(club_id, array['admin','treasurer']))
  with check (app_has_role(club_id, array['admin','treasurer']));

create policy payment_installment_select on payment_installment
  for select using (club_id in (select app_member_club_ids()));

create policy payment_installment_manage on payment_installment
  for all using (app_has_role(club_id, array['admin','treasurer']))
  with check (app_has_role(club_id, array['admin','treasurer']));

create policy payment_select on payment
  for select using (club_id in (select app_member_club_ids()));

-- BR77: insert only. No update policy and no delete policy, deliberately --
-- with RLS on, an operation with no policy is denied, so a receipt cannot
-- be rewritten by anyone going through the API.
create policy payment_insert on payment
  for insert with check (app_has_role(club_id, array['admin','treasurer']));
