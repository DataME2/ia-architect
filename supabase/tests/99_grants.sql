-- Table privileges for the Supabase roles.
--
-- RLS decides *which rows* a role may touch; GRANT decides whether it may
-- touch the table at all. Both are needed — a policy without a grant denies
-- everything, and a grant without a policy is the leak check_rls.py exists
-- to catch.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to anon, authenticated;
