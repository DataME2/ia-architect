-- 0035 — The feed a referee already has a calendar for (scope 41).
--
-- C13, and it **implements a decision rather than making one**.
-- [Decision 4](../../docs/decisions/4_calendar-distribution-by-feed-not-account-access.md)
-- settled the shape in July 2026: a private, revocable, per-Person
-- iCalendar feed the referee's calendar *pulls*, not an OAuth integration
-- that writes into their Gmail. The reasons still hold — no P2 exception,
-- no per-vendor integration, and no custody of credentials for accounts
-- this platform does not own.
--
-- **The token is decision 12's, reused rather than reinvented.** The
-- unsubscribe link solved the same shape: an unguessable URL, held by
-- somebody with no account, that must be revocable. `HMAC(secret, salt)`
-- with the hash stored here for verification. The difference is which
-- property matters — an unsubscribe link must be durable so a year-old
-- email still works; a feed URL must be rotatable so a lost phone stops
-- reading it. The same construction gives both.

create table calendar_subscription (
  id        uuid primary key default gen_random_uuid(),
  club_id   uuid not null references club(id) on delete cascade,

  -- Whose appointments the feed carries (BR30).
  person_id uuid not null references person(id) on delete cascade,

  -- **Who holds the URL** (BR33). For an adult, themselves. For a minor,
  -- a guardian with authority — a calendar feed is a record of where a
  -- child will be and when, which decision 4 named as the duty-of-care
  -- half of the question rather than the technical half.
  holder_person_id uuid not null references person(id) on delete cascade,

  feed_salt       text not null,
  feed_token_hash text not null,

  created_at  timestamptz not null default now(),
  -- BR31. Rotation is a new salt, so the previous URL stops resolving the
  -- moment this changes. Recorded so a person can see when they last did it.
  rotated_at  timestamptz,
  revoked_at  timestamptz,

  -- One live feed per Person per club. #83: a guardian with two
  -- officiating children holds two URLs, because one document naming two
  -- children's whereabouts is a worse artifact than two naming one each.
  unique (club_id, person_id)
);

create index calendar_subscription_token_idx on calendar_subscription (feed_token_hash)
  where revoked_at is null;

comment on column calendar_subscription.feed_salt is
  'Not a secret. The URL token is HMAC(server secret, this), so rotating '
  'this invalidates the previous URL immediately (BR31) — decision 12''s '
  'construction, reused.';

-- --------------------------------------------------------------- BR33
-- Who may hold a feed: the person themselves if they are an adult, or a
-- guardian with authority otherwise. Enforced here rather than on the
-- screen that creates it, for the reason every other rule in this schema is.

create or replace function enforce_feed_holder()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_minor boolean;
begin
  select date_of_birth > (current_date - interval '18 years') into v_is_minor
    from person where id = new.person_id;

  if v_is_minor is null then
    raise exception 'No such person.';
  end if;

  if not v_is_minor then
    if new.holder_person_id <> new.person_id then
      -- An adult's whereabouts are their own. A club officer wanting a
      -- referee's schedule reads the designation screen, which is theirs
      -- to read; a private feed is a different thing.
      raise exception 'BR33: an adult holds their own calendar feed';
    end if;
    return new;
  end if;

  if new.holder_person_id = new.person_id then
    raise exception
      'BR33: a minor''s calendar feed is issued to their parent or guardian, not to them';
  end if;

  if not exists (
    select 1 from guardianship g
     where g.club_id = new.club_id
       and g.person_id = new.person_id
       and g.guardian_person_id = new.holder_person_id
       and g.is_authority
  ) then
    raise exception 'BR33: only a guardian with authority may hold a minor''s calendar feed';
  end if;

  return new;
end
$$;

create trigger calendar_subscription_holder
  before insert or update on calendar_subscription
  for each row execute function enforce_feed_holder();

-- ------------------------------------------------------------------ policies

alter table calendar_subscription enable row level security;

-- A person manages their own feed, and a guardian the ones they hold.
-- Reached through `account_person` rather than a membership, exactly as
-- decision 11's family reads are.
create policy calendar_subscription_own on calendar_subscription
  for select using (
    holder_person_id in (select app_my_family_person_ids(club_id))
    or person_id in (select app_my_family_person_ids(club_id))
  );

create policy calendar_subscription_manage on calendar_subscription
  for all using (holder_person_id in (select app_my_family_person_ids(club_id)))
  with check (holder_person_id in (select app_my_family_person_ids(club_id)));

-- A coordinator can see that a feed exists, to answer "have you subscribed?"
-- — and the salt is useless to them without the server secret.
create policy calendar_subscription_officer on calendar_subscription
  for select using (app_has_role(club_id, array['admin','coordinator']));

-- ---------------------------------------------------------- app_calendar_feed
-- BR141. **A projection, not a table read.**
--
-- The holder of a feed URL is by definition unauthenticated, so this takes
-- a token and returns a fixed set of columns. There is no parameter to
-- vary, no filter to widen, and nothing in the result that belongs to
-- anybody else (BR32): competition, date, time, venue, and the
-- subscriber's own role.
--
-- Note what is absent: no opponent's officials, no player names, no team
-- sheet. A feed assembled by filtering a query the caller influences would
-- be one query-string away from being a different feed.

create or replace function app_calendar_feed(p_token text)
returns table (
  appointment_id uuid,
  played_on      date,
  kick_off       time,
  venue          text,
  competition    text,
  own_role       text,
  state          text,
  fixture_status text,
  updated_at     timestamptz
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with me as (
    select cs.club_id, cs.person_id
      from calendar_subscription cs
     where cs.feed_token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
       and cs.revoked_at is null
  )
  select
    a.id,
    f.played_on,
    f.kick_off,
    f.venue,
    -- The catalogued name where 0032 has one, the free text otherwise.
    -- Never the opponent: who else is playing is the club's fixture list,
    -- not this person's commitment.
    coalesce(c.name, f.competition),
    a.role,
    a.state,
    f.status,
    -- When this commitment last moved, so the document's SEQUENCE can
    -- advance and a client treats it as an update rather than a duplicate.
    greatest(a.proposed_at, coalesce(a.responded_at, a.proposed_at), f.created_at)
  from me
  join match_official_appointment a
    on a.club_id = me.club_id and a.person_id = me.person_id
  join fixture f on f.id = a.fixture_id
  left join competition c on c.id = f.competition_id
  -- BR30: only what they actually hold. A proposal they have not accepted
  -- is not a commitment, and a declined one is not theirs at all.
  where a.state in ('proposed', 'accepted')
  order by f.played_on, f.kick_off;
$$;

revoke all on function app_calendar_feed(text) from public;
grant execute on function app_calendar_feed(text) to anon, authenticated;

-- BR34 is enforced by absence: there is no function here that accepts
-- calendar data, so a subscriber editing or deleting the event in their own
-- calendar accepts, declines and cancels nothing. The feed is one-way
-- because there is no other way for it to be.
