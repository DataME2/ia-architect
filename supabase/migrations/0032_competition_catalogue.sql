-- 0032 — The catalogue that makes BR8 computable (scope 38).
--
-- Two columns in this schema are free text with a comment saying they
-- become references when C11 exists: `fixture.competition` and
-- `referee_classification.level`. This cashes both, and the payoff is one
-- rule. Read `src/domain/officiating/conflicts.ts` before this migration
-- and BR8 is there with an apology — "cannot be completed… no competition
-- record exists" — so a referee **below** a competition's minimum produced
-- nothing at all, because there was no minimum to be below.
--
-- **The catalogue is shared, not per-club**
-- ([decision 15](../../docs/decisions/15_the_competition_catalogue_is_shared_reference_data.md)).
-- Per-club copies would mean forty clubs re-keying one association's list
-- and — the part that settles it — the same competition carrying a
-- different minimum at each of them, so one fixture is eligible at one club
-- and refused at another because two registrars typed different numbers.
--
-- P5 is not weakened, structurally rather than by argument: these three
-- tables have **no column that could carry tenant data**. No person, no
-- club, no registration, no money. There is nothing in them to leak, which
-- is the same instinct as a public carnival fixture carrying no person_id.

-- ------------------------------------------------------------- association
-- The body that runs competitions. Football Queensland is the named
-- example; nothing here assumes one.

create table association (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (btrim(name) <> ''),
  -- Matches `club.jurisdiction`'s vocabulary so the two can be compared by
  -- a human reading them side by side. Not a foreign key: a jurisdiction is
  -- a label, not a row.
  jurisdiction text not null,
  created_at timestamptz not null default now()
);

create unique index association_name_idx on association (lower(name));

-- ------------------------------------------------------ classification_level
-- BR135. A rank is what makes BR8 a comparison rather than a string match,
-- and confining the comparison to one association is what stops a Football
-- Queensland Level 4 being read as equivalent to another body's Level 4 —
-- a guess wearing the clothes of a calculation.

create table classification_level (
  id             uuid primary key default gen_random_uuid(),
  association_id uuid not null references association(id) on delete cascade,
  name           text not null check (btrim(name) <> ''),

  -- Higher is more senior. A small integer a platform administrator sets,
  -- and **the one field in this catalogue where a typo changes an
  -- eligibility decision** — two levels sharing a rank compare as equal and
  -- nothing here detects that somebody meant them to differ.
  rank           integer not null check (rank >= 0),
  created_at     timestamptz not null default now()
);

create unique index classification_level_name_idx
  on classification_level (association_id, lower(name));

comment on column classification_level.rank is
  'BR135. Higher is more senior, and comparable only within one association.';

-- ------------------------------------------------------------- competition
-- Tier and playing format as free text beside the reference, for the same
-- reason `referee_classification.level` was free text: a check constraint
-- listing the formats somebody guessed would refuse the real ones.

create table competition (
  id             uuid primary key default gen_random_uuid(),
  association_id uuid not null references association(id) on delete cascade,
  name           text not null check (btrim(name) <> ''),
  season_year    integer check (season_year is null or season_year between 1900 and 2200),

  tier           text,
  playing_format text,

  -- BR8's minimum. Nullable: a competition with no stated minimum is an
  -- ordinary state, and BR8 then says there is nothing to compare rather
  -- than inventing a floor.
  minimum_classification_id uuid references classification_level(id) on delete set null,

  created_at     timestamptz not null default now()
);

create unique index competition_name_idx
  on competition (association_id, lower(name), coalesce(season_year, -1));

-- A minimum has to belong to the same association as the competition, or
-- BR135's confinement is a convention rather than a fact.
create or replace function enforce_minimum_within_association()
returns trigger
language plpgsql
as $$
begin
  if new.minimum_classification_id is not null
     and not exists (
       select 1 from classification_level cl
        where cl.id = new.minimum_classification_id
          and cl.association_id = new.association_id
     ) then
    raise exception
      'BR135: a competition''s minimum classification must belong to the same association';
  end if;
  return new;
