-- Table privileges for the Supabase roles.
--
-- RLS decides *which rows* a role may touch; GRANT decides whether it may
-- touch the table at all. Both are needed — a policy without a grant denies
-- everything, and a grant without a policy is the leak check_rls.py exists
-- to catch.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to anon, authenticated;

-- 0070 (BR78): the balance is not a selectable column. Supabase's own
-- defaults grant at table creation, before the migration revokes; here the
-- blanket grant above runs after every migration, so it is narrowed again.
revoke select on registration from anon, authenticated;
grant select (id, club_id, person_id, season_id, status, created_at) on registration to anon, authenticated;
grant select (playing_group, imported_from) on registration to authenticated;

-- 0101 (BR90): an import is the platform owner's, run with the database
-- role; no club user may call it, so the blanket grant is narrowed here too.
revoke execute on function import_history_season(uuid, jsonb) from anon, authenticated;
