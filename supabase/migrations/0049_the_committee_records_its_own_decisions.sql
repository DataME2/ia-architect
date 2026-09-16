-- 0049 — The Committee records its own decisions (scope 57).
--
-- BR123 has been written since open question #59 was answered and had no
-- code: *the Committee records its own decisions — a dated resolution
-- naming what was decided, who moved it, and which Committee Term it
-- belongs to.* Nothing wrote one, and `committee` — the role Q59 answered
-- may now write something — could write nothing at all.
--
-- **BR21 was found unenforced while building this, and it is one of the
-- oldest rules in the project.** *A Voucher Program cannot be applied to a
-- club's invoices until the club's Committee approves it.* `registration_voucher.program`
-- has been free text since migration 0008 with no gate behind it at all —
-- any club officer could attach a voucher for any program string, approved
-- or not. `docs/ea/2_business/4_business-objects.md` has named the missing
-- mechanism the whole time: **Club Voucher Program Enablement**, "records
-- the Committee's approval and date; gates whether Finance Admin or
-- Treasurer can apply that program's Vouchers." `src/data/governance.ts`'s
-- own header says a registrar reads the governance screen to check this by
-- eye. BR21 was never a rule the database asked about; it was a rule a
-- human was trusted to have checked.
--
-- **One resolution mechanism, two callers.** `committee_resolution` is
-- general — the club's own list is wider than vouchers, per Q59: buying
-- goals, hiring or promoting a coach, funding a coaching licence, enabling
-- a voucher programme. `club_voucher_program_enablement` is the one
-- caller built here, because it is the one rule already written down and
-- waiting. A future decision that needs its own gate points at a
-- resolution the same way, rather than growing a second free-text column
-- somewhere else that also means "the Committee said yes."

-- ---------------------------------------------------- committee_resolution

create table committee_resolution (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references club(id) on delete cascade,
  -- BR123: which Committee Term this belongs to. A resolution moved by a
  -- committee whose term has lapsed (BR86) is still recorded against that
  -- term — the record is a fact about when the decision was made, not a
  -- claim about whether the mandate was current.
  term_id            uuid not null references committee_term(id) on delete cascade,

  decided_on         date not null,
  summary            text not null check (btrim(summary) <> ''),

  -- The office-bearer who moved it, where the club names one. Nullable:
  -- some clubs' minutes record "the Committee resolved" without naming a
  -- mover, and refusing to record the resolution at all over a name nobody
  -- wrote down would be the BR56 failure the other direction — invented
  -- precision standing in for a real gap.
  moved_by_person_id uuid references person(id),

  -- What kind of decision this is, so a caller like the voucher gate can
  -- find "the resolution that enables this" without parsing free text.
  -- 'general' is every decision Q59's own list names that has no caller
  -- yet — buying goals, hiring a coach — recorded because BR123 asks for
  -- it, not because anything reads it back.
  category           text not null default 'general'
    check (category in ('general', 'voucher_program')),

  created_by         uuid,
  created_at         timestamptz not null default now(),

  foreign key (club_id, moved_by_person_id) references person (club_id, id)
);

create index committee_resolution_club_idx on committee_resolution (club_id, decided_on desc);

-- committee_term carries no unique key on (club_id, id) — committee_position
-- (0011) faces the same shape and settles it the same way: a plain foreign
-- key on term_id, with the club match enforced by a trigger rather than a
-- composite key, so a resolution cannot be filed against another club's term.
create or replace function assert_resolution_term_is_same_club()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from committee_term where id = new.term_id and club_id = new.club_id
  ) then
    raise exception 'that Committee Term does not belong to this club'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger resolution_term_is_same_club
  before insert or update on committee_resolution
  for each row execute function assert_resolution_term_is_same_club();

alter table committee_resolution enable row level security;

-- Committee resolutions are club information, the same footing BR21 and
-- 0011 already give committee_term and committee_position: any member
-- reads them, because a registrar checking whether a program was approved
-- is exactly who this exists for.
create policy committee_resolution_select on committee_resolution
  for select using (club_id in (select app_member_club_ids()));