end
$$;

create trigger competition_minimum_within_association
  before insert or update on competition
  for each row execute function enforce_minimum_within_association();

-- ---------------------------------------------------------- club_competition
-- Which competitions this club plays in. **Tenant-scoped like everything
-- else** — participation is the club's own business even though the
-- catalogue is not.

create table club_competition (
  id             uuid primary key default gen_random_uuid(),
  club_id        uuid not null references club(id) on delete cascade,
  season_id      uuid not null references season(id) on delete cascade,
  competition_id uuid not null references competition(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (club_id, season_id, competition_id)
);

-- ----------------------------------------------------- references on existing
-- Beside the free text, never instead of it. Rows recorded before the
-- catalogue existed stay readable exactly as the club entered them.

alter table fixture add column competition_id uuid references competition(id) on delete set null;
alter table referee_classification
  add column classification_level_id uuid references classification_level(id) on delete set null;

-- **No trigger refuses free text, and that is deliberate.**
--
-- The obvious enforcement — refuse an insert that sets `competition`
-- without `competition_id` — was written, and then removed after it broke
-- three existing suites and, more importantly, showed what it would do to a
-- real club. **The catalogue ships empty** (scope 38 makes that a decision,
-- not an accident: seeding a guessed pathway would refuse the real levels).
-- Until a platform administrator catalogues an association, a club that
-- refuses free text can record no competition at all — so "U12 Div 2"
-- becomes nothing rather than becoming a reference, and the club is worse
-- off than before this migration.
--
-- R27.2 is therefore enforced where it can be enforced without that cost:
-- the fixture form offers a selection and writes `competition_id` only. The
-- database keeps the column readable so history survives, and a club whose
-- association nobody has catalogued yet keeps working.
--
-- This becomes a trigger the day the catalogue is reliably populated, and
-- the scope document records that as the condition rather than as a
-- someday.

comment on column fixture.competition is
  'Free text, retained. Written by no current code path — the fixture form '
  'writes competition_id (0032) — and kept readable for rows recorded '
  'before the catalogue existed, and for a club whose association is not '
  'catalogued yet.';

-- ------------------------------------------------------------------ policies
-- RLS on, with a read policy that is `using (true)` for signed-in callers
-- rather than club-keyed — which is the whole of decision 15, expressed.
-- Writes belong to platform administration; every other role is refused by
-- the absence of a policy naming them.

alter table association          enable row level security;
alter table classification_level enable row level security;
alter table competition          enable row level security;
alter table club_competition     enable row level security;

create policy association_select on association
  for select to authenticated using (true);
create policy classification_level_select on classification_level
  for select to authenticated using (true);
create policy competition_select on competition
  for select to authenticated using (true);

create policy association_write on association
  for all using (app_is_platform()) with check (app_is_platform());
create policy classification_level_write on classification_level
  for all using (app_is_platform()) with check (app_is_platform());
create policy competition_write on competition
  for all using (app_is_platform()) with check (app_is_platform());

-- A club's participation is ordinary tenant data with an ordinary policy.
create policy club_competition_select on club_competition
  for select using (club_id in (select app_member_club_ids()));
create policy club_competition_write on club_competition
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));

-- ------------------------------------------------- app_competition_minimum
-- BR8's answer, for one fixture: the competition's minimum rank, or null
-- where there is nothing to compare against (#78 — a friendly has no
-- competition, and BR8 says so rather than inventing a floor).

create or replace function app_competition_minimum(p_fixture_id uuid)
returns table (association_id uuid, minimum_rank integer, minimum_name text)
language sql
stable
security definer
set search_path = public
as $$
  select c.association_id, cl.rank, cl.name
    from fixture f
    join competition c on c.id = f.competition_id
    left join classification_level cl on cl.id = c.minimum_classification_id
   where f.id = p_fixture_id
$$;

revoke all on function app_competition_minimum(uuid) from public;
grant execute on function app_competition_minimum(uuid) to authenticated;
