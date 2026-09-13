-- 0030 — The platform learns to send, and to stop (scope 36, WP1).
--
-- C7's first code, and it starts from the half that is not a feature.
-- Marketing consent has been collected at the demonstration door since
-- 0014 with **no way to withdraw it** — a promise collected against and
-- not honourable, rather than a screen nobody got round to. So the
-- unsubscribe lands before anything that sends.
--
-- Three things are settled here.
--
-- **Suppression is ours, not the provider's** (BR129). The convenient
-- answer is to let the email vendor hold the unsubscribe list. It would
-- not survive changing vendor, and it would sit under their access rules
-- rather than the policies protecting everything else a club holds (BR68).
--
-- **Operational and marketing are separate purposes** (BR130). A parent
-- who leaves a newsletter has not asked to stop being told their child is
-- missing a birth certificate. Equally, someone who wants no contact at
-- all must be able to say so — and then the club is *shown* that this
-- family cannot be emailed, so it rings them instead of assuming delivery.
--
-- **The token behind the link is derived, not stored**
-- ([decision 12](../../docs/decisions/12_an_unsubscribe_link_is_derived_not_stored.md)).
-- BR73's hash-only pattern would kill every older message's link, because
-- the plaintext would exist for exactly one send. Here the row keeps a
-- non-secret salt (so the application can re-derive the token whenever it
-- composes a message) and the token's hash (so this database can verify a
-- presented one, exactly as `submit_public_registration` verifies an
-- invitation). The secret itself never enters the database.

-- ------------------------------------------------------- message_subscriber
-- One row per contactable Person per club: the address, the suppression
-- state of each purpose, and the salt behind their unsubscribe link.
--
-- Person-scoped rather than address-scoped on purpose. Families share an
-- inbox — the same reason decision 10 refuses to infer identity from an
-- email — so suppressing "this address" would silence a parent because
-- their partner unsubscribed.

create table message_subscriber (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  person_id   uuid not null references person(id) on delete cascade,
  -- Copied from the Person at creation and refreshed on send: the log has
  -- to say where a message actually went, not where it would go today.
  email       text not null check (position('@' in email) > 1),

  unsubscribe_salt       text not null,
  unsubscribe_token_hash text not null,

  -- Null means "may be contacted for this purpose". A timestamp is a
  -- withdrawal, kept rather than deleted so BR127's log stays explainable.
  operational_suppressed_at timestamptz,
  marketing_suppressed_at   timestamptz,

  created_at  timestamptz not null default now()
);

create unique index message_subscriber_person_idx
  on message_subscriber (club_id, person_id);

comment on column message_subscriber.unsubscribe_salt is
  'Not a secret. The token is HMAC(server secret, salt); this column exists '
  'so the application can re-derive the same durable token for every message '
  'rather than issuing one that dies with the last send (decision 12).';

comment on column message_subscriber.operational_suppressed_at is
  'BR130. Suppressing operational contact is permitted and is surfaced to '
  'the club as "cannot be emailed" — refusing to honour it because the club '
  'needs to reach them would make the withdrawal conditional on the club''s '
  'convenience, which is not a withdrawal.';

-- ----------------------------------------------------------------- prospect
-- A prospect belongs to no tenant (BR92), so they cannot have a row in a
-- club-scoped table — but they are the people the unsubscribe was built
-- for. They get a salt on the record they already have, and walk through
-- the same door. `marketing_consent_revoked_at` already exists (0014).

alter table prospect
  add column unsubscribe_salt       text,
  add column unsubscribe_token_hash text;

-- -------------------------------------------------------------- message_log
-- BR127: every message recorded, including the ones deliberately not sent.
--
-- Append-only by the absence of an update policy, the same way `payment`
-- and `audit_event` are. A log that quietly drops the suppressed ones
-- cannot answer the only question that matters after a complaint — *did we
-- contact this person, and on what basis?* — because an absent row would
-- mean both "never attempted" and "correctly withheld".

