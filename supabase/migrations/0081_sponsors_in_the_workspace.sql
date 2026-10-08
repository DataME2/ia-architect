-- 0081 — Sponsors in the workspace (scope 84; BR169, BR170, decision 17).
--
-- Clubs live on sponsors, and the platform has space to sell. The product
-- owner decided, October 2026:
--
--   * **Both sell.** A club sells its own sponsors into its members'
--     workspaces; Let'sDataTalk sells platform-wide campaigns into clubs that
--     opt in, with a revenue share for the club. Every campaign belongs to
--     one club, so tenant isolation (P5) is untouched: a platform campaign is
--     placed per club, never read across clubs.
--   * **Adults only.** A sponsor appears only in the workspace of a person of
--     eighteen or over — guardian, coach, referee, committee, adult player.
--     A 13–17 person's own workspace shows none, and an impression or click
--     from one is refused here as well as never rendered (BR169).
--   * **Measure and invoice.** Impressions, clicks and acquisitions are
--     counted per campaign per day, **with no identity attached**; what is
--     owed under CPC, CPM or CPA is computed for a statement the club
--     invoices from. No card is processed (BR170).
--
-- A sponsor never learns who saw or clicked: the click passes through the
-- platform's own redirect, carrying nothing about the viewer, and nothing is
-- shared with the sponsor but the counts (decision 17).

-- -------------------------------------------------------------- settings

create table club_sponsor_settings (
  club_id                    uuid primary key references club(id) on delete cascade,
  accepts_platform_campaigns boolean not null default false,
  -- The club's share of a platform campaign's charges, in basis points.
  platform_share_bps         integer not null default 3000 check (platform_share_bps between 0 and 10000),
  updated_by_user_id         uuid,
  updated_at                 timestamptz not null default now()
);

alter table club_sponsor_settings enable row level security;

create policy club_sponsor_settings_select on club_sponsor_settings
  for select using (app_has_role(club_id, array['admin', 'treasurer']) or app_is_platform());
create policy club_sponsor_settings_manage on club_sponsor_settings
  for all using (app_has_role(club_id, array['admin', 'treasurer']))
  with check (app_has_role(club_id, array['admin', 'treasurer']));

-- The share is a commercial term (docs/annexes/commercial-terms.md): the club
-- opts in or out, and only the platform sets what share it receives.
create or replace function club_sponsor_share_is_the_platforms()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $
begin
  if not app_is_platform() then
    new.platform_share_bps := case when tg_op = 'UPDATE' then old.platform_share_bps else 3000 end;
  end if;
  return new;
end;
$;

create trigger club_sponsor_share_is_the_platforms
  before insert or update on club_sponsor_settings
  for each row execute function club_sponsor_share_is_the_platforms();

-- -------------------------------------------------------------- campaigns

create table sponsor_campaign (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references club(id) on delete cascade,
  owner              text not null default 'club' check (owner in ('club', 'platform')),
  sponsor_name       text not null check (btrim(sponsor_name) <> ''),
  headline           text not null check (btrim(headline) <> '' and length(headline) <= 90),
  body               text check (body is null or length(body) <= 200),
  link_url           text not null check (link_url ~* '^https://[^\s/]+\.[^\s/]+'),
  pricing_model      text not null check (pricing_model in ('cpc', 'cpm', 'cpa')),
  -- Per click (CPC), per thousand impressions (CPM), or per acquisition (CPA).
  rate_cents         integer not null check (rate_cents > 0),
  audience           text[] not null default array['guardian', 'coach', 'referee', 'player', 'committee']
    check (audience <@ array['guardian', 'coach', 'referee', 'player', 'committee'] and cardinality(audience) > 0),
  starts_on          date not null,
  ends_on            date not null,
  status             text not null default 'active' check (status in ('active', 'paused', 'ended')),
  -- A platform campaign records the club's share at placement; a club's own is 100%.
  club_share_bps     integer not null default 10000 check (club_share_bps between 0 and 10000),
  created_by_user_id uuid,
  created_at         timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (owner = 'platform' or club_share_bps = 10000)
);

