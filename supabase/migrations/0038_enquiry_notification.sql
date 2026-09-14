-- 0038 — Somebody is told when a club enquires (scope 45).
--
-- [Scope 44](../../docs/scope/44_a_club_says_it_is_interested.md) shipped
-- with a gap named in its own "what this does not do": an enquiry landed in
-- the table and nothing told anybody. The owner had to open the console.
-- That is a large improvement on a psql prompt and it is not a
-- notification, and a lead nobody looks at for a week is the failure the
-- whole initiative was about.
--
-- **The interesting half of this is what it does *not* reuse.**
--
-- C7's send path — `sendMessage`, `message_subscriber`, `message_log` —
-- fits this badly, and the schema says so before any argument does:
-- `message_log.club_id` is `not null`, and there is no club here. A
-- prospect belongs to no tenant (BR92), the platform owner is a member of
-- no club, and neither has a `message_subscriber` row or a Person to hang
-- one on.
--
-- **BR146** settles it rather than letting the next person widen
-- `club_id` to nullable: a message to the platform's own operators is not
-- a message to a data subject. No unsubscribe link (BR128 exists so
-- somebody can stop mail *about themselves*, and an unsubscribe on this
-- would let an operator switch off the only signal that a customer is
-- trying to reach them), no `message_log` row, and **nothing from inside
-- any club** — which is the clause that keeps decision 9 intact the day
-- somebody wants an alert about something that happened in a tenant.
--
-- **Why the notification outcome is a parameter and not a second
-- function.** The alert's whole content comes from the form the visitor
-- just submitted, so it can be sent *before* the row is written and its
-- outcome passed in — one call, one row, written by the same definer
-- function that creates the lead. A separate `mark_enquiry_notified()`
-- would have to be granted to `anon`, because the enquiry path is
-- anonymous by definition, and would then let any anonymous caller write a
-- misleading delivery record into a sales log. There is no such function,
-- so there is no such surface.
--
-- The ordering it implies is the safe one: if the database write fails
-- after the alert has gone, the owner has been told about a club whose row
-- is missing — and the alert carries the club's details, so nothing is
-- lost. The reverse (recorded, nobody told) is the failure being fixed.
--
-- Rejected: `pg_net` and a database trigger that posts to the provider.
-- It would make the send atomic with the insert, and it puts an outbound
-- HTTP call inside a transaction that a public function opens — a provider
-- timing out would then hold a lock and fail the enquiry the club came to
-- make.

-- ------------------------------------------------ what happened to the alert
-- The outcome pair 0030 established for `message_log`: what happened, and
-- why when it is not a plain success. Null/null is the third state and
-- means the row predates this migration.

alter table prospect
  add column notified_at  timestamptz,
  add column notify_error text,

  -- An error and a success are mutually exclusive, so a row cannot claim
  -- both. Same shape as `message_log_detail_for_non_sent`, and for the same
  -- reason: a log that can hold an incoherent outcome is not evidence.
  add constraint prospect_notify_outcome_is_coherent
    check (notified_at is null or notify_error is null);

comment on column prospect.notified_at is
  'When the platform owner was alerted to this enquiry. Null means nobody '
  'was told — either because it failed (see notify_error), because no alert '
  'address is configured, or because the row predates migration 0038.';

comment on column prospect.notify_error is
  'Why the alert did not go out. Recorded rather than swallowed: a silent '
  'failure here returns the product to the state scope 45 was written to '
  'fix, and the console is where somebody would notice (BR127''s reasoning, '
  'applied one level out — see BR146 for why this is not message_log).';

-- ------------------------------------------------------ record_interest, v2
-- Dropped and recreated rather than replaced: the signature changes, and
-- `create or replace` cannot change one. 0037 has not been merged and so
-- has not been applied to the linked project, but a migration is edited
-- **never** rather than when it looks safe — the rule is worth more than
-- the two lines it costs here.

drop function if exists record_interest(
  text, text, text, text, text, text, text, text, text, text);