create table message_log (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references club(id) on delete cascade,
  subscriber_id uuid references message_subscriber(id) on delete set null,

  to_email      text not null,
  purpose       text not null check (purpose in ('operational','marketing')),

  -- Which template, at which version. The wording lives in code and is
  -- reviewed like code, so a row holding a copy of it would be a second
  -- source of the same truth; the version is enough to explain an old
  -- message against the commit that produced it.
  template_key     text not null,
  template_version integer not null check (template_version >= 1),
  subject          text not null,

  outcome           text not null check (outcome in ('sent','suppressed','failed')),
  -- Why it was not sent. Required for exactly the outcomes that need one.
  outcome_detail    text,

  -- The Person the message is *about*, where that differs from the
  -- recipient — a guardian is told about their child (BR131).
  about_person_id uuid references person(id) on delete set null,
  sent_by_user_id uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),

  constraint message_log_detail_for_non_sent
    check ((outcome = 'sent') = (outcome_detail is null))
);

create index message_log_club_created_idx on message_log (club_id, created_at desc);
create index message_log_subscriber_idx    on message_log (subscriber_id);

-- ------------------------------------------------------------------ policies

alter table message_subscriber enable row level security;
alter table message_log        enable row level security;

-- BR120: named roles, not "any member of the club". A coach has no reason
-- to read who the club has emailed, and BR122 asks for the test that says
-- so — `supabase/tests/33_communications.sql`, scenario 6.
create policy message_subscriber_select on message_subscriber
  for select using (app_has_role(club_id, array['admin','registrar','treasurer','coordinator']));

create policy message_subscriber_insert on message_subscriber
  for insert with check (app_has_role(club_id, array['admin','registrar','treasurer','coordinator']));

-- An officer may correct an address. They may not write suppression
-- directly — the trigger below sees to that.
create policy message_subscriber_update on message_subscriber
  for update using (app_has_role(club_id, array['admin','registrar','treasurer','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','treasurer','coordinator']));

create policy message_log_select on message_log
  for select using (app_has_role(club_id, array['admin','registrar','treasurer','coordinator']));

create policy message_log_insert on message_log
  for insert with check (app_has_role(club_id, array['admin','registrar','treasurer','coordinator']));

-- No update policy and no delete policy on message_log. With RLS on, an
-- operation with no policy is denied — which is how BR127's append-only
-- property is enforced rather than asked for.

-- ------------------------------------------------- one door for suppression
-- A withdrawal has to be hard to undo by accident. The update policy above
-- lets an officer fix a typo in an address, and that same policy would let
-- any officer clear a suppression with an ordinary update — silently, and
-- with nothing recorded.
--
-- So the columns are closed to direct writes and opened only inside the two
-- functions that own them: `app_unsubscribe()`, which the recipient
-- reaches, and `app_set_suppression()`, which writes an audit event. A
-- comment asking people not to do it would have been the alternative, and
-- P5's whole lesson in this repository is that a rule nobody can bypass
-- beats a rule nobody is supposed to.
--
-- **Each function closes the door behind itself.** `set_config(..., true)`
-- is transaction-local, not statement-local, so setting it and walking away
-- would leave suppression writable for the rest of the caller's
-- transaction. One request, one RPC makes that harmless in practice — and
-- "harmless in practice" is how the leaks in this domain start, so the flag
-- is cleared before each function returns.

create or replace function enforce_suppression_through_one_door()
returns trigger
language plpgsql
as $$
begin
  if (new.operational_suppressed_at is distinct from old.operational_suppressed_at
      or new.marketing_suppressed_at is distinct from old.marketing_suppressed_at)
     and coalesce(current_setting('app.suppression_change', true), '') <> 'on' then
    raise exception
      'BR128/BR130: suppression changes through app_unsubscribe() or app_set_suppression(), not by a direct write';
  end if;
  return new;
end
$$;

create trigger message_subscriber_suppression_one_door
  before update on message_subscriber
  for each row execute function enforce_suppression_through_one_door();

