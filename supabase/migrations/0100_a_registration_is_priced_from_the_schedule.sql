-- 0100 — A registration is priced from the club's schedule (scope 130, WP4;
-- BR195).
--
-- 0099 gave each club its fee schedule. This makes every registration, at any
-- age, open owing what that schedule says, instead of the season's single
-- fee, and lets the treasurer bring the season's existing registrations onto
-- it once, seeing every change before it is applied.
--
-- **Which club line a player pays.**
--   1. The line the club mapped to the player's team this season
--      (`team_fee_line`). Two siblings in different teams therefore pay
--      their own teams' lines, and the discount comes off each later
--      sibling's own line.
--   2. With no team yet, the cheapest **standard** line that fits the
--      player's age: the treasurer ticks which lines a player without a team
--      is charged (`fee_line.standard`, added here), so an Academy or
--      Advanced line is only ever charged through its team.
--   3. With no standard line for the age, the cheapest line that fits.
-- The governing body's fee is chosen by steps 2 and 3, so a forty-year-old
-- pays the seniors' fee, not the masters', unless the club made masters the
-- standard. Every levy that fits the age is added. A player's age is the season's year less their year of
-- birth, as the governing body counts age groups (an Under 8 turns seven).
--
-- **Who is a sibling.** Another player at the same club in the same season
-- who shares a guardian with this one, opened earlier. The first opened pays
-- in full (Q118, answered 30 October 2026).
--
-- **A club with no lines for the season** keeps the season's own fee, as
-- before, so nothing changes for it until it builds a schedule.
--
-- Every pricing is kept in `registration_price`, so a registration can always
-- say what it was priced from, even after a line is retired.

-- ------------------------------------------------- the standard line
alter table fee_line add column standard boolean not null default false;

-- ------------------------------------------------------------ team_fee_line
create table team_fee_line (
  club_id      uuid not null references club(id) on delete cascade,
  team_id      uuid primary key references team(id) on delete cascade,
  fee_line_id  uuid not null references fee_line(id) on delete cascade,
  updated_by   uuid default auth.uid(),
  updated_at   timestamptz not null default now()
);

alter table team_fee_line enable row level security;

create policy team_fee_line_select on team_fee_line
  for select using (app_has_role(club_id, array['admin', 'registrar', 'treasurer']));
create policy team_fee_line_manage on team_fee_line
  for all using (app_has_role(club_id, array['admin', 'treasurer']))
  with check (app_has_role(club_id, array['admin', 'treasurer']));

-- ------------------------------------------------------- registration_price
-- Written only by the functions below; read by the roles that price.
create table registration_price (
  club_id          uuid not null references club(id) on delete cascade,
  id               uuid primary key default gen_random_uuid(),
  registration_id  uuid not null references registration(id) on delete cascade,
  fee_line_id      uuid references fee_line(id) on delete set null,
  lines            jsonb not null check (jsonb_typeof(lines) = 'array'),
  sibling_index    integer not null check (sibling_index >= 0),
  discount_cents   integer not null check (discount_cents >= 0),
  total_cents      integer not null,
  reason           text not null check (reason in ('opened', 'repriced')),
  priced_by        uuid default auth.uid(),
  priced_at        timestamptz not null default now()
);

create index registration_price_by_registration on registration_price (registration_id, priced_at desc);

alter table registration_price enable row level security;

create policy registration_price_select on registration_price
  for select using (app_has_role(club_id, array['admin', 'registrar', 'treasurer']));

