-- 0061: a guardian whose login was unlinked can be given her workspace back.
--
--   * a registrar cannot reissue a working link — it refuses, detaching nothing,
--   * once the login is unlinked, reissuing clears the claim and returns the email,
--   * claim_family_access then links the same login to the same Person again,
--   * a committee member (not admin/registrar) is refused.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99996100-0000-0000-0000-000000000001', 'Reissue Test FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e6100000-0000-0000-0000-000000000001', 'registrar@reissue.test'),
  ('e6100000-0000-0000-0000-000000000002', 'mum@reissue.test'),
  ('e6100000-0000-0000-0000-000000000003', 'committee@reissue.test');

insert into club_membership (club_id, user_id, role) values
  ('99996100-0000-0000-0000-000000000001', 'e6100000-0000-0000-0000-000000000001', 'registrar'),
  ('99996100-0000-0000-0000-000000000001', 'e6100000-0000-0000-0000-000000000003', 'committee');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b6100000-0000-0000-0000-000000000001', '99996100-0000-0000-0000-000000000001', 'Karen', 'Alfonso', '1987-01-01', 'mum@reissue.test'),
  ('b6100000-0000-0000-0000-000000000002', '99996100-0000-0000-0000-000000000001', 'Santiago', 'Alfonso', '2018-02-01', null);

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('99996100-0000-0000-0000-000000000001', 'b6100000-0000-0000-0000-000000000002', 'b6100000-0000-0000-0000-000000000001', true, true);

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a6100000-0000-0000-0000-000000000001', '99996100-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31');

insert into registration (club_id, person_id, season_id, status) values
  ('99996100-0000-0000-0000-000000000001', 'b6100000-0000-0000-0000-000000000002', 'a6100000-0000-0000-0000-000000000001', 'COMPLETE');

insert into guardian_invitation (club_id, guardian_person_id, email, invited_by_user_id, claimed_user_id, claimed_at) values
  ('99996100-0000-0000-0000-000000000001', 'b6100000-0000-0000-0000-000000000001', 'mum@reissue.test',
   'e6100000-0000-0000-0000-000000000001', 'e6100000-0000-0000-0000-000000000002', now());

insert into account_person (club_id, user_id, person_id) values
  ('99996100-0000-0000-0000-000000000001', 'e6100000-0000-0000-0000-000000000002', 'b6100000-0000-0000-0000-000000000001');

commit;

do $$
declare
  the_club  uuid := '99996100-0000-0000-0000-000000000001';
  registrar uuid := 'e6100000-0000-0000-0000-000000000001';
  mum_login uuid := 'e6100000-0000-0000-0000-000000000002';
  committee uuid := 'e6100000-0000-0000-0000-000000000003';
  mum       uuid := 'b6100000-0000-0000-0000-000000000001';
  sent_to   text;
  n         integer;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', registrar::text, true);

  -- 1. A working link is left alone.
  begin
    perform reissue_workspace_invitation(mum);
    failures := array_append(failures, 'a working link was reissued');
  exception when others then null;
  end;

  -- The link is removed (what the Access screen's unlink did).
  perform set_config('role', 'postgres', true);
  delete from account_person where user_id = mum_login;
  perform set_config('role', 'authenticated', true);

  -- 2. A committee member may not reissue.
  perform set_config('request.jwt.claim.sub', committee::text, true);
  begin
    perform reissue_workspace_invitation(mum);
    failures := array_append(failures, 'a committee member reissued a workspace link');
  exception when others then null;
  end;

  -- 3. The registrar reissues: the claim is cleared, the email returned.
  perform set_config('request.jwt.claim.sub', registrar::text, true);
  begin
    select reissue_workspace_invitation(mum) into sent_to;
  exception when others then
    failures := array_append(failures, 'the reissue was refused: ' || sqlerrm);
  end;
  if sent_to is distinct from 'mum@reissue.test' then
    failures := array_append(failures, 'the reissue did not return the invitation email');
  end if;

  -- 4. She opens the new link: the family claim links her again.
  perform set_config('request.jwt.claim.sub', mum_login::text, true);
  perform claim_family_access();

  perform set_config('role', 'postgres', true);
  select count(*) into n from account_person
   where club_id = the_club and user_id = mum_login and person_id = mum;
  if n <> 1 then
    failures := array_append(failures, 'the new link did not restore her to her own Person');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Reissue workspace invitation FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Reissue workspace invitation OK — 4 scenarios';
end
$$;
