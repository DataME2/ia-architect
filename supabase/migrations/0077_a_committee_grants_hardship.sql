-- 0077 — A committee grants hardship (scope 82; question 50; BR79, BR164).
--
-- BR79 is "no pay, no play", absolute. Question 50 asked whether there is a
-- hardship override and who grants it, and expected BR21's shape: a
-- Committee decision, recorded, with the approver named. The club asked for
-- it to be built, October 2026.
--
--   * A family asks (an authority guardian, or the player from thirteen —
--     `app_may_answer_designation`, 0075), or the registrar or treasurer asks
--     on their behalf. Every request carries a reason.
--   * The committee decides — a member holding committee, admin, secretary
--     or treasurer — through `app_decide_hardship()`, never by editing the
--     row: approved until a date, or declined with a reason. Who decided and
--     when are written by the function, not supplied.
--   * While approved, the player may take the field although money is owed.
--     **The debt is not forgiven**: the balance, BR3 and the arrears view are
--     unchanged. Only BR79's verdict changes, and only until the date.
--
-- `app_registration_money()` (0070) gains `hardship_until`, so the verdict
-- every screen already reads carries the override with it. A coach learns
-- only "clear to play"; the reason stays with the family and the committee.

create table hardship_request (
  id                     uuid primary key default gen_random_uuid(),
  club_id                uuid not null references club(id) on delete cascade,
  registration_id        uuid not null references registration(id) on delete cascade,
  person_id              uuid not null references person(id) on delete cascade,
  reason                 text not null check (btrim(reason) <> ''),
  requested_by_person_id uuid references person(id),
  requested_by_user_id   uuid,
  requested_at           timestamptz not null default now(),
  state                  text not null default 'requested'
    check (state in ('requested', 'approved', 'declined')),
  valid_until            date,
  decision_note          text,
  decided_by_user_id     uuid,
  decided_at             timestamptz,
  check (state <> 'approved' or valid_until is not null),
  check (state <> 'declined' or btrim(coalesce(decision_note, '')) <> '')
);

-- One open request per registration at a time.
create unique index hardship_request_one_open
  on hardship_request (registration_id) where state = 'requested';
create index hardship_request_club_idx on hardship_request (club_id, state);

alter table hardship_request enable row level security;

-- Who decides: the committee, BR21's shape.
create or replace function app_may_decide_hardship(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_has_role(p_club_id, array['admin', 'committee', 'secretary', 'treasurer'])
$$;

revoke all on function app_may_decide_hardship(uuid) from public;
grant execute on function app_may_decide_hardship(uuid) to authenticated;

create policy hardship_request_select on hardship_request
  for select using (
    app_may_decide_hardship(club_id)
    or app_has_role(club_id, array['registrar'])
    or person_id in (select app_my_family_person_ids(club_id))
  );

-- Asking: the family (whoever answers for the player), or a registrar or
-- treasurer on their behalf. The registration must be the player's own.
create policy hardship_request_ask on hardship_request
  for insert with check (
    state = 'requested'
    and decided_by_user_id is null
    and exists (select 1 from registration r
                 where r.id = registration_id and r.club_id = hardship_request.club_id
                   and r.person_id = hardship_request.person_id)
    and (
      (requested_by_person_id in (select app_my_person_ids())
       and requested_by_person_id in (select app_may_answer_designation(person_id, club_id, current_date)))
      or (app_has_role(club_id, array['registrar', 'treasurer', 'admin'])
          and requested_by_user_id = auth.uid())
    )
  );

-- No update or delete policy: a decision goes through the function below.

create or replace function app_decide_hardship(
  p_request_id uuid, p_approve boolean, p_valid_until date, p_note text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v hardship_request;
begin
  select * into v from hardship_request where id = p_request_id;
  if v.id is null then
    raise exception 'No such hardship request.';
  end if;
  if not app_may_decide_hardship(v.club_id) then
    raise exception 'Only the committee decides a hardship request (BR164).' using errcode = '42501';
  end if;
  if v.state <> 'requested' then
    raise exception 'That request has already been decided.';
  end if;
  if p_approve and (p_valid_until is null or p_valid_until < current_date) then
    raise exception 'An approved hardship runs until a date that has not passed (BR164).';
  end if;
  if not p_approve and btrim(coalesce(p_note, '')) = '' then
    raise exception 'A declined hardship request says why (BR164).';
  end if;

  update hardship_request
     set state = case when p_approve then 'approved' else 'declined' end,
         valid_until = case when p_approve then p_valid_until end,
         decision_note = nullif(btrim(coalesce(p_note, '')), ''),
         decided_by_user_id = auth.uid(),
         decided_at = now()
   where id = p_request_id;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (v.club_id, auth.uid(),
          case when p_approve then 'hardship_approved' else 'hardship_declined' end,
          'hardship_request', p_request_id,
          jsonb_build_object('registration_id', v.registration_id, 'valid_until', p_valid_until));

  return case when p_approve then 'approved' else 'declined' end;
end;
$$;

revoke all on function app_decide_hardship(uuid, boolean, date, text) from public;
grant execute on function app_decide_hardship(uuid, boolean, date, text) to authenticated;

-- ------------------------------------------- the verdict carries the override
-- Same doors and the same figure rule as 0070, plus the latest approved,
-- unexpired hardship. A new return column means a new function.

drop function if exists app_registration_money(uuid[]);

create function app_registration_money(p_registration_ids uuid[])
returns table (registration_id uuid, outstanding_amount_cents integer, owes boolean, hardship_until date)
language sql stable security definer set search_path = public
as $$
  select r.id,
         case
           when app_has_role(r.club_id, array['admin','treasurer','registrar','digital_technology_manager'])
             or exists (
               select 1 from guardianship g
                where g.club_id = r.club_id
                  and g.person_id = r.person_id
                  and g.is_authority
                  and g.guardian_person_id in (select app_my_person_ids()))
             or (r.person_id in (select app_my_person_ids())
                 and coalesce(app_is_adult_on(r.person_id, current_date), false))
           then r.outstanding_amount_cents
         end,
         r.outstanding_amount_cents > 0,
         (select max(h.valid_until) from hardship_request h
           where h.registration_id = r.id and h.state = 'approved' and h.valid_until >= current_date)
    from registration r
   where r.id = any(p_registration_ids)
     and (
       app_reads_club_wide(r.club_id)
       or (r.club_id in (select app_member_club_ids())
           and r.person_id in (select app_my_team_person_ids(r.club_id)))
       or r.person_id in (select app_my_family_person_ids(r.club_id))
     )
$$;

revoke all on function app_registration_money(uuid[]) from public;
grant execute on function app_registration_money(uuid[]) to authenticated;

comment on function app_registration_money(uuid[]) is
  'BR78/BR79: for each readable registration, the balance (money roles, a '
  'guardian with authority, an adult about themself; otherwise null), whether '
  'anything is owed, and the date an approved hardship (BR164) runs until.';