-- -------------------------------------------------- registration_breakdown
-- BR195 for one registration, or null when the club has no active line for
-- the season. Internal: it reads across policies, so only the functions
-- below call it.
create or replace function registration_breakdown(p_registration_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  r         registration%rowtype;
  v_year    integer;
  v_age     integer;
  v_line    fee_line%rowtype;
  v_gov     fee_line%rowtype;
  v_bps     integer;
  v_index   integer;
  v_lines   jsonb := '[]'::jsonb;
  v_gross   integer := 0;
  v_off     integer := 0;
  v_levy    record;
begin
  select * into r from registration where id = p_registration_id;
  if not found then
    return null;
  end if;
  if not exists (select 1 from fee_line
                  where club_id = r.club_id and season_id = r.season_id and retired_at is null) then
    return null;
  end if;

  select extract(year from s.starts_on)::integer into v_year from season s where s.id = r.season_id;
  select v_year - extract(year from p.date_of_birth)::integer into v_age from person p where p.id = r.person_id;

  -- 1. The line mapped to the player's team this season.
  select fl.* into v_line
    from team_member tm
    join team t on t.id = tm.team_id and t.season_id = r.season_id
    join team_fee_line tf on tf.team_id = t.id
    join fee_line fl on fl.id = tf.fee_line_id and fl.retired_at is null
   where tm.person_id = r.person_id and tm.role = 'player'
   order by fl.amount_cents, fl.name
   limit 1;

  -- 2 and 3. Else the cheapest standard line that fits the age, else the
  -- cheapest line that fits.
  if v_line.id is null then
    select * into v_line from fee_line
     where club_id = r.club_id and season_id = r.season_id and kind = 'club' and retired_at is null
       and (min_age is null or v_age >= min_age) and (max_age is null or v_age <= max_age)
     order by standard desc, amount_cents, name
     limit 1;
  end if;

  if v_line.id is not null then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('label', v_line.name, 'cents', v_line.amount_cents));
    v_gross := v_gross + v_line.amount_cents;
  end if;

  select * into v_gov from fee_line
   where club_id = r.club_id and season_id = r.season_id and kind = 'governing' and retired_at is null
     and (min_age is null or v_age >= min_age) and (max_age is null or v_age <= max_age)
   order by standard desc, amount_cents, name
   limit 1;
  if v_gov.id is not null then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('label', v_gov.name, 'cents', v_gov.amount_cents));
    v_gross := v_gross + v_gov.amount_cents;
  end if;

  for v_levy in
    select name, amount_cents from fee_line
     where club_id = r.club_id and season_id = r.season_id and kind = 'levy' and retired_at is null
       and (min_age is null or v_age >= min_age) and (max_age is null or v_age <= max_age)
     order by name
  loop
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('label', v_levy.name, 'cents', v_levy.amount_cents));
    v_gross := v_gross + v_levy.amount_cents;
  end loop;

  -- Siblings: players here this season sharing a guardian, opened earlier.
  select count(*) into v_index
    from registration o
   where o.club_id = r.club_id and o.season_id = r.season_id and o.id <> r.id
     and (o.created_at, o.id) < (r.created_at, r.id)
     and exists (
       select 1 from guardianship g1
         join guardianship g2 on g2.guardian_person_id = g1.guardian_person_id and g2.club_id = g1.club_id
        where g1.club_id = r.club_id and g1.person_id = r.person_id and g2.person_id = o.person_id
     );

  select coalesce((select sibling_discount_bps from fee_settings where club_id = r.club_id), 1500) into v_bps;
  if v_index > 0 and v_line.id is not null then
    v_off := round(v_line.amount_cents * v_bps / 10000.0)::integer;
  end if;

  return jsonb_build_object(
    'feeLineId', v_line.id,
    'lineName', v_line.name,
    'lines', v_lines,
    'siblingIndex', v_index,
    'discountCents', v_off,
    'totalCents', v_gross - v_off
  );
end
$$;

revoke execute on function registration_breakdown(uuid) from public, anon, authenticated;

-- ------------------------------------------- pricing a new registration
create or replace function price_new_registration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  b jsonb := registration_breakdown(new.id);
begin
  if b is null then
    return null; -- no schedule: the season's own fee stands
  end if;
  update registration set outstanding_amount_cents = (b->>'totalCents')::integer where id = new.id;
  insert into registration_price (club_id, registration_id, fee_line_id, lines, sibling_index, discount_cents, total_cents, reason, priced_by)
  values (new.club_id, new.id, nullif(b->>'feeLineId', '')::uuid, b->'lines', (b->>'siblingIndex')::integer,
          (b->>'discountCents')::integer, (b->>'totalCents')::integer, 'opened', auth.uid());
  return null;
end
$$;

