-- 0063 — A family reads the player record it holds authority over (scope 70, BR155).
--
-- BR149 promised a player "the workspace keeps showing the last confirmed
-- value", and a guardian has always been told they answer for the child
-- (BR63). Neither could read `player_profile` at all: its only select
-- policy names the five roles that pick teams (BR99, 0051). So a club
-- officer corrected a child's position or squad number and the family who
-- holds authority over that child saw nothing change — reported as a bug,
-- and it was one.
--
-- **Not a policy on `player_profile`.** RLS is row-level, and the row
-- carries height and weight, which BR99 keeps to the roles that pick teams.
-- A family select policy would hand a parent the whole row, physique
-- included. Instead, decision 11's shape: a `security definer` function
-- that derives the household from `auth.uid()` (through
-- app_my_family_person_ids, 0028) and returns only the columns BR149
-- already calls the player's own — positions, foot, squad number.
-- `player_profile_select` is untouched, so BR99 stays exactly as narrow.
--
-- The household is not an argument. The club is, because a family may
-- hold links at more than one club, but app_my_family_person_ids returns
-- nothing at a club where the caller holds no link.

create or replace function app_family_player_profiles(p_club_id uuid)
returns table (
  registration_id    uuid,
  person_id          uuid,
  preferred_position text,
  secondary_position text,
  preferred_foot     text,
  squad_number       integer,
  recorded_on        date
)
language sql
stable
security definer
set search_path = public
as $$
  select pp.registration_id,
         r.person_id,
         pp.preferred_position,
         pp.secondary_position,
         pp.preferred_foot,
         pp.squad_number,
         pp.recorded_on
    from player_profile pp
    join registration r on r.id = pp.registration_id and r.club_id = pp.club_id
   where pp.club_id = p_club_id
     and r.person_id in (select app_my_family_person_ids(p_club_id))
$$;

revoke all on function app_family_player_profiles(uuid) from public;
grant execute on function app_family_player_profiles(uuid) to authenticated;

comment on function app_family_player_profiles(uuid) is
  'BR155: the player record a family holds authority over — the player '
  'themselves and any child under is_authority guardianship — without '
  'height or weight, which BR99 keeps to the roles that pick teams.';
