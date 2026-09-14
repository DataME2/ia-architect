-- 0037 — A club says it is interested (scope 44).
--
-- Scope 28 §3 specified the marketing surface as **explain, qualify,
-- capture — never provision**, in August 2026. Only *capture* was built,
-- and only as a side effect: the demonstration door records an email
-- address and a phone number, and nothing about the club the address
-- belongs to. So a cold enquiry arrives naming no club, no jurisdiction, no
-- size and no incumbent, and the first reply is a round of questions the
-- club has to answer before anything useful is said.
--
-- Two things follow, and the second matters more than the first.
--
-- **This extends `prospect` rather than adding a table.** A club that
-- looked at the demonstration club in March and enquired in July is one
-- lead with a fresher date, not two rows in two lists — the same reasoning
-- that made `prospect_email_idx` unique in 0013, applied to a second door.
-- `source` already distinguishes where a lead came from.
--
-- **The enquiries were never readable.** `prospect_no_api_access` denies
-- every request in both directions, and nothing in the application has ever
-- read the table: every lead captured since 0013 is visible only to
-- somebody with a psql prompt. A capture surface whose output nobody can
-- open is a form, not a feature, so `app_enquiries()` is the other half of
-- this migration rather than an extra.
--
-- **BR145 — recording interest grants nothing.** `record_interest()`
-- creates no club, no account, no membership and no access.
-- [Decision 7](../../docs/decisions/7_tenant-provisioning-by-owner-issued-invitation.md)
-- settles that a tenant is created only on the platform owner's
-- authorisation, and its reasoning is commercial before it is technical:
-- the first year is A$12,000 including onboarding and migration, every sale
-- displaces an incumbent mid-season, and the buyer is a committee that
-- decides in a meeting. The natural next request after an interest form is
-- a self-serve access code; the answer is written down rather than
-- re-argued.
--
-- Rejected: a `club_enquiry` table with its own id and its own list. It
-- reads more tidily and it splits one prospect into two records the moment
-- somebody who saw the demo comes back, which is the case a sales list
-- exists to handle well.

-- ------------------------------------------------------- what a club said
-- All nullable, on purpose (BR144). The club's name and one way to reply
-- are required by the function below; everything else is invited. A
-- half-filled form that refuses to send is the same closed tab BR91 was
-- written about.

alter table prospect
  add column club_name       text,
  add column jurisdiction    text,
  -- The human, and what they do at the club. A secretary and a coach asking
  -- the same question need different answers, and the role is the cheapest
  -- signal of which conversation this is.
  add column contact_name    text,
  add column contact_role    text,
  -- Approximate, and free text rather than a band: a club that writes
  -- "about 400, mostly MiniRoos" has said more than any band would capture.
  add column club_size       text,
  -- Decision 5 makes this the most load-bearing question on the form — the
  -- product replaces an incumbent rather than integrating with one, so what
  -- they are on now decides what the migration is.
  add column current_system  text,
  add column note            text,
  add column enquired_at     timestamptz;

comment on column prospect.club_name is
  'The club this enquiry is about. Required by record_interest(), and the '
  'one field that turns a lead into a conversation — an email address with '
  'no club attached cannot be researched, qualified or prioritised.';

comment on column prospect.current_system is
  'What the club runs today. Decision 5: this product replaces the '
  'incumbent rather than integrating with it, so the answer decides what '
  'the migration actually is, not merely who the competitor was.';

comment on column prospect.enquired_at is
  'When the club asked to be contacted, as distinct from created_at (first '
  'seen) and last_seen_at (most recent visit). A lead that has enquired is '
  'a different thing from one that has only looked.';

-- ------------------------------------------------------ record_interest()
-- The public door. `security definer` because `prospect` denies everyone,
-- which is the same shape `enter_demo()` uses and for the same reason: the
-- table's isolation is the absence of API access, so its writers own it.
--
-- It takes no club id, no role and no flag. There is nothing a caller can
-- vary to make this do something else — the only outcome is a row in a
-- list the platform owner reads.

create or replace function record_interest(
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
  p_marketing_wording text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_name text := nullif(btrim(coalesce(p_club_name, '')), '');
  v_email     text := lower(nullif(btrim(coalesce(p_email, '')), ''));
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
    marketing_consent_at, marketing_consent_wording
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
    nullif(btrim(coalesce(p_marketing_wording, '')), '')
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
  text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function record_interest(
  text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

comment on function record_interest(
  text, text, text, text, text, text, text, text, text, text) is
  'Records a club''s expression of interest as a prospect. Creates no club, '
  'no account, no membership and no access (BR145) — a tenant is provisioned '
  'only on the platform owner''s authorisation (decision 7).';

-- --------------------------------------------------------- app_enquiries()
-- The platform owner's view of the lead list, and the first time anything
-- in the application has read `prospect` at all.
--
-- Restricted to `app_is_platform()` **explicitly and by raising**, for the
-- reason scope 42 established for the reports: this is an aggregate-shaped
-- read over a table whose policy denies everyone, so access cannot be an
-- emergent property of which rows a policy admits. There are no rows a
-- policy admits.
--
-- Decision 9 says platform administration **provisions but never reads**
-- inside a tenant. This reads nothing inside a tenant: a prospect is not a
-- club, holds no club_id, and by BR92 lives outside the tenant world
-- entirely. That is why this is not the exception decision 9 forbids.

create or replace function app_enquiries()
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
  marketing_consent_at timestamptz
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
                then p.marketing_consent_at end
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