-- ---------------------------------------------------------- app_unsubscribe
-- BR128. Reached by `anon`: the people this exists for — a prospect, a
-- guardian who registered through a link — largely hold no account, and
-- requiring one would make the withdrawal conditional on joining the thing
-- being withdrawn from.
--
-- The token is verified here rather than in the application so that no
-- caller needs elevated access to withdraw. Same shape as
-- `submit_public_registration`: definer, pinned search_path, and the
-- subject looked up from the token rather than supplied alongside it.
--
-- Returns the purposes now suppressed, so the page can tell the person
-- what has actually stopped rather than a generic acknowledgement.

create or replace function app_unsubscribe(
  p_id      uuid,
  p_token   text,
  p_purpose text default 'marketing'
)
returns table (subject text, operational boolean, marketing boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  v_sub  message_subscriber;
  v_pro  prospect;
begin
  if p_purpose not in ('marketing', 'operational', 'all') then
    raise exception 'Unknown contact purpose.';
  end if;

  perform set_config('app.suppression_change', 'on', true);

  select * into v_sub from message_subscriber
   where id = p_id and unsubscribe_token_hash = v_hash;

  if found then
    update message_subscriber
       set marketing_suppressed_at =
             case when p_purpose in ('marketing','all')
                  then coalesce(marketing_suppressed_at, now()) end,
           operational_suppressed_at =
             case when p_purpose in ('operational','all')
                  then coalesce(operational_suppressed_at, now())
                  else operational_suppressed_at end
     where id = p_id
     returning * into v_sub;

    perform set_config('app.suppression_change', 'off', true);
    return query select 'person'::text,
                        v_sub.operational_suppressed_at is not null,
                        v_sub.marketing_suppressed_at is not null;
    return;
  end if;

  -- A prospect has no tenant and no Person (BR92), and unsubscribes from
  -- the only thing they were ever asked to consent to.
  select * into v_pro from prospect
   where id = p_id and unsubscribe_token_hash = v_hash;

  if found then
    update prospect
       set marketing_consent_revoked_at = coalesce(marketing_consent_revoked_at, now())
     where id = p_id
     returning * into v_pro;

    perform set_config('app.suppression_change', 'off', true);
    return query select 'prospect'::text, true, v_pro.marketing_consent_revoked_at is not null;
    return;
  end if;

  -- An unknown id and a wrong token fail identically, for the reason
  -- BR73's three cases do: the response must not confirm that an address
  -- is on the list.
  perform set_config('app.suppression_change', 'off', true);
  raise exception 'This unsubscribe link is not valid.';
end
$$;

-- ------------------------------------------------------- app_set_suppression
-- The way back. A person who unsubscribed by mistake asks the club, and an
-- officer restores contact — recorded, and never silently.

create or replace function app_set_suppression(
  p_subscriber_id uuid,
  p_purpose       text,
  p_suppressed    boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club uuid;
begin
  select club_id into v_club from message_subscriber where id = p_subscriber_id;
  if v_club is null then
    raise exception 'No such subscriber.';
  end if;
  if not app_has_role(v_club, array['admin','registrar','treasurer','coordinator']) then
    raise exception 'Not permitted at this club.';
  end if;
  if p_purpose not in ('marketing', 'operational') then
    raise exception 'Unknown contact purpose.';
  end if;

  perform set_config('app.suppression_change', 'on', true);

  if p_purpose = 'marketing' then
    update message_subscriber
       set marketing_suppressed_at = case when p_suppressed then coalesce(marketing_suppressed_at, now()) end
     where id = p_subscriber_id;
  else
    update message_subscriber
       set operational_suppressed_at = case when p_suppressed then coalesce(operational_suppressed_at, now()) end
     where id = p_subscriber_id;
  end if;

  perform set_config('app.suppression_change', 'off', true);

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_club, auth.uid(),
          case when p_suppressed then 'suppression.set' else 'suppression.cleared' end,
          'message_subscriber', p_subscriber_id,
          jsonb_build_object('purpose', p_purpose));
end
$$;

revoke all on function app_unsubscribe(uuid, text, text) from public;
revoke all on function app_set_suppression(uuid, text, boolean) from public;
grant execute on function app_unsubscribe(uuid, text, text) to anon, authenticated;
grant execute on function app_set_suppression(uuid, text, boolean) to authenticated;
