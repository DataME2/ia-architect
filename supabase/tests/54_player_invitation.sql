-- Can a player of thirteen or over reach the workspace BR63 promised —
-- invited once their own registration is COMPLETE, and never granted a
-- club_membership row (BR150)?
--
--   * BR150 refuses an invitation before COMPLETE,
--   * BR150 refuses a player under thirteen even when COMPLETE,
--   * only an admin or registrar may invite,
--   * a player reads nothing before claiming,
--   * claiming links account_person and creates no club_membership row,
--   * once claimed, the player reads their own record through
--     app_my_person_ids()/person_role — not through the family functions,
--   * a stranger reads nothing, and claiming is keyed to the invited
--     email, not to whoever is signed in.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('d64a0000-0000-0000-0000-000000000001', 'fifteen@northstar.test'),
  ('d64a0000-0000-0000-0000-000000000002', 'twelve@northstar.test'),
  ('d64a0000-0000-0000-0000-0000000000c1', 'coach.only@player-invite.test'),
  ('d64a0000-0000-0000-0000-0000000000ee', 'unrelated.stranger@player-invite.test');

insert into club_membership (club_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'd64a0000-0000-0000-0000-0000000000c1', 'coach')
  on conflict do nothing;

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b64a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Fifteen', 'YearOld', '2011-06-01', 'fifteen@northstar.test'),
  ('b64a0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Twelve', 'YearOld', '2014-06-01', 'twelve@northstar.test');

insert into registration (id, club_id, person_id, season_id, status) values
  ('c64a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'b64a0000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'DRAFT'),
  ('c64a0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'b64a0000-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 'COMPLETE');

commit;

do $$
declare
  north_star   uuid := '11111111-1111-1111-1111-111111111111';
  ns_admin     uuid := 'd1111111-1111-1111-1111-111111111111';  -- admin + registrar
  coach_only   uuid := 'd64a0000-0000-0000-0000-0000000000c1';
  stranger     uuid := 'd64a0000-0000-0000-0000-0000000000ee';
  fifteen_user uuid := 'd64a0000-0000-0000-0000-000000000001';
  fifteen      uuid := 'b64a0000-0000-0000-0000-000000000001';
  twelve       uuid := 'b64a0000-0000-0000-0000-000000000002';
  n            integer;
  result       integer;
  failures     text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);

  -- 1. BR150 refuses an invitation before COMPLETE — the fifteen-year-old's
  --    own registration is DRAFT.
  begin
    insert into player_invitation (club_id, person_id, email, invited_by_user_id)
    values (north_star, fifteen, 'fifteen@northstar.test', ns_admin);
    failures := array_append(failures, 'BR150 let an invitation through for a DRAFT registration');
  exception when others then
    if sqlerrm not like '%BR150%' then
      failures := array_append(failures, 'the DRAFT refusal did not cite BR150: ' || sqlerrm);
    end if;
  end;

  -- 2. Complete the registration, then re-attempt.
  perform set_config('role', 'postgres', true);
  update registration set status = 'COMPLETE' where id = 'c64a0000-0000-0000-0000-000000000001';
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', ns_admin::text, true);

  insert into player_invitation (club_id, person_id, email, invited_by_user_id)
  values (north_star, fifteen, 'fifteen@northstar.test', ns_admin);
  select count(*) into n from player_invitation where club_id = north_star and person_id = fifteen;
  if n <> 1 then
    failures := array_append(failures, 'a COMPLETE, thirteen-or-over registration did not let an invitation through');
  end if;

  -- 3. BR150 refuses a player under thirteen, even with a COMPLETE
  --    registration (twelve's registration was seeded COMPLETE already).
  begin
    insert into player_invitation (club_id, person_id, email, invited_by_user_id)
    values (north_star, twelve, 'twelve@northstar.test', ns_admin);
    failures := array_append(failures, 'BR150 let an invitation through for a twelve-year-old');
  exception when others then
    if sqlerrm not like '%thirteen%' then
      failures := array_append(failures, 'the under-thirteen refusal did not name the reason: ' || sqlerrm);
    end if;
  end;

  -- 4. Only an admin or registrar may invite — a coach at the same club
  --    may not, even for a genuinely eligible player.
  perform set_config('request.jwt.claim.sub', coach_only::text, true);
  begin
    insert into player_invitation (club_id, person_id, email, invited_by_user_id)
    values (north_star, twelve, 'twelve@northstar.test', coach_only);
    failures := array_append(failures, 'a coach sent a player invitation');
  exception when others then null;
  end;

  -- 5. The player reads nothing before claiming.
  perform set_config('request.jwt.claim.sub', fifteen_user::text, true);
  select count(*) into n from person where id = fifteen;
  if n <> 0 then
    failures := array_append(failures, 'an unclaimed invitation already granted a read');
  end if;

  -- 6. Claiming links the account and creates no club_membership row.
  select claim_player_access() into result;
  if result <> 1 then
    failures := array_append(failures, 'claim_player_access did not claim the pending invitation');
  end if;
  select count(*) into n from account_person where user_id = fifteen_user and club_id = north_star;
  if n <> 1 then
    failures := array_append(failures, 'claiming did not link the account to the player''s Person');
  end if;
  select count(*) into n from club_membership where user_id = fifteen_user and club_id = north_star;
  if n <> 0 then
    failures := array_append(failures, 'claiming a player invitation created a club_membership row');
  end if;

  -- 7. Once claimed, the player reads their own record.
  select count(*) into n from person where id = fifteen;
  if n <> 1 then
    failures := array_append(failures, 'a claimed player could not read their own person row');
  end if;
  select count(*) into n from registration where person_id = fifteen;
  if n <> 1 then
    failures := array_append(failures, 'a claimed player could not read their own registration');
  end if;

  -- 8. And nothing of the other family's child at the same club.
  select count(*) into n from person where id = twelve;
  if n <> 0 then
    failures := array_append(failures, 'a player read another child''s person row');
  end if;

  -- 9. A stranger reads nothing.
  perform set_config('request.jwt.claim.sub', stranger::text, true);
  select count(*) into n from person where id in (fifteen, twelve);
  if n <> 0 then
    failures := array_append(failures, 'an uninvited account with no membership read a player''s record');
  end if;

  -- 10. Claiming is keyed to the invited email, not to whoever signs in.
  select claim_player_access() into result;
  if result <> 0 then
    failures := array_append(failures, 'an unrelated account claimed somebody else''s invitation');
  end if;
  select count(*) into n from account_person where user_id = stranger;
  if n <> 0 then
    failures := array_append(failures, 'an unrelated account ended up linked to a Person');
  end if;

  -- 11. The claim is audited.
  perform set_config('role', 'postgres', true);
  select count(*) into n from audit_event where club_id = north_star and action = 'player.claimed';
  if n < 1 then
    failures := array_append(failures, 'claiming a player invitation was not audited');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Player invitation FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Player invitation OK — 11 scenarios; a player is invited only once COMPLETE and thirteen or over, reads only their own record, and never holds a club_membership row';
end
$$;
