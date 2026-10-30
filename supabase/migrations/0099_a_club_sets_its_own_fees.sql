-- 0099 — A club sets its own fees (scope 130; BR195, BR196).
--
-- Until now a season had one fee, `season.registration_fee_cents`, which a
-- registration opened owing (BR3). The pilot club's schedule has fourteen
-- registration lines by programme and age, Football Queensland's four fees,
-- a volunteer levy and sibling discounts, and the product owner asked for
-- each club to keep its own, set by the admin and the treasurer only.
--
-- This migration holds the schedule. It does **not** yet change what a
-- registration opens owing: the family's checkout, which chooses the line
-- and opens the registration at BR195's price, is scope 130's next step and
-- is reviewed on its own. Until then `season.registration_fee_cents` stands.
--
-- Three tables, each with its `club_id` and RLS in this migration:
--
--   * fee_line: one row per line a club charges — its own registration
--     lines (`club`), the governing body's fees (`governing`) and its levies
--     (`levy`) — with an optional deposit, an optional age range, and the
--     schedule's *admin only* marker. A line is retired, never deleted, so a
--     registration priced from it can always say what it was priced from.
--   * fee_settings: the club's sibling discount, 15% by default (open
--     question 118, answered 30 October 2026).
--   * registration_terms: the club's terms, written with placeholders
--     ({club}, {club_email}, ...), and the values that fill them.
--
-- **BR196: read by the roles that register and take money, written by the
-- admin and the treasurer only.** The registrar reads the schedule to price
-- a registration; only the two money roles may change it.

-- ------------------------------------------------------------- fee_line
create table fee_line (
  club_id        uuid not null references club(id) on delete cascade,
  id             uuid primary key default gen_random_uuid(),
  season_id      uuid not null references season(id) on delete cascade,

  kind           text not null check (kind in ('club', 'governing', 'levy')),
  name           text not null check (length(btrim(name)) between 1 and 200),
  amount_cents   integer not null check (amount_cents >= 0),
  -- Paid up front, and part of the amount rather than on top of it.
  deposit_cents  integer check (deposit_cents is null or deposit_cents between 0 and amount_cents),
  -- Inclusive ages in the season; null is "no bound".
  min_age        integer check (min_age is null or min_age between 0 and 120),
  max_age        integer check (max_age is null or max_age between 0 and 120),
  admin_only     boolean not null default true,

  retired_at     timestamptz,
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),

  check (min_age is null or max_age is null or min_age <= max_age)
);

create index fee_line_club_season on fee_line (club_id, season_id);

alter table fee_line enable row level security;

create policy fee_line_select on fee_line
  for select using (app_has_role(club_id, array['admin', 'registrar', 'treasurer']));
create policy fee_line_manage on fee_line
  for all using (app_has_role(club_id, array['admin', 'treasurer']))
  with check (app_has_role(club_id, array['admin', 'treasurer']));

-- --------------------------------------------------------- fee_settings
create table fee_settings (
  club_id               uuid primary key references club(id) on delete cascade,
  -- Basis points: 1500 is 15%, the product owner's default (Q118).
  sibling_discount_bps  integer not null default 1500 check (sibling_discount_bps between 0 and 10000),
  updated_by            uuid default auth.uid(),
  updated_at            timestamptz not null default now()
);

alter table fee_settings enable row level security;

create policy fee_settings_select on fee_settings
  for select using (app_has_role(club_id, array['admin', 'registrar', 'treasurer']));
create policy fee_settings_manage on fee_settings
  for all using (app_has_role(club_id, array['admin', 'treasurer']))
  with check (app_has_role(club_id, array['admin', 'treasurer']));

-- --------------------------------------------------- registration_terms
create table registration_terms (
  club_id             uuid primary key references club(id) on delete cascade,
  body                text not null default '' check (length(body) <= 20000),
  -- {"club_email": "secretary@…", "date_in_future": "1 March 2027", …}
  placeholder_values  jsonb not null default '{}'::jsonb check (jsonb_typeof(placeholder_values) = 'object'),
  updated_by          uuid default auth.uid(),
  updated_at          timestamptz not null default now()
);

alter table registration_terms enable row level security;

create policy registration_terms_select on registration_terms
  for select using (app_has_role(club_id, array['admin', 'registrar', 'treasurer']));
create policy registration_terms_manage on registration_terms
  for all using (app_has_role(club_id, array['admin', 'treasurer']))
  with check (app_has_role(club_id, array['admin', 'treasurer']));

insert into schema_migration_log (version, name) values
  ('0099', '0099_a_club_sets_its_own_fees');
