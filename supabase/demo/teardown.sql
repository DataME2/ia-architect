-- Remove the demo club, entirely.
--
-- A demo you cannot delete is a liability, so this exists alongside the
-- seed rather than being left as an exercise.
--
-- `on delete cascade` runs throughout the schema, so removing the club row
-- takes every person, registration, payment, voucher, team, clearance,
-- committee record and audit event beneath it. That is safe *here* and
-- exactly what makes it unsafe for a real club -- which is why nothing in
-- the application offers it.

\set ON_ERROR_STOP on

do $$
declare
  v_club uuid := 'dede0000-0000-0000-0000-0000000000c1';
  v_name text;
begin
  select name into v_name from club where id = v_club;

  if v_name is null then
    raise notice 'No demo club present. Nothing to do.';
    return;
  end if;

  -- Refuse to delete anything that is not the demo. The id is fixed and the
  -- name is checked as well, because a mistyped id that happened to match a
  -- real club would be unrecoverable.
  if v_name not like '%(DEMO)%' then
    raise exception
      'Refusing to delete "%": that id does not belong to the demo club', v_name;
  end if;

  delete from club where id = v_club;
  raise notice 'Demo club removed: %', v_name;
end
$$;
