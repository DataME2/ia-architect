-- 0068 — A coach reads no payment plan (scope 35 WP2, #73, BR78).
--
-- `payment_plan_select`, `payment_installment_select` and `payment_select`
-- were `club_id in (select app_member_club_ids())`: any member of the club,
-- whatever their role, read every family's plan, its instalment schedule
-- and every receipt. The club answered #73 in September 2026 that a coach
-- sees whether a player is clear to play, never the money (BR78), and its
-- own matrix (scope 29 §2c) gives payment plans and payments to four roles
-- only: the admin, the treasurer, the registrar and the IT manager.
--
-- The three read policies are narrowed to exactly those four. Writing is
-- unchanged (`_manage`, admin and treasurer). A family still reads its own
-- through the `_select_family` policies (0028), which are not touched.
--
-- BR3's verdict does not depend on this: it reads the balance on
-- `registration`, and a plan only adds detail to its message. That balance
-- column, and `registration_voucher` (which the committee needs for BR21),
-- are left for scope 35's later work and are not changed here.

drop policy if exists payment_plan_select on payment_plan;
create policy payment_plan_select on payment_plan
  for select using (
    app_has_role(club_id, array['admin','treasurer','registrar','digital_technology_manager'])
  );

drop policy if exists payment_installment_select on payment_installment;
create policy payment_installment_select on payment_installment
  for select using (
    app_has_role(club_id, array['admin','treasurer','registrar','digital_technology_manager'])
  );

drop policy if exists payment_select on payment;
create policy payment_select on payment
  for select using (
    app_has_role(club_id, array['admin','treasurer','registrar','digital_technology_manager'])
  );
