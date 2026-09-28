-- 0058 — Committee role permissions (scope 29, WP5).
--
-- The pilot club supplied its own read/write matrix for the five roles
-- scope 62 (0051) deliberately left ungranted: Secretary, Finance Admin,
-- Referee Coordinator Admin, Referee Admin Back-Up, and Blue Card
-- Administration. Two of those five need a role value the schema does
-- not have yet — `secretary` and `blue_card_administrator` — the other
-- three (Finance Admin, Referee Coordinator Admin, Referee Admin
-- Back-Up) stay covered by `treasurer`/`coordinator`/`admin` as scope 62
-- left them; the club's matrix did not ask for a further split there,
-- and "Referee Coordinator or Ref Admin" was confirmed (September 2026,
-- scope 29 §2b) to stay on the existing `coordinator` value rather than
-- split from Registrar/Events Coordinator.
--
-- **Additive only — no existing read is narrowed.** Every table below
-- already grants broad read to any club member
-- (`club_id in (select app_member_club_ids())`); scope 29 §3 names that
-- as its own large, separate, deliberately-not-incremental narrowing
-- project. This migration only adds write (and, for `clearance`, read)
-- capability the matrix asked for that nobody had — it removes nothing.
--
-- **One matrix cell is excluded on purpose: Treasurer on Player
-- physique.** Every other Treasurer cell in the source matrix is
-- money-only (payments, payment plans, vouchers) or read-only elsewhere
-- — a Treasurer writing a child's height and weight is the one
-- discontinuous cell in an otherwise consistent pattern, in a table
-- BR99/BR125 already single out as health-adjacent. Recorded as a
-- transcription flag in scope 29 §2c rather than implemented; a
-- confirmed instruction for it is a one-line follow-up migration, not
-- a reason to hold the other twenty-odd grants that are consistent.

-- --------------------------------------------------- club_membership_role_check
-- Reproduces 0051's body with two more values, per that migration's own
-- comment: a migration once applied is never edited.

