-- 0098 — An enquiry may ask for a guided demo (scope 116, BR188).
--
-- `/interest` was the only way for a club to reach us, and a club that
-- wanted to be walked through the product had to say so in the free-text
-- note. The choice is now a column, so the lead list can show it and the
-- alert can lead with it.
--
-- `record_interest` gains one parameter, last and defaulted, so a caller
-- that does not know about it still records "a question". It is dropped and
-- recreated because the signature changes; the body is 0039's plus the
-- column. `app_enquiries` returns it.
--
-- **Granted to anon explicitly, and revoked from anon where it should not
-- be.** 0097 found that Supabase grants execute on every new function to
-- anon. `record_interest` is meant for anon; `app_enquiries` is not, and
-- although it refuses everybody but the platform owner, a stranger should
-- not be able to call it at all.

alter table prospect
  add column wants_demo boolean not null default false;

comment on column prospect.wants_demo is
  'Whether the enquirer asked for a guided demo rather than a question '
  '(BR188). Once true it stays true on a later enquiry: a question that '
  'follows a demo request does not withdraw it.';

-- ------------------------------------------------------ record_interest, v4

drop function if exists record_interest(
  text, text, text, text, text, text, text, text, text, text, boolean, text);

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
  -- words*, never a boolean.
  p_marketing_wording text default null,
  -- BR146's outcome, supplied by the caller that just attempted the alert.
  p_notified       boolean default false,
  p_notify_error   text    default null,
  -- BR188. Last and defaulted, so every existing caller still means "a
  -- question".
  p_wants_demo     boolean default false
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
  -- An enquiry always attempts the alert. A row arrives here having been
  -- tried exactly once; retries add to it through app_record_alert_outcome.
  v_attempts  integer := 1;
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
    notified_at, notify_error, notify_attempts, notify_attempted_at, wants_demo
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
    v_notified, v_error, v_attempts, now(), coalesce(p_wants_demo, false)
  )
  on conflict ((lower(email))) do update set
    -- Never blank out what a previous visit supplied.
    club_name      = coalesce(excluded.club_name, prospect.club_name),
    jurisdiction   = coalesce(excluded.jurisdiction, prospect.jurisdiction),
    contact_name   = coalesce(excluded.contact_name, prospect.contact_name),
    contact_role   = coalesce(excluded.contact_role, prospect.contact_role),
    club_size      = coalesce(excluded.club_size, prospect.club_size),
    current_system = coalesce(excluded.current_system, prospect.current_system),
    phone          = coalesce(excluded.phone, prospect.phone),
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
    -- The count, by contrast, **does** accumulate. It answers "how much
    -- trouble has this club's alert been", which does not reset because
    -- they enquired again — and a club enquiring twice because nobody
    -- answered the first time is precisely when the history matters.
    notify_attempts     = prospect.notify_attempts + 1,
    notify_attempted_at = now(),
    -- BR188: a later question does not withdraw an earlier demo request,
    -- for BR93's reason — saying nothing about it is not saying no.
    wants_demo     = prospect.wants_demo or excluded.wants_demo,
    -- BR93: an unticked box is not a withdrawal.
    marketing_consent_at =
      coalesce(excluded.marketing_consent_at, prospect.marketing_consent_at),
    marketing_consent_wording =
      coalesce(excluded.marketing_consent_wording, prospect.marketing_consent_wording);
end;
$$;

revoke all on function record_interest(
  text, text, text, text, text, text, text, text, text, text, boolean, text, boolean) from public;
grant execute on function record_interest(
  text, text, text, text, text, text, text, text, text, text, boolean, text, boolean) to anon, authenticated;

comment on function record_interest(
  text, text, text, text, text, text, text, text, text, text, boolean, text, boolean) is
  'Records a club''s expression of interest — a question or a demo request '
  '(BR188) — with the outcome of the alert the caller has just attempted '
  '(BR146). Creates no club, no account, no membership and no access (BR145).';

-- ---------------------------------------------------- app_enquiries, v4

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
  notify_error    text,
  notify_attempts integer,
  notify_attempted_at timestamptz,
  wants_demo      boolean
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
           p.notified_at, p.notify_error, p.notify_attempts, p.notify_attempted_at,
           p.wants_demo
      from prospect p
     order by p.enquired_at desc nulls last, p.last_seen_at desc;
end;
$$;

revoke all on function app_enquiries() from public, anon;
grant execute on function app_enquiries() to authenticated;

comment on function app_enquiries() is
  'Every prospect, for the platform owner alone. Reads nothing inside any '
  'tenant — a prospect has no club_id and is not a member of anything '
  '(BR92), which is why this is not decision 9''s forbidden exception.';

insert into schema_migration_log (version, name) values
  ('0098', '0098_an_enquiry_may_ask_for_a_demo');
