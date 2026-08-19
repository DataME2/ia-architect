-- Local stand-ins for what Supabase provides, so the real migrations and RLS
-- policies can be applied and exercised on a plain Postgres in CI.
--
-- Nothing here ships to Supabase — it only exists so `auth.uid()` and the
-- `authenticated` role resolve locally.

create schema if not exists auth;

-- Supabase owns this table; the shim only needs enough of it for the
-- foreign key in 0003 to resolve.
create table if not exists auth.users (
  id uuid primary key,
  email text
);

-- Supabase derives this from the request JWT. Locally we set the claim with
-- `set local request.jwt.claim.sub = '<uuid>'` to act as a given user.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- The roles Supabase creates. `authenticated` is what a signed-in user's
-- requests run as, and — crucially — it does not own the tables, so RLS
-- applies to it.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
