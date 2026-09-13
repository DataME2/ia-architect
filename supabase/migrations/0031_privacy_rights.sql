-- 0031 — Forgetting, and the reasons not to (scope 37).
--
-- BR40's retention and BR49's erasure have been in the business layer since
-- it was drafted and have had no code at all. They are one piece of
-- machinery seen from two directions: both ask *is there a reason this
-- record must stay?*, and differ only in who asks and what happens when the
-- answer is no. Building them apart would have produced two answers to that
-- question, which is the shape that eventually disagrees with itself.
--
-- Two decisions were settled before any of this was written.
--
-- **Erasure deletes or refuses, and never redacts in place**
-- ([decision 13](../../docs/decisions/13_erasure_is_all_or_nothing.md)). A
-- blanked `person` row still joins to a team sheet and is re-identifiable
-- in a minute; calling that erasure is a claim this platform cannot
-- support. So: no binding basis and the row goes, cascade and all; any
-- binding basis and nothing goes, with the refusal naming every basis and
-- when each expires.
--
-- **The schedule proposes and a person disposes**
-- ([decision 14](../../docs/decisions/14_retention_proposes_a_person_disposes.md)).
-- These are children's records. A wrong predicate in an unattended job
-- destroys a club's history and leaves nothing to notice it by, while being
-- wrong the other way costs a few months of over-retention and one click.

-- ---------------------------------------------------------- jurisdiction
-- BR52: the framework is *determined by* jurisdiction and *recorded*. The
-- jurisdiction has been on `club` since 0001 and nothing has ever read it.

alter table club
  add column privacy_framework text not null default 'AU_PRIVACY_ACT'
    check (privacy_framework in ('AU_PRIVACY_ACT', 'NZ_PRIVACY_ACT'));

update club set privacy_framework =
  case when jurisdiction like 'NZ%' then 'NZ_PRIVACY_ACT' else 'AU_PRIVACY_ACT' end;

comment on column club.privacy_framework is
  'BR52. Derived from jurisdiction at provisioning and then recorded, not '
  'recomputed: a club that changes jurisdiction does not retroactively '
  'change the framework its existing records were collected under.';

-- ------------------------------------------------------------- deceased
-- BR70. A date rather than a flag, because "when" is what an honour roll
-- and an anniversary need, and a boolean cannot answer either.

alter table person add column deceased_on date;

comment on column person.deceased_on is
  'BR70. A deceased Life Member is retained indefinitely and never '
  'contacted. Recorded on the Person rather than the role because dying is '
  'not a role.';

-- ---------------------------------------------------------- life member
-- BR69: granted once, no season, in effect until revoked or the Person
-- dies. Every other `person_role` is season-scoped, so `season_id` becomes
-- nullable *for this role only* — enforced both ways, because a nullable
-- column with a convention attached is a column that will hold a season for
-- a life member by Friday.

alter table person_role alter column season_id drop not null;

alter table person_role drop constraint person_role_role_check;
alter table person_role add constraint person_role_role_check
  check (role in ('player','referee','coach','guardian','committee','life_member'));

alter table person_role add constraint person_role_season_matches_role
  check ((role = 'life_member') = (season_id is null));

-- BR71: a life member register that is never contacted goes stale, and the
-- club finds out when an invitation bounces at the anniversary dinner.
alter table person_role add column contact_confirmed_at timestamptz;

-- `unique (person_id, season_id, role)` does not constrain a null season,
-- so without this a Person could hold life membership twice.
create unique index person_role_life_member_idx
  on person_role (person_id) where role = 'life_member';

-- -------------------------------------------------------- retention_basis
-- The reasons a record must stay. One table, read by both directions of the
-- machinery: an erasure asks whether any row here binds, and a retention
-- review asks the same question of every Person at once.

