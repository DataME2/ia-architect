-- 0014 — Marketing consent at the demonstration door (BR93).
--
-- Entering the demonstration club needs no consent: asking to see a product
-- infers consent to hear back about that demonstration, and nothing wider.
-- Being added to a mailing list is the wider thing, so it is asked for
-- separately, granted explicitly, and refusable without losing the demo.
--
-- Recorded the way `consent` records a club's consents (0001) and for the
-- same stated reason: **a boolean cannot say when it was given or what it
-- covered.** The difference here is that a prospect is not a Person and
-- belongs to no club, so these are columns on `prospect` rather than rows
-- in `consent` — one subject, one purpose, one lifecycle. A second purpose
-- would be the moment to make it a table.

alter table prospect
  -- When, not whether. Null means never granted.
  add column marketing_consent_at timestamptz,

  -- The exact words shown at that moment. Stored, not referenced, so that
  -- editing the annex does not silently rewrite what somebody agreed to —
  -- and the words are the thing in dispute if it is ever disputed. Written
  -- from a server-side constant, never from the client, so it records what
  -- was rendered rather than what a caller claims was rendered.
  add column marketing_consent_wording text,

  -- Nothing sets this yet, and that is stated rather than hidden: no
  -- unsubscribe mechanism is built, and an unticked box on a return visit
  -- is NOT a withdrawal — somebody who did not notice a checkbox has not
  -- withdrawn anything. Inferring withdrawal from silence is the same
  -- mistake as inferring consent from it.
  add column marketing_consent_revoked_at timestamptz,

  -- Consent without its words is not evidence, so the pair travels together
  -- or not at all.
  add constraint prospect_marketing_consent_has_wording
    check ((marketing_consent_at is null) = (marketing_consent_wording is null)),

  -- Nothing can be revoked that was never granted.
  add constraint prospect_marketing_consent_revoked_after_grant
    check (marketing_consent_revoked_at is null
           or (marketing_consent_at is not null
               and marketing_consent_revoked_at >= marketing_consent_at));

comment on column prospect.marketing_consent_wording is
  'The exact text the prospect was shown when they consented. Stored rather '
  'than referenced so later edits to the wording annex cannot rewrite an '
  'existing consent.';

-- ------------------------------------------------------------- enter_demo
-- Same function, one more thing it may record. Everything about the club
-- lookup is unchanged: the club is still never an argument.

create or replace function enter_demo(
  p_email              text,
  p_phone              text default null,
  p_marketing_consent  boolean default false,
  p_consent_wording    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_club  uuid;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_grant boolean := coalesce(p_marketing_consent, false);
begin
  if v_user is null then
    raise exception 'A session is required. Take an anonymous one first.'
      using errcode = '42501';
  end if;

  if position('@' in v_email) < 2 then
    raise exception 'A valid email address is required.'
      using errcode = '22023';
  end if;

  -- Consent with no words recorded would be a boolean wearing a timestamp,
  -- which is the thing BR93 exists to prevent.
  if v_grant and nullif(btrim(coalesce(p_consent_wording, '')), '') is null then
    raise exception 'Marketing consent must record the wording that was shown.'
      using errcode = '22023';
  end if;

  select id into v_club
  from club
  where name like '%(DEMO)%'
  order by created_at
  limit 1;

  if v_club is null then
    raise exception 'No demonstration club is seeded in this deployment.'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1 from club_membership
    where user_id = v_user and club_id <> v_club
  ) then
    raise exception 'This account already belongs to a club. Sign out first.'
      using errcode = '42501';
  end if;

  insert into prospect (email, phone, user_id,
                        marketing_consent_at, marketing_consent_wording)
  values (v_email,
          nullif(btrim(coalesce(p_phone, '')), ''),
          v_user,
          case when v_grant then now() end,
          case when v_grant then btrim(p_consent_wording) end)
  on conflict ((lower(email))) do update
    set phone        = coalesce(excluded.phone, prospect.phone),
        user_id      = excluded.user_id,
        last_seen_at = now(),
        -- A return visit may GRANT consent that was not given before. It
        -- may not take one away: an unticked box is not a withdrawal, and
        -- treating it as one would silently drop a permission somebody
        -- actually gave. Withdrawal needs an act of its own, which is
        -- BR93's revoked_at and is not built.
        marketing_consent_at =
          coalesce(prospect.marketing_consent_at, excluded.marketing_consent_at),
        marketing_consent_wording =
          coalesce(prospect.marketing_consent_wording, excluded.marketing_consent_wording);

  insert into club_membership (club_id, user_id, role)
  values (v_club, v_user, 'viewer')
  on conflict do nothing;

  return v_club;
end;
$$;

-- The two-argument form is gone: every caller now passes consent, and
-- leaving an overload behind would let a caller record a visit with no
-- decision recorded at all.
drop function if exists enter_demo(text, text);

revoke all on function enter_demo(text, text, boolean, text) from public;
grant execute on function enter_demo(text, text, boolean, text) to anon, authenticated;

comment on function enter_demo(text, text, boolean, text) is
  'Grants the calling session read-only (viewer) membership of the '
  'demonstration club, records the caller as a prospect, and records '
  'marketing consent with the wording shown if it was given. The club is '
  'looked up, never supplied, so this cannot be pointed at a real tenant.';