-- **Q59's answer, made real.** Until now `committee` could write nothing at
-- all — the role existed on `club_membership` and named no policy anywhere
-- ([scope 29](../../docs/scope/29_actors-access-and-permissions.md)'s
-- finding). This is the first thing it may write. `admin` keeps the
-- ordinary escape hatch every governance table here has, for the club with
-- no separate committee account.
create policy committee_resolution_record on committee_resolution
  for insert with check (app_has_role(club_id, array['admin', 'committee']));

-- **No update or delete policy, deliberately** — the same absence that
-- makes `payment` and `audit_event` append-only. A resolution corrected
-- after the fact is a new resolution recording the correction, not an old
-- one rewritten to read as if it had always said that.

comment on table committee_resolution is
  'BR123. A dated resolution naming what the Committee decided, who moved '
  'it, and which Committee Term it belongs to. Append-only, by the absence '
  'of an update or delete policy — a corrected decision is a new '
  'resolution, not an old one rewritten.';

-- ------------------------------------------- club_voucher_program_enablement
--
-- BR21, for the first time. `program` is compared the way `rateFor`
-- compares a competition (scope 34) — trimmed and case-insensitive —
-- because it is the same free-text problem: a club typing "Play On!" once
-- and "play on" the next time has not named two programs.

create table club_voucher_program_enablement (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references club(id) on delete cascade,
  program       text not null check (btrim(program) <> ''),
  resolution_id uuid not null,
  enabled_at    timestamptz not null default now(),

  unique (club_id, program),
  foreign key (resolution_id) references committee_resolution (id)
);

alter table club_voucher_program_enablement enable row level security;

create policy club_voucher_program_enablement_select on club_voucher_program_enablement
  for select using (club_id in (select app_member_club_ids()));

-- Enabling a program is itself a Committee decision (BR21), so it is
-- gated the same way recording one is: admin or committee.
create policy club_voucher_program_enablement_manage on club_voucher_program_enablement
  for all using (app_has_role(club_id, array['admin', 'committee']))
  with check (app_has_role(club_id, array['admin', 'committee']));

-- committee_resolution carries no unique key on (club_id, id) either (the
-- same shape as committee_term above), so this trigger checks both things a
-- composite key would have: the resolution belongs to this same club, and
-- it is actually about this (category matches) — an enablement must not be
-- able to point at another club's decision, or at an unrelated one of its
-- own, just because a row with that id happens to exist.
create or replace function assert_enablement_cites_a_voucher_resolution()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_club_id uuid;
  v_category text;
begin
  select club_id, category into v_club_id, v_category
    from committee_resolution where id = new.resolution_id;

  if v_club_id is distinct from new.club_id then
    raise exception 'that resolution does not belong to this club'
      using errcode = '23514';
  end if;

  if v_category is distinct from 'voucher_program' then
    raise exception
      'that resolution is not recorded as a voucher-program decision (BR21) -- '
      'record the resolution with category ''voucher_program'' first'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger enablement_cites_a_voucher_resolution
  before insert or update on club_voucher_program_enablement
  for each row execute function assert_enablement_cites_a_voucher_resolution();

comment on table club_voucher_program_enablement is
  'BR21. A club''s decision to accept a Voucher Program for its own '
  'invoices, naming the committee_resolution that approved it. Gates '
  'registration_voucher: no enablement, no voucher attached under that '
  'program.';

-- --------------------------------------------- the gate on registration_voucher
--
-- BR21 itself. Found unenforced while this migration was being written:
-- `registration_voucher.program` has taken any string since 0008, and
-- nothing has ever asked whether the Committee approved it.

create or replace function assert_voucher_program_is_enabled()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from club_voucher_program_enablement
     where club_id = new.club_id
       and btrim(lower(program)) = btrim(lower(new.program))
  ) then
    raise exception
      'this club''s Committee has not approved "%" as a Voucher Program (BR21) -- '
      'record a resolution and enable it first', new.program
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger voucher_program_is_enabled
  before insert on registration_voucher
  for each row execute function assert_voucher_program_is_enabled();

comment on function assert_voucher_program_is_enabled() is
  'BR21. Unenforced since migration 0008 — any club officer could attach '
  'a voucher for any program string. Now requires a matching, Committee-'
  'approved club_voucher_program_enablement row for this club.';