revoke execute on function price_new_registration() from public, anon, authenticated;

create trigger registration_priced_from_the_schedule
  after insert on registration
  for each row execute function price_new_registration();

-- ------------------------------------ the season's registrations, re-priced
-- What each registration would owe under the schedule today, beside what it
-- owes now. A registration on a live payment plan is shown but never
-- changed: its plan's total is what the family agreed, so the treasurer
-- changes the plan. A cancelled plan does not count.
create or replace function app_preview_season_prices(p_club_id uuid, p_season_id uuid)
returns table (
  registration_id  uuid,
  person_name      text,
  status           text,
  has_plan         boolean,
  paid_cents       integer,
  owes_cents       integer,
  line_name        text,
  sibling_index    integer,
  total_cents      integer,
  would_owe_cents  integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not app_has_role(p_club_id, array['admin', 'treasurer']) then
    raise exception 'Only the club''s admin and treasurer can re-price registrations (BR196)'
      using errcode = '42501';
  end if;
  return query
    select r.id,
           btrim(coalesce(nullif(p.preferred_name, ''), p.legal_given_names) || ' ' || p.legal_family_name),
           r.status::text,
           exists (select 1 from payment_plan pp where pp.registration_id = r.id and pp.cancelled_at is null),
           coalesce((select sum(pm.amount_cents) from payment pm where pm.registration_id = r.id), 0)::integer,
           r.outstanding_amount_cents,
           b->>'lineName',
           (b->>'siblingIndex')::integer,
           (b->>'totalCents')::integer,
           (b->>'totalCents')::integer
             - coalesce((select sum(pm.amount_cents) from payment pm where pm.registration_id = r.id), 0)::integer
      from registration r
      join person p on p.id = r.person_id
      cross join lateral registration_breakdown(r.id) as b
     where r.club_id = p_club_id and r.season_id = p_season_id and b is not null
     order by r.created_at, r.id;
end
$$;

-- Applies the preview: each registration without a payment plan owes its
-- schedule price less what has been paid, and the pricing is kept. With
-- `p_include_complete` false a COMPLETE registration is left as it was, so a
-- club can price only those still open.
create or replace function app_reprice_season(p_club_id uuid, p_season_id uuid, p_include_complete boolean)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v record;
  n integer := 0;
begin
  if not app_has_role(p_club_id, array['admin', 'treasurer']) then
    raise exception 'Only the club''s admin and treasurer can re-price registrations (BR196)'
      using errcode = '42501';
  end if;
  for v in
    select r.id, r.club_id, r.outstanding_amount_cents, b,
           coalesce((select sum(pm.amount_cents) from payment pm where pm.registration_id = r.id), 0)::integer as paid
      from registration r
      cross join lateral registration_breakdown(r.id) as b
     where r.club_id = p_club_id and r.season_id = p_season_id and b is not null
       and not exists (select 1 from payment_plan pp where pp.registration_id = r.id and pp.cancelled_at is null)
       and (p_include_complete or r.status::text <> 'COMPLETE')
  loop
    if v.outstanding_amount_cents is distinct from (v.b->>'totalCents')::integer - v.paid then
      update registration set outstanding_amount_cents = (v.b->>'totalCents')::integer - v.paid where id = v.id;
      insert into registration_price (club_id, registration_id, fee_line_id, lines, sibling_index, discount_cents, total_cents, reason)
      values (v.club_id, v.id, nullif(v.b->>'feeLineId', '')::uuid, v.b->'lines', (v.b->>'siblingIndex')::integer,
              (v.b->>'discountCents')::integer, (v.b->>'totalCents')::integer, 'repriced');
      insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
      values (v.club_id, auth.uid(), 'registration_repriced', 'registration', v.id,
              jsonb_build_object('rule', 'BR195', 'fromCents', v.outstanding_amount_cents,
                                 'toCents', (v.b->>'totalCents')::integer - v.paid, 'totalCents', (v.b->>'totalCents')::integer));
      n := n + 1;
    end if;
  end loop;
  return n;
end
$$;

insert into schema_migration_log (version, name) values
  ('0100', '0100_a_registration_is_priced_from_the_schedule');
