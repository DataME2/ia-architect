-- Registration slice — Row-Level Security policies.
--
-- This file IS Principle P5. Tenant isolation is enforced here, in the
-- database, rather than by remembering `where club_id = ...` in every query:
-- a forgotten filter then returns nothing instead of everything.
--
-- Every table created in 0001 must appear here. scripts/check_rls.py fails
-- the build if one does not, because a table without a policy is open.

-- Clubs the current user belongs to. STABLE so the planner can cache it
-- within a statement; SECURITY DEFINER so the lookup itself is not subject
-- to the policy it is used by (which would recurse).
create or replace function app_member_club_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select club_id from club_membership where user_id = auth.uid()
$$;

-- Whether the current user holds one of the given roles at a club.
create or replace function app_has_role(target_club_id uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from club_membership
    where user_id = auth.uid()
      and club_id = target_club_id
      and role = any(roles)
  )
$$;

-- ------------------------------------------------------------------ club

create policy club_select on club
  for select using (id in (select app_member_club_ids()));

-- Clubs are provisioned by platform operations, not by their own members.
create policy club_modify on club
  for all using (false) with check (false);

-- -------------------------------------------------------- club_membership

create policy club_membership_select on club_membership
  for select using (club_id in (select app_member_club_ids()));

create policy club_membership_manage on club_membership
  for all using (app_has_role(club_id, array['admin']))
  with check (app_has_role(club_id, array['admin']));

-- ---------------------------------------------------------------- season

create policy season_select on season
  for select using (club_id in (select app_member_club_ids()));

create policy season_manage on season
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- ---------------------------------------------------------------- person
-- Read is club-wide for members; writes are the registrar's.

create policy person_select on person
  for select using (club_id in (select app_member_club_ids()));

create policy person_manage on person
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- ----------------------------------------------------------- person_role

create policy person_role_select on person_role
  for select using (club_id in (select app_member_club_ids()));

create policy person_role_manage on person_role
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- ---------------------------------------------------------- guardianship

create policy guardianship_select on guardianship
  for select using (club_id in (select app_member_club_ids()));

create policy guardianship_manage on guardianship
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- ---------------------------------------------------------- registration

create policy registration_select on registration
  for select using (club_id in (select app_member_club_ids()));

create policy registration_manage on registration
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- ------------------------------------------------- registration_document

create policy registration_document_select on registration_document
  for select using (club_id in (select app_member_club_ids()));

create policy registration_document_manage on registration_document
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- --------------------------------------------------------------- consent

create policy consent_select on consent
  for select using (club_id in (select app_member_club_ids()));

create policy consent_manage on consent
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- ----------------------------------------------------- validation_result
-- Written by the rules engine, never edited by hand: a validation result
-- that a human can change is not evidence of anything.

create policy validation_result_select on validation_result
  for select using (club_id in (select app_member_club_ids()));

create policy validation_result_insert on validation_result
  for insert with check (app_has_role(club_id, array['admin','registrar']));

create policy validation_result_no_update on validation_result
  for update using (false) with check (false);

create policy validation_result_no_delete on validation_result
  for delete using (false);

-- ------------------------------------------------------- submission_pack
-- BR58: immutable once generated. A new version is a new row; the one that
-- was sent is the club's evidence of what it sent, so it cannot be edited.
-- The single permitted update is recording the handover.

create policy submission_pack_select on submission_pack
  for select using (club_id in (select app_member_club_ids()));

create policy submission_pack_insert on submission_pack
  for insert with check (app_has_role(club_id, array['admin','registrar']));

create policy submission_pack_record_handover on submission_pack
  for update using (app_has_role(club_id, array['admin','registrar']) and handed_over_at is null)
  with check (app_has_role(club_id, array['admin','registrar']));

create policy submission_pack_no_delete on submission_pack
  for delete using (false);

-- ----------------------------------------------------- submission_record

create policy submission_record_select on submission_record
  for select using (club_id in (select app_member_club_ids()));

create policy submission_record_manage on submission_record
  for all using (app_has_role(club_id, array['admin','registrar']))
  with check (app_has_role(club_id, array['admin','registrar']));

-- ----------------------------------------------------------- audit_event
-- Append-only, and not even the registrar may rewrite it.

create policy audit_event_select on audit_event
  for select using (app_has_role(club_id, array['admin']));

create policy audit_event_insert on audit_event
  for insert with check (club_id in (select app_member_club_ids()));

create policy audit_event_no_update on audit_event
  for update using (false) with check (false);

create policy audit_event_no_delete on audit_event
  for delete using (false);