create index sponsor_campaign_live_idx on sponsor_campaign (club_id, status, starts_on, ends_on);

alter table sponsor_campaign enable row level security;

-- Any member or family of the club reads active campaigns (the slot renders
-- them); the money roles and the platform read every one.
create policy sponsor_campaign_select on sponsor_campaign
  for select using (
    app_has_role(club_id, array['admin', 'treasurer'])
    or app_is_platform()
    or (status = 'active'
        and (club_id in (select app_member_club_ids()) or club_id in (select app_family_club_ids())))
  );

-- A club manages its own campaigns; a platform campaign is placed and
-- changed only through the platform's function.
create policy sponsor_campaign_manage on sponsor_campaign
  for all using (owner = 'club' and app_has_role(club_id, array['admin', 'treasurer']))
  with check (owner = 'club' and app_has_role(club_id, array['admin', 'treasurer']));

-- ------------------------------------------------------ counts, no identity

create table sponsor_tally (
  club_id     uuid not null references club(id) on delete cascade,
  campaign_id uuid not null references sponsor_campaign(id) on delete cascade,
  on_day      date not null,
  impressions integer not null default 0 check (impressions >= 0),
  clicks      integer not null default 0 check (clicks >= 0),
  acquisitions integer not null default 0 check (acquisitions >= 0),
  primary key (campaign_id, on_day)
);

alter table sponsor_tally enable row level security;

create policy sponsor_tally_select on sponsor_tally
  for select using (app_has_role(club_id, array['admin', 'treasurer']) or app_is_platform());

-- One count per viewer per campaign per day, so a refresh is not a second
-- impression and a double click is not a second charge. A one-way hash of
-- the viewer, the campaign and the day — never the viewer — and only for
-- today and yesterday: older rows are removed as new ones are written.
create table sponsor_seen (
  club_id     uuid not null references club(id) on delete cascade,
  campaign_id uuid not null references sponsor_campaign(id) on delete cascade,
  on_day      date not null,
  kind        text not null check (kind in ('impression', 'click')),
  viewer_hash text not null,
  primary key (campaign_id, on_day, kind, viewer_hash)
);

alter table sponsor_seen enable row level security;
-- No policy grants anything: only the function below touches it.
create policy sponsor_seen_none on sponsor_seen for select using (false);

-- ------------------------------------------------------------- recording

