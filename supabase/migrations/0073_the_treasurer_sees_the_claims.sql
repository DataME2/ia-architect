-- 0073 — The treasurer sees the claims they decide (bug fix; BR78, BR117).
--
-- The treasurer decides referee claims and pays the runs, and could read
-- every claim and run — but not `match_official_appointment`, which is the
-- admin's, registrar's and coordinator's (0026). Every claim screen joins a
-- claim to its appointment for the official's name and the fixture, and
-- drops a claim it cannot join, so a treasurer signed in alone saw
-- "Nothing waiting on a decision" over a raised claim, "No approved claims"
-- over two approved ones, and approving one sent the official no notice.
--
-- An additive read for the treasurer, of **only the appointments a claim was
-- raised against** — not the designation list, which is not theirs. Through a
-- `security definer` helper because the claim's own family policy (0057)
-- already reads this table, and two policies reading each other recurse.

create or replace function app_claimed_appointment_ids(p_club_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select appointment_id from referee_payment_claim where club_id = p_club_id
$$;

revoke all on function app_claimed_appointment_ids(uuid) from public;
grant execute on function app_claimed_appointment_ids(uuid) to authenticated;

create policy match_official_appointment_select_treasurer on match_official_appointment
  for select using (
    app_has_role(club_id, array['treasurer'])
    and id in (select app_claimed_appointment_ids(club_id))
  );
