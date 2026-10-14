-- Does a migration's own receipt stay exactly that — written once, by the
-- migration itself, and read by nobody through the API?
--
-- schema_migration_log (0090) exists so a nightly job can tell whether the
-- connected database has actually caught up with what main expects,
-- independent of Supabase's own `supabase_migrations` schema. The whole
-- design rests on nobody but the migration runner ever writing to it — so
-- the questions worth asking are:
--
--   * did 0090 register itself,
--   * can an ordinary club officer, even an admin, read it through the API,
--   * can one write to it,
--   * and does an anonymous caller fare any differently.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('d9000000-0000-0000-0000-000000000001', 'migration-receipt-admin@ownrole.test');

insert into club (id, name, jurisdiction) values
  ('c9000000-0000-0000-0000-000000000001', 'Migration Receipt FC', 'QLD');

insert into club_membership (club_id, user_id, role) values
  ('c9000000-0000-0000-0000-000000000001', 'd9000000-0000-0000-0000-000000000001', 'admin');

commit;

do $$
declare
  admin_user uuid := 'd9000000-0000-0000-0000-000000000001';
  n          integer;
  failures   text[] := '{}';
begin
  -- 1. **0090 registered itself.** Read as the database owner, the same
  --    way every fixture in this suite is seeded — this is the one
  --    assertion in this file that is not about RLS.
  perform set_config('role', 'postgres', true);
  select count(*) into n from schema_migration_log where version = '0090';
  if n <> 1 then
    failures := array_append(failures, '0090 did not record itself in schema_migration_log');
  end if;

  -- 2. **An admin reads nothing through the API.** Not narrowed to their
  --    own club's rows — there is no club column at all — refused outright.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_user::text, true);
  select count(*) into n from schema_migration_log;
  if n <> 0 then
    failures := array_append(failures, 'an admin read schema_migration_log through the API');
  end if;

  -- 3. **An admin cannot write to it either** — a receipt an application
  --    can edit is not a receipt.
  begin
    insert into schema_migration_log (version, name) values ('9999', 'forged');
    failures := array_append(failures, 'an admin inserted a row into schema_migration_log');
  exception when others then null;
  end;

  -- 4. **An anonymous caller fares no better.**
  perform set_config('role', 'anon', true);
  select count(*) into n from schema_migration_log;
  if n <> 0 then
    failures := array_append(failures, 'an anonymous caller read schema_migration_log through the API');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'A migration proves it ran FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A migration proves it ran OK — 4 scenarios; 0090 registered itself, and nobody reads or writes the receipt through the API, admin or anonymous alike';
end
$$;
