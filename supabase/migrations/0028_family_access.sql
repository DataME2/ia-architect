-- 0028 — A guardian reads their own household (scope 35, WP4, resumed).
--
-- Decision 11's design, built. Two things are settled here.
--
-- **How a guardian is invited.** Never automatically, and never before
-- there is anything to show: BR126's trigger refuses `guardian_invitation`
-- unless a child under that guardian's authority already has a
-- registration at COMPLETE (BR2, BR3). Sending a link to an empty
-- workspace reads as broken rather than as early.
--
-- **How a guardian reads, once invited.** Never through `club_membership`
-- — that was the design decision 11 rejected, because a `guardian` role
-- would inherit every one of the 26 still-wide-open policies WP1–WP3 have
-- not yet narrowed. Instead: `account_person` links the account to the
-- guardian's own Person, exactly as it already does for club officers
-- (0022), and a pair of `security definer` functions — reached through
-- `auth.uid()`, never an argument — derive the household. Twelve tables
-- gain an *additive* select policy alongside their existing one: a club
-- officer's read is unchanged, and a family's read is a second, narrower
-- door into the same tables.

-- --------------------------------------------------------- app_family_club_ids
-- Clubs where the caller holds a family link, independent of
-- `club_membership` — the whole point of decision 11. Parallel to
-- `app_member_club_ids()`, for the reads that do not come from membership.

create or replace function app_family_club_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct club_id from account_person where user_id = auth.uid()
$$;

-- ---------------------------------------------------- app_my_family_person_ids
-- The caller's own Person, plus the children they hold `is_authority` over,
-- at one club. Every row is reached through `auth.uid()`, which a caller
-- cannot set — so unlike `app_who_am_i()`, which deliberately keeps a
-- membership check because access there flows from membership, there is no
-- equivalent check to keep here. A guardian's access flows from
-- `account_person` existing at all, which an admin controls by linking or
-- unlinking it (BR107) — that link *is* the revocation point.

create or replace function app_my_family_person_ids(p_club_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select person_id from account_person
     where user_id = auth.uid() and club_id = p_club_id
  )
  select person_id from mine
  union
  select g.person_id
    from guardianship g
   where g.club_id = p_club_id
     and g.is_authority
     and g.guardian_person_id in (select person_id from mine)
$$;

revoke all on function app_family_club_ids() from public;
revoke all on function app_my_family_person_ids(uuid) from public;
grant execute on function app_family_club_ids() to authenticated;
grant execute on function app_my_family_person_ids(uuid) to authenticated;

-- ------------------------------------------------------------ read policies
-- Additive: each sits beside the table's existing membership-based select
-- policy. Postgres combines permissive policies with `or`, so this can
-- never narrow what a club officer already sees.

create policy account_person_select_own on account_person
  for select using (user_id = auth.uid());

create policy club_select_family on club
  for select using (id in (select app_family_club_ids()));

create policy season_select_family on season
  for select using (club_id in (select app_family_club_ids()));

create policy person_select_family on person
  for select using (id in (select app_my_family_person_ids(club_id)));

create policy guardianship_select_family on guardianship
  for select using (guardian_person_id in (select app_my_family_person_ids(club_id)));

create policy registration_select_family on registration
  for select using (person_id in (select app_my_family_person_ids(club_id)));

create policy consent_select_family on consent
  for select using (person_id in (select app_my_family_person_ids(club_id)));

-- payment / payment_plan / payment_installment carry no person_id of their
-- own — they are reached through the registration they belong to.
create policy payment_plan_select_family on payment_plan
  for select using (
    registration_id in (
      select id from registration where person_id in (select app_my_family_person_ids(club_id))
    )
  );

create policy payment_select_family on payment
  for select using (
    registration_id in (
      select id from registration where person_id in (select app_my_family_person_ids(club_id))
    )
  );

create policy payment_installment_select_family on payment_installment
  for select using (
    payment_plan_id in (
      select id from payment_plan
       where registration_id in (
         select id from registration where person_id in (select app_my_family_person_ids(club_id))
       )
    )
  );

create policy team_member_select_family on team_member
  for select using (person_id in (select app_my_family_person_ids(club_id)));

create policy team_select_family on team
  for select using (
    id in (
      select team_id from team_member where person_id in (select app_my_family_person_ids(club_id))
    )
  );

