-- 0041 — The six-monthly WWCC reminder (scope 48, WP2).
--
-- [Scope 47](../../docs/scope/47_stakeholder-answers-september-2026.md)
-- restated BR51's secondary mechanism from an annual, visual check to a
-- **six-monthly reminder to the Secretary**. Nothing prompted anybody on
-- any cadence before this: `clearance` recorded an expiry date and a
-- one-time verification, and re-checking it was an intention rather than
-- a thing that happened.
--
-- Two functions, in the shape 0040 (scope 48 WP1) already established:
--
--   * `app_wwcc_due_for_reminder` — every clearance whose reminder is
--     overdue, restricted to the same roles `clearance_select` already
--     allows (admin, registrar). There is no separate `secretary` access
--     role in `club_membership` — the office is recorded on
--     `committee_position`, not on system access — so *who* the reminder
--     goes to is resolved by the caller, the same way `committee_position`
--     is already club-wide readable and always has been.
--   * `app_record_wwcc_reminder_sent` — a plain, `security invoker`
--     update, relying on `clearance_manage`'s existing RLS. Deliberately
--     not a `security definer` function with its own role check: unlike
--     0040's arrears report, there is nothing here RLS would compute
--     wrongly for an excluded role — a coach already cannot read
--     `clearance` at all, so there is no confident-zero failure mode to
--     guard against.
--
-- **What this migration does *not* do, and why that is safe rather than
-- an oversight:** the plan for this work package called for an explicit
-- carve-out so a re-verification write still works while a club is in
-- BR97's read-only state. Checking the rest of this schema found there is
-- **no RLS policy anywhere that actually gates a write on
-- `club_licence.state`** — BR97 is recorded as club metadata (0018) but
-- nothing yet enforces the read-only consequence it describes at the
-- database layer. `clearance_manage`'s policy (0010) was never narrowed
-- by licence state, so it already permits exactly the write BR97/#75
-- asked for, with nothing to carve an exception out of. Whoever builds
-- BR97's enforcement later must remember this and exempt `clearance`'s
-- writes explicitly — this comment is that memory.

alter table clearance
  add column reminder_sent_at timestamptz;

comment on column clearance.reminder_sent_at is
  'BR51: when the six-monthly re-verification reminder was last sent for '
  'this clearance. Distinct from verified_at (the check itself), the same '
  'way notify_attempted_at was kept distinct from notified_at in 0039 -- '
  '"we reminded them" and "somebody verified it" are different facts.';

-- --------------------------------------------------- app_wwcc_due_for_reminder
-- Every current (unrevoked) clearance whose reminder is null or older than
-- six months. Ordered oldest-reminder-first, the same "what has been
-- waiting longest" ordering 0040's arrears queue uses for the same reason:
-- a club with forty clearances should not have to guess where to start.

create or replace function app_wwcc_due_for_reminder(p_club_id uuid)
returns table (
  clearance_id      uuid,
  person_id         uuid,
  person_name       text,
  kind              text,
  expires_on        date,
  reminder_sent_at  timestamptz,
  computed_at       timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not app_has_role(p_club_id, array['admin', 'registrar']) then
    raise exception
      'BR142: this report is not readable by your role — a partial total would be worse than none';
  end if;

  return query
  select
    c.id,
    c.person_id,
    p.legal_given_names || ' ' || p.legal_family_name,
    c.kind,
    c.expires_on,
    c.reminder_sent_at,
    now()
    from clearance c
    join person p on p.id = c.person_id
   where c.club_id = p_club_id
     and c.revoked_at is null
     and (c.reminder_sent_at is null or c.reminder_sent_at < now() - interval '6 months')
   order by c.reminder_sent_at asc nulls first, c.expires_on asc;
end
$$;

comment on function app_wwcc_due_for_reminder(uuid) is
  'BR51: clearances whose six-monthly re-verification reminder is overdue '
  'or has never been sent. Restricted to admin/registrar (BR142), matching '
  'clearance_select — refuses rather than returning an empty list for '
  'anyone else.';

revoke all on function app_wwcc_due_for_reminder(uuid) from public;
grant execute on function app_wwcc_due_for_reminder(uuid) to authenticated;

-- ------------------------------------------------- app_record_wwcc_reminder_sent
-- What sending the reminder writes back. `security invoker`, not definer:
-- relies on `clearance_manage`'s policy for who may call it, and on the
-- caller's own role for a screen, or on the service role's RLS bypass for
-- the scheduled job that actually sends the reminders (there being no
-- `secretary` system-access role to grant execute to instead).

create or replace function app_record_wwcc_reminder_sent(p_clearance_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update clearance set reminder_sent_at = now() where id = p_clearance_id;
end
$$;

comment on function app_record_wwcc_reminder_sent(uuid) is
  'BR51: records that the six-monthly re-verification reminder was sent. '
  'security invoker -- relies on clearance_manage''s RLS policy for who may '
  'call it; the scheduled job that sends the reminder uses the service '
  'role, which bypasses RLS by design.';

revoke all on function app_record_wwcc_reminder_sent(uuid) from public;
grant execute on function app_record_wwcc_reminder_sent(uuid) to authenticated;
