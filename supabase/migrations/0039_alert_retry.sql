-- 0039 — Trying again, on purpose (scope 46).
--
-- [Scope 45](../../docs/scope/45_telling_somebody_a_club_asked.md) shipped
-- the alert and named the gap in its own "what this does not do": a failed
-- alert stayed failed. The console counted them, which is how somebody
-- finds out, and finding out is not the same as fixing it — a provider
-- that was down for an hour left leads that nobody was told about and
-- nothing to do about it but copy an address out of a table.
--
-- **BR147**, and both halves earn their place.
--
-- *Retried by a person.* Nothing in this product runs on a schedule —
-- the same missing piece that leaves BR133's retention review a button
-- rather than a nightly job. The tempting alternative is an opportunistic
-- retry that piggybacks on the next enquiry, and it fails in exactly the
-- wrong place: a quiet week is when a missed lead matters most, and a
-- quiet week is when it would never fire.
--
-- *Never re-sent once delivered.* The obvious implementation of a retry is
-- "send everything not confirmed", and an operator emailed three times
-- about the same club stops reading the alerts — which returns the product
-- to the state the alert was built to fix. So delivery is terminal here,
-- twice over: a delivered row is not selected, and recording an outcome
-- against one is **refused** rather than allowed to overwrite it. The
-- selection is the behaviour; the refusal is what stops a second caller,
-- a double-clicked button or a future scheduler from undoing it.
--
-- Written so the day a scheduler exists it calls the same function. That
-- is scope 37's shape and it is deliberate: "nightly" becoming a cron is
-- then a deployment change rather than a rewrite.

-- ---------------------------------------------------------- how many tries
-- Two columns, both answering a question the console could not answer
-- before: **how many times have we tried, and when did we last?** A row
-- that has failed once is a provider hiccup; a row that has failed four
-- times with the same message means stop clicking and go and fix the
-- provider. Without a count they look identical.

alter table prospect
  add column notify_attempts integer not null default 0
    check (notify_attempts >= 0),
  -- Set on every attempt, delivered or not — unlike `notified_at`, which
  -- is only ever a success. Keeping them apart is what lets a row say
  -- "tried twenty minutes ago and failed" rather than only "never told".
  add column notify_attempted_at timestamptz;

comment on column prospect.notify_attempts is
  'How many times delivery of the enquiry alert has been attempted. '
  'Includes attempts that found nowhere to send — from the operator''s '
  'point of view "we tried to tell you and could not" is the attempt that '
  'matters, and notify_error says which kind it was.';

comment on column prospect.notify_attempted_at is
  'When delivery was last attempted, successful or not. notified_at is the '
  'success; this is the try.';

-- ------------------------------------------------------ record_interest, v3
-- Unchanged but for the counters. Dropped and recreated rather than
-- replaced because the body changes and the rule is that a migration is
-- edited never — 0037 and 0038 stay exactly as they were applied.

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
    notified_at, notify_error, notify_attempts, notify_attempted_at
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
    v_notified, v_error, v_attempts, now()
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
    -- BR93: an unticked box is not a withdrawal.
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
  'membership and no access (BR145).';

-- --------------------------------------------- app_record_alert_outcome()
-- What a retry writes back.
--
-- **Platform owner only**, which is the whole reason a second outcome
-- function may exist at all. Scope 45 refused one because the enquiry path
-- is anonymous by definition and a function granted to `anon` lets a
-- stranger write delivery records into a sales log. A retry is initiated
-- from the console by somebody already on the allowlist, so the same
-- function shape is safe here and nowhere else.
--
-- **Refuses a row that was already delivered** (BR147). The selection in
-- the application is what stops a second alert being *sent*; this is what
-- stops a double-clicked button, a second operator or a future scheduler
-- overwriting a success with a failure after the fact.

create or replace function app_record_alert_outcome(
  p_email    text,
  p_notified boolean,
  p_error    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_existing timestamptz;
begin
  if not app_is_platform() then
    raise exception 'Only the platform owner retries an enquiry alert.'
      using errcode = '42501';
  end if;

  select notified_at into v_existing from prospect where lower(email) = v_email;

  if not found then
    raise exception 'No such prospect.' using errcode = 'P0002';
  end if;

  if v_existing is not null then
    raise exception 'That alert was already delivered; it is not sent again (BR147).'
      using errcode = '23505';
  end if;

  update prospect set
    notified_at         = case when p_notified then now() end,
    notify_error        = case when p_notified then null
                               else nullif(btrim(coalesce(p_error, '')), '') end,
    notify_attempts     = notify_attempts + 1,
    notify_attempted_at = now()
  where lower(email) = v_email;
end;
$$;

revoke all on function app_record_alert_outcome(text, boolean, text) from public;
grant execute on function app_record_alert_outcome(text, boolean, text) to authenticated;

comment on function app_record_alert_outcome(text, boolean, text) is
  'Records the outcome of a retried enquiry alert. Platform owner only, and '
  'refuses a prospect whose alert already went out — delivery is terminal '
  '(BR147), because an operator emailed three times about one club stops '
  'reading the alerts.';

-- ---------------------------------------------------- app_enquiries, v3
-- Two columns wider again: a count nobody can see distinguishes nothing.

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
  notify_attempted_at timestamptz
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
           p.notified_at, p.notify_error, p.notify_attempts, p.notify_attempted_at
      from prospect p
     order by p.enquired_at desc nulls last, p.last_seen_at desc;
end;
$$;

revoke all on function app_enquiries() from public;
grant execute on function app_enquiries() to authenticated;

comment on function app_enquiries() is
  'Every prospect, for the platform owner alone. Reads nothing inside any '
  'tenant — a prospect has no club_id and is not a member of anything '
  '(BR92), which is why this is not decision 9''s forbidden exception.';
