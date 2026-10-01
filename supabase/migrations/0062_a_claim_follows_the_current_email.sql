-- 0062 — An invitation is claimed only at the Person's current email (scope 68).
--
-- Found in review, September 2026. A seventeen-year-old's player invitation
-- was addressed to the club's own admin mailbox; his email was then
-- corrected to his guardian's. The invitation kept the old address, so the
-- next time the admin login signed in, `claim_player_access` would have
-- linked the club's admin login to the boy's record — and since password
-- sign-ins began running the claims (scope 68), that was one sign-in away.
--
-- Three changes, all to functions (no table changes):
--   1. The family, player and staff claims only claim an invitation while
--      its address is still the invited Person's current email. Correcting a
--      Person's email therefore withdraws a stale invitation instead of
--      leaving it claimable by whoever holds the old address.
--   2. The family and player claims mark an invitation claimed only when the
--      login actually ends up linked to that Person — `claim_staff_access`
--      (0059) already worked this way; the two older ones marked it claimed
--      even when the link insert did nothing.
--   3. `reissue_workspace_invitation` (0061) re-addresses the invitation to
--      the Person's current email before resending, and refuses a Person
--      with none — so a resend never goes to an address the club corrected.

-- --------------------------------------------------------- claim_family_access
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
    select gi.* from guardian_invitation gi
      join person p on p.id = gi.guardian_person_id
     where lower(gi.email) = v_email
       and lower(coalesce(p.email, '')) = v_email
       and gi.claimed_user_id is null
  loop
    -- The admin's invite already named this Person; this executes that
    -- assertion (decision 10) rather than inferring one from the address.
    insert into account_person (club_id, user_id, person_id, linked_by)
    values (v_row.club_id, v_user, v_row.guardian_person_id, v_row.invited_by_user_id)
    on conflict do nothing;

    -- Linked to somebody else here, or the Person to another login: not
    -- this account's invitation to claim.
    if not exists (
      select 1 from account_person
       where club_id = v_row.club_id and user_id = v_user and person_id = v_row.guardian_person_id
    ) then
      continue;
    end if;

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

-- --------------------------------------------------------- claim_player_access
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
    select pi.* from player_invitation pi
      join person p on p.id = pi.person_id
     where lower(pi.email) = v_email
       and lower(coalesce(p.email, '')) = v_email
       and pi.claimed_user_id is null
  loop
    insert into account_person (club_id, user_id, person_id, linked_by)
    values (v_row.club_id, v_user, v_row.person_id, v_row.invited_by_user_id)
    on conflict do nothing;

    if not exists (
      select 1 from account_person
       where club_id = v_row.club_id and user_id = v_user and person_id = v_row.person_id
    ) then
      continue;
    end if;

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

-- ---------------------------------------------------------- claim_staff_access
create or replace function claim_staff_access()
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
    select aa.* from appointment_access aa
      join person p on p.id = aa.person_id
     where lower(aa.email) = v_email
       and lower(coalesce(p.email, '')) = v_email
       and aa.claimed_user_id is null
  loop
    insert into account_person (club_id, user_id, person_id, linked_by)
    values (v_row.club_id, v_user, v_row.person_id, v_row.confirmed_by_user_id)
    on conflict do nothing;

    if not exists (
      select 1 from account_person
       where club_id = v_row.club_id and user_id = v_user and person_id = v_row.person_id
    ) then
      continue;
    end if;

    insert into club_membership (club_id, user_id, role)
    values (v_row.club_id, v_user, v_row.access_role)
    on conflict do nothing;

    update appointment_access
       set claimed_user_id = v_user, claimed_at = now()
     where id = v_row.id;

    insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
    values (v_row.club_id, 'access.appointment_claimed', 'appointment_access', v_row.id, v_user,
            jsonb_build_object('email', v_email, 'role', v_row.access_role));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ------------------------------------------------- reissue_workspace_invitation
create or replace function reissue_workspace_invitation(p_person_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club    uuid;
  v_current text;
  v_count   integer := 0;
  v_more    integer := 0;
begin
  select club_id, lower(btrim(email)) into v_club, v_current from person where id = p_person_id;
  if v_club is null then
    raise exception 'No such person.' using errcode = 'P0002';
  end if;

  if not app_has_role(v_club, array['admin', 'registrar']) then
    raise exception 'Only an administrator or registrar may resend a workspace link.'
      using errcode = '42501';
  end if;

  if v_current is null or v_current = '' then
    raise exception 'This person has no email address on record. Add one with Edit details on People, then resend.'
      using errcode = '22023';
  end if;

  -- Clear a claim whose login is no longer linked to this Person (0061), and
  -- re-address every invitation not currently in use to the current email.
  update guardian_invitation gi
     set claimed_user_id = null, claimed_at = null, email = v_current
   where gi.club_id = v_club
     and gi.guardian_person_id = p_person_id
     and (gi.claimed_user_id is null or not exists (
       select 1 from account_person ap
        where ap.club_id = v_club and ap.user_id = gi.claimed_user_id and ap.person_id = p_person_id));
  get diagnostics v_count = row_count;

  update player_invitation pi
     set claimed_user_id = null, claimed_at = null, email = v_current
   where pi.club_id = v_club
     and pi.person_id = p_person_id
     and (pi.claimed_user_id is null or not exists (
       select 1 from account_person ap
        where ap.club_id = v_club and ap.user_id = pi.claimed_user_id and ap.person_id = p_person_id));
  get diagnostics v_more = row_count;

  if v_count + v_more = 0 then
    raise exception 'Nothing to resend: this person''s workspace link is still in place, or they were never invited.'
      using errcode = '22023';
  end if;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'workspace.reissued', 'person', p_person_id, auth.uid(),
          jsonb_build_object('email', v_current));

  return v_current;
end;
$$;
