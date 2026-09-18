-- 0053 — A player reaches the workspace BR63 promised (scope 64, BR150).
--
-- BR63: a Person of thirteen or over "may hold their own account and see
-- their own record." Traced end to end, that promise was only half true.
-- A player can create an `auth.users` account, and `PlayerWorkspace` already
-- renders correctly once that account is linked — but nothing ever links
-- it. `/registrar/access`, the only screen that calls
-- `link_account_to_person()`, builds its account list from
-- `app_club_accounts()`, which reads `club_membership` (0022). A player
-- deliberately holds no `club_membership` row, for the same reason a
-- guardian holds none (decision 11) — so the account a player creates for
-- themselves never appears there for anybody to link.
--
-- **`guardian_invitation`'s shape (0028), moved one row over.** A guardian
-- had this identical structural problem and scope 35 WP4 solved it: an
-- invitation recorded before the account exists, claimed on arrival, no
-- `club_membership` ever granted. `player_invitation` targets the player's
-- own Person directly rather than a guardian's; `claim_player_access()` is
-- `claim_family_access()` unchanged in every property that matters — the
-- email comes from the caller's own session, the club from the invitation,
-- and nothing here creates a `club_membership` row.
--
-- **BR150 mirrors BR126, for the same reason.** BR126 refuses a guardian
-- invitation before a linked child's registration is COMPLETE — an empty
-- workspace reads as broken, not as early. A player invited before their
-- own registration is COMPLETE opens `/me` to the same nothing. There is no
-- guardianship join here: the player is the registration.

create table player_invitation (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references club(id) on delete cascade,
  person_id          uuid not null references person(id) on delete cascade,
  email              text not null check (position('@' in email) > 1),
  invited_by_user_id uuid not null,
  invited_at         timestamptz not null default now(),
  claimed_user_id    uuid references auth.users(id) on delete set null,
  claimed_at         timestamptz,

  foreign key (club_id, person_id) references person (club_id, id) on delete cascade,
  unique (club_id, person_id)
);

create index player_invitation_email_idx on player_invitation (lower(email)) where claimed_user_id is null;

alter table player_invitation enable row level security;

create policy player_invitation_select on player_invitation
  for select using (club_id in (select app_member_club_ids()));

create policy player_invitation_manage on player_invitation
  for insert with check (app_has_role(club_id, array['admin','registrar']));

-- No update or delete policy: claiming happens through
-- claim_player_access() below, which runs as the table owner and bypasses
-- RLS entirely — guardian_invitation's shape (0028).

comment on table player_invitation is
  'BR150. A recorded intent to give a player of thirteen or over their own '
  'workspace, gated on their own registration being COMPLETE. Claimed by '
  'claim_player_access() on arrival. guardian_invitation''s shape (0028), '
  'targeting the player''s own Person rather than a guardian''s.';

-- ---------------------------------------------- assert_player_invitation_is_eligible
-- BR150, enforced where a screen cannot skip it.

create or replace function assert_player_invitation_is_eligible()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_age integer;
begin
  -- BR63's own threshold, the same arithmetic BR137's declaration-authority
  -- trigger (0033) already uses for the identical number.
  select extract(year from age(p.date_of_birth))::integer into v_age
    from person p where p.id = new.person_id;

  if v_age is null or v_age < 13 then
    raise exception 'BR150: invite a player only once they are thirteen or over.'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from registration r
     where r.club_id = new.club_id and r.person_id = new.person_id and r.status = 'COMPLETE'
  ) then
    raise exception 'BR150: invite a player only once their registration is COMPLETE.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger player_invitation_is_eligible
  before insert on player_invitation
  for each row execute function assert_player_invitation_is_eligible();

-- ------------------------------------------------------------- claim_player_access
-- claim_family_access()'s body (0028), for a player's own Person rather
-- than a guardian's. Grants no club_membership — a player's read access is
-- app_my_person_ids() and person_role, both already unconditional on it.

create or replace function claim_player_access()
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
    select * from player_invitation
     where lower(email) = v_email and claimed_user_id is null
  loop
    -- The admin's invite already named this Person; this executes that
    -- assertion (decision 10) rather than inferring one from the address.
    insert into account_person (club_id, user_id, person_id, linked_by)
    values (v_row.club_id, v_user, v_row.person_id, v_row.invited_by_user_id)
    on conflict (club_id, user_id) do nothing;

    update player_invitation
       set claimed_user_id = v_user, claimed_at = now()
     where id = v_row.id;

    insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
    values (v_row.club_id, 'player.claimed', 'player_invitation', v_row.id, v_user,
            jsonb_build_object('email', v_email));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function claim_player_access() from public;
grant execute on function claim_player_access() to authenticated;

comment on function claim_player_access() is
  'Links a newly-arrived account to the Person a player invitation already '
  'named. Never grants club_membership -- a player''s read access comes '
  'entirely from app_my_person_ids() and person_role.';
