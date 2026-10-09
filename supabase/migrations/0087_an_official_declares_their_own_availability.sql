-- 0087 — An official declares their own availability (scope 90; BR174).
--
-- The referee process has always begun "referee declares availability"
-- (0024's own header), yet only an admin, registrar or coordinator could
-- read or write it. The official told the coordinator, who typed it in. Now
-- the official declares it themself, from the Referee workspace:
--
--   * **Their weekly windows for a season**, replaced as a whole through
--     `app_set_my_availability()`. A grid saves the week it shows, so a
--     partial write (half deleted, half inserted) must never be visible.
--   * **Their away periods**, added and removed one at a time.
--
-- "Their own" is `app_my_person_ids()` (0043): the caller's linked Person,
-- never a child's. An account exists only from thirteen (0060), which is
-- the age Q80 (C) set for an official deciding their own Saturdays, so no
-- age test is needed here. The person must hold a referee record at that
-- club. The officer policies are untouched: the coordinator still manages
-- everybody's.

-- Whether a Person holds a referee record at a club. Security definer
-- because a policy's own subquery runs as the caller, and an official cannot
-- read `referee_profile` (0023 admits the club's officers only).
create or replace function app_holds_referee_record(p_club_id uuid, p_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from referee_profile where club_id = p_club_id and person_id = p_person_id)
$$;

revoke all on function app_holds_referee_record(uuid, uuid) from public;
grant execute on function app_holds_referee_record(uuid, uuid) to authenticated;

create policy referee_availability_select_own on referee_availability
  for select using (person_id in (select app_my_person_ids()));

create policy referee_unavailability_select_own on referee_unavailability
  for select using (person_id in (select app_my_person_ids()));

create policy referee_unavailability_insert_own on referee_unavailability
  for insert with check (
    person_id in (select app_my_person_ids())
    and app_holds_referee_record(club_id, person_id)
  );

create policy referee_unavailability_delete_own on referee_unavailability
  for delete using (person_id in (select app_my_person_ids()));

-- The whole week, replaced at once. `p_windows` is an array of
-- {weekday, from_time, to_time}; null times mean the whole day.
create or replace function app_set_my_availability(p_club_id uuid, p_season_id uuid, p_windows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person uuid;
  v_count  integer;
begin
  select ap.person_id into v_person
    from account_person ap
   where ap.user_id = auth.uid() and ap.club_id = p_club_id
     and exists (select 1 from referee_profile rp where rp.club_id = p_club_id and rp.person_id = ap.person_id)
   limit 1;
  if v_person is null then
    raise exception 'Only a match official declares their own availability (BR174).' using errcode = '42501';
  end if;
  if not exists (select 1 from season where id = p_season_id and club_id = p_club_id) then
    raise exception 'No such season at this club.';
  end if;
  if jsonb_typeof(coalesce(p_windows, '[]'::jsonb)) <> 'array' then
    raise exception 'The week is a list of windows.';
  end if;

  delete from referee_availability
   where club_id = p_club_id and season_id = p_season_id and person_id = v_person;

  insert into referee_availability (club_id, season_id, person_id, weekday, from_time, to_time)
  select p_club_id, p_season_id, v_person,
         (w ->> 'weekday')::smallint,
         nullif(w ->> 'from_time', '')::time,
         nullif(w ->> 'to_time', '')::time
    from jsonb_array_elements(coalesce(p_windows, '[]'::jsonb)) w;
  get diagnostics v_count = row_count;

  insert into audit_event (club_id, actor_user_id, action, entity, entity_id, detail)
  values (p_club_id, auth.uid(), 'availability_declared', 'person', v_person,
          jsonb_build_object('season_id', p_season_id, 'windows', v_count));
  return v_count;
end;
$$;

revoke all on function app_set_my_availability(uuid, uuid, jsonb) from public;
grant execute on function app_set_my_availability(uuid, uuid, jsonb) to authenticated;