-- A fixture with no team (a friendly recorded before one existed) is not
-- reachable this way, deliberately: there is nothing to tie it to the
-- child, so it stays club-officer-only rather than guessed at.
create policy fixture_select_family on fixture
  for select using (
    team_id in (
      select team_id from team_member where person_id in (select app_my_family_person_ids(club_id))
    )
  );

-- ----------------------------------------------------------- guardian_invitation
-- The pre-authorised intent, matching `club_contact`'s shape (0017): the
-- admin's assertion is recorded before the account exists, and claimed on
-- arrival rather than inferred from the address it lands at.

create table guardian_invitation (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references club(id) on delete cascade,
  guardian_person_id uuid not null,
  -- Snapshotted at invite time, like club_contact's email — the address a
  -- link was sent to should not silently change if the Person record is
  -- edited afterwards.
  email              text not null check (position('@' in email) > 1),
  invited_by_user_id uuid not null,
  invited_at         timestamptz not null default now(),
  claimed_user_id    uuid references auth.users(id) on delete set null,
  claimed_at         timestamptz,

  foreign key (club_id, guardian_person_id) references person (club_id, id) on delete cascade,
  unique (club_id, guardian_person_id)
);

create index guardian_invitation_email_idx on guardian_invitation (lower(email)) where claimed_user_id is null;

alter table guardian_invitation enable row level security;

create policy guardian_invitation_select on guardian_invitation
  for select using (club_id in (select app_member_club_ids()));

create policy guardian_invitation_manage on guardian_invitation
  for insert with check (app_has_role(club_id, array['admin','registrar']));

-- No update or delete policy: claiming happens through
-- `claim_family_access()` below, which runs as the table owner and bypasses
-- RLS entirely — the same shape `claim_club_access()` already uses for
-- `club_contact`. Nothing else needs to change this table.

comment on table guardian_invitation is
  'A recorded intent to give a guardian their own workspace, gated by '
  'BR126: refused unless a child under their authority is already '
  'COMPLETE. Claimed by claim_family_access() on arrival.';

-- ---------------------------------------------- assert_guardian_has_completed_registration
-- BR126, enforced where a screen cannot skip it.

create or replace function assert_guardian_has_completed_registration()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
      from guardianship g
      join registration r on r.club_id = g.club_id and r.person_id = g.person_id
     where g.club_id = new.club_id
       and g.guardian_person_id = new.guardian_person_id
       and g.is_authority
       and r.status = 'COMPLETE'
  ) then
    raise exception 'BR126: invite a guardian only once a linked child''s registration is COMPLETE.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger guardian_invitation_requires_completed_registration
  before insert on guardian_invitation
  for each row execute function assert_guardian_has_completed_registration();

-- ------------------------------------------------------------- claim_family_access
-- `claim_club_access()`'s shape (0017), for a link rather than a role: no
-- `club_membership` row is ever created, which is the entire reason WP4
-- does not need WP1–3 finished first (nothing here touches the tables they
-- narrow).

create or replace function claim_family_access()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_email text;
  v_row   record;
  v_count integer := 0;
begin
  if v_user is null then return 0; end if;

  select lower(email) into v_email from auth.users where id = v_user;
  if v_email is null or v_email = '' then return 0; end if;

  for v_row in
    select * from guardian_invitation
     where lower(email) = v_email and claimed_user_id is null
  loop
    -- The admin's invite already named this Person; this executes that
    -- assertion (decision 10) rather than inferring one from the address.
    insert into account_person (club_id, user_id, person_id, linked_by)
    values (v_row.club_id, v_user, v_row.guardian_person_id, v_row.invited_by_user_id)
    on conflict (club_id, user_id) do nothing;

    update guardian_invitation
       set claimed_user_id = v_user, claimed_at = now()
     where id = v_row.id;

    insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
    values (v_row.club_id, 'family.claimed', 'guardian_invitation', v_row.id, v_user,
            jsonb_build_object('email', v_email));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function claim_family_access() from public;
grant execute on function claim_family_access() to authenticated;

comment on function claim_family_access() is
  'Links a newly-arrived account to the Person a guardian invitation '
  'already named. Never grants club_membership (decision 11).';
