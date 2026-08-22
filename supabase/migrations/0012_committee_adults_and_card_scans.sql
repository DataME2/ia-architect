-- A committee is adults, and a clearance can carry its card.
--
--   BR87  a Committee Position may only be held by an **adult**. A MiniRoos
--         player cannot govern the club; their parent can, and so can a
--         life member. Enforced in the database, because unlike a card this
--         does not depend on paperwork arriving -- it is true or it is not.
--
--   BR88  Committee and subcommittee members require a Working with
--         Children Check, and **not holding one does not block the
--         appointment**. See below: this is the one child-facing role where
--         the gap is surfaced rather than enforced, and the reason is the
--         club's own instruction.
--
-- Also adds the scan. A card number typed from a photograph is a
-- transcription; the photograph is the evidence, and BR19's verification is
-- a person saying they looked at something.

-- ---------------------------------------------------------------- BR87

create function assert_committee_member_is_adult() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_dob date;
begin
  select date_of_birth into v_dob from person where id = new.person_id;

  if v_dob is null then
    raise exception 'person_not_found' using errcode = '22000';
  end if;

  -- Measured at the term's start, not at today: a committee elected in
  -- March is a committee of the people who were adults in March.
  if v_dob > ((select starts_on from committee_term where id = new.term_id)
              - interval '18 years') then
    raise exception
      'a committee position may only be held by an adult (BR87)'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger committee_position_is_adult
  before insert or update on committee_position
  for each row execute function assert_committee_member_is_adult();

-- ------------------------------------------------------- the card's scan

alter table clearance
  add column file_path text;

comment on column clearance.file_path is
  'BR19: a scan of the card. The number is a transcription; this is the evidence.';

-- ------------------------------------------------------------ BR88, read
--
-- Who the club is *supposed* to hold a clearance for. Deliberately a view
-- rather than a rule that blocks: the club's instruction was to identify
-- the committee first and chase paperwork after, and a platform that
-- refuses to record a committee until every card is in is a platform whose
-- committee list lives in a spreadsheet instead.
--
-- Coaches, referees and team officials are *blocked* at appointment
-- (BR83/BR84) because those roles put an adult in front of children on a
-- fixture date. Committee membership is governance, and the club may
-- reasonably seat a treasurer the week before their card arrives.

create view clearance_expectation as
select
  p.id                                       as person_id,
  p.club_id,
  r.role,
  app_clearance_covers(p.id, p.club_id)      as covered_to
from person p
join lateral (
  select 'committee'::text as role
  where exists (
    select 1 from committee_position cp
    where cp.person_id = p.id and cp.resigned_on is null
  )
  union all
  select tm.role::text
  from team_member tm
  where tm.person_id = p.id and tm.role <> 'player'
  union all
  select pr.role::text
  from person_role pr
  where pr.person_id = p.id and pr.role in ('referee', 'coach')
) r on true
where p.merged_into_person_id is null;

comment on view clearance_expectation is
  'BR88: every person holding a role the club should hold a clearance for, and how far their clearance actually reaches. Null means none.';

-- A view inherits the row-level security of the tables beneath it when it
-- is not SECURITY DEFINER, which in Postgres 15+ means declaring it so
-- explicitly. `person`, `committee_position`, `team_member` and
-- `person_role` are all policy-protected, and `clearance` is narrower
-- still -- so a caller who cannot read clearances sees `covered_to` as
-- null rather than as somebody else's date.
alter view clearance_expectation set (security_invoker = true);

-- ---------------------------------------------------------------- storage
-- A second private bucket, separate from vouchers. Same path convention --
-- the club id is the first segment and the policy checks exactly that --
-- but a narrower audience: a clearance scan is a safeguarding record and a
-- government-issued identity document, so only admin and registrar reach
-- it, matching the `clearance` table's own policy.
--
-- Guarded, because the local test Postgres has no `storage` schema. The
-- same coverage gap as the vouchers bucket applies and is recorded in the
-- scope document rather than left to be discovered.

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('clearances', 'clearances', false)
    on conflict (id) do nothing;

    execute $p$
      create policy clearance_files_read on storage.objects
        for select using (
          bucket_id = 'clearances'
          and app_has_role((storage.foldername(name))[1]::uuid, array['admin','registrar'])
        )
    $p$;

    execute $p$
      create policy clearance_files_write on storage.objects
        for insert with check (
          bucket_id = 'clearances'
          and app_has_role((storage.foldername(name))[1]::uuid, array['admin','registrar'])
        )
    $p$;
  end if;
end
$$;