create function record_interest(
  p_club_name      text,
  p_email          text,
  p_contact_name   text default null,
  p_contact_role   text default null,
  p_jurisdiction   text default null,
  p_club_size      text default null,
  p_current_system text default null,
  p_note           text default null,
  p_phone          text default null,
  -- BR93's shape, carried over unchanged: the *moment* and the *exact
  -- words*, never a boolean. The wording is written by the server from a
  -- constant, so this records what was rendered rather than what a caller
  -- claims was rendered.
  p_marketing_wording text default null,
  -- BR146's outcome, supplied by the caller that just attempted the alert.
  p_notified       boolean default false,
  p_notify_error   text    default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_name text := nullif(btrim(coalesce(p_club_name, '')), '');
  v_email     text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_notified  timestamptz := case when p_notified then now() end;
  v_error     text := case when p_notified then null
                           else nullif(btrim(coalesce(p_notify_error, '')), '') end;
begin
  -- BR144's two required fields, checked here rather than only in the form:
  -- a public function is reachable without the form.
  if v_club_name is null then
    raise exception 'An enquiry names the club it is about (BR144).'
      using errcode = '22023';
  end if;

  if v_email is null or position('@' in v_email) < 2 then
    raise exception 'An enquiry needs an address to reply to (BR144).'
      using errcode = '22023';
  end if;

  insert into prospect (
    email, phone, source, club_name, jurisdiction, contact_name, contact_role,
    club_size, current_system, note, enquired_at,
    marketing_consent_at, marketing_consent_wording,
    notified_at, notify_error
  )
  values (
    v_email,
    nullif(btrim(coalesce(p_phone, '')), ''),
    'enquiry',
    v_club_name,
    nullif(btrim(coalesce(p_jurisdiction, '')), ''),
    nullif(btrim(coalesce(p_contact_name, '')), ''),
    nullif(btrim(coalesce(p_contact_role, '')), ''),
    nullif(btrim(coalesce(p_club_size, '')), ''),
    nullif(btrim(coalesce(p_current_system, '')), ''),
    nullif(btrim(coalesce(p_note, '')), ''),
    now(),
    case when p_marketing_wording is null then null else now() end,
    nullif(btrim(coalesce(p_marketing_wording, '')), ''),
    v_notified,
    v_error
  )
  on conflict ((lower(email))) do update set
    -- Never blank out what a previous visit supplied. A returning enquirer
    -- who skips the phone field has not withdrawn their phone number, and
    -- the same reasoning 0013 applied to `phone` applies to all of these.
    club_name      = coalesce(excluded.club_name, prospect.club_name),
    jurisdiction   = coalesce(excluded.jurisdiction, prospect.jurisdiction),
    contact_name   = coalesce(excluded.contact_name, prospect.contact_name),
    contact_role   = coalesce(excluded.contact_role, prospect.contact_role),
    club_size      = coalesce(excluded.club_size, prospect.club_size),
    current_system = coalesce(excluded.current_system, prospect.current_system),
    phone          = coalesce(excluded.phone, prospect.phone),
    -- The newest note, not an appended history: this is a lead record, and
    -- the conversation itself lives wherever the owner replies from.
    note           = coalesce(excluded.note, prospect.note),
    source         = 'enquiry',
    enquired_at    = now(),
    last_seen_at   = now(),
    -- **This enquiry's alert, not the last one's.** Unlike every field
    -- above, a stale success here is a lie about the message that matters:
    -- the owner needs to know whether they were told about *this* enquiry,
    -- and a coalesce would let March's delivered alert vouch for July's
    -- failure.
    notified_at    = excluded.notified_at,
    notify_error   = excluded.notify_error,
    -- BR93, and the half that is easy to get wrong. An enquiry with the box
    -- left unticked is **not a withdrawal** of consent given earlier —
    -- somebody who did not notice a checkbox has withdrawn nothing, and
    -- inferring withdrawal from silence is the same mistake as inferring
    -- consent from it. Granting is recorded; not granting changes nothing.
    marketing_consent_at =
      coalesce(excluded.marketing_consent_at, prospect.marketing_consent_at),
    marketing_consent_wording =
      coalesce(excluded.marketing_consent_wording, prospect.marketing_consent_wording);
end;
$$;

revoke all on function record_interest(
  text, text, text, text, text, text, text, text, text, text, boolean, text) from public;
grant execute on function record_interest(
  text, text, text, text, text, text, text, text, text, text, boolean, text) to anon, authenticated;

comment on function record_interest(
  text, text, text, text, text, text, text, text, text, text, boolean, text) is
  'Records a club''s expression of interest, with the outcome of the alert '
  'the caller has just attempted (BR146). Creates no club, no account, no '
  'membership and no access (BR145) — a tenant is provisioned only on the '
  'platform owner''s authorisation (decision 7).';

-- ---------------------------------------------------- app_enquiries, v2
-- Two columns wider: the console is where a failed alert is noticed, and a
-- column nobody can see is not a record of anything.

drop function if exists app_enquiries();

create function app_enquiries()
returns table (
  email           text,
  phone           text,
  club_name       text,
  jurisdiction    text,
  contact_name    text,
  contact_role    text,
  club_size       text,
  current_system  text,
  note            text,
  source          text,
  enquired_at     timestamptz,
  first_seen_at   timestamptz,
  last_seen_at    timestamptz,
  marketing_consent_at timestamptz,
  notified_at     timestamptz,
  notify_error    text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not app_is_platform() then
    raise exception 'The lead list belongs to the platform owner.'
      using errcode = '42501';
  end if;

  return query
    select p.email, p.phone, p.club_name, p.jurisdiction, p.contact_name,
           p.contact_role, p.club_size, p.current_system, p.note, p.source,
           p.enquired_at, p.created_at, p.last_seen_at,
           -- Not whether they may be emailed *today* — a revoked consent is
           -- a withheld one, and collapsing the two would let a withdrawal
           -- disappear from the only screen that shows it.
           case when p.marketing_consent_revoked_at is null
                then p.marketing_consent_at end,
           p.notified_at, p.notify_error
      from prospect p
     -- Enquiries first, then whoever looked most recently: a club that
     -- typed its name has done more than one that typed an address.
     order by p.enquired_at desc nulls last, p.last_seen_at desc;
end;
$$;

revoke all on function app_enquiries() from public;
grant execute on function app_enquiries() to authenticated;

comment on function app_enquiries() is
  'Every prospect, for the platform owner alone. Reads nothing inside any '
  'tenant — a prospect has no club_id and is not a member of anything '
  '(BR92), which is why this is not decision 9''s forbidden exception.';
