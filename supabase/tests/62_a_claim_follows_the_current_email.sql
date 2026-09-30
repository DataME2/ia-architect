-- 0062: an invitation is claimed only at the invited Person's current email.
--
--   * the old address a Person's email was corrected away from claims nothing,
--   * a resend re-addresses the invitation to the current email,
--   * the current address then claims it and is linked,
--   * a login already linked to somebody else claims nothing, and the
--     invitation stays unclaimed (the older claims marked it claimed anyway).

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99996200-0000-0000-0000-000000000001', 'Current Email Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e6200000-0000-0000-0000-000000000001', 'registrar@current.test'),
  ('e6200000-0000-0000-0000-000000000002', 'old@current.test'),
  ('e6200000-0000-0000-0000-000000000003', 'new@current.test'),
  ('e6200000-0000-0000-0000-000000000004', 'guardian@current.test');

insert into club_membership (club_id, user_id, role) values
  ('99996200-0000-0000-0000-000000000001', 'e6200000-0000-0000-0000-000000000001', 'registrar');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b6200000-0000-0000-0000-000000000001', '99996200-0000-0000-0000-000000000001', 'Antonio', 'Player', current_date - interval '17 years', 'new@current.test'),
  ('b6200000-0000-0000-0000-000000000002', '99996200-0000-0000-0000-000000000001', 'Gia', 'Guardian', '1985-01-01', 'guardian@current.test'),
  ('b6200000-0000-0000-0000-000000000003', '99996200-0000-0000-0000-000000000001', 'Someone', 'Else', '1980-01-01', null);

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99996200-0000-0000-0000-000000000001', 'b6200000-0000-0000-0000-000000000001', 'b6200000-0000-0000-0000-000000000002', true, true);

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a6200000-0000-0000-0000-000000000001', '99996200-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31');

insert into registration (club_id, person_id, season_id, status) values
  ('99996200-0000-0000-0000-000000000001', 'b6200000-0000-0000-0000-000000000001', 'a6200000-0000-0000-0000-000000000001', 'COMPLETE');

-- The stale invitation: sent to the address the Person's email was corrected away from.
insert into player_invitation (club_id, person_id, email, invited_by_user_id) values
  ('99996200-0000-0000-0000-000000000001', 'b6200000-0000-0000-0000-000000000001', 'old@current.test',
   'e6200000-0000-0000-0000-000000000001');

insert into guardian_invitation (club_id, guardian_person_id, email, invited_by_user_id) values
  ('99996200-0000-0000-0000-000000000001', 'b6200000-0000-0000-0000-000000000002', 'guardian@current.test',
   'e6200000-0000-0000-0000-000000000001');

-- The guardian's login is already linked to somebody else.
insert into account_person (club_id, user_id, person_id) values
  ('99996200-0000-0000-0000-000000000001', 'e6200000-0000-0000-0000-000000000004', 'b6200000-0000-0000-0000-000000000003');

commit;

do $$
declare
  the_club  uuid := '99996200-0000-0000-0000-000000000001';
  registrar uuid := 'e6200000-0000-0000-0000-000000000001';
  old_login uuid := 'e6200000-0000-0000-0000-000000000002';
  new_login uuid := 'e6200000-0000-0000-0000-000000000003';
  g_login   uuid := 'e6200000-0000-0000-0000-000000000004';
  player    uuid := 'b6200000-0000-0000-0000-000000000001';
  n         integer;
  sent_to   text;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. The old address claims nothing.
  perform set_config('request.jwt.claim.sub', old_login::text, true);
  select claim_player_access() into n;
  if n <> 0 then
    failures := array_append(failures, 'the corrected-away address claimed the invitation');
  end if;

  -- 2. A resend re-addresses it to the current email.
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  select reissue_workspace_invitation(player) into sent_to;
  if sent_to is distinct from 'new@current.test' then
    failures := array_append(failures, 'the resend did not go to the current email: ' || coalesce(sent_to, 'null'));
  end if;

  -- 3. The current address claims it and is linked.
  perform set_config('request.jwt.claim.sub', new_login::text, true);
  select claim_player_access() into n;
  if n <> 1 then
    failures := array_append(failures, 'the current address could not claim the re-addressed invitation');
  end if;

  -- 4. A login already linked elsewhere claims nothing, and leaves it unclaimed.
  perform set_config('request.jwt.claim.sub', g_login::text, true);
  select claim_family_access() into n;
  if n <> 0 then
    failures := array_append(failures, 'a login linked to somebody else claimed a family invitation');
  end if;

  perform set_config('role', 'postgres', true);

  select count(*) into n from account_person where user_id = old_login;
  if n <> 0 then
    failures := array_append(failures, 'the old address was linked to the player');
  end if;
  select count(*) into n from account_person where user_id = new_login and person_id = player;
  if n <> 1 then
    failures := array_append(failures, 'the current address is not linked to the player');
  end if;
  select count(*) into n from guardian_invitation
   where club_id = the_club and claimed_user_id is not null;
  if n <> 0 then
    failures := array_append(failures, 'a family invitation was marked claimed without a link');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'A claim follows the current email FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'A claim follows the current email OK — 4 scenarios';
end
$$;
