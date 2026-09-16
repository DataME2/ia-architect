-- 0050 — A bell for the Referee Coordinator (scope 39's own gap, closed).
--
-- BR136 already made a declared officiating interest a claim rather than a
-- classification, reviewed by a Referee Coordinator "before it becomes
-- anything." What 0033 never built is any way for the Coordinator to find
-- out a claim exists — `InterestQueue` has been reachable from
-- `/registrar/referees` since scope 39, and nothing has ever pointed
-- anybody at it. A family declares; the platform waits to be asked.
--
-- **This is not C7.** `message_subscriber`/`message_log` (scope 36) govern
-- messages to a *data subject* — a family — with consent, suppression and
-- an unsubscribe link BR127–BR131 require of every one of them. A
-- Coordinator finding out their own club has new work waiting is not that
-- kind of message any more than the operator alert BR146 already
-- distinguishes from one (scope 45) — it is a fact about the account's own
-- inbox, not a communication to a person outside the platform. So this is
-- a new, narrower object: `notification`, read only by the account it
-- names, never suppressible because it was never optional, and carrying no
-- unsubscribe because there is nothing to unsubscribe from.
--
-- **One trigger for now, not every notifiable event BR42/BR64 already
-- name.** Wiring every documented notification point in one migration
-- would be the same mistake scope 36's own baseline note describes —
-- BR42's coordinator notification and BR64's fixture-change notification
-- have been "unbuildable" for want of exactly this table, and now that it
-- exists they are candidates for the next initiative, not this one.

-- ------------------------------------------------------------- notification

create table notification (
  id                uuid primary key default gen_random_uuid(),
  club_id           uuid not null references club(id) on delete cascade,

  -- A specific account's inbox, not a role's — the same reason
  -- `calendar_subscription.holder_person_id` names a person rather than
  -- "whoever is coach this week": a role can be held by several accounts
  -- at once, and a stale claim on a screen nobody opens is worse than
  -- three coordinators each getting the same one.
  recipient_user_id uuid not null,

  -- What kind of event this is, for a future screen that wants to filter
  -- or group them. Not a foreign key to anything: the event that caused
  -- this may itself be reviewed, resolved, or deleted long before the
  -- notification is read, and the notification's job is to say what
  -- happened, not to still be able to prove it via a join.
  kind      text not null check (btrim(kind) <> ''),
  headline  text not null check (btrim(headline) <> ''),
  detail    text,

  -- Where "view" takes them. A relative path within the app, never a full
  -- URL — this is data a recipient's own client renders and clicks, not
  -- somewhere the server redirects blindly, so there is nothing here that
  -- needs validating against an open-redirect the way messaging.ts's
  -- constructed links do.
  link_path text,

  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create index notification_recipient_unread_idx
  on notification (recipient_user_id, created_at desc)
  where read_at is null;

alter table notification enable row level security;

-- An inbox is read by the account it was written for, and by nobody else —
-- not even an admin. What a coordinator is being told is that a queue they
-- already have access to has something in it; the notification names no
-- fact a club officer role does not already grant through the queue
-- itself, so narrowing it to the recipient costs nothing and a shared
-- inbox would be a stranger reading mail addressed to somebody else.
create policy notification_select on notification
  for select using (recipient_user_id = auth.uid());

-- Marking read is the recipient's own act on their own row — the same
-- shape `calendar_subscription`'s holder-manages-their-own-feed policy
-- uses, and for the same reason: this is single-user state, not a fact
-- the club needs preserved (BR146's alert is retried by a person and kept
-- forever; this is read or unread, nothing else, and nobody but the
-- recipient has a reason to touch it).
create policy notification_mark_read on notification
  for update using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

-- No insert or delete policy for `authenticated`/`anon`. A notification is
-- created only by a `security definer` function that has already verified
-- the event it announces — a client that could insert its own would be a
-- client that could put an untrue claim in somebody else's inbox — and
-- never deleted: an unread badge a recipient could make vanish by deleting
-- the row instead of reading it would defeat the one thing this exists to
-- guarantee.

comment on table notification is
  'An account''s own inbox — created only by a security definer function, '
  'read only by the account it names, never suppressible or deleted. '
  'Distinct from message_subscriber/message_log (scope 36), which govern '
  'consent-bound messages to a data subject; this is a fact about the '
  'account''s own queue, not a communication BR127-BR131 apply to.';

-- ------------------------------------------------------- app_declare_interest
-- Reproduced in full from 0033 (a migration already applied is never
-- edited) with one addition at the end: every account holding admin or
-- coordinator at this club is told a claim is waiting. Both roles, because
-- `officiating_interest_select` already grants both read access to it —
-- a small club that has never appointed a separate coordinator still has
-- an admin who needs to know, and a club that has both should not have the
-- claim seen only by whichever one happened to be granted first.

create or replace function app_declare_interest(
  p_registration_id uuid,
  p_wants boolean,
  p_before boolean,
  p_number text,
  p_level text,
  p_declared_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg registration;
  v_id  uuid;
  v_who text;
begin
  select * into v_reg from registration where id = p_registration_id;
  if v_reg is null then
    raise exception 'No such registration.';
  end if;

  -- Nothing to record. Said plainly rather than writing a row of falses
  -- that a coordinator then has to read and dismiss.
  if not coalesce(p_wants, false) and not coalesce(p_before, false) then
    return null;
  end if;

  insert into officiating_interest (
    club_id, person_id, registration_id,
    wants_to_officiate, has_officiated_before,
    declared_accreditation_number, declared_level,
    -- Matched against the catalogue where it happens to match, by name,
    -- case-insensitively. A miss is ordinary and costs nothing.
    declared_level_id,
    declared_by_person_id
  )
  values (
    v_reg.club_id, v_reg.person_id, p_registration_id,
    coalesce(p_wants, false), coalesce(p_before, false),
    nullif(btrim(coalesce(p_number, '')), ''),
    nullif(btrim(coalesce(p_level, '')), ''),
    (select cl.id from classification_level cl
      where lower(cl.name) = lower(btrim(coalesce(p_level, '')))
      limit 1),
    p_declared_by
  )
  on conflict (club_id, person_id) where state = 'pending'
  do update set
    wants_to_officiate = excluded.wants_to_officiate,
    has_officiated_before = excluded.has_officiated_before,
    declared_accreditation_number = excluded.declared_accreditation_number,
    declared_level = excluded.declared_level,
    declared_level_id = excluded.declared_level_id,
    declared_at = now()
  returning id into v_id;

  -- Named by preferred name where there is one, exactly as a queue screen
  -- would (BR55) — a coordinator's first read of this should not be a uuid.
  select coalesce(p.preferred_name, p.legal_given_names) || ' ' || p.legal_family_name
    into v_who
    from person p where p.id = v_reg.person_id;

  insert into notification (club_id, recipient_user_id, kind, headline, detail, link_path)
  select
    v_reg.club_id,
    m.user_id,
    'officiating_interest_declared',
    v_who || ' would like to officiate',
    case when coalesce(p_before, false)
      then 'Has officiated before' || case when nullif(btrim(coalesce(p_level, '')), '') is null
        then '.' else ', declared level ' || btrim(p_level) || '.' end
      else 'Has not officiated before.'
    end,
    '/registrar/referees'
  from club_membership m
  where m.club_id = v_reg.club_id
    and m.role in ('admin', 'coordinator');

  return v_id;
end
$$;