create or replace function app_record_sponsor_event(p_campaign_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_c    sponsor_campaign;
  v_hash text;
  v_new  integer;
begin
  if p_kind not in ('impression', 'click') then
    raise exception 'An impression or a click.';
  end if;
  select * into v_c from sponsor_campaign where id = p_campaign_id;
  if v_c.id is null or v_c.status <> 'active' or current_date not between v_c.starts_on and v_c.ends_on then
    return false;
  end if;
  -- The viewer belongs to the club (member or family) and is an adult (BR169).
  if not (v_c.club_id in (select app_member_club_ids()) or v_c.club_id in (select app_family_club_ids())) then
    return false;
  end if;
  -- Adults only (BR169): a club officer (BR87: committee and staff are
  -- adults), or an account whose own Person at this club is eighteen or over.
  -- A 13-17 player's or referee's own account is neither, and is not counted.
  if not exists (select 1 from club_membership m where m.user_id = auth.uid() and m.club_id = v_c.club_id)
     and not exists (
       select 1 from account_person ap
        where ap.user_id = auth.uid() and ap.club_id = v_c.club_id
          and coalesce(app_is_adult_on(ap.person_id, current_date), false)) then
    return false;
  end if;

  delete from sponsor_seen where on_day < current_date - 1;

  v_hash := md5(auth.uid()::text || ':' || p_campaign_id::text || ':' || current_date::text || ':' || p_kind);
  insert into sponsor_seen (club_id, campaign_id, on_day, kind, viewer_hash)
  values (v_c.club_id, p_campaign_id, current_date, p_kind, v_hash)
  on conflict do nothing;
  get diagnostics v_new = row_count;
  if v_new = 0 then
    return true;   -- already counted today
  end if;

  insert into sponsor_tally (club_id, campaign_id, on_day, impressions, clicks)
  values (v_c.club_id, p_campaign_id, current_date,
          case when p_kind = 'impression' then 1 else 0 end,
          case when p_kind = 'click' then 1 else 0 end)
  on conflict (campaign_id, on_day) do update
     set impressions = sponsor_tally.impressions + excluded.impressions,
         clicks      = sponsor_tally.clicks + excluded.clicks;
  return true;
end;
$$;

revoke all on function app_record_sponsor_event(uuid, text) from public;
grant execute on function app_record_sponsor_event(uuid, text) to authenticated;

-- CPA: acquisitions are reported by the sponsor (a promo code redeemed, a
-- sign-up) and recorded by the club's admin or treasurer, or the platform for
-- its own campaigns — never inferred by tracking anybody.
create or replace function app_record_sponsor_acquisitions(p_campaign_id uuid, p_on_day date, p_count integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_c sponsor_campaign;
begin
  select * into v_c from sponsor_campaign where id = p_campaign_id;
  if v_c.id is null then
    raise exception 'No such campaign.';
  end if;
  if not (app_has_role(v_c.club_id, array['admin', 'treasurer']) or (v_c.owner = 'platform' and app_is_platform())) then
    raise exception 'Only the club''s admin or treasurer records acquisitions (BR170).' using errcode = '42501';
  end if;
  if p_count is null or p_count < 1 or p_on_day is null or p_on_day > current_date then
    raise exception 'Record at least one acquisition, on a day that has happened.';
  end if;

  insert into sponsor_tally (club_id, campaign_id, on_day, acquisitions)
  values (v_c.club_id, p_campaign_id, p_on_day, p_count)
  on conflict (campaign_id, on_day) do update
     set acquisitions = sponsor_tally.acquisitions + excluded.acquisitions;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_c.club_id, auth.uid(), 'sponsor_acquisitions_recorded', 'sponsor_campaign', p_campaign_id,
          jsonb_build_object('on_day', p_on_day, 'count', p_count));
end;
$$;

revoke all on function app_record_sponsor_acquisitions(uuid, date, integer) from public;
grant execute on function app_record_sponsor_acquisitions(uuid, date, integer) to authenticated;

-- ------------------------------------------------- the platform's placement

create or replace function app_platform_place_campaign(
  p_club_id uuid, p_sponsor_name text, p_headline text, p_body text, p_link_url text,
  p_pricing_model text, p_rate_cents integer, p_audience text[], p_starts_on date, p_ends_on date)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_share integer;
  v_id    uuid;
begin
  if not app_is_platform() then
    raise exception 'Only Let''sDataTalk places a platform campaign.' using errcode = '42501';
  end if;
  select platform_share_bps into v_share
    from club_sponsor_settings where club_id = p_club_id and accepts_platform_campaigns;
  if v_share is null then
    raise exception 'That club has not opted in to platform campaigns (BR170).';
  end if;

  insert into sponsor_campaign (club_id, owner, sponsor_name, headline, body, link_url, pricing_model,
                                rate_cents, audience, starts_on, ends_on, club_share_bps, created_by_user_id)
  values (p_club_id, 'platform', p_sponsor_name, p_headline, p_body, p_link_url, p_pricing_model,
          p_rate_cents, coalesce(p_audience, array['guardian', 'coach', 'referee', 'player', 'committee']),
          p_starts_on, p_ends_on, v_share, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function app_platform_place_campaign(uuid, text, text, text, text, text, integer, text[], date, date) from public;
grant execute on function app_platform_place_campaign(uuid, text, text, text, text, text, integer, text[], date, date) to authenticated;
