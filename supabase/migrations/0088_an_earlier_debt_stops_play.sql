-- 0088 — An earlier season's debt at the same club stops play (scope 92;
-- BR79 amended; open question 81 answered).
--
-- BR79 opened "a Player with any amount outstanding does not take the
-- field", yet eligibility read only the registration's own season. A family
-- could leave 2025 unpaid and play in 2026. The product owner's answer,
-- October 2026: **at the same club, an earlier season's debt stops play.**
--
-- `app_registration_money()` gains `owes_earlier`, which every reader gets,
-- exactly as `owes` is: a coach learns "not clear", never an amount (BR78).
-- It is true when the same Person has another registration at the same club
-- that:
--
--   * belongs to a season that **ended before this one began**,
--   * ended **within the last two years** (BR79's visibility window; older
--     debts are the treasurer's to resolve, not the team sheet's),
--   * still has money outstanding, and
--   * has not been **amended** by the treasurer: an `arrears_action` of
--     `amendment_recorded` is the documented, reasoned decision BR79 asks
--     for (a waiver, a plan, a correction). `payment_requested` is not; it
--     is the chase, and the player stays off until it is paid.
--
-- A hardship the committee approved (BR164) still lets an owing player take
-- the field until its date, as it does for this season's debt.
--
-- Debts at **another** club are not visible here: a Person is one club's
-- record (P5), and nothing crosses tenants.

drop function if exists app_registration_money(uuid[]);

create function app_registration_money(p_registration_ids uuid[])
returns table (
  registration_id          uuid,
  outstanding_amount_cents integer,
  owes                     boolean,
  hardship_until           date,
  owes_earlier             boolean
)
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
           where h.registration_id = r.id and h.state = 'approved' and h.valid_until >= current_date),
         exists (
           select 1
             from registration e
             join season es on es.id = e.season_id
             join season cur on cur.id = r.season_id
            where e.club_id = r.club_id
              and e.person_id = r.person_id
              and e.id <> r.id
              and es.ends_on < cur.starts_on
              and es.ends_on >= current_date - interval '2 years'
              and e.outstanding_amount_cents > 0
              and (select a.action from arrears_action a
                    where a.club_id = e.club_id and a.person_id = e.person_id and a.season_id = e.season_id
                    order by a.recorded_at desc limit 1) is distinct from 'amendment_recorded')
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
  'anything is owed, the date an approved hardship (BR164) runs until, and '
  'whether an earlier season at the same club, ended within two years and not '
  'amended, still owes (0088).';
