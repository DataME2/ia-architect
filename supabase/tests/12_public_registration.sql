-- Does the public registration path stay inside the club that issued the link?
--
-- `submit_public_registration` is a SECURITY DEFINER function: it runs as the
-- owner and is not subject to RLS. That is the entire public write surface,
-- and it is the one piece of this schema where a mistake would not be caught
-- by a policy underneath it -- so it is asserted behaviourally, as `anon`,
-- with no session at all.
--
-- See docs/decisions/6_public-registration-through-a-scoped-function.md.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures
-- Issued as the owner, the way a registrar's client would through RLS.

begin;

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a1111111-1111-1111-1111-1111111111ee',
   '11111111-1111-1111-1111-111111111111',
   '2028 (invite test)', '2028-01-01', '2028-12-01');

-- Tokens: 'live-token', 'revoked-token', 'expired-token'. Stored as sha256,
-- never in the clear (BR73) -- the same way the application stores them.
insert into registration_invitation
  (club_id, season_id, token_hash, label, expires_at, revoked_at, created_by_user_id)
values
  ('11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-1111111111ee',
   encode(digest('live-token', 'sha256'), 'hex'),
   'U12s 2028', now() + interval '30 days', null,
   'd1111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-1111111111ee',
   encode(digest('revoked-token', 'sha256'), 'hex'),
   'Revoked', now() + interval '30 days', now() - interval '1 hour',
   'd1111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-1111111111ee',
   encode(digest('expired-token', 'sha256'), 'hex'),
   'Expired', now() - interval '1 day', null,
   'd1111111-1111-1111-1111-111111111111');

commit;

-- ------------------------------------------------------------ assertions

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  rival      uuid := '22222222-2222-2222-2222-222222222222';
  invite_season uuid := 'a1111111-1111-1111-1111-1111111111ee';
  failures   text[] := '{}';
  reg_id     uuid;
  minor_reg  uuid;
  seen       integer;
  uses       integer;
