-- 0103 — A treasurer's payment moves the balance (scope 134, WP1a; BR77, BR78).
--
-- **The defect.** `recordPayment` (src/data/finance.ts) inserted a payment
-- and then, in a second request, updated `registration.outstanding_amount_cents`.
-- The insert is allowed to the admin and the treasurer (`payment_insert`,
-- 0007); the update only to the admin, the registrar and the IT manager
-- (`registration_manage`, 0058). For a treasurer who is not also an admin
-- the update matched no row and the API reported no error, so the receipt
-- was recorded and the balance did not move. The Treasurer office carries
-- `treasurer` access (0059), so this was the ordinary path, and it reached
-- voucher relief too, which is recorded the same way (BR81). The finance
-- report (0102) reads *collected* from `payment` and *outstanding* from the
-- column, so it then disagreed with itself.
--
-- **The fix.** One `security definer` function records the payment, writes
-- its audit line and re-derives the balance in a single transaction, with
-- the caller's right to record money checked inside it (BR78) rather than
-- borrowed from two policies that disagree. The balance is computed exactly
-- as `recordPayment` computed it: with a live payment plan, the plan's total
-- less every receipt; without one, the balance less this receipt. What a
-- reader sees changes only in that it is now right.
--
-- **Refused now as well**, because a definer function must not widen what
-- its caller could do:
--   - a reversal (BR77) naming a payment of another registration;
--   - a registration of another club than the one the caller is acting in;
--   - a payment against imported history (BR90), whose balance
--     `registration_imported_is_history` (0101) already refuses to change.
--     Before, the receipt was written and the second request failed after it
--     (or, for a treasurer, silently did nothing), leaving a stray payment.
--     Now the whole call is refused and nothing is written.
--
-- **Rejected:** granting `treasurer` update on `registration`. That widens a
-- role across every column of a registration to fix one, and keeps the two
-- writes apart, so a failure between them still leaves a receipt with no
-- balance. **Also rejected:** a trigger on `payment` keeping the column in
-- step. Every direct insert would then move a balance by a rule nobody reads
-- in the data layer, and WP1 (BR201) replaces the typed column with a
-- derived balance anyway. This function is the bridge to that, not a
-- substitute for it; `payment_insert` is left as it is until then.

create or replace function app_record_payment(
  p_club_id             uuid,
  p_registration_id     uuid,
  p_amount_cents        integer,
  p_received_on         date,
  p_method              text,
  p_reference           text,
  p_reverses_payment_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club       uuid;
  v_balance    integer;
  v_plan_total integer;
  v_received   bigint;
  v_id         uuid;
begin
  -- Locked, so two receipts recorded at once cannot both start from the
  -- same balance and leave one of them out of it.
  select r.club_id, r.outstanding_amount_cents
    into v_club, v_balance
    from registration r
   where r.id = p_registration_id
     and r.club_id = p_club_id
     for update;
  if v_club is null then
    raise exception 'No such registration at this club.' using errcode = 'P0002';
  end if;

  if not app_has_role(v_club, array['admin', 'treasurer']) then
    raise exception 'Only the club''s admin or treasurer records a payment (BR78).' using errcode = '42501';
  end if;

  if p_reverses_payment_id is not null and not exists (
       select 1 from payment p
        where p.id = p_reverses_payment_id
          and p.registration_id = p_registration_id) then
    raise exception 'A reversal names a payment of the same registration (BR77).' using errcode = '23514';
  end if;

  insert into payment (club_id, registration_id, amount_cents, received_on, method,
                       reference, reverses_payment_id, recorded_by_user_id)
  values (v_club, p_registration_id, p_amount_cents, p_received_on, p_method,
          p_reference, p_reverses_payment_id, auth.uid())
  returning id into v_id;

  -- BR75 allows one live plan, so this finds one row or none.
  select pp.total_cents into v_plan_total
    from payment_plan pp
   where pp.registration_id = p_registration_id
     and pp.cancelled_at is null;

  if v_plan_total is not null then
    -- With a plan, the balance is re-derived from its total and every
    -- receipt, so a reversal corrects it by the same route a payment does.
    select coalesce(sum(p.amount_cents), 0) into v_received
      from payment p
     where p.registration_id = p_registration_id;
    v_balance := v_plan_total - v_received;
  else
    -- Without one there is no recorded total to derive from: the
    -- registration's own figure is the only statement of what was charged.
    v_balance := v_balance - p_amount_cents;
  end if;

  update registration
     set outstanding_amount_cents = v_balance
   where id = p_registration_id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_club, auth.uid(), 'payment_recorded', 'payment', v_id,
          jsonb_build_object('registrationId', p_registration_id,
                             'amountCents', p_amount_cents,
                             'method', p_method,
                             'reversesPaymentId', p_reverses_payment_id,
                             'rule', 'BR77'));

  return v_id;
end;
$$;

comment on function app_record_payment(uuid, uuid, integer, date, text, text, uuid) is
  'BR77, BR78 (0103): records a payment and moves the registration''s balance '
  'in one transaction, for the club''s admin or treasurer only.';

revoke all on function app_record_payment(uuid, uuid, integer, date, text, text, uuid) from public;
grant execute on function app_record_payment(uuid, uuid, integer, date, text, text, uuid) to authenticated;

insert into schema_migration_log (version, name) values
  ('0103', '0103_a_treasurers_payment_moves_the_balance');