alter table club_membership drop constraint club_membership_role_check;
alter table club_membership add constraint club_membership_role_check
  check (role in (
    'registrar','treasurer','committee','coach','coordinator','admin','viewer',
    'digital_technology_manager',
    'director_of_football','head_of_performance','head_of_community_football',
    'head_of_womens_football','technical_director',
    'grants_committee_member','appeals_panel_member','grants_coordinator',
    'volunteer_coordinator','player_welfare_officer','social_media_and_photographer',
    'program_coordinator',
    'secretary','blue_card_administrator'
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
    'program_coordinator',
    'secretary','blue_card_administrator'
  ) then
    raise exception 'Not a club role: %', p_role using errcode = '22023';
  end if;

  select id into v_target from auth.users where lower(email) = v_email;

  if v_target is null then
    raise exception 'No account exists for %. They must create one first, then you can grant access.', v_email
      using errcode = 'P0002';
  end if;

  -- BR106, unchanged: an administrator's account must already be linked to
  -- a named individual. Every other role here is exactly as ungated as the
  -- roles beside it always were.
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
  '(scope 62) plus secretary/blue_card_administrator (scope 29 WP5), alongside '
  'the original seven. Refuses to grant admin to an account not yet linked to '
  'a Person, same as 0042.';

-- ------------------------------------------------------------- person / person_role / guardianship
-- Matrix row "People, roles, guardianship": IT Manager gains write.

drop policy person_manage on person;
create policy person_manage on person
  for all using (app_has_role(club_id, array['admin','registrar','digital_technology_manager']))
  with check (app_has_role(club_id, array['admin','registrar','digital_technology_manager']));

drop policy person_role_manage on person_role;
create policy person_role_manage on person_role
  for all using (app_has_role(club_id, array['admin','registrar','digital_technology_manager']))
  with check (app_has_role(club_id, array['admin','registrar','digital_technology_manager']));

drop policy guardianship_manage on guardianship;
create policy guardianship_manage on guardianship
  for all using (app_has_role(club_id, array['admin','registrar','digital_technology_manager']))
  with check (app_has_role(club_id, array['admin','registrar','digital_technology_manager']));

-- ------------------------------------------------------------- registration / registration_document
-- Matrix row "Registrations & documents": IT Manager gains write.

drop policy registration_manage on registration;
create policy registration_manage on registration
  for all using (app_has_role(club_id, array['admin','registrar','digital_technology_manager']))
  with check (app_has_role(club_id, array['admin','registrar','digital_technology_manager']));

drop policy registration_document_manage on registration_document;
create policy registration_document_manage on registration_document
  for all using (app_has_role(club_id, array['admin','registrar','digital_technology_manager']))
  with check (app_has_role(club_id, array['admin','registrar','digital_technology_manager']));

-- ------------------------------------------------------------------------- season
-- Matrix row "Seasons & requirements": IT Manager gains write.

drop policy season_manage on season;
create policy season_manage on season
  for all using (app_has_role(club_id, array['admin','registrar','digital_technology_manager']))
  with check (app_has_role(club_id, array['admin','registrar','digital_technology_manager']));

-- ------------------------------------------------------------------- registration_invitation
-- Matrix row "Registration links": IT Manager gains write.

drop policy registration_invitation_manage on registration_invitation;
create policy registration_invitation_manage on registration_invitation
  for all using (app_has_role(club_id, array['admin','registrar','digital_technology_manager']))
  with check (app_has_role(club_id, array['admin','registrar','digital_technology_manager']));

-- ------------------------------------------------------------------------- consent
-- Matrix row "Consents": IT Manager gains write.

drop policy consent_manage on consent;
create policy consent_manage on consent
  for all using (app_has_role(club_id, array['admin','registrar','digital_technology_manager']))
  with check (app_has_role(club_id, array['admin','registrar','digital_technology_manager']));

-- ------------------------------------------------------------------------- registration_voucher
-- Matrix row "Vouchers — attach": IT Manager gains write (attach only —
-- "verify/reject" stays admin/treasurer, matching the matrix's separate
-- row and today's separation of duties between attaching and verifying).

drop policy registration_voucher_attach on registration_voucher;
create policy registration_voucher_attach on registration_voucher
  for insert
  with check (
    app_has_role(club_id, array['admin','registrar','treasurer','digital_technology_manager'])
    and state = 'ATTACHED' and relief_payment_id is null
  );

-- --------------------------------------------------------------- team / team_member
-- Matrix row "Teams & rosters": IT Manager, Secretary and the Coach group
-- (coach plus the football-operations leads the matrix bundles with it)
-- all gain write. `coordinator` already had it.

drop policy team_manage on team;
create policy team_manage on team
  for all using (app_has_role(club_id, array[
    'admin','registrar','coordinator','digital_technology_manager','secretary',
    'coach','head_of_performance','head_of_community_football','head_of_womens_football','technical_director'
  ]))
  with check (app_has_role(club_id, array[
    'admin','registrar','coordinator','digital_technology_manager','secretary',
    'coach','head_of_performance','head_of_community_football','head_of_womens_football','technical_director'
  ]));

drop policy team_member_manage on team_member;
create policy team_member_manage on team_member
  for all using (app_has_role(club_id, array[
    'admin','registrar','coordinator','digital_technology_manager','secretary',
    'coach','head_of_performance','head_of_community_football','head_of_womens_football','technical_director'
  ]))
  with check (app_has_role(club_id, array[
    'admin','registrar','coordinator','digital_technology_manager','secretary',
    'coach','head_of_performance','head_of_community_football','head_of_womens_football','technical_director'
  ]));

-- --------------------------------------------------------------------- clearance
-- Matrix row "Clearances (WWCC)": this is the row the whole initiative
-- exists for. Blue Card Administrator can now verify and record a
-- Working with Children Check without holding `registrar`; IT Manager
-- gains write too, per the matrix. Nothing already granted is removed.

drop policy clearance_manage on clearance;
create policy clearance_manage on clearance
  for all using (app_has_role(club_id, array['admin','registrar','digital_technology_manager','blue_card_administrator']))
  with check (app_has_role(club_id, array['admin','registrar','digital_technology_manager','blue_card_administrator']));

drop policy clearance_select on clearance;
create policy clearance_select on clearance
  for select using (app_has_role(club_id, array['admin','registrar','digital_technology_manager','blue_card_administrator']));

-- ------------------------------------------------------------------------- fixture
-- Matrix row "Fixtures": IT Manager and Secretary gain write, alongside
-- admin/registrar/coordinator/coach who already had it.

drop policy fixture_manage on fixture;
create policy fixture_manage on fixture
  for all using (app_has_role(club_id, array['admin','registrar','coordinator','coach','digital_technology_manager','secretary']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator','coach','digital_technology_manager','secretary']));

-- ---------------------------------------------------------------------- appearance
-- Matrix row "Appearances & statistics": IT Manager and the football
-- program coordinators gain write, alongside who already had it.

drop policy appearance_manage on appearance;
create policy appearance_manage on appearance
  for all using (app_has_role(club_id, array['admin','registrar','coordinator','coach','digital_technology_manager','program_coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator','coach','digital_technology_manager','program_coordinator']));

-- ------------------------------------------------------------------- player_profile
-- Matrix row "Player physique (height, weight)": the football program
-- coordinators gain write, alongside admin/registrar/coordinator/coach/
-- technical_director who already had it (0051). IT Manager and Treasurer
-- are both in the source matrix for this row too; IT Manager is added
-- (consistent with its write access everywhere else in the matrix),
-- Treasurer is not — see this migration's header comment.

drop policy player_profile_manage on player_profile;
create policy player_profile_manage on player_profile
  for all using (app_has_role(club_id, array['admin','registrar','coordinator','coach','technical_director','digital_technology_manager','program_coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator','coach','technical_director','digital_technology_manager','program_coordinator']));

drop policy player_profile_select on player_profile;
create policy player_profile_select on player_profile
  for select using (app_has_role(club_id, array['admin','registrar','coordinator','coach','technical_director','digital_technology_manager','program_coordinator']));
