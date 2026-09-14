-- 0036 — Numbers a committee can act on (scope 42).
--
-- C8. Every figure here is derived from data that already exists, which
-- makes this look like the easiest migration in the repository. It has one
-- genuinely dangerous failure mode, and the shape of these functions is
-- entirely a response to it.
--
-- **Row-Level Security hides rows. It does not refuse sums.**
--
-- A coach may not read `payment` — BR78 says a coach sees whether a player
-- is clear to take the field and never what the family owes. So a finance
-- report written the obvious way, aggregating what the caller can see,
-- would show a coach **$0 outstanding**: correct isolation producing a
-- confident lie, and the kind nobody catches, because it looks like good
-- news and the screen gives no hint that half the rows were invisible.
--
-- So BR142: a figure computed over rows the reader may not see is **not
-- shown as a figure**. Each function below is `security definer`, checks
-- the caller's role **explicitly**, and raises where they may not have it.
-- It computes the true total or refuses; it never quietly computes a
-- partial one.
--
-- That inverts the usual shape in this schema and does so deliberately.
-- Everywhere else access is an emergent property of which rows a policy
-- admits. For an aggregate it cannot be, because **the aggregate of
-- nothing is a number rather than an absence**.
--
-- The role check is therefore the only thing standing between a coach and
-- the club's finances. `supabase/tests/39_reporting.sql` asserts the
-- refusal for every one of these rather than trusting three `if`s.

-- ------------------------------------------------- app_registration_summary
-- How far through the season the club is, and what the rest is waiting on.
-- Readable by the roles that work the queue.

