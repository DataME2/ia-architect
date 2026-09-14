-- 0040 — Outstanding-balance visibility across seasons (scope 48, WP1).
--
-- [Scope 47](../../docs/scope/47_stakeholder-answers-september-2026.md)
-- restated BR40 and BR79 in text: a debt from a season now archived must
-- not quietly disappear at season change, and the Registrar and Treasurer
-- jointly keep it in view for **at least two years**, with the Treasurer
-- either obtaining payment or recording a documented, reasoned amendment.
-- Nothing built that. `registration.outstanding_amount_cents` has always
-- been scoped to one season (`unique (person_id, season_id)`), and no
-- query ever looked across the seasons a Person has accumulated.
--
-- Two pieces, in the shape [scope 42](../../docs/scope/42_numbers_a_committee_can_act_on.md)
-- already established for exactly this reason:
--
--   * `app_outstanding_balances` — **BR142 applies here too.** A coach
--     aggregating what RLS lets them see would not even get a wrong
--     number, because `registration` is currently club-wide readable
--     (0002's `registration_select`) — this function's own explicit role
--     check is what BR78/BR79 actually rest on until that base-table
--     policy is itself narrowed, which is not this migration's job.
--   * `arrears_action` — append-only, the same shape `payment` uses for
--     BR77: a correction is a new row, never an edit. BR79's "never a
--     silent write-off" is a table-level check constraint, not only a
--     function's discipline, because a check constraint holds even
--     against a caller who never goes through the convenience function
--     below.

-- ------------------------------------------------------------ the table

create table arrears_action (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references club(id) on delete cascade,
  person_id           uuid not null references person(id) on delete cascade,
  -- The season the arrear belongs to — the same balance can be chased more
  -- than once, and each attempt is its own row rather than an overwritten
  -- status, so a family asked twice shows two entries, not one edited note.
  season_id           uuid not null references season(id) on delete cascade,
  action              text not null check (action in ('payment_requested', 'amendment_recorded')),
  -- BR79: an amendment is never silent. Enforced here, not only by the
  -- convenience function below, because a check constraint holds against
  -- every caller and a function's validation holds only against the ones
  -- that use it.
  reason              text
    check (action <> 'amendment_recorded' or length(btrim(coalesce(reason, ''))) > 0),
  recorded_by_user_id uuid not null,
  recorded_at         timestamptz not null default now()
);
create index arrears_action_person_idx on arrears_action (person_id, recorded_at desc);
create index arrears_action_season_idx on arrears_action (season_id);

comment on table arrears_action is
  'BR79: the Treasurer''s recorded response to a prior-season arrear -- '
  'payment requested, or a documented, reasoned amendment. Append-only, '
  'like payment (BR77): a correction is a new row, never an edit.';

comment on column arrears_action.reason is
  'Required when action = amendment_recorded (BR79: never a silent write-off). '
  'Optional for payment_requested, where the ask speaks for itself.';

alter table arrears_action enable row level security;

create policy arrears_action_select on arrears_action
  for select using (app_has_role(club_id, array['admin', 'treasurer', 'registrar']));

-- BR77-style append-only: insert only, no update or delete policy. With
-- RLS on, an operation with no policy is denied outright rather than
-- merely discouraged.
create policy arrears_action_insert on arrears_action
  for insert with check (app_has_role(club_id, array['admin', 'treasurer']));

-- --------------------------------------------------- app_outstanding_balances
-- Every Person with money owed from a season within the last two years,
-- regardless of which season it was, and whatever the Treasurer has
-- already done about it. **Refuses rather than under-counts** (BR142):
-- Registrar and Treasurer get the true cross-season total; anyone else
-- gets an exception naming the rule, never a partial or empty result that
-- would read as "nobody owes anything".

create or replace function app_outstanding_balances(p_club_id uuid)
returns table (
  person_id         uuid,
  person_name       text,
  season_id         uuid,
  season_name       text,
  season_ended_on   date,
  outstanding_cents integer,
  age_days          integer,
  last_action       text,
  last_action_at    timestamptz,
  computed_at       timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not app_has_role(p_club_id, array['admin', 'treasurer', 'registrar']) then
    raise exception
      'BR142: this report is not readable by your role — a partial total would be worse than none';
  end if;

  return query
  with owing as (
    -- BR79's two-year window is measured from the season's own end, not
    -- from today of the query — a debt from a season that ended twenty-
    -- three months ago is still in view; one that ended twenty-five is not.
    select r.person_id, r.season_id, s.ends_on, r.outstanding_amount_cents
      from registration r
      join season s on s.id = r.season_id
     where r.club_id = p_club_id
       and r.outstanding_amount_cents > 0
       and s.ends_on >= (current_date - interval '2 years')
  ),
  latest_action as (
    select distinct on (a.person_id, a.season_id)
           a.person_id, a.season_id, a.action, a.recorded_at
      from arrears_action a
     where a.club_id = p_club_id
     order by a.person_id, a.season_id, a.recorded_at desc
  )
  select
    o.person_id,
    p.legal_given_names || ' ' || p.legal_family_name,
    o.season_id,
    s.name,
    o.ends_on,
    o.outstanding_amount_cents,
    (current_date - o.ends_on)::integer,
    la.action,
    la.recorded_at,
    now()
    from owing o
    join person p on p.id = o.person_id
    join season s on s.id = o.season_id
    left join latest_action la on la.person_id = o.person_id and la.season_id = o.season_id
   order by o.ends_on asc, o.outstanding_amount_cents desc;
end
$$;

comment on function app_outstanding_balances(uuid) is
  'BR40/BR79: every Person owing money from a season within the last two years, '
  'across all seasons, with the Treasurer''s most recent recorded action against '
  'each. Restricted to admin/treasurer/registrar (BR142) — refuses rather than '
  'computing a partial total for anyone else.';

revoke all on function app_outstanding_balances(uuid) from public;
grant execute on function app_outstanding_balances(uuid) to authenticated;

-- --------------------------------------------------- app_record_arrears_action
-- The one write path a screen needs, ahead of a plain insert: it turns
-- BR79's "never a silent write-off" into a sentence naming the rule, the
-- same courtesy `record_interest` and `app_record_alert_outcome` extend
-- elsewhere, rather than leaving a caller to decode a bare constraint
-- violation. The check constraint on `arrears_action.reason` still holds
-- underneath — this function does not replace it, it just fails first,
-- with a better message.

create or replace function app_record_arrears_action(
  p_club_id  uuid,
  p_person_id uuid,
  p_season_id uuid,
  p_action    text,
  p_reason    text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_id     uuid;
begin
  if p_action not in ('payment_requested', 'amendment_recorded') then
    raise exception 'Unknown arrears action: %', p_action using errcode = '22023';
  end if;

  if p_action = 'amendment_recorded' and v_reason is null then
    raise exception
      'BR79: an amendment is never silent — a reason is required to record one'
      using errcode = '22023';
  end if;

  insert into arrears_action (club_id, person_id, season_id, action, reason, recorded_by_user_id)
  values (p_club_id, p_person_id, p_season_id, p_action, v_reason, auth.uid())
  returning id into v_id;

  return v_id;
end
$$;

comment on function app_record_arrears_action(uuid, uuid, uuid, text, text) is
  'BR79: records the Treasurer''s response to a prior-season arrear. '
  'security invoker -- relies on arrears_action_insert''s RLS policy for who '
  'may call it, and exists only to name BR79 in the error rather than '
  'leaving a bare constraint violation.';

revoke all on function app_record_arrears_action(uuid, uuid, uuid, text, text) from public;
grant execute on function app_record_arrears_action(uuid, uuid, uuid, text, text) to authenticated;
