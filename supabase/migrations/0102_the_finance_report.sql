-- 0102 — The finance report (scope 133; C8, BR142, BR143, BR199).
--
-- Every season a club holds, imported or live, read the same way: what it
-- billed, collected and left outstanding, what the bills were made of,
-- when they went out, and which teams they belong to. Then the bills
-- themselves, for the people who handle a family's money.
--
-- **One shape for both kinds of season.** An imported season's bills are
-- its `historical_invoice` rows and their lines (0101). A live season has
-- no invoice: each registration is its bill, priced by its latest
-- `registration_price` (0100), paid by its `payment` rows and owing its
-- balance. `finance_bills` and `finance_bill_lines` put both into one shape,
-- so the report and the list cannot disagree about what a season billed.
--
-- **A team's share of a family's bill (BR199).** A bill can cover siblings
-- in different teams, so it is split by its lines: each line goes to the
-- team of the player it names, and the bill's payments and balance follow
-- in the same proportion. A line naming nobody, or a player in no team,
-- goes to "No team". Nothing is counted twice.
--
-- **Who reads it.** The season figures are aggregates, read by the admin,
-- treasurer and committee, as app_finance_summary already is (#84). The
-- bills name families and what each owes, so they are read by the admin and
-- treasurer only (BR78). Each check is explicit, and a refusal says so
-- rather than returning nothing (BR142).

-- --------------------------------------------------------- internal shapes
-- Internal: each reads across policies, so only the two functions at the
-- end call them.
create or replace function finance_bills(p_club_id uuid)
returns table (
  season_id        uuid,
  bill_id          uuid,
  imported         boolean,
  reference        text,
  billed_on        date,
  payer_person_id  uuid,
  invoiced_cents   bigint,
  paid_cents       bigint,
  outstanding_cents bigint,
  credit_cents     bigint,
  payments         integer,
  last_paid_on     date
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select h.season_id, h.id, true, h.reference, h.invoiced_on, h.payer_person_id,
         h.invoice_cents::bigint, h.paid_cents::bigint, greatest(h.outstanding_cents, 0)::bigint, h.credit_cents::bigint,
         h.payments, h.last_paid_on
    from historical_invoice h
   where h.club_id = p_club_id
  union all
  select r.season_id, r.id, false, null::text, r.created_at::date,
         coalesce((select g.guardian_person_id from guardianship g
                    where g.person_id = r.person_id and g.is_authority
                    order by g.guardian_person_id limit 1), r.person_id),
         coalesce(lp.total_cents, coalesce(pd.cents, 0) + greatest(r.outstanding_amount_cents, 0))::bigint,
         coalesce(pd.cents, 0)::bigint, greatest(r.outstanding_amount_cents, 0)::bigint,
         greatest(-r.outstanding_amount_cents, 0)::bigint,
         coalesce(pd.n, 0), pd.last_on
    from registration r
    left join lateral (select rp.total_cents from registration_price rp
                        where rp.registration_id = r.id order by rp.priced_at desc limit 1) lp on true
    left join lateral (select sum(pm.amount_cents)::bigint as cents, count(*)::integer as n, max(pm.received_on) as last_on
                         from payment pm where pm.registration_id = r.id) pd on true
   where r.club_id = p_club_id and r.imported_from is null
$$;

create or replace function finance_bill_lines(p_club_id uuid)
returns table (
  season_id        uuid,
  bill_id          uuid,
  registration_id  uuid,
  category         text,
  description      text,
  cents            bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Imported: the invoice's own lines.
  select h.season_id, l.invoice_id, l.registration_id, l.category, l.description, l.amount_cents::bigint
    from historical_invoice_line l
    join historical_invoice h on h.id = l.invoice_id
   where l.club_id = p_club_id
  union all
  -- Live: the latest pricing's lines, each the kind of the fee line it names.
  select r.season_id, r.id, r.id,
         coalesce((select f.kind from fee_line f
                    where f.club_id = r.club_id and f.season_id = r.season_id and f.name = e->>'label'
                    order by f.retired_at nulls first limit 1), 'adjustment'),
         e->>'label', (e->>'cents')::bigint
    from registration r
    join lateral (select rp.lines, rp.discount_cents from registration_price rp
                   where rp.registration_id = r.id order by rp.priced_at desc limit 1) lp on true
    cross join lateral jsonb_array_elements(lp.lines) e
   where r.club_id = p_club_id and r.imported_from is null
  union all
  select r.season_id, r.id, r.id, 'discount', 'Sibling discount', -rp.discount_cents::bigint
    from registration r
    join lateral (select rp.discount_cents from registration_price rp
                   where rp.registration_id = r.id order by rp.priced_at desc limit 1) rp on true
   where r.club_id = p_club_id and r.imported_from is null and rp.discount_cents > 0
  union all
  -- Live with no schedule: the season's single fee, one club line.
  select b.season_id, b.bill_id, b.bill_id, 'club', 'Registration fee', b.invoiced_cents
    from finance_bills(p_club_id) b
   where not b.imported
     and not exists (select 1 from registration_price rp where rp.registration_id = b.bill_id)
$$;

-- Each registration's team that season: the first by name, when a player is
-- in more than one, so a line is never given to two teams.
create or replace function finance_registration_team(p_club_id uuid)
returns table (registration_id uuid, season_id uuid, team text, category text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct on (r.id) r.id, r.season_id, t.name, t.category
    from registration r
    join team_member tm on tm.person_id = r.person_id and tm.role = 'player' and tm.withdrawn_at is null
    join team t on t.id = tm.team_id and t.season_id = r.season_id
   where r.club_id = p_club_id
   order by r.id, t.name
$$;

revoke execute on function finance_bills(uuid) from public, anon, authenticated;
revoke execute on function finance_bill_lines(uuid) from public, anon, authenticated;
revoke execute on function finance_registration_team(uuid) from public, anon, authenticated;

-- ------------------------------------------------------- app_finance_report
create or replace function app_finance_report(p_club_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb;
begin
  if not app_has_role(p_club_id, array['admin', 'treasurer', 'committee']) then
    raise exception 'The finance report is read by the club''s admin, treasurer and committee (BR142)'
      using errcode = '42501';
  end if;

  with bill as (select * from finance_bills(p_club_id)),
  line as (select * from finance_bill_lines(p_club_id)),
  reg_team as (select * from finance_registration_team(p_club_id)),
  bill_total as (select bill_id, sum(cents) as total from line group by bill_id),
  team_line as (
    select l.season_id, coalesce(rt.team, 'No team') as team, rt.category, l.cents,
           case when bt.total = 0 then 0 else b.paid_cents::numeric * l.cents / bt.total end as paid_share,
           case when bt.total = 0 then 0 else b.outstanding_cents::numeric * l.cents / bt.total end as owed_share
      from line l
      join bill b on b.bill_id = l.bill_id
      join bill_total bt on bt.bill_id = l.bill_id
      left join reg_team rt on rt.registration_id = l.registration_id
  ),
  team_money as (
    select season_id, team, max(category) as category, sum(cents) as invoiced,
           round(sum(paid_share)) as collected, round(sum(owed_share)) as outstanding
      from team_line group by season_id, team
  ),
  team_players as (
    select season_id, team, count(*) as players from reg_team group by season_id, team
  ),
  teams as (
    select coalesce(m.season_id, p.season_id) as season_id, coalesce(m.team, p.team) as team, m.category,
           coalesce(p.players, 0) as players, coalesce(m.invoiced, 0) as invoiced,
           coalesce(m.collected, 0) as collected, coalesce(m.outstanding, 0) as outstanding
      from team_money m full join team_players p on p.season_id = m.season_id and p.team = m.team
  ),
  totals as (
    select season_id, sum(invoiced_cents) as invoiced, sum(paid_cents) as collected,
           sum(outstanding_cents) as outstanding, sum(credit_cents) as credits,
           count(*) as bills, count(*) filter (where outstanding_cents > 0) as owing
      from bill group by season_id
  ),
  comps as (select season_id, category, sum(cents) as cents from line group by season_id, category),
  months as (
    select season_id, to_char(date_trunc('month', billed_on), 'YYYY-MM') as month,
           sum(invoiced_cents) as cents, count(*) as n
      from bill group by season_id, 2
  )
  select jsonb_build_object(
    'computedAt', now(),
    'seasons', coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'startsOn', s.starts_on, 'endsOn', s.ends_on,
      'imported', exists (select 1 from historical_import h where h.season_id = s.id),
      'invoiced', coalesce(t.invoiced, 0), 'collected', coalesce(t.collected, 0),
      'outstanding', coalesce(t.outstanding, 0), 'credits', coalesce(t.credits, 0),
      'bills', coalesce(t.bills, 0), 'owing', coalesce(t.owing, 0),
      'components', coalesce((select jsonb_object_agg(c.category, c.cents) from comps c where c.season_id = s.id), '{}'),
      'months', coalesce((select jsonb_agg(jsonb_build_object('month', m.month, 'cents', m.cents, 'count', m.n) order by m.month)
                            from months m where m.season_id = s.id), '[]'),
      'teams', coalesce((select jsonb_agg(jsonb_build_object('team', tm.team, 'category', tm.category, 'players', tm.players,
                                                              'invoiced', tm.invoiced, 'collected', tm.collected,
                                                              'outstanding', tm.outstanding) order by tm.team)
                            from teams tm where tm.season_id = s.id), '[]')
    ) order by s.starts_on), '[]'))
    into v
    from season s
    left join totals t on t.season_id = s.id
   where s.club_id = p_club_id;

  return v;
end
$$;

-- -------------------------------------------------------- app_finance_bills
-- One page of a season's bills, the largest balance first, each with its
-- family, players, teams and lines. A team narrows it to the bills with a
-- line for that team; `p_owing` to those with a balance; `p_search` to a
-- reference, family or player.
create or replace function app_finance_bills(
  p_club_id  uuid,
  p_season_id uuid,
  p_team     text default null,
  p_owing    boolean default false,
  p_search   text default null,
  p_limit    integer default 25,
  p_offset   integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v jsonb;
  v_search text := nullif(lower(btrim(coalesce(p_search, ''))), '');
begin
  if not app_has_role(p_club_id, array['admin', 'treasurer']) then
    raise exception 'A family''s bills are read by the club''s admin and treasurer (BR142, BR78)'
      using errcode = '42501';
  end if;

  with bill as (select * from finance_bills(p_club_id) b where b.season_id = p_season_id),
  line as (select * from finance_bill_lines(p_club_id) l where l.season_id = p_season_id),
  reg_team as (select * from finance_registration_team(p_club_id) r where r.season_id = p_season_id),
  named as (
    select l.bill_id, l.registration_id, l.category, l.description, l.cents,
           coalesce(rt.team, 'No team') as team,
           btrim(coalesce(nullif(p.preferred_name, ''), p.legal_given_names) || ' ' || p.legal_family_name) as player
      from line l
      left join reg_team rt on rt.registration_id = l.registration_id
      left join registration r on r.id = l.registration_id
      left join person p on p.id = r.person_id
  ),
  picked as (
    select b.*, btrim(coalesce(nullif(py.preferred_name, ''), py.legal_given_names) || ' ' || py.legal_family_name) as payer
      from bill b
      left join person py on py.id = b.payer_person_id
     where (not p_owing or b.outstanding_cents > 0)
       and (p_team is null or exists (select 1 from named n where n.bill_id = b.bill_id and n.team = p_team))
       and (v_search is null
            or lower(coalesce(b.reference, '')) like '%' || v_search || '%'
            or lower(coalesce(py.legal_given_names || ' ' || py.legal_family_name, '')) like '%' || v_search || '%'
            or exists (select 1 from named n where n.bill_id = b.bill_id and lower(coalesce(n.player, '')) like '%' || v_search || '%'))
  )
  select jsonb_build_object(
    'total', (select count(*) from picked),
    'rows', coalesce((
      select jsonb_agg(item order by ord)
        from (select row_number() over (order by pk.outstanding_cents desc, pk.billed_on, pk.reference) as ord,
                     jsonb_build_object(
                       'id', pk.bill_id, 'imported', pk.imported, 'reference', pk.reference, 'billedOn', pk.billed_on,
                       'payer', pk.payer, 'invoiced', pk.invoiced_cents, 'paid', pk.paid_cents,
                       'outstanding', pk.outstanding_cents, 'credits', pk.credit_cents,
                       'payments', pk.payments, 'lastPaidOn', pk.last_paid_on,
                       'players', coalesce((select jsonb_agg(distinct jsonb_build_object('name', n.player, 'team', n.team))
                                              from named n where n.bill_id = pk.bill_id and n.player is not null), '[]'),
                       'lines', coalesce((select jsonb_agg(jsonb_build_object('category', n.category, 'description', n.description,
                                                                               'cents', n.cents, 'player', n.player)
                                                           order by n.cents desc)
                                            from named n where n.bill_id = pk.bill_id), '[]')
                     ) as item
                from picked pk
               order by pk.outstanding_cents desc, pk.billed_on, pk.reference
               limit greatest(least(p_limit, 100), 1) offset greatest(p_offset, 0)) x), '[]'))
    into v;

  return v;
end
$$;

revoke execute on function app_finance_report(uuid) from public, anon;
revoke execute on function app_finance_bills(uuid, uuid, text, boolean, text, integer, integer) from public, anon;

insert into schema_migration_log (version, name) values
  ('0102', '0102_the_finance_report');
