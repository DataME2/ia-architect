-- 0101 — A club's history is imported (scope 132; C9, BR90, BR197, BR198).
--
-- The pilot club's Majestri exports carry what the platform had no place
-- for: a player's gender and Football Australia number, a family's mobile,
-- an emergency contact, the playing group a family asked for, and a team's
-- category. This gives each a column, and gives the club's past seasons a
-- way in that cannot be mistaken for work.
--
-- **BR90, built: an imported registration is history.** It arrives
-- COMPLETE and owing nothing, so it is in no queue, no pack and no chase,
-- and counts toward no eligibility. Nothing may change its status or
-- balance afterwards, and only an import may mark a registration as
-- imported. It is never priced or re-priced from the schedule. What the
-- family was invoiced and paid is kept beside it, in `historical_invoice`,
-- as the club's record of that season rather than as a debt to collect.
--
-- **BR197: who an imported row is.** Matched to a Person already in the
-- club, in this order, and otherwise created:
--   1. a player with the same FFA number and birth date;
--   2. anyone with the same email and the same first and family names
--      (a guardian's birth date is unknown, an adult player's must agree);
--   3. a child with the same names and birth date who already shares a
--      guardian with this one.
-- Anything weaker, a name and a birth date alone, creates a new Person and
-- is left for the duplicates screen to raise (BR5). A match only fills what
-- the Person lacks; it never overwrites what the club already holds.
--
-- `import_history_season` is run by the platform owner with the database
-- role, never by a club user (scope 132's annex), one season at a time.

-- --------------------------------------------------------- the new columns
alter table person
  add column gender text check (gender in ('female', 'male', 'non-binary', 'not-stated')),
  add column ffa_number text check (ffa_number ~ '^[0-9]{4,12}$'),
  add column mobile text check (mobile ~ '^\+?[0-9]{8,15}$');

create index person_by_ffa_number on person (club_id, ffa_number) where ffa_number is not null;

alter table team
  add column category text check (length(btrim(category)) between 1 and 100);

-- --------------------------------------------------------- historical_import
-- One row per season imported: what it came from, whether it was masked
-- (BR198), and when. Written only by import_history_season.
create table historical_import (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references club(id) on delete cascade,
  season_id    uuid not null references season(id) on delete cascade,
  source       text not null check (length(btrim(source)) between 1 and 2000),
  masked       boolean not null,
  rows_read    integer not null check (rows_read >= 0),
  imported_at  timestamptz not null default now(),
  unique (club_id, season_id)
);

alter table historical_import enable row level security;

create policy historical_import_select on historical_import
  for select using (app_has_role(club_id, array['admin', 'registrar', 'treasurer']));

alter table registration
  add column playing_group text check (length(btrim(playing_group)) between 1 and 200),
  add column imported_from uuid references historical_import(id) on delete restrict;

-- 0070 made registration readable column by column; the new two join them.
grant select (playing_group, imported_from) on registration to authenticated;

-- ------------------------------------------------- BR90: history stays put
create or replace function assert_imported_history_is_history()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.imported_from is not null
     and (tg_op = 'INSERT' or old.imported_from is null)
     and coalesce(current_setting('app.importing_history', true), '') <> 'on' then
    raise exception 'Only an import marks a registration as history (BR90)' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.imported_from is not null
     and (new.status, new.outstanding_amount_cents, new.season_id, new.imported_from)
         is distinct from (old.status, old.outstanding_amount_cents, old.season_id, old.imported_from) then
    raise exception 'An imported registration is history and does not change (BR90)' using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger registration_imported_is_history
  before insert or update on registration
  for each row execute function assert_imported_history_is_history();

-- 0100's three, each now passing history by. Unchanged otherwise.
create or replace function price_new_registration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  b jsonb;
begin
  if new.imported_from is not null then
    return null; -- BR90: history is never priced
  end if;
  b := registration_breakdown(new.id);
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
       and r.imported_from is null
     order by r.created_at, r.id;
end
$$;

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
       and r.imported_from is null
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

-- --------------------------------------------------------- emergency_contact
-- Who to call about a person, as the family last gave it. Read and kept by
-- the admin and registrar; an import brings only the current season's.
create table emergency_contact (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references club(id) on delete cascade,
  person_id    uuid not null references person(id) on delete cascade,
  full_name    text not null check (length(btrim(full_name)) between 1 and 200),
  mobile       text not null check (mobile ~ '^\+?[0-9]{8,15}$'),
  email        text check (email ~ '^[^@\s]+@[^@\s]+$'),
  recorded_at  timestamptz not null default now()
);

create index emergency_contact_by_person on emergency_contact (person_id, recorded_at desc);

alter table emergency_contact enable row level security;

create policy emergency_contact_select on emergency_contact
  for select using (app_has_role(club_id, array['admin', 'registrar']));
create policy emergency_contact_manage on emergency_contact
  for all using (app_has_role(club_id, array['admin', 'registrar']))
  with check (app_has_role(club_id, array['admin', 'registrar']));

-- -------------------------------------------- historical_invoice and lines
-- What a season invoiced, collected and left outstanding, as the incumbent
-- recorded it. A record of the past, not a debt: nothing chases it (BR90).
create table historical_invoice (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references club(id) on delete cascade,
  import_id          uuid not null references historical_import(id) on delete cascade,
  season_id          uuid not null references season(id) on delete cascade,
  reference          text not null check (length(btrim(reference)) between 1 and 100),
  invoiced_on        date not null,
  payer_person_id    uuid references person(id) on delete set null,
  invoice_cents      integer not null,
  paid_cents         integer not null,
  credit_cents       integer not null default 0,
  outstanding_cents  integer not null,
  payments           integer not null default 0 check (payments >= 0),
  last_paid_on       date,
  unique (import_id, reference)
);

create index historical_invoice_by_season on historical_invoice (club_id, season_id);

create table historical_invoice_line (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references club(id) on delete cascade,
  invoice_id       uuid not null references historical_invoice(id) on delete cascade,
  registration_id  uuid references registration(id) on delete set null,
  category         text not null check (category in ('club', 'governing', 'levy', 'discount', 'adjustment')),
  description      text not null check (length(btrim(description)) between 1 and 500),
  amount_cents     integer not null
);

create index historical_invoice_line_by_invoice on historical_invoice_line (invoice_id);

alter table historical_invoice enable row level security;
alter table historical_invoice_line enable row level security;

create policy historical_invoice_select on historical_invoice
  for select using (app_has_role(club_id, array['admin', 'registrar', 'treasurer']));
create policy historical_invoice_line_select on historical_invoice_line
  for select using (app_has_role(club_id, array['admin', 'registrar', 'treasurer']));

-- ------------------------------------------------------ import_history_season
-- One season of a club's history, from the batch scripts/import_history.py
-- stages. All or nothing; a season is imported once.
create or replace function import_history_season(p_club_id uuid, p_batch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_season   uuid;
  v_import   uuid;
  v_ids      jsonb := '{}';  -- the batch's person key -> person id
  v_regs     jsonb := '{}';  -- the batch's person key -> registration id
  v_teams    jsonb := '{}';  -- team name -> team id
  v_id       uuid;
  v_dob      date;
  v_invoice  uuid;
  p          jsonb;
  n_matched  integer := 0;
  n_created  integer := 0;
  n_regs     integer := 0;
  n_skipped  integer := 0;
begin
  if not exists (select 1 from club where id = p_club_id) then
    raise exception 'No club %', p_club_id;
  end if;
  perform set_config('app.importing_history', 'on', true);

  select id into v_season from season where club_id = p_club_id and name = p_batch#>>'{season,name}';
  if v_season is null then
    insert into season (club_id, name, starts_on, ends_on)
    values (p_club_id, p_batch#>>'{season,name}', (p_batch#>>'{season,startsOn}')::date, (p_batch#>>'{season,endsOn}')::date)
    returning id into v_season;
  end if;
  if exists (select 1 from historical_import where club_id = p_club_id and season_id = v_season) then
    raise exception 'Season % is already imported for this club', p_batch#>>'{season,name}';
  end if;
  insert into historical_import (club_id, season_id, source, masked, rows_read)
  values (p_club_id, v_season, p_batch->>'source', (p_batch->>'masked')::boolean, (p_batch->>'rowsRead')::integer)
  returning id into v_import;

  -- People. Guardians first, so a child can be known by who brings them.
  for p in select value from jsonb_array_elements(p_batch->'people') order by value->>'kind' = 'player'
  loop
    v_id := null;
    v_dob := (p->>'dob')::date;
    if p->>'kind' = 'player' and p->>'ffa' is not null then
      select id into v_id from person
       where club_id = p_club_id and merged_into_person_id is null
         and ffa_number = p->>'ffa' and date_of_birth = v_dob
       order by created_at limit 1;
    end if;
    if v_id is null and p->>'email' is not null then
      select id into v_id from person
       where club_id = p_club_id and merged_into_person_id is null
         and lower(btrim(email)) = p->>'email'
         and split_part(lower(btrim(legal_given_names)), ' ', 1) = split_part(lower(p->>'given'), ' ', 1)
         and lower(btrim(legal_family_name)) = lower(p->>'family')
         and (v_dob is null or date_of_birth in (v_dob, date '1900-01-01'))
       order by created_at limit 1;
    end if;
    if v_id is null and p->>'guardian' is not null then
      select c.id into v_id from person c
        join guardianship g on g.person_id = c.id and g.guardian_person_id = (v_ids->>(p->>'guardian'))::uuid
       where c.club_id = p_club_id and c.merged_into_person_id is null and c.date_of_birth = v_dob
         and split_part(lower(btrim(c.legal_given_names)), ' ', 1) = split_part(lower(p->>'given'), ' ', 1)
         and lower(btrim(c.legal_family_name)) = lower(p->>'family')
       order by c.created_at limit 1;
    end if;

    if v_id is null then
      insert into person (club_id, legal_given_names, legal_family_name, date_of_birth, email, gender, ffa_number, mobile)
      values (p_club_id, p->>'given', p->>'family', coalesce(v_dob, date '1900-01-01'),
              p->>'email', p->>'gender', p->>'ffa', p->>'mobile')
      returning id into v_id;
      n_created := n_created + 1;
    else
      update person
         set date_of_birth = case when date_of_birth = date '1900-01-01' and v_dob is not null then v_dob else date_of_birth end,
             email      = coalesce(email, p->>'email'),
             gender     = coalesce(gender, p->>'gender'),
             ffa_number = coalesce(ffa_number, p->>'ffa'),
             mobile     = coalesce(mobile, p->>'mobile')
       where id = v_id;
      n_matched := n_matched + 1;
    end if;
    v_ids := v_ids || jsonb_build_object(p->>'key', v_id);

    insert into person_role (club_id, person_id, season_id, role)
    values (p_club_id, v_id, v_season, p->>'kind')
    on conflict do nothing;
    if p->>'guardian' is not null then
      insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact)
      values (p_club_id, v_id, (v_ids->>(p->>'guardian'))::uuid, true, true)
      on conflict do nothing;
    end if;
  end loop;

  -- Registrations: COMPLETE, owing nothing, imported (BR90). A Person who
  -- already holds this season's registration keeps theirs.
  for p in select value from jsonb_array_elements(p_batch->'registrations')
  loop
    insert into registration (club_id, person_id, season_id, status, outstanding_amount_cents, created_at,
                              playing_group, imported_from)
    values (p_club_id, (v_ids->>(p->>'person'))::uuid, v_season, 'COMPLETE', 0,
            coalesce((p->>'registeredAt')::timestamptz, (p_batch#>>'{season,startsOn}')::timestamptz),
            p->>'playingGroup', v_import)
    on conflict (person_id, season_id) do nothing
    returning id into v_id;
    if v_id is null then
      n_skipped := n_skipped + 1;
    else
      v_regs := v_regs || jsonb_build_object(p->>'person', v_id);
      n_regs := n_regs + 1;
    end if;
  end loop;

  insert into emergency_contact (club_id, person_id, full_name, mobile, email)
  select p_club_id, (v_ids->>(c->>'person'))::uuid, c->>'name', c->>'mobile', c->>'email'
    from jsonb_array_elements(p_batch->'emergencyContacts') c;

  -- Teams and their players. Officials are not imported: a coach needs a
  -- clearance the export cannot show (BR10).
  for p in select value from jsonb_array_elements(p_batch->'teams')
  loop
    insert into team (club_id, season_id, name, age_group, category)
    values (p_club_id, v_season, p->>'name', p->>'ageGroup', p->>'category')
    on conflict (club_id, season_id, name) do update set category = coalesce(team.category, excluded.category)
    returning id into v_id;
    v_teams := v_teams || jsonb_build_object(p->>'name', v_id);
  end loop;
  insert into team_member (club_id, team_id, person_id, role)
  select p_club_id, (v_teams->>(m->>'team'))::uuid, (v_ids->>(m->>'person'))::uuid, 'player'
    from jsonb_array_elements(p_batch->'teamMembers') m
  on conflict do nothing;

  for p in select value from jsonb_array_elements(p_batch->'invoices')
  loop
    insert into historical_invoice (club_id, import_id, season_id, reference, invoiced_on, payer_person_id,
                                    invoice_cents, paid_cents, credit_cents, outstanding_cents, payments, last_paid_on)
    values (p_club_id, v_import, v_season, p->>'reference', (p->>'invoicedOn')::date, (v_ids->>(p->>'payer'))::uuid,
            (p->>'invoiceCents')::integer, (p->>'paidCents')::integer, (p->>'creditCents')::integer,
            (p->>'outstandingCents')::integer, (p->>'payments')::integer, (p->>'lastPaidOn')::date)
    returning id into v_invoice;
    insert into historical_invoice_line (club_id, invoice_id, registration_id, category, description, amount_cents)
    select p_club_id, v_invoice, (v_regs->>(l->>'registration'))::uuid, l->>'category', l->>'description',
           (l->>'cents')::integer
      from jsonb_array_elements(p->'lines') l;
  end loop;

  perform set_config('app.importing_history', '', true);
  return jsonb_build_object(
    'season', p_batch#>>'{season,name}', 'import', v_import,
    'peopleMatched', n_matched, 'peopleCreated', n_created,
    'registrations', n_regs, 'alreadyRegistered', n_skipped,
    'teams', jsonb_array_length(p_batch->'teams'),
    'invoices', jsonb_array_length(p_batch->'invoices'));
end
$$;

revoke execute on function import_history_season(uuid, jsonb) from public, anon, authenticated;
revoke execute on function assert_imported_history_is_history() from public, anon, authenticated;

insert into schema_migration_log (version, name) values
  ('0101', '0101_a_clubs_history_is_imported');
