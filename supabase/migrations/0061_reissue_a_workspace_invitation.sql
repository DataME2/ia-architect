-- 0061 — Reissue a workspace invitation whose link was removed (scope 68).
--
-- Found in use, September 2026: a guardian's login was unlinked from her own
-- Person on the Access screen. Her guardian invitation was already marked
-- claimed, so `claim_family_access` — which only claims unclaimed rows —
-- would never link her again, and `link_account_to_person` refuses any login
-- without staff access. She was locked out of her own family workspace with
-- no route back in the application.
--
-- `reissue_workspace_invitation` clears the claim on a Person's guardian
-- and player invitations **only when the login that claimed them is no
-- longer linked to that Person** — so it repairs a removed link and can
-- never be used to detach a working one. The application then sends a new
-- link; on arrival the existing claim functions link the login to the
-- Person the invitation names (decision 10: the registrar who issued the
-- invitation asserted who it is for, and this re-sends that assertion).
-- Admin or registrar only, the same roles that may invite.

create or replace function reissue_workspace_invitation(p_person_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club    uuid;
  v_email   text;
  v_player  text;
  v_count   integer := 0;
  v_more    integer := 0;
begin
  select club_id into v_club from person where id = p_person_id;
  if v_club is null then
    raise exception 'No such person.' using errcode = 'P0002';
  end if;

  if not app_has_role(v_club, array['admin', 'registrar']) then
    raise exception 'Only an administrator or registrar may resend a workspace link.'
      using errcode = '42501';
  end if;

  update guardian_invitation gi
     set claimed_user_id = null, claimed_at = null
   where gi.club_id = v_club
     and gi.guardian_person_id = p_person_id
     and gi.claimed_user_id is not null
     and not exists (
       select 1 from account_person ap
        where ap.club_id = v_club and ap.user_id = gi.claimed_user_id and ap.person_id = p_person_id)
  returning gi.email into v_email;
  get diagnostics v_count = row_count;

  -- A Person can be both a guardian and a player; one press repairs both.
  update player_invitation pi
     set claimed_user_id = null, claimed_at = null
   where pi.club_id = v_club
     and pi.person_id = p_person_id
     and pi.claimed_user_id is not null
     and not exists (
       select 1 from account_person ap
        where ap.club_id = v_club and ap.user_id = pi.claimed_user_id and ap.person_id = p_person_id)
  returning pi.email into v_player;
  get diagnostics v_more = row_count;
  v_count := v_count + v_more;
  v_email := coalesce(v_email, v_player);

  -- Nothing needed resetting: an invitation still waiting to be opened is
  -- simply resent (a retry after a failed email lands here).
  if v_count = 0 then
    select email into v_email from (
      select gi.email from guardian_invitation gi
       where gi.club_id = v_club and gi.guardian_person_id = p_person_id and gi.claimed_user_id is null
      union all
      select pi.email from player_invitation pi
       where pi.club_id = v_club and pi.person_id = p_person_id and pi.claimed_user_id is null
    ) waiting limit 1;
  end if;

  if v_email is null then
    raise exception 'Nothing to resend: this person''s workspace link is still in place, or they were never invited.'
      using errcode = '22023';
  end if;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'workspace.reissued', 'person', p_person_id, auth.uid(),
          jsonb_build_object('email', v_email));

  return v_email;
end;
$$;

grant execute on function reissue_workspace_invitation(uuid) to authenticated;

comment on function reissue_workspace_invitation(uuid) is
  'Clears a claimed workspace invitation whose login is no longer linked to its Person, so a '
  'new link can restore it. Refuses to touch a working link. Admin or registrar only.';
