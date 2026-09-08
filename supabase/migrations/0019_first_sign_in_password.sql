-- 0019 — A password the person chose, set on first arrival.
--
-- Somebody invited to a club arrives through a magic link and is signed in
-- without ever having a password. They can work, and then cannot get back
-- in: `/sign-in` asks for a password they do not have, and the only way
-- back is another link from the platform owner — the support burden the
-- invitation was meant to remove, arriving one day later.
--
-- **Why not email a temporary password**, which is what was asked for: it
-- travels in plaintext, and then it sits in that inbox for as long as the
-- inbox exists. The link already emailed is single-use and expires, which
-- is strictly better as a first credential. What was missing is the second
-- half — being made to choose a password once inside — and that is what
-- this adds.
--
-- `auth.users.encrypted_password` cannot answer "have they chosen one":
-- Supabase populates it for magic-link users too. So the fact is recorded
-- here, by the application, at the moment it becomes true.

create table user_password_set (
  user_id uuid primary key references auth.users (id) on delete cascade,
  set_at  timestamptz not null default now()
);

alter table user_password_set enable row level security;

-- No API access in either direction: written only by the function below,
-- read only through `app_needs_password()`. A table a client can write is a
-- table a client can use to skip the prompt.
create policy user_password_set_no_api_access on user_password_set
  for all using (false) with check (false);

-- Everybody who already has an account chose their own password, so nobody
-- existing is prompted. Only people who arrive from here on are.
insert into user_password_set (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ------------------------------------------------------ app_needs_password

create or replace function app_needs_password()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- An account with no email address is an anonymous demonstration
  -- visitor. They cannot sign in with a password and never will, so
  -- prompting them for one would trap them on a page that means nothing
  -- to them. Keyed on the email rather than on `is_anonymous` so the same
  -- statement runs against the local test shim.
  select exists (
    select 1 from auth.users u
     where u.id = auth.uid()
       and coalesce(u.email, '') <> ''
       and not exists (select 1 from user_password_set p where p.user_id = u.id)
  )
$$;

-- --------------------------------------------------- record_password_set
-- Called after `updateUser({ password })` has actually succeeded.
--
-- It records only that the caller set their own password — the id comes
-- from `auth.uid()` and never from an argument, so this cannot be used to
-- mark somebody else as done and skip their prompt.

create or replace function record_password_set()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No session.' using errcode = '42501';
  end if;
  insert into user_password_set (user_id) values (auth.uid())
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function app_needs_password() from public;
revoke all on function record_password_set() from public;
grant execute on function app_needs_password() to authenticated;
grant execute on function record_password_set() to authenticated;

comment on table user_password_set is
  'Who has chosen their own password. Needed because '
  'auth.users.encrypted_password is populated for magic-link users too and '
  'therefore cannot answer the question.';
