-- 0057 — A guardian chooses how their referee is paid (scope 67, BR152).
--
-- Asked directly, following on from BR151: once a match is confirmed,
-- the guardian of the official who worked it should be told there is
-- money owed and given a say in how it is settled.
--
-- **BR118 is unmoved.** "The platform never initiates a transfer" — this
-- adds no payment rail, collects no bank detail, and moves no money. What
-- it adds is a *choice*, recorded against a claim that already exists and
-- is already approved: pay me the way the club already pays anyone
-- (BR118, outside the platform), or credit it toward what I owe next
-- season. The choice is the thing this migration makes real; who acts on
-- it is unchanged.
--
-- **Deliberately stops at recording the choice.** Applying a "credit"
-- automatically to a *future* season's registration needs a notion of
-- "next season" the schema does not have — seasons are dated rows with no
-- successor pointer, and inventing one to resolve a credit nobody has
-- looked at yet is exactly the kind of unasked scope this project's own
-- steering docs warn against. A registrar or treasurer applies a chosen
-- credit by hand, through the arrears/outstanding-amount tools that
-- already exist, once the next season's registration is there to apply it
-- to — the choice being visibly recorded is what makes that possible at
-- all, which is the gap that was actually reported.
--
-- **Who may choose, reused rather than redefined.** `app_may_answer_designation`
-- (migration 0045) already answers "who may decide for this official" —
-- themselves once adult, otherwise a Parent/Guardian holding authority —
-- and that is exactly BR152's question too. Not narrowed to thirteen the
-- way BR151 is: a settlement choice is available to any official's family
-- once a claim for them is approved, matching BR113's own threshold rather
-- than inventing a third one.

alter table referee_payment_claim
  add column settlement text check (settlement is null or settlement in ('pay', 'credit')),
  add column settlement_chosen_by uuid references person(id),
  add column settlement_chosen_at timestamptz;

alter table referee_payment_claim
  add constraint referee_payment_claim_settlement_chooser_is_at_this_club
    foreign key (club_id, settlement_chosen_by) references person (club_id, id);

comment on column referee_payment_claim.settlement is
  'BR152. How the official''s family wants this approved claim settled -- '
  '"pay" (the club pays outside the platform, BR118, unchanged) or '
  '"credit" (applied to the official''s next registration fee, by hand, '
  'once that registration exists). Null until they choose.';

-- --------------------------------------------------------------- the guard
create or replace function assert_claim_settlement_is_chosen_by_the_official()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person_id uuid;
begin
  -- Officer writes (raising, deciding, batching) never touch settlement —
  -- this guard has nothing to say about them.
  if new.settlement is null then
    return new;
  end if;

  if new.state <> 'approved' then
    raise exception
      'a claim''s settlement can only be chosen once it is approved (BR152)'
      using errcode = '23514';
  end if;

  select person_id into v_person_id from match_official_appointment where id = new.appointment_id;

  if new.settlement_chosen_by is null or not exists (
    select 1 from app_may_answer_designation(v_person_id, new.club_id, current_date) a
     where a = new.settlement_chosen_by
  ) then
    raise exception
      'that person does not hold authority to choose how this official is paid (BR152)'
      using errcode = '23514';
  end if;

  new.settlement_chosen_at := coalesce(new.settlement_chosen_at, now());
  return new;
end;
$$;

create trigger claim_settlement_is_chosen_by_the_official
  before insert or update on referee_payment_claim
  for each row execute function assert_claim_settlement_is_chosen_by_the_official();

-- A family changing the settlement changes only that — not the amount, not
-- the state, not which batch it is in. 0045's exact shape, moved.
create or replace function assert_family_only_chooses_settlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if app_has_role(new.club_id, array['admin', 'treasurer']) then
    return new;
  end if;

  if new.appointment_id is distinct from old.appointment_id
     or new.amount_cents is distinct from old.amount_cents
     or new.schedule_id is distinct from old.schedule_id
     or new.state is distinct from old.state
     or new.raised_by is distinct from old.raised_by
     or new.raised_at is distinct from old.raised_at
     or new.decided_by is distinct from old.decided_by
     or new.decided_at is distinct from old.decided_at
     or new.decision_note is distinct from old.decision_note
     or new.batch_id is distinct from old.batch_id then
    raise exception
      'choosing how you are paid changes only that, nothing else about the claim (BR152)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger family_only_chooses_settlement
  before update on referee_payment_claim
  for each row execute function assert_family_only_chooses_settlement();

-- ----------------------------------------------------------------- the RLS
-- Permissive policies combine with `or` (0028's shape) — admitting the
-- family to their own claim can never narrow what admin/registrar/
-- coordinator/treasurer already see through the existing policies.

create policy referee_payment_claim_select_family on referee_payment_claim
  for select using (
    exists (
      select 1 from match_official_appointment moa
       where moa.id = referee_payment_claim.appointment_id
         and moa.person_id in (select app_my_family_person_ids(referee_payment_claim.club_id))
    )
  );

create policy referee_payment_claim_settle_family on referee_payment_claim
  for update using (
    exists (
      select 1 from match_official_appointment moa
       where moa.id = referee_payment_claim.appointment_id
         and moa.person_id in (select app_my_family_person_ids(referee_payment_claim.club_id))
    )
  )
  with check (
    exists (
      select 1 from match_official_appointment moa
       where moa.id = referee_payment_claim.appointment_id
         and moa.person_id in (select app_my_family_person_ids(referee_payment_claim.club_id))
    )
    and settlement_chosen_by in (select app_my_person_ids())
  );
