-- 0047 — A superseded fee schedule is history (scope 53).
--
-- The fee-schedule editor is the screen scope 34 left unbuilt as WP2, and
-- without it no club had any rates, so `rateFor` returned "no rate" for
-- every appointment and **no official could be paid at all**.
--
-- The editor does not offer to change a schedule that has already been
-- superseded, and that offer being absent is not a control. This repository
-- treats a rule displayed and unenforced as its own defect class — the
-- `T2` section of `docs/spec/tasks.md` is a list of them — so the refusal
-- goes where the rule can be relied on.
--
-- **What BR115 actually says.** A schedule is a dated version, not an
-- edited row: a club that raises the assistant referee rate in July has not
-- changed what it owed in May. Editing a superseded schedule is precisely
-- editing the row — it is a second answer to "what did we pay from March",
-- given after the question has been asked.
--
-- **Superseded, not merely past.** The schedule in force is the latest one
-- that has started, and it stays editable: a club that mistyped a rate this
-- morning must be able to correct it. What is closed is a schedule some
-- later schedule has already taken over from. `app_fee_schedule_on` decides
-- which that is, so the trigger asks **it** rather than re-deriving the
-- comparison — a second definition would drift, and it would drift over
-- which version of the table a claim was priced by.
--
-- **Existing claims are safe either way**, and that is worth saying so this
-- is not read as protecting them. BR116 stores the amount on the claim at
-- the moment it was computed and never recomputes it, so a rewritten
-- schedule would not move a claim already raised. What it would move is the
-- price of a claim raised *later* for a match already played — which is the
-- same club, the same match, and a different answer.

create or replace function assert_schedule_is_not_superseded()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_club     uuid;
  v_schedule uuid;
  v_in_force uuid;
  v_from     date;
begin
  -- A delete carries its row in `old`; everything else in `new`.
  if tg_op = 'DELETE' then
    v_club := old.club_id;
    v_schedule := old.schedule_id;
  else
    v_club := new.club_id;
    v_schedule := new.schedule_id;
  end if;

  select effective_from into v_from from referee_fee_schedule where id = v_schedule;
  if v_from is null then
    return coalesce(new, old);
  end if;

  -- A schedule that has not started yet is nobody's answer to anything, and
  -- is freely editable. One that has started is compared against the
  -- schedule in force **on its own start date** — which is itself, unless
  -- something later has taken over by today.
  if v_from > current_date then
    return coalesce(new, old);
  end if;

  v_in_force := app_fee_schedule_on(v_club, current_date);

  if v_in_force is distinct from v_schedule then
    raise exception
      'that fee schedule has been superseded -- it is the answer to what this club '
      'paid from %, and a question already asked does not get a second answer (BR115). '
      'Publish a new schedule instead.', v_from
      using errcode = '42501';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger fee_rate_schedule_is_not_superseded
  before insert or update or delete on referee_fee_rate
  for each row execute function assert_schedule_is_not_superseded();

comment on function assert_schedule_is_not_superseded() is
  'BR115. A schedule some later schedule has taken over from is history: '
  'its rates cannot be added to, changed or removed. The one in force stays '
  'editable, because a rate mistyped this morning must be correctable. '
  'Asks app_fee_schedule_on() rather than re-deriving which is which.';
