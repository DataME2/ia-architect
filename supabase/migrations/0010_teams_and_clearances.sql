-- Teams, who is in them, and who is allowed to stand in front of them.
--
-- The club is organising several teams and had nowhere to put them: Team was
-- named in passing by Season Competition Entry and by the Squadi extract's
-- role list, and modelled nowhere. This adds it.
--
-- The part that is not merely a list is the officials. A Team Official is a
-- child-related role, so BR19 applies -- Queensland's rule is literally "no
-- card, no start" -- and BR54 says the check is against the **end of the
-- season**, not against today. A coach whose Blue Card expires in round 12
-- has not passed; they have failed later.
--
--   BR83  a Team Official cannot be added without a Working with Children
--         Check that is current and covers the end of that team's season.
--         Enforced by trigger, because a screen that forgets is a child
--         standing in front of an uncleared adult.

-- ------------------------------------------------------------- clearances

create table clearance (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references club(id) on delete cascade,
  person_id           uuid not null references person(id) on delete cascade,
  -- State-specific: Queensland's Blue Card, NSW's WWCC, and so on. Text
  -- rather than an enum because the club operates across jurisdictions and
  -- the list is configuration (BR52).
  kind                text not null default 'WWCC' check (length(btrim(kind)) > 0),
  -- The card number as issued. Not a secret, but it is personal data.
  identifier          text not null check (length(btrim(identifier)) > 0),
  issued_on           date,
  expires_on          date not null,
  -- BR19: verification is against the state government's portal, by a
  -- human. Null means someone typed a number and nobody checked it.
  verified_by_user_id uuid,
  verified_at         timestamptz,
  revoked_at          timestamptz,
  created_at          timestamptz not null default now(),
  unique (club_id, person_id, kind, identifier)
);
create index clearance_person_idx on clearance (person_id, expires_on desc);

comment on table clearance is
  'BR19/BR54: a child-related role needs one of these, current and covering the end of the season.';

-- ------------------------------------------------------------------ teams

create table team (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  season_id  uuid not null references season(id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  -- 'U8', 'U10 Girls', 'Senior Men' -- configuration, not code.
  age_group  text,
  created_at timestamptz not null default now(),
  unique (club_id, season_id, name)
);
create index team_season_idx on team (club_id, season_id);

-- One row per person per team per role, so a parent who coaches the team
-- their child plays in is two rows and one Person (P1).
create table team_member (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  team_id    uuid not null references team(id) on delete cascade,
  person_id  uuid not null references person(id) on delete cascade,
  role       text not null
    check (role in ('player','coach','assistant-coach','manager','team-official')),
  added_by_user_id uuid,
  added_at   timestamptz not null default now(),
  unique (team_id, person_id, role)
);
create index team_member_team_idx on team_member (team_id, role);
create index team_member_person_idx on team_member (person_id);

-- ------------------------------------------------- BR83, by trigger
--
-- Every role here except `player` puts an adult in front of children, so
-- every role here except `player` needs a clearance. Enforced in the
-- database rather than in the screen that happens to be adding them,
-- because there will be more than one such screen and the failure mode is
-- not a wrong number -- it is an uncleared adult with a team.

create function assert_official_is_cleared() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_season_end date;
  v_expires    date;
begin
  if new.role = 'player' then
    return new;
  end if;

  select s.ends_on into v_season_end
  from team t join season s on s.id = t.season_id
  where t.id = new.team_id;

  -- BR54: measured against the end of the season, not against today. A card
  -- expiring mid-season is flagged now, with months of warning, rather than
  -- on the morning it lapses.
  select max(c.expires_on) into v_expires
  from clearance c
  where c.person_id = new.person_id
    and c.club_id = new.club_id
    and c.revoked_at is null
    and c.verified_at is not null;

  if v_expires is null then
    raise exception
      'no verified Working with Children Check for this person -- no card, no start (BR19)'
      using errcode = '23514';
  end if;

  if v_expires < v_season_end then
    raise exception
      'their clearance expires % , before the season ends % (BR54)', v_expires, v_season_end
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger team_member_official_is_cleared
  before insert or update on team_member
  for each row execute function assert_official_is_cleared();

-- ------------------------------------------------------------------- RLS

alter table clearance   enable row level security;
alter table team        enable row level security;
alter table team_member enable row level security;

-- Clearances carry a card number and are safeguarding records, so reading
-- is narrower than the rest of the slice: admin and registrar only, not
-- every club member.
create policy clearance_select on clearance
  for select using (app_has_role(club_id, array['admin','registrar']));

create policy clearance_manage on clearance
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- Teams and their rosters are ordinary club information: a coach needs to
-- see their own squad, a treasurer needs to know who is in what.
create policy team_select on team
  for select using (club_id in (select app_member_club_ids()));

create policy team_manage on team
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));

create policy team_member_select on team_member
  for select using (club_id in (select app_member_club_ids()));

create policy team_member_manage on team_member
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));
