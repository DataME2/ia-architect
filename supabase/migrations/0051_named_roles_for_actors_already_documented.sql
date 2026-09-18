-- 0051 — Named roles for actors already documented (scope 62).
--
-- `docs/ea/2_business/1_business-actors-and-roles.md` names 48 human
-- actors. Nine of them existed nowhere in the schema — not a
-- `club_membership.role`, not a `person_role.role`, not a
-- `committee_position.position`. This gives thirteen of the missing
-- titles a role value, folding twelve near-identical "program
-- coordinator" job titles into one role rather than enumerating each —
-- the same instinct 0032's comment states about `competition.tier`: a
-- check constraint listing values somebody guessed would refuse the
-- real ones, and here the values would gate nothing differently from
-- each other regardless.
--
-- **A role, not a screen.** `committee` sat on `club_membership` for a
-- long time before scope 57 gave it anything to write; `viewer` still
-- has almost nothing that names it. Naming a role before its screen
-- exists is this schema's established pattern.
--
-- **Two actors named in the same audit are deliberately not added here**
-- — see scope 62's own "what this does not do":
--   * Football Australia is an external organisation with no ITC objects
--     behind it yet (BR35–BR38) — a capability, not a role.
--   * The AI Assistant stays off `club_membership` on purpose. Decision 1
--     sets its autonomy at advisory with no decision rights; a role grant
--     is an access grant, and giving the Assistant one would create the
--     control surface decision 1 exists to refuse it.
--
-- **BR125 found unenforced while adding the Technical Director.** The
-- rule's own text in the business rules table already claims the fix —
-- "previously admin, registrar and coordinator could write them and the
-- coach could only read: the wrong way round" — but `player_profile_manage`
-- (0020) was never changed. Closed alongside the role it was blocking.

-- --------------------------------------------------- club_membership_role_check
-- Rewritten rather than merely widened, so the full set is legible in one
-- place. `grant_club_role` is rewritten below to match — a migration once
-- applied is never edited, so this reproduces 0042's body with the wider
-- list rather than touching it.

alter table club_membership drop constraint club_membership_role_check;
alter table club_membership add constraint club_membership_role_check
  check (role in (
    'registrar','treasurer','committee','coach','coordinator','admin','viewer',
    'digital_technology_manager',
    'director_of_football','head_of_performance','head_of_community_football',
    'head_of_womens_football','technical_director',
    'grants_committee_member','appeals_panel_member','grants_coordinator',
    'volunteer_coordinator','player_welfare_officer','social_media_and_photographer',
    'program_coordinator'
  ));

create or replace function grant_club_role(p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club   uuid := app_admin_club();
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_target uuid;
begin
  if v_club is null then
    raise exception 'Only a club administrator may change who has access.'
      using errcode = '42501';
  end if;

  -- 'viewer' is deliberately absent: it is set only by enter_demo() (0013)
  -- for the anonymous demonstration session, and 0042's own list never
  -- granted it either. Widening the roles a grant recognises must not widen
  -- who can hand out the demo's own marker.
  if p_role not in (
    'registrar','treasurer','committee','coach','coordinator','admin',
    'digital_technology_manager',
    'director_of_football','head_of_performance','head_of_community_football',
    'head_of_womens_football','technical_director',
    'grants_committee_member','appeals_panel_member','grants_coordinator',
    'volunteer_coordinator','player_welfare_officer','social_media_and_photographer',
    'program_coordinator'
  ) then
    raise exception 'Not a club role: %', p_role using errcode = '22023';
  end if;

  select id into v_target from auth.users where lower(email) = v_email;

  if v_target is null then
    raise exception 'No account exists for %. They must create one first, then you can grant access.', v_email
      using errcode = 'P0002';
  end if;

  -- BR106, unchanged from 0042: an administrator's account must already be
  -- linked to a named individual. Every other role here is exactly as
  -- ungated as the roles beside it always were.
  if p_role = 'admin'
     and not exists (select 1 from account_person where club_id = v_club and user_id = v_target)
     and not exists (
       select 1 from club_membership where club_id = v_club and user_id = v_target and role = 'admin'
     )
  then
    raise exception
      'BR106: an administrator''s account must be linked to a named individual first. '
      'Grant a lesser role, link the account to who it belongs to on the Access screen, '
      'then add admin.'
      using errcode = '22023';
  end if;

  insert into club_membership (club_id, user_id, role)
  values (v_club, v_target, p_role)
  on conflict do nothing;

  insert into audit_event (club_id, action, entity, entity_id, actor_user_id, detail)
  values (v_club, 'access.granted', 'club_membership', v_target, auth.uid(),
          jsonb_build_object('role', p_role, 'email', v_email));
end;
$$;

comment on function grant_club_role(text, text) is
  'BR106/BR124: grants an existing account a role at the caller''s club. '
  'Accepts the roles named in docs/ea/2_business/1_business-actors-and-roles.md '
  '(scope 62) alongside the original seven. Refuses to grant admin to an '
  'account not yet linked to a Person, same as 0042.';

-- --------------------------------------------------------------- BR125
-- The coach and the Technical Director are named as the roles that record
-- a player's physique. Added alongside admin/registrar/coordinator rather
-- than replacing them — BR125's complaint is that the coach could not
-- write, not that the club officers who could should lose the ability;
-- narrowing that is a different rule this migration was not asked to make.

drop policy player_profile_manage on player_profile;
create policy player_profile_manage on player_profile
  for all using (app_has_role(club_id, array['admin','registrar','coordinator','coach','technical_director']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator','coach','technical_director']));

-- BR99's read narrowing already named coach; the Technical Director reads
-- what they may now also write.
drop policy player_profile_select on player_profile;
create policy player_profile_select on player_profile
  for select using (app_has_role(club_id, array['admin','registrar','coordinator','coach','technical_director']));

