-- 0064 — The club reads the player record, without the physique (scope 70, BR156).
--
-- 0063 let a family read the record. The same report had a second half: a
-- committee member opened the registrar's player page for a record an
-- administrator had just corrected and saw "Position not recorded", no
-- squad number and an empty form. `player_profile_select` names only the
-- roles that pick teams (BR99, 0051), so any other role reads no row at all,
-- and the page could not tell "nobody recorded it" from "you may not see it".
--
-- BR99 narrowed the whole row to protect two columns, height and weight.
-- The other four (positions, preferred foot, squad number) are as public
-- inside a club as the season's statistics, which every member already
-- reads (scope 29). So, in 0063's shape: a `security definer` function that
-- returns those four columns to any member of the player's club, and never
-- height or weight. `player_profile_select` is untouched, so BR99 stays
-- exactly as narrow.
--
-- The club is not an argument. It comes from the registration, and the
-- caller must be a member of it (app_member_club_ids, 0002); a registration
-- at another club returns nothing.

create or replace function app_club_player_profile(p_registration_id uuid)
returns table (
  registration_id    uuid,
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
         pp.preferred_position,
         pp.secondary_position,
         pp.preferred_foot,
         pp.squad_number,
         pp.recorded_on
    from player_profile pp
   where pp.registration_id = p_registration_id
     and pp.club_id in (select app_member_club_ids())
$$;

revoke all on function app_club_player_profile(uuid) from public;
grant execute on function app_club_player_profile(uuid) to authenticated;

comment on function app_club_player_profile(uuid) is
  'BR156: a player''s positions, preferred foot and squad number for any '
  'member of their club, without height or weight, which BR99 keeps to the '
  'roles that pick teams.';
