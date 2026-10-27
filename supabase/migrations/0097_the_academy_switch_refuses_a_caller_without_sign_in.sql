-- 0097 — The academy switch refuses a caller who is not signed in (BR184).
--
-- 0096's `app_set_team_academy` runs as its owner and leaves the decision to
-- the trigger `assert_a_technical_lead_marks_academy`, which lets a write
-- without `auth.uid()` through: that exemption is for seeds and tests. But
-- Supabase grants `execute` on every new function to `anon`, so a caller
-- holding only the public key and a team's id could mark or unmark it,
-- changing who is asked to check in. Consent still guarded every entry, and
-- nothing could be read.
--
-- The function now decides for itself, so the exemption stays the
-- platform's, and `anon` loses `execute` on 0096's functions.

create or replace function app_set_team_academy(p_team_id uuid, p_academy boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from team t where t.id = p_team_id and app_is_technical_lead(t.club_id)) then
    raise exception 'only a Technical Lead marks an academy team (BR184)'
      using errcode = '42501';
  end if;
  update team set academy = p_academy where id = p_team_id;
end
$$;

revoke execute on function app_set_team_academy(uuid, boolean) from anon;
revoke execute on function app_check_in_players(uuid) from anon;
revoke execute on function app_coaches_player(uuid, uuid) from anon;
revoke execute on function app_grant_check_in_consent(uuid, uuid) from anon;
revoke execute on function app_withdraw_check_in_consent(uuid, uuid) from anon;

insert into schema_migration_log (version, name) values
  ('0097', '0097_the_academy_switch_refuses_a_caller_without_sign_in');
