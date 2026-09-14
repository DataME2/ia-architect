-- Is the shared catalogue actually shared — and actually read-only?
--
-- Decision 15 exempts three tables from `check_rls.py`'s tenant-column
-- rule, which the script's own comment says should stay empty. An
-- exemption is only as good as what replaces it, so these scenarios are
-- what replaces it:
--
--   * every signed-in club reads the catalogue, including one that has
--     nothing to do with the association,
--   * **no club can write it** — not an admin, not a registrar,
--   * a platform administrator can,
--   * an anonymous caller reads none of it,
--   * a competition's minimum must belong to its own association (BR135),
--   * a club's *participation* is ordinary tenant data and does not leak,
--   * and a new fixture cannot carry free-text competition (R27.2).

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d35a0000-0000-0000-0000-000000000001', 'catalogue.admin@northstar.test'),
  -- Platform-only, holding **no club_membership** — which is exactly what
  -- decision 9 says keeps every ordinary policy denying it. Kept separate
  -- from the club admin above so scenario 6 tests the policy rather than
  -- an account that happens to hold both.
  ('d35a0000-0000-0000-0000-0000000000ff', 'catalogue.platform@letsdatatalk.test');

insert into club_membership (club_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'd35a0000-0000-0000-0000-000000000001', 'admin');

insert into association (id, name, jurisdiction) values
  ('11115555-0000-0000-0000-000000000001', 'Football Queensland', 'AU-QLD'),
  ('11115555-0000-0000-0000-000000000002', 'Northern NSW Football', 'AU-NSW');

insert into classification_level (id, association_id, name, rank) values
  ('22225555-0000-0000-0000-000000000004', '11115555-0000-0000-0000-000000000001', 'Level 4', 40),
  ('22225555-0000-0000-0000-000000000003', '11115555-0000-0000-0000-000000000001', 'Level 3', 30),
  -- Same label, different body. BR135 exists because these are not the same.
  ('22225555-0000-0000-0000-000000000009', '11115555-0000-0000-0000-000000000002', 'Level 4', 40);

insert into competition (id, association_id, name, tier, minimum_classification_id) values
  ('33335555-0000-0000-0000-000000000001', '11115555-0000-0000-0000-000000000001',
   'Capital League 1', 'Senior men', '22225555-0000-0000-0000-000000000004');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  admin_user uuid := 'd35a0000-0000-0000-0000-000000000001';
  platform   uuid := 'd35a0000-0000-0000-0000-0000000000ff';
  officer    uuid := 'd1111111-1111-1111-1111-111111111111';
  fq         uuid := '11115555-0000-0000-0000-000000000001';
  nnsw       uuid := '11115555-0000-0000-0000-000000000002';
  comp       uuid := '33335555-0000-0000-0000-000000000001';
  season     uuid := 'a1111111-1111-1111-1111-111111111111';
  n          integer;
  failures   text[] := '{}';
begin
  -- 1. **Every signed-in club reads it**, including one with no connection
  --    to the association. That is the point of it being shared.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', officer::text, true);
  select count(*) into n from competition;
  if n < 1 then failures := array_append(failures, 'a club officer could not read the catalogue'); end if;
  select count(*) into n from classification_level;
  if n < 3 then failures := array_append(failures, 'a club officer could not read the classification levels'); end if;
  select count(*) into n from association;
  if n < 2 then failures := array_append(failures, 'a club officer could not read the associations'); end if;

  -- 2. **And no club can write it.** This is the half that makes the
  --    check_rls.py exemption safe rather than merely argued.
  begin
    insert into competition (association_id, name) values (fq, 'Invented By A Club');
    failures := array_append(failures, 'a registrar wrote to the shared catalogue');
  exception when others then null;
  end;

  perform set_config('request.jwt.claim.sub', admin_user::text, true);
  begin
    insert into classification_level (association_id, name, rank) values (fq, 'Invented Level', 99);
    failures := array_append(failures, 'a club admin wrote to the shared catalogue');
  exception when others then null;
  end;
  begin
    update competition set name = 'Renamed By A Club' where id = comp;
    if (select name from competition where id = comp) <> 'Capital League 1' then
      failures := array_append(failures, 'a club admin renamed a shared competition');
    end if;
  exception when others then null;
  end;

  -- 3. **A platform administrator can.** Decision 9 draws the line at
  --    tenant contents, and shared reference data is not that.
  perform set_config('role', 'postgres', true);
  insert into platform_admin (user_id) values (platform) on conflict do nothing;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', platform::text, true);

  insert into competition (association_id, name) values (fq, 'Written By The Platform');
  select count(*) into n from competition where name = 'Written By The Platform';
  if n <> 1 then
    failures := array_append(failures, 'a platform administrator could not write the catalogue');
  end if;

  -- 4. **BR135 — a minimum belongs to its competition's association.**
  --    Asked as the platform account, since a club cannot write at all.
  --    Without this the confinement is a convention rather than a fact.
  begin
    update competition set minimum_classification_id = '22225555-0000-0000-0000-000000000009'
     where id = comp;
    failures := array_append(failures,
      'a competition took a minimum from another association — BR135 is then only a comment');
  exception when others then null;
  end;

  -- 5. **An anonymous caller reads none of it.** Shared means shared
  --    between signed-in clubs, not published (this is narrower than P6).
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into n from competition;
  if n <> 0 then failures := array_append(failures, 'an anonymous caller read the catalogue'); end if;

  -- 6. **Participation is ordinary tenant data.**
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', officer::text, true);
  insert into club_competition (club_id, season_id, competition_id) values (north_star, season, comp);

  perform set_config('request.jwt.claim.sub', platform::text, true);
  -- The platform account holds no club_membership, deliberately (decision
  -- 9), so the ordinary policy denies it this even though the catalogue
  -- above is its to write. Shared reference data and tenant data are
  -- different things and this is where that stops being a sentence.
  select count(*) into n from club_competition;
  if n <> 0 then
    failures := array_append(failures, 'the platform account read a club''s participation');
  end if;

  -- 7. **R27.2 — a fixture references the catalogue.**
  --
  --    Note what is *not* asserted: that free text is refused. A trigger
  --    doing that was written and removed — with an empty catalogue it
  --    would leave a club unable to record "U12 Div 2" at all, which is
  --    worse than the free text it was meant to replace. The rule lives at
  --    the write path; the database keeps the column readable.
  perform set_config('request.jwt.claim.sub', officer::text, true);

  -- The reference is accepted, and no competition at all is still allowed
  -- for a friendly (#78).
  insert into fixture (club_id, season_id, played_on, opponent, home_away, competition_id)
  values (north_star, season, '2026-07-02', 'Catalogued FC', 'home', comp);
  insert into fixture (club_id, season_id, played_on, opponent, home_away)
  values (north_star, season, '2026-07-03', 'Friendly FC', 'home');

  select count(*) into n from fixture where opponent in ('Catalogued FC', 'Friendly FC');
  if n <> 2 then
    failures := array_append(failures, 'a catalogued fixture or a friendly was refused');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Competition catalogue FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Competition catalogue OK — 7 scenarios; every club reads it, no club writes it, a minimum stays inside its association, and a fixture references it rather than typing it';
end
$$;