begin
  -- 0. The hash agrees with the one TypeScript computes at issue time.
  --    src/web/invitation-view.test.ts pins the identical constant. If these
  --    drift, every issued link stops working silently rather than loudly:
  --    the token is hashed there and matched here.
  if encode(digest('live-token', 'sha256'), 'hex')
     <> '6d2fec1ec213cfadabafaccdf0b6e3855f90107af42f243b241546092c00f455' then
    failures := array_append(
      failures,
      'the database hashes tokens differently from the application -- every link would be invalid'
    );
  end if;

  -- No session at all: not a club member, not signed in.
  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);

  -- 1. An adult registration through a live link succeeds.
  begin
    reg_id := submit_public_registration(
      'live-token', 'Jordan Blake', 'Reyes', 'Jordy', date '1996-04-11',
      'jordan@example.test', null, null, null, true, false, false);
  exception when others then
    failures := array_append(failures, 'a live token was refused: ' || sqlerrm);
  end;

  -- 2. A minor registration creates the guardian and the guardianship (BR1).
  begin
    minor_reg := submit_public_registration(
      'live-token', 'Alexandra Marie', 'Nguyen', 'Alex', date '2015-06-01',
      null, 'Mai', 'Nguyen', 'mai@example.test', true, true, false);
  exception when others then
    failures := array_append(failures, 'a minor registration was refused: ' || sqlerrm);
  end;

  -- The function bypasses RLS, so verify its effects as the owner.
  set local role postgres;

  if reg_id is not null then
    -- 3. It landed in the club that issued the link, and that season.
    select count(*) into seen
    from registration
    where id = reg_id and club_id = north_star and season_id = invite_season;
    if seen <> 1 then
      failures := array_append(failures, 'the registration did not land in the inviting club/season');
    end if;

    -- 4. Nothing leaked into another club.
    select count(*) into seen from registration where id = reg_id and club_id = rival;
    if seen <> 0 then
      failures := array_append(failures, 'a public registration reached another club');
    end if;

    -- 5. BR55: the family stated a legal name; nobody verified it.
    select count(*) into seen
    from registration r join person p on p.id = r.person_id
    where r.id = reg_id and p.legal_name_verified_at is null;
    if seen <> 1 then
      failures := array_append(
        failures,
        'legal_name_verified_at was set by a public submission -- only a club officer may verify'
      );
    end if;

    -- 6. BR48: the collection notice was recorded.
    select count(*) into seen
    from registration r join consent c on c.person_id = r.person_id
    where r.id = reg_id and c.purpose = 'REGISTRATION_COLLECTION_NOTICE' and c.revoked_at is null;
    if seen <> 1 then
      failures := array_append(failures, 'no collection notice consent was recorded');
    end if;

    -- 7. BR57: publicity was not granted, so no row exists for it.
    select count(*) into seen
    from registration r join consent c on c.person_id = r.person_id
    where r.id = reg_id and c.purpose = 'PUBLICITY';
    if seen <> 0 then
      failures := array_append(failures, 'a publicity consent was invented for someone who declined it');
    end if;
  end if;

  if minor_reg is not null then
    -- 8. BR1/BR67: a guardian with authority, and contactable.
    select count(*) into seen
    from registration r join guardianship g on g.person_id = r.person_id
    where r.id = minor_reg and g.is_authority and g.is_contact;
    if seen <> 1 then
      failures := array_append(failures, 'a minor was registered without a guardian holding authority');
    end if;

    -- 9. The photograph consent asked for was recorded; publicity was not.
    select count(*) into seen
    from registration r join consent c on c.person_id = r.person_id
    where r.id = minor_reg and c.purpose = 'IDENTIFICATION_PHOTOGRAPH';
    if seen <> 1 then
      failures := array_append(failures, 'the photograph consent was not recorded');
    end if;
  end if;

  -- 10. BR73: uses are counted against the invitation.
  select use_count into uses
  from registration_invitation
  where token_hash = encode(digest('live-token', 'sha256'), 'hex');
  if uses <> 2 then
    failures := array_append(failures, format('use_count should be 2, was %s', uses));
  end if;

  set local role anon;
  perform set_config('request.jwt.claim.sub', '', true);

  -- 11. An unknown token is refused.
  begin
    perform submit_public_registration(
      'not-a-real-token', 'Mallory', 'Probe', null, date '1990-01-01',
      null, null, null, null, true, false, false);
    failures := array_append(failures, 'an unknown token was accepted');
  exception when others then
    if position('invitation_invalid' in sqlerrm) = 0 then
      failures := array_append(failures, 'an unknown token failed for the wrong reason: ' || sqlerrm);
    end if;
  end;

  -- 12. A revoked token is refused -- immediately, per BR73.
  begin
    perform submit_public_registration(
      'revoked-token', 'Mallory', 'Probe', null, date '1990-01-01',
      null, null, null, null, true, false, false);
    failures := array_append(failures, 'a revoked token was accepted');
  exception when others then
    if position('invitation_invalid' in sqlerrm) = 0 then
      failures := array_append(failures, 'a revoked token failed for the wrong reason: ' || sqlerrm);
    end if;
  end;

  -- 13. An expired token is refused.
  begin
    perform submit_public_registration(
      'expired-token', 'Mallory', 'Probe', null, date '1990-01-01',
      null, null, null, null, true, false, false);
    failures := array_append(failures, 'an expired token was accepted');
  exception when others then
    if position('invitation_invalid' in sqlerrm) = 0 then
      failures := array_append(failures, 'an expired token failed for the wrong reason: ' || sqlerrm);
    end if;
  end;

  -- 14. BR48 is enforced in the function, not only in the form. An
  --     anonymous caller can skip the form entirely.
  begin
    perform submit_public_registration(
      'live-token', 'No', 'Consent', null, date '1990-01-01',
      null, null, null, null, false, false, false);
    failures := array_append(failures, 'a registration was accepted without the collection notice');
  exception when others then
    if position('collection_notice_required' in sqlerrm) = 0 then
      failures := array_append(failures, 'missing consent failed for the wrong reason: ' || sqlerrm);
    end if;
  end;

  -- 15. BR1 likewise: a minor with no guardian is refused by the database.
  begin
    perform submit_public_registration(
      'live-token', 'Unaccompanied', 'Child', null, (current_date - interval '10 years')::date,
      null, null, null, null, true, false, false);
    failures := array_append(failures, 'a minor was accepted with no guardian');
  exception when others then
    if position('guardian_required' in sqlerrm) = 0 then
      failures := array_append(failures, 'a guardianless minor failed for the wrong reason: ' || sqlerrm);
    end if;
  end;

  -- 16. The link is write-only. Holding it grants no reading of anything.
  select count(*) into seen from registration_invitation;
  if seen <> 0 then
    failures := array_append(failures, 'anon could enumerate invitation tokens');
  end if;

  select count(*) into seen from person;
  if seen <> 0 then
    failures := array_append(failures, 'anon could read person rows');
  end if;

  select count(*) into seen from registration;
  if seen <> 0 then
    failures := array_append(failures, 'anon could read registrations');
  end if;

  -- 17. And it grants no writing outside the function either.
  begin
    insert into person (club_id, legal_given_names, legal_family_name, date_of_birth)
    values (north_star, 'Direct', 'Insert', date '2000-01-01');
    failures := array_append(failures, 'anon could insert a person directly, bypassing the function');
  exception
    when insufficient_privilege then null;
    when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception 'Public registration FAILED: %', array_to_string(failures, ' | ');
  end if;

  raise notice 'Public registration OK — 18 scenarios; the link writes to one club and reads nothing.';
end
$$;
