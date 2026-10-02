-- 0074 — The treasurer reads the referee side, and can undo an open run
-- (scope 77; BR163, BR117 extended).
--
-- The club asked, October 2026, that every actor in the referee pipeline
-- can see the steps either side of their own: the coordinator designates
-- and verifies, the treasurer approves and pays. A treasurer who cannot see
-- who was designated or what was verified approves a claim blind.
--
--   1. **The treasurer reads every match appointment** — read only. 0073
--      gave them only the appointments a claim was raised against; this
--      widens that to the designation list, so 0073's narrow policy and its
--      helper go. Writing stays with admin, registrar and coordinator.
--      (`appointment_verification` was already readable by the treasurer.)
--
--   2. **An open payment run can be deleted** by the admin or treasurer, who
--      already manage runs (0027). A closed or paid run cannot: its total has
--      been acted on (BR117). Any claim in the deleted run returns to
--      "approved, not in a run", unchanged otherwise.

-- ------------------------------------------------------------ 1. the read

drop policy if exists match_official_appointment_select_treasurer on match_official_appointment;
drop function if exists app_claimed_appointment_ids(uuid);

drop policy if exists match_official_appointment_select on match_official_appointment;
create policy match_official_appointment_select on match_official_appointment
  for select using (
    app_has_role(club_id, array['admin', 'registrar', 'coordinator', 'treasurer'])
  );

-- ------------------------------------------------------ 2. deleting a run

create or replace function referee_payment_batch_deletes_only_open()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.closed_at is not null or old.paid_at is not null then
    raise exception 'Only an open payment run can be deleted; a closed run''s total has been acted on (BR117).'
      using errcode = '23514';
  end if;

  -- Its claims go back to waiting for a run, nothing else about them changes.
  update referee_payment_claim
     set batch_id = null
   where club_id = old.club_id
     and batch_id = old.id;

  return old;
end;
$$;

create trigger referee_payment_batch_deletes_only_open
  before delete on referee_payment_batch
  for each row execute function referee_payment_batch_deletes_only_open();