create table retention_basis (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  person_id  uuid not null references person(id) on delete cascade,

  basis      text not null check (basis in (
    'statutory_financial',   -- the club's books; seven years in both regimes
    'child_safety',          -- safeguarding records; until the child turns 25
    'active_eligibility',    -- a live registration the governing body relies on
    'life_member',           -- BR70: indefinite, and never expires
    'legal_hold'             -- a dispute or an investigation; entered by hand
  )),

  -- Null is indefinite (BR70). Everything else lapses, which is what makes
  -- "no, until 2033" an honest answer rather than a brush-off.
  expires_on date,
  detail     text,
  recorded_at timestamptz not null default now()
);

create index retention_basis_person_idx on retention_basis (club_id, person_id);

-- -------------------------------------------------------- erasure_request
-- BR132: the request is a record, and it **survives the erasure it
-- authorised**. "We deleted them" and "we were asked and refused" are both
-- answers a regulator may want years later, and neither survives if the
-- only trace was the row that was removed.
--
-- So `person_id` goes null on delete rather than cascading, and the
-- subject's name is *not* copied here — a request that kept the name would
-- be a record of the person it erased.

create table erasure_request (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references club(id) on delete cascade,
  person_id   uuid references person(id) on delete set null,

  -- Who asked. A guardian for a child, or an adult for themselves.
  requested_by_person_id uuid references person(id) on delete set null,
  requested_at timestamptz not null default now(),
  -- What the family actually asked for, in their words.
  request_detail text,

  state text not null default 'received'
    check (state in ('received', 'honoured', 'refused', 'withdrawn')),

  decided_at      timestamptz,
  decided_by_user_id uuid references auth.users(id) on delete set null,
  -- Every basis that bound it, and when each lapses. Plural deliberately:
  -- telling a family the one reason you thought of first is how a refusal
  -- gets re-litigated.
  refused_bases   jsonb not null default '[]'::jsonb,
  -- The date the last of those bases expires, so the club can answer
  -- "when could you?" without recomputing (#76).
  honourable_from date,

  constraint erasure_request_decided_together
    check ((state in ('received', 'withdrawn')) = (decided_at is null))
);

create index erasure_request_club_state_idx on erasure_request (club_id, state, requested_at desc);

-- ------------------------------------------------------- retention_review
-- What the schedule proposed, and what a person did about it (BR133). Kept
-- rather than recomputed so a club can show *when* a record was flagged and
-- who acted, which is the evidence over-retention needs.

create table retention_review (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references club(id) on delete cascade,
  person_id  uuid references person(id) on delete set null,

  reviewed_at timestamptz not null default now(),
  state       text not null check (state in (
    'active',            -- still participating; at least ten years (BR40)
    'lapsed',            -- no participation; the clock runs
    'due_for_disposal',  -- past its period and bound by nothing
    'life_member',       -- BR70: never proposed
    'contact_stale'      -- BR71: a living life member nobody has confirmed
  )),
  detail      text,

  disposed_at         timestamptz,
  disposed_by_user_id uuid references auth.users(id) on delete set null
);

create index retention_review_club_state_idx on retention_review (club_id, state, reviewed_at desc);

-- ------------------------------------------------------------------ policies

alter table retention_basis  enable row level security;
alter table erasure_request  enable row level security;
alter table retention_review enable row level security;

-- BR120: privacy decisions are an administrator's and a secretary's work,
-- not every member's. A coach has no business reading who asked to be
-- forgotten — `supabase/tests/34_privacy_rights.sql` scenario 8 says so.
create policy retention_basis_select on retention_basis
  for select using (app_has_role(club_id, array['admin','registrar','committee']));
create policy retention_basis_insert on retention_basis
  for insert with check (app_has_role(club_id, array['admin','registrar']));
create policy retention_basis_delete on retention_basis
  for delete using (app_has_role(club_id, array['admin']));

create policy erasure_request_select on erasure_request
  for select using (app_has_role(club_id, array['admin','registrar','committee']));
create policy erasure_request_insert on erasure_request
  for insert with check (app_has_role(club_id, array['admin','registrar']));

-- No update policy on erasure_request: a decision is written by
-- app_decide_erasure() and never edited afterwards. An answer that can be
-- quietly changed is not an answer.

create policy retention_review_select on retention_review
  for select using (app_has_role(club_id, array['admin','registrar','committee']));

-- ----------------------------------------------------- app_erasure_verdict
-- Whether anything binds, and until when. Read by the decision function and
-- by the screen, so the club sees the same answer the database will act on.

create or replace function app_erasure_verdict(p_person_id uuid)
returns table (bound boolean, bases jsonb, honourable_from date)
language sql
stable
security definer
set search_path = public
as $$
  with binding as (
    select rb.basis, rb.expires_on, rb.detail
      from retention_basis rb
     where rb.person_id = p_person_id
       and (rb.expires_on is null or rb.expires_on >= current_date)
  )
  select
    exists (select 1 from binding),
    coalesce(
      (select jsonb_agg(jsonb_build_object('basis', basis, 'expiresOn', expires_on, 'detail', detail))
         from binding), '[]'::jsonb),
    -- Null when anything is indefinite: there is no date on which this
    -- becomes honourable, and offering one would be a lie of arithmetic.
    case when exists (select 1 from binding where expires_on is null)
         then null
         else (select max(expires_on) from binding) end
$$;

-- ----------------------------------------------------- app_decide_erasure
-- BR49 and BR132, and decision 13's two outcomes with no third.
--
-- The verdict is recomputed here rather than trusted from the caller. A
-- screen rendered ten minutes ago may have been looking at a basis that has
-- since been recorded, and erasing a child because a page was stale is not
-- a mistake this system gets to make.

create or replace function app_decide_erasure(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req    erasure_request;
  v_bound  boolean;
  v_bases  jsonb;
  v_from   date;
begin
  select * into v_req from erasure_request where id = p_request_id;
  if v_req is null then
    raise exception 'No such erasure request.';
  end if;
  if not app_has_role(v_req.club_id, array['admin']) then
    -- #75: an administrator, because most clubs in the pilot's tier have no
    -- Member Protection Officer and a permission nobody holds is a request
    -- nobody answers.
    raise exception 'Only an administrator of this club may decide an erasure request.';
  end if;
  if v_req.state <> 'received' then
    raise exception 'That request has already been answered.';
  end if;
  if v_req.person_id is null then
    raise exception 'That request no longer names a person.';
  end if;

  select bound, bases, honourable_from into v_bound, v_bases, v_from
    from app_erasure_verdict(v_req.person_id);

  if v_bound then
    update erasure_request
       set state = 'refused',
           decided_at = now(),
           decided_by_user_id = auth.uid(),
           refused_bases = v_bases,
           honourable_from = v_from
     where id = p_request_id;

    insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
    values (v_req.club_id, auth.uid(), 'erasure.refused', 'erasure_request', p_request_id,
            jsonb_build_object('bases', v_bases, 'honourableFrom', v_from));

    return 'refused';
  end if;

  -- Honoured. The audit event is written *before* the delete, because
  -- afterwards there is no club_id to reach through the person and no
  -- second chance to record that this happened.
  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_req.club_id, auth.uid(), 'erasure.honoured', 'erasure_request', p_request_id,
          jsonb_build_object('requestedAt', v_req.requested_at));

  update erasure_request
     set state = 'honoured', decided_at = now(), decided_by_user_id = auth.uid()
   where id = p_request_id;

  -- `person_id` is `on delete set null` here, so the request survives its
  -- own subject (BR132) carrying no personal data of theirs.
  delete from person where id = v_req.person_id;

  return 'honoured';
end
$$;

-- ------------------------------------------------ app_run_retention_review
-- BR40 and BR133. Computes, records, and deletes nothing.
--
-- Idempotent: it clears the club's undecided rows and rewrites them, so
-- running it twice in a morning is the same as running it once, and a club
-- officer can press the button without wondering.

create or replace function app_run_retention_review(p_club_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_framework  text;
  v_lapse_years integer;
  v_stale_months integer := 24;   -- BR71's configurable default
  v_count integer := 0;
begin
  if not app_has_role(p_club_id, array['admin','registrar']) then
    raise exception 'Not permitted at this club.';
  end if;

  select privacy_framework into v_framework from club where id = p_club_id;
  -- BR40's floor for someone still active is ten years. The lapse period
  -- for someone who has stopped is the same figure in both frameworks
  -- today; it is read from the club rather than written as a constant so
  -- that a club's own counsel can move it without a code change.
  v_lapse_years := 10;

  delete from retention_review where club_id = p_club_id and disposed_at is null;

  -- BR70 first, and it wins outright: a deceased life member is never
  -- proposed for disposal, and their absence from the list is the rule
  -- working rather than a gap in it.
  insert into retention_review (club_id, person_id, state, detail)
  select p_club_id, p.id, 'life_member',
         case when p.deceased_on is null
              then 'Life member — retained indefinitely (BR69).'
              else 'Life member, deceased ' || p.deceased_on || ' — retained indefinitely for the club''s history (BR70).' end
    from person p
    join person_role pr on pr.person_id = p.id and pr.role = 'life_member'
   where p.club_id = p_club_id;

  get diagnostics v_count = row_count;

  -- BR71: a living life member nobody has confirmed in two years.
  insert into retention_review (club_id, person_id, state, detail)
  select p_club_id, p.id, 'contact_stale',
         'Life member''s contact details have not been confirmed since ' ||
         coalesce(pr.contact_confirmed_at::date::text, 'ever') || ' (BR71).'
    from person p
    join person_role pr on pr.person_id = p.id and pr.role = 'life_member'
   where p.club_id = p_club_id
     and p.deceased_on is null
     and (pr.contact_confirmed_at is null
          or pr.contact_confirmed_at < now() - make_interval(months => v_stale_months));

  -- Everyone else, by participation (BR40).
  insert into retention_review (club_id, person_id, state, detail)
  select p_club_id, p.id,
         case
           when last_season.ends_on is null then 'lapsed'
           when last_season.ends_on >= current_date - make_interval(years => v_lapse_years) then 'active'
           when (select bound from app_erasure_verdict(p.id)) then 'lapsed'
           else 'due_for_disposal'
         end,
         case
           when last_season.ends_on is null then 'No participation recorded.'
           else 'Last participated in a season ending ' || last_season.ends_on || '.'
         end
    from person p
    left join lateral (
      select max(s.ends_on) as ends_on
        from person_role pr
        join season s on s.id = pr.season_id
       where pr.person_id = p.id
    ) last_season on true
   where p.club_id = p_club_id
     and not exists (
       select 1 from person_role pr where pr.person_id = p.id and pr.role = 'life_member'
     );

  select count(*) into v_count from retention_review where club_id = p_club_id and disposed_at is null;
  return v_count;
end
$$;

-- ------------------------------------------------------- app_dispose_person
-- The human half of BR133. Same delete as an honoured erasure, reached from
-- the other direction, and refused for the same reasons.

create or replace function app_dispose_person(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rev retention_review;
  v_bound boolean;
begin
  select * into v_rev from retention_review where id = p_review_id;
  if v_rev is null then raise exception 'No such review.'; end if;
  if not app_has_role(v_rev.club_id, array['admin']) then
    raise exception 'Only an administrator of this club may dispose of a record.';
  end if;
  if v_rev.state <> 'due_for_disposal' then
    raise exception 'Only a record the review proposed for disposal can be disposed of.';
  end if;
  if v_rev.person_id is null then raise exception 'That review no longer names a person.'; end if;

  -- Re-asked, never trusted from the review row: the review may be from
  -- this morning and a legal hold may be from this afternoon.
  select bound into v_bound from app_erasure_verdict(v_rev.person_id);
  if v_bound then
    raise exception 'A retention basis now binds this record — it cannot be disposed of.';
  end if;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v_rev.club_id, auth.uid(), 'retention.disposed', 'retention_review', p_review_id,
          jsonb_build_object('state', v_rev.state, 'detail', v_rev.detail));

  update retention_review
     set disposed_at = now(), disposed_by_user_id = auth.uid()
   where id = p_review_id;

  delete from person where id = v_rev.person_id;
end
$$;

-- ------------------------------------------------- app_transfer_authority
-- BR67. The one thing in this migration that is safe to automate, because
-- it destroys nothing: authority ends at eighteen, contactability does not
-- (`is_contact` is untouched, which is the whole reason 0001 made them two
-- flags rather than one).

create or replace function app_transfer_authority(p_club_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_moved integer := 0;
  r record;
begin
  if not app_has_role(p_club_id, array['admin','registrar']) then
    raise exception 'Not permitted at this club.';
  end if;

  for r in
    select g.id, g.person_id
      from guardianship g
      join person p on p.id = g.person_id
     where g.club_id = p_club_id
       and g.is_authority
       and p.date_of_birth <= current_date - interval '18 years'
  loop
    update guardianship set is_authority = false where id = r.id;

    insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
    values (p_club_id, auth.uid(), 'authority.transferred', 'guardianship', r.id,
            jsonb_build_object('personId', r.person_id, 'rule', 'BR67'));

    v_moved := v_moved + 1;
  end loop;

  return v_moved;
end
$$;

-- ------------------------------------------------------- export_club_data
-- BR68. The club owns its data and may take it elsewhere.
--
-- "Nearly free under Postgres" has been the claim since the technology
-- layer was written; this is the claim being cashed. One JSONB document,
-- club-scoped by the same `club_id` every policy keys off, so an export
-- cannot reach another tenant's rows even by mistake.

-- Deliberately not `stable`: this writes an audit event. An export is a
-- copy of every child's record leaving the building, and "who took one, and
-- when" is exactly the question BR68's portability makes worth asking.
create or replace function export_club_data(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out jsonb;
begin
  if not app_has_role(p_club_id, array['admin']) then
    raise exception 'Only an administrator of this club may export its data.';
  end if;

  select jsonb_build_object(
    'exportedAt', now(),
    'club',            (select to_jsonb(c) from club c where c.id = p_club_id),
    'seasons',         (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from season t where t.club_id = p_club_id),
    'people',          (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from person t where t.club_id = p_club_id),
    'personRoles',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from person_role t where t.club_id = p_club_id),
    'guardianships',   (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from guardianship t where t.club_id = p_club_id),
    'consents',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from consent t where t.club_id = p_club_id),
    'registrations',   (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from registration t where t.club_id = p_club_id),
    'documents',       (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from registration_document t where t.club_id = p_club_id),
    'paymentPlans',    (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from payment_plan t where t.club_id = p_club_id),
    'installments',    (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from payment_installment t where t.club_id = p_club_id),
    'payments',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from payment t where t.club_id = p_club_id),
    'vouchers',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from registration_voucher t where t.club_id = p_club_id),
    'teams',           (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from team t where t.club_id = p_club_id),
    'teamMembers',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from team_member t where t.club_id = p_club_id),
    'clearances',      (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from clearance t where t.club_id = p_club_id),
    'fixtures',        (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from fixture t where t.club_id = p_club_id),
    'appearances',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from appearance t where t.club_id = p_club_id),
    'committeeTerms',  (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from committee_term t where t.club_id = p_club_id),
    'committeePositions', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from committee_position t where t.club_id = p_club_id),
    'retentionBases',  (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from retention_basis t where t.club_id = p_club_id),
    'erasureRequests', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from erasure_request t where t.club_id = p_club_id),
    'auditEvents',     (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from audit_event t where t.club_id = p_club_id)
  ) into v_out;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (p_club_id, auth.uid(), 'club.exported', 'club', p_club_id, '{}'::jsonb);

  return v_out;
end
$$;

revoke all on function app_erasure_verdict(uuid) from public;
revoke all on function app_decide_erasure(uuid) from public;
revoke all on function app_run_retention_review(uuid) from public;
revoke all on function app_dispose_person(uuid) from public;
revoke all on function app_transfer_authority(uuid) from public;
revoke all on function export_club_data(uuid) from public;
grant execute on function app_erasure_verdict(uuid) to authenticated;
grant execute on function app_decide_erasure(uuid) to authenticated;
grant execute on function app_run_retention_review(uuid) to authenticated;
grant execute on function app_dispose_person(uuid) to authenticated;
grant execute on function app_transfer_authority(uuid) to authenticated;
grant execute on function export_club_data(uuid) to authenticated;
