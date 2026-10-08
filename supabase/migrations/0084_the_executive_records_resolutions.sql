-- 0084 — The executive records committee resolutions (scope 86; BR123
-- amended).
--
-- 0049 let `admin` and `committee` record a resolution. The Secretary keeps
-- the minutes and the Treasurer is an elected officer of the same meeting,
-- yet neither could record what the meeting decided unless they also held
-- the `committee` role. Both now may. The table stays append-only: still
-- no update or delete policy.

drop policy if exists committee_resolution_record on committee_resolution;
create policy committee_resolution_record on committee_resolution
  for insert with check (app_has_role(club_id, array['admin', 'committee', 'secretary', 'treasurer']));