create or replace function app_registration_summary(p_club_id uuid, p_season_id uuid)
returns table (
  total            integer,
  complete         integer,
  pending_documents integer,
  pending_payment  integer,
  pending_external integer,
  draft            integer,
  -- BR143: the base, carried with the figures rather than assumed.
  blocked_by       jsonb,
  computed_at      timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not app_has_role(p_club_id, array['admin','registrar','committee','coordinator']) then
    raise exception
      'BR142: this report is not readable by your role — a partial total would be worse than none';
  end if;

  return query
  with r as (
    select status from registration
     where club_id = p_club_id and season_id = p_season_id
  ),
  -- What the incomplete are waiting on, by rule. Read from the *latest*
  -- evaluation per registration, because `validation_result` is a history
  -- (that is the point of persisting it) and counting every row ever
  -- written would count the same blocker once per recheck.
  latest as (
    select distinct on (v.registration_id, v.rule_id)
           v.rule_id, v.status
      from validation_result v
      join registration reg on reg.id = v.registration_id
     where reg.club_id = p_club_id and reg.season_id = p_season_id
     order by v.registration_id, v.rule_id, v.evaluated_at desc
  )
  select
    (select count(*)::integer from r),
    (select count(*)::integer from r where status = 'COMPLETE'),
    (select count(*)::integer from r where status = 'PENDING_DOCUMENTS'),
    (select count(*)::integer from r where status = 'PENDING_PAYMENT'),
    (select count(*)::integer from r where status = 'PENDING_EXTERNAL_REGISTRATION'),
    (select count(*)::integer from r where status = 'DRAFT'),
    coalesce((
      select jsonb_object_agg(rule_id, n)
        from (select rule_id, count(*)::integer as n from latest where status = 'fail' group by rule_id) x
    ), '{}'::jsonb),
    now();
end
$$;

-- ------------------------------------------------------ app_finance_summary
-- What the club is owed, and how overdue it is.
--
-- **The one a coach must not be given a zero for.** #84: a committee member
-- may read it — BR78 separates the Committee's governance authority from
-- the Treasurer's financial execution, and a committee that cannot see
-- whether the club is solvent cannot govern it. Reading a total executes
-- nothing.

create or replace function app_finance_summary(p_club_id uuid, p_season_id uuid)
returns table (
  registrations        integer,
  owing                integer,
  outstanding_cents    bigint,
  credit_cents         bigint,
  on_a_plan            integer,
  instalments_overdue  integer,
  overdue_cents        bigint,
  vouchers_attached    integer,
  vouchers_verified    integer,
  voucher_relief_cents bigint,
  computed_at          timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not app_has_role(p_club_id, array['admin','treasurer','committee']) then
    raise exception
      'BR142: this report is not readable by your role — a partial total would be worse than none';
  end if;

  return query
  with r as (
    select id, outstanding_amount_cents from registration
     where club_id = p_club_id and season_id = p_season_id
  ),
  plans as (
    select pp.id, pp.registration_id from payment_plan pp
     join r on r.id = pp.registration_id
    where pp.cancelled_at is null
  ),
  overdue as (
    select pi.id, pi.amount_cents
      from payment_installment pi
      join plans on plans.id = pi.payment_plan_id
     where pi.due_on < current_date
  )
  select
    (select count(*)::integer from r),
    -- Owing and credit counted apart: netting them would hide a club that
    -- is owed eight hundred dollars and owes two hundred back (BR3's
    -- "a credit is never an obstacle", seen from the club's side).
    (select count(*)::integer from r where outstanding_amount_cents > 0),
    (select coalesce(sum(outstanding_amount_cents), 0)::bigint from r where outstanding_amount_cents > 0),
    (select coalesce(sum(-outstanding_amount_cents), 0)::bigint from r where outstanding_amount_cents < 0),
    (select count(*)::integer from plans),
    (select count(*)::integer from overdue),
    (select coalesce(sum(amount_cents), 0)::bigint from overdue),
    (select count(*)::integer from registration_voucher rv join r on r.id = rv.registration_id where rv.state = 'ATTACHED'),
    (select count(*)::integer from registration_voucher rv join r on r.id = rv.registration_id where rv.state in ('VERIFIED','CLAIMED')),
    -- BR81: only a verified voucher has moved any money. An attached one
    -- reduces nothing, and counting it as relief would overstate what the
    -- club has actually collected.
    (select coalesce(sum(rv.face_value_cents), 0)::bigint from registration_voucher rv join r on r.id = rv.registration_id where rv.state in ('VERIFIED','CLAIMED')),
    now();
end
$$;

-- -------------------------------------------------- app_officiating_summary
-- Appointments, declines, and what the club owes its officials.

create or replace function app_officiating_summary(p_club_id uuid, p_season_id uuid)
returns table (
  officials          integer,
  appointments       integer,
  accepted           integer,
  proposed           integer,
  declined           integer,
  withdrawn          integer,
  claims_raised      integer,
  claims_approved    integer,
  approved_cents     bigint,
  unverified_fixtures integer,
  computed_at        timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not app_has_role(p_club_id, array['admin','coordinator','treasurer','committee']) then
    raise exception
      'BR142: this report is not readable by your role — a partial total would be worse than none';
  end if;

  return query
  with f as (
    select id from fixture where club_id = p_club_id and season_id = p_season_id
  ),
  a as (
    select mo.id, mo.state, mo.fixture_id
      from match_official_appointment mo
      join f on f.id = mo.fixture_id
     where mo.club_id = p_club_id
  )
  select
    (select count(*)::integer from referee_profile where club_id = p_club_id),
    (select count(*)::integer from a),
    (select count(*)::integer from a where state = 'accepted'),
    (select count(*)::integer from a where state = 'proposed'),
    (select count(*)::integer from a where state = 'declined'),
    (select count(*)::integer from a where state = 'withdrawn'),
    (select count(*)::integer from referee_payment_claim c join a on a.id = c.appointment_id where c.state = 'raised'),
    (select count(*)::integer from referee_payment_claim c join a on a.id = c.appointment_id where c.state = 'approved'),
    (select coalesce(sum(c.amount_cents), 0)::bigint from referee_payment_claim c join a on a.id = c.appointment_id where c.state = 'approved'),
    -- BR13's precondition, counted: an appointment nobody verified cannot
    -- be claimed, so this is the coordinator's actual to-do list rather
    -- than a curiosity.
    (select count(*)::integer from a
      where state = 'accepted'
        and not exists (select 1 from appointment_verification v where v.appointment_id = a.id)),
    now();
end
$$;

revoke all on function app_registration_summary(uuid, uuid) from public;
revoke all on function app_finance_summary(uuid, uuid) from public;
revoke all on function app_officiating_summary(uuid, uuid) from public;
grant execute on function app_registration_summary(uuid, uuid) to authenticated;
grant execute on function app_finance_summary(uuid, uuid) to authenticated;
grant execute on function app_officiating_summary(uuid, uuid) to authenticated;
