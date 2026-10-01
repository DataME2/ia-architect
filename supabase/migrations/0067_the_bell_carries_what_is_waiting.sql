-- 0067 — The bell carries what is already waiting (scope 72, BR159).
--
-- Five features each compute a "waiting on you" flag at read time: a proposed
-- correction (BR149), an unanswered availability (BR62) or designation
-- (BR113), an unconfirmed MiniRef match (BR151), and an approved claim with no
-- payment choice (BR152). BR159 puts them in the account's own inbox (0050).
--
-- They are synchronised, not event-written: two of them have no event to hook
-- (a match becomes unconfirmed when its date passes), and the flag logic lives
-- in the app's tested loaders, where a second copy in SQL would drift. The app
-- computes what is waiting for the signed-in account and hands it here, and
-- app_sync_waiting brings that account's own inbox into line:
--
--   * added once, keyed by `subject_key`,
--   * retired (`settled_at`) once no longer waiting, never deleted (0050),
--   * reopened if waiting again, so a read that failed once cannot lose it,
--   * left dismissed if the account dismissed it (`read_at`).
--
-- It writes only to the caller's own inbox, only BR159's five kinds, only
-- at clubs the caller is linked to, and only links inside the app. Scope 58's
-- event-written notifications have no subject_key and are never touched.

alter table notification
  add column subject_key text,
  add column settled_at  timestamptz;

comment on column notification.subject_key is
  'BR159: what a synchronised item is about (e.g. fixture:person), so it '
  'arrives once. Null for event-written notifications (BR148).';
comment on column notification.settled_at is
  'BR159: when a synchronised item stopped waiting. Retired, never deleted; '
  'cleared again if the item is waiting once more.';

create unique index notification_waiting_once_idx
  on notification (recipient_user_id, kind, subject_key)
  where subject_key is not null;

-- ---------------------------------------------------- the well-formed items
-- The items a sync was handed, kept only where they are well formed: the
-- given clubs and kinds (already narrowed by app_sync_waiting), a subject and
-- a headline, and an in-app path, never a scheme and never protocol-relative.
-- app_sync_waiting reads the list twice, so the filter is written once here.

create or replace function app_waiting_items(p_items jsonb, p_clubs uuid[], p_kinds text[])
returns table (club_id uuid, kind text, subject_key text, headline text, detail text, link_path text)
language sql
immutable
set search_path = public
as $$
  select x.club_id, x.kind, btrim(x.subject_key), btrim(x.headline),
         nullif(btrim(coalesce(x.detail, '')), ''), x.link_path
    from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb))
           as x(club_id uuid, kind text, subject_key text,
                headline text, detail text, link_path text)
   where x.club_id = any(p_clubs)
     and x.kind = any(p_kinds)
     and btrim(coalesce(x.subject_key, '')) <> ''
     and btrim(coalesce(x.headline, '')) <> ''
     and x.link_path ~ '^/[A-Za-z0-9_?&=./%-]*$'
     and x.link_path !~ '^//'
$$;

revoke all on function app_waiting_items(jsonb, uuid[], text[]) from public;

-- ------------------------------------------------------------- the sync

create or replace function app_sync_waiting(
  p_club_ids uuid[],
  p_kinds    text[],
  p_items    jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_kinds text[];
  v_clubs uuid[];
begin
  if v_uid is null then
    return;
  end if;

  -- Only BR159's kinds: scope 58's officiating notification is event-written
  -- and must never be retired by a sync that does not know about it.
  select coalesce(array_agg(k), '{}') into v_kinds
    from unnest(coalesce(p_kinds, '{}')) as k
   where k in ('correction_proposed', 'availability_unanswered',
               'designation_unanswered', 'match_unconfirmed', 'claim_unsettled');

  -- Only clubs the caller is linked to, as an officer or as a person.
  select coalesce(array_agg(c), '{}') into v_clubs
    from unnest(coalesce(p_club_ids, '{}')) as c
   where c in (select m.club_id from club_membership m where m.user_id = v_uid
               union
               select a.club_id from account_person a where a.user_id = v_uid);

  if cardinality(v_kinds) = 0 or cardinality(v_clubs) = 0 then
    return;
  end if;

  -- Add what is new; reopen what had been retired. A dismissal stays.
  insert into notification
    (club_id, recipient_user_id, kind, subject_key, headline, detail, link_path)
  select w.club_id, v_uid, w.kind, w.subject_key, w.headline, w.detail, w.link_path
    from app_waiting_items(p_items, v_clubs, v_kinds) w
  on conflict (recipient_user_id, kind, subject_key) where subject_key is not null
  do update set settled_at = null,
                headline   = excluded.headline,
                detail     = excluded.detail,
                link_path  = excluded.link_path;

  -- Retire what is no longer waiting, within the clubs and kinds this call
  -- is the authority for, and nowhere else.
  update notification n
     set settled_at = now()
   where n.recipient_user_id = v_uid
     and n.subject_key is not null
     and n.settled_at is null
     and n.kind = any(v_kinds)
     and n.club_id = any(v_clubs)
     and not exists (select 1 from app_waiting_items(p_items, v_clubs, v_kinds) w
                      where w.kind = n.kind and w.subject_key = n.subject_key);
end
$$;

revoke all on function app_sync_waiting(uuid[], text[], jsonb) from public;
grant execute on function app_sync_waiting(uuid[], text[], jsonb) to authenticated;

comment on function app_sync_waiting(uuid[], text[], jsonb) is
  'BR159: brings the caller''s own inbox into line with what is waiting on '
  'them: adds once, retires what stopped waiting, reopens what is waiting '
  'again, leaves a dismissal alone. Never another account''s inbox, never '
  'scope 58''s event-written kinds, never a link outside the app.';
