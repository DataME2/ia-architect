-- 0070 — A coach sees their own team, and never the balance
-- (scope 74; #78b answered B, #73, scope 35 WP3; BR78, BR79, BR120).
--
-- Two narrowings, both of reads:
--
--   1. **The balance.** `registration.outstanding_amount_cents` was readable
--      by every member and every family, and the coach's own workspace showed
--      "$180 owing". BR78: the figure reaches the money roles (admin,
--      treasurer, registrar, IT manager, as 0068), a Parent/Guardian holding
--      authority, and an adult about themself. Everyone else who may read the
--      registration is told only whether money is owed, which with the
--      status is BR79's verdict, computed fresh and never stored.
--
--      Row-level security cannot hide one column from some app roles and not
--      others: every signed-in caller is the same Postgres role. So the
--      column's SELECT privilege is revoked from `authenticated` and `anon`
--      altogether, and the figure comes back through
--      `app_registration_money()`, which decides per row. Writes are
--      unchanged (UPDATE and INSERT keep their table grants, and the
--      `_manage` policies still decide who). **A column added to
--      `registration` later must be granted to `authenticated` by name**,
--      because the table-wide grant is gone.
--
--   2. **The coach's reach (#78b, B).** A member whose only club role is
--      `coach` reads the people, contacts, consents and registrations of the
--      teams they stand in front of this season, and the guardians of those
--      players, and nothing else in the club. Every other role (the
--      officers: admin, registrar, secretary, treasurer, IT manager,
--      committee, coordinator and the rest, and the demo `viewer`) keeps the
--      club-wide read. Families are untouched: their `_select_family`
--      policies (0028, 0029) sit beside these and are not changed.

-- ------------------------------------------------------- app_reads_club_wide
-- Any club role but `coach`. A coach who also holds an office reads as the
-- officer, because the office is what the wider read is for.

create or replace function app_reads_club_wide(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from club_membership
     where user_id = auth.uid()
       and club_id = p_club_id
       and role <> 'coach'
  )
$$;

revoke all on function app_reads_club_wide(uuid) from public;
grant execute on function app_reads_club_wide(uuid) to authenticated;

comment on function app_reads_club_wide(uuid) is
  '#78b (B): whether the caller holds any club role other than coach, and so '
  'reads people, contacts, consents and registrations club-wide.';

-- --------------------------------------------------- app_my_team_person_ids
-- The players and staff of every team the caller stands in front of (any
-- role but player, not withdrawn) in a season that has not ended, the
-- Parents/Guardians of those players, and the caller themself. Derived from
-- `auth.uid()`; nothing is supplied but the club.

create or replace function app_my_team_person_ids(p_club_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with my_teams as (
    select t.id
      from team_member me
      join team t on t.id = me.team_id and t.club_id = me.club_id
      join season s on s.id = t.season_id and s.club_id = t.club_id
     where me.club_id = p_club_id
       and me.role <> 'player'
       and me.withdrawn_at is null
       and me.person_id in (select app_my_person_ids())
       and s.ends_on >= current_date
  ),
  members as (
    select tm.person_id, tm.role
      from team_member tm
     where tm.club_id = p_club_id
       and tm.team_id in (select id from my_teams)
       and tm.withdrawn_at is null
  )
  select person_id from members
  union
  select g.guardian_person_id
    from guardianship g
   where g.club_id = p_club_id
     and g.person_id in (select person_id from members where role = 'player')
  union
  select person_id from account_person
   where user_id = auth.uid() and club_id = p_club_id
$$;

revoke all on function app_my_team_person_ids(uuid) from public;
grant execute on function app_my_team_person_ids(uuid) to authenticated;

comment on function app_my_team_person_ids(uuid) is
  '#78b (B): the people a coach reads. Their teams'' players and staff this '
  'season, those players'' guardians, and the coach themself.';

-- ------------------------------------------------------------- the policies
-- Each `_select` was `club_id in (select app_member_club_ids())`.

drop policy if exists person_select on person;
create policy person_select on person
  for select using (
    app_reads_club_wide(club_id)
    or (club_id in (select app_member_club_ids())
        and id in (select app_my_team_person_ids(club_id)))
  );

drop policy if exists guardianship_select on guardianship;
create policy guardianship_select on guardianship
  for select using (
    app_reads_club_wide(club_id)
    or (club_id in (select app_member_club_ids())
        and person_id in (select app_my_team_person_ids(club_id)))
  );

drop policy if exists consent_select on consent;
create policy consent_select on consent
  for select using (
    app_reads_club_wide(club_id)
    or (club_id in (select app_member_club_ids())
        and person_id in (select app_my_team_person_ids(club_id)))
  );

drop policy if exists person_role_select on person_role;
create policy person_role_select on person_role
  for select using (
    app_reads_club_wide(club_id)
    or (club_id in (select app_member_club_ids())
        and person_id in (select app_my_team_person_ids(club_id)))
  );

drop policy if exists registration_select on registration;
create policy registration_select on registration
  for select using (
    app_reads_club_wide(club_id)
    or (club_id in (select app_member_club_ids())
        and person_id in (select app_my_team_person_ids(club_id)))
  );

drop policy if exists registration_document_select on registration_document;
create policy registration_document_select on registration_document
  for select using (
    app_reads_club_wide(club_id)
    or (club_id in (select app_member_club_ids())
        and registration_id in (
          select r.id from registration r
           where r.club_id = registration_document.club_id
             and r.person_id in (select app_my_team_person_ids(registration_document.club_id))))
  );

drop policy if exists validation_result_select on validation_result;
create policy validation_result_select on validation_result
  for select using (
    app_reads_club_wide(club_id)
    or (club_id in (select app_member_club_ids())
        and registration_id in (
          select r.id from registration r
           where r.club_id = validation_result.club_id
             and r.person_id in (select app_my_team_person_ids(validation_result.club_id))))
  );

-- Officers only: a coach has no use for login links, invitations or the
-- voucher queue, and every one of them names a family's email or money.

drop policy if exists account_person_select on account_person;
create policy account_person_select on account_person
  for select using (app_reads_club_wide(club_id));

drop policy if exists guardian_invitation_select on guardian_invitation;
create policy guardian_invitation_select on guardian_invitation
  for select using (app_reads_club_wide(club_id));

drop policy if exists player_invitation_select on player_invitation;
create policy player_invitation_select on player_invitation
  for select using (app_reads_club_wide(club_id));

drop policy if exists registration_invitation_select on registration_invitation;
create policy registration_invitation_select on registration_invitation
  for select using (app_reads_club_wide(club_id));

drop policy if exists registration_voucher_select on registration_voucher;
create policy registration_voucher_select on registration_voucher
  for select using (app_reads_club_wide(club_id));

-- ------------------------------------------------------------- the balance
-- The table-wide SELECT goes; every column but the balance comes back.

revoke select on registration from anon, authenticated;
grant select (id, club_id, person_id, season_id, status, created_at)
  on registration to anon, authenticated;

-- BR78 and BR79 per registration. A row is returned only for a registration
-- the caller may read at all (the same doors as `registration_select` and
-- the family policy); `outstanding_amount_cents` is null unless the caller
-- may see the figure, and `owes` is always the verdict's half that is money.

create or replace function app_registration_money(p_registration_ids uuid[])
returns table (registration_id uuid, outstanding_amount_cents integer, owes boolean)
language sql
stable
security definer
set search_path = public
as $$
  select r.id,
         case
           when app_has_role(r.club_id, array['admin','treasurer','registrar','digital_technology_manager'])
             or exists (
               select 1 from guardianship g
                where g.club_id = r.club_id
                  and g.person_id = r.person_id
                  and g.is_authority
                  and g.guardian_person_id in (select app_my_person_ids()))
             or (r.person_id in (select app_my_person_ids())
                 and coalesce(app_is_adult_on(r.person_id, current_date), false))
           then r.outstanding_amount_cents
         end,
         r.outstanding_amount_cents > 0
    from registration r
   where r.id = any(p_registration_ids)
     and (
       app_reads_club_wide(r.club_id)
       or (r.club_id in (select app_member_club_ids())
           and r.person_id in (select app_my_team_person_ids(r.club_id)))
       or r.person_id in (select app_my_family_person_ids(r.club_id))
     )
$$;

revoke all on function app_registration_money(uuid[]) from public;
grant execute on function app_registration_money(uuid[]) to authenticated;

comment on function app_registration_money(uuid[]) is
  'BR78/BR79: for each readable registration, the balance (money roles, a '
  'guardian with authority, an adult about themself; otherwise null) and '
  'whether anything is owed, the money half of "clear to play".';

-- ------------------------------------------------- 0052's trigger, re-read
-- It ran `select *` from registration as the proposing player, which the
-- column privilege above now refuses. Same check, only the columns it uses.

create or replace function assert_correction_matches_its_registration()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_person uuid;
  v_club   uuid;
begin
  select person_id, club_id into v_person, v_club from registration where id = new.registration_id;
  if v_person is null or v_person <> new.person_id or v_club <> new.club_id then
    raise exception 'that registration does not belong to this person and club'
      using errcode = '23514';
  end if;

  -- BR148: the proposer must be the player themselves, eighteen or over.
  if not coalesce(app_is_adult_on(new.person_id, current_date), false) then
    raise exception
      'BR148: only a player of eighteen or over may propose a correction to their own record'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- ------------------------------------------------- 0020's coherence check
-- It read the fixture and registration as the caller. A coach of another
-- team no longer reads that registration, so the check refused them as
-- "incoherent" before BR158's policy could refuse them as not theirs. A
-- coherence check is about the rows, not the reader.

alter function assert_appearance_is_coherent() security definer set search_path = public, pg_temp;
