-- 0040 — A person can see the office they hold (bug fix).
--
-- Reported against a real account: somebody elected **president** on the
-- governance screen opened `/me` and found no governance workspace.
--
-- The product has three separate things that can be called "committee", and
-- only one of them is the election:
--
--   * `club_membership.role = 'committee'` — an access grant made to an
--     *account*, by an admin, entirely separately from any election;
--   * `person_role.role = 'committee'` — a season role on the Person;
--   * `committee_position` — the **office**, held for a term (BR85), which
--     is what the governance screen writes and what BR21 means when it says
--     an approval rests on committee authority.
--
-- Two defects, one in each layer. The application checked the first two and
-- never the third — fixed in `src/data/me.ts`. And underneath it, this: the
-- select policy on both governance tables admits only club **members**, so
-- an elected officer whose account holds no `club_membership` row — a
-- parent elected at the AGM, which is the ordinary case at a volunteer
-- club — could not read the fact of their own election at all. Fixing the
-- screen alone would have left it reading nothing.
--
-- **The shape is 0028's, reused rather than invented.** That migration
-- admitted a guardian to their own household through `account_person`,
-- beside the membership-based policy rather than instead of it. Permissive
-- policies combine with `or`, so a policy that admits a person to their own
-- row **cannot narrow** what a club officer already sees — which is the
-- property that makes this safe to add to a table BR21 says is club
-- information.
--
-- Deliberately **not** widened to a guardian's children, unlike
-- `app_my_family_person_ids`. BR87 puts a floor of eighteen under every
-- committee position, so a child's committee row is a row that cannot
-- exist; a helper that reached for one would be answering a question the
-- schema already refuses to ask.
--
-- Read only. Changing the committee stays an admin's act (BR21) — the
-- `_manage` policies are untouched, and `supabase/tests/41` asserts that a
-- president can neither promote herself nor appoint anybody.

-- ------------------------------------------------------- app_my_person_ids
-- The caller's own Person at each club, and nobody else's.
--
-- `security definer` for the same reason 0028's helpers are: every row is
-- reached through `auth.uid()`, which a caller cannot set, so there is
-- nothing here for a membership check to add. The link existing at all is
-- what an admin controls, and unlinking it is the revocation point (BR107).

create or replace function app_my_person_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select person_id from account_person where user_id = auth.uid()
$$;

revoke all on function app_my_person_ids() from public;
grant execute on function app_my_person_ids() to authenticated;

comment on function app_my_person_ids() is
  'The Person rows the calling account is linked to. Their own and no '
  'other — unlike app_my_family_person_ids(), which also reaches a '
  'guardian''s children, and deliberately so: BR87 means a child holds no '
  'committee office for a guardian to read.';

-- ------------------------------------------------------------- the policies
-- Additive. Each sits beside the existing membership-based select policy,
-- which is unchanged.

create policy committee_position_select_own on committee_position
  for select using (person_id in (select app_my_person_ids()));

-- The term as well as the position. BR85 holds a position for exactly one
-- term, so a position without its term is a row with no mandate behind it —
-- the screen cannot say whether the office is current, which is the first
-- thing it is asked.
create policy committee_term_select_own on committee_term
  for select using (
    id in (
      select term_id from committee_position
       where person_id in (select app_my_person_ids())
    )
  );
