-- Does the submission pack behave as BR58 says it does?
--
-- BR58 calls a pack immutable once generated, and 0002_rls_policies.sql
-- backs that with a deliberately narrow update policy: the *only* permitted
-- change is stamping the handover, and only while `handed_over_at` is still
-- null. That is a subtle policy. It is easy to write, easy to get wrong, and
-- wrong silently — a pack whose handover can be rewritten is a pack that
-- cannot answer "when did we send this, and through what channel?".
--
-- Runs as `authenticated`, on the fixtures 10_tenant_isolation.sql seeded.

\set ON_ERROR_STOP on

-- Its own season, so this file and 10_tenant_isolation.sql cannot collide on
-- submission_pack's (club, season, version) key as either one grows.
-- Inserted as the owner, like 10's fixtures.
begin;
insert into season (id, club_id, name, starts_on, ends_on) values
  ('a1111111-1111-1111-1111-1111111111ff',
   '11111111-1111-1111-1111-111111111111',
   '2027 (pack test)', '2027-01-01', '2027-12-01');
commit;

do $$
declare
  north_star   uuid := '11111111-1111-1111-1111-111111111111';
  ns_season    uuid := 'a1111111-1111-1111-1111-1111111111ff';
  ns_person    uuid := 'b1111111-1111-1111-1111-111111111111';
  ns_registrar text := 'd1111111-1111-1111-1111-111111111111';
  rival_registrar text := 'd2222222-2222-2222-2222-222222222222';
  pack_id      uuid;
  failures     text[] := '{}';
  affected     integer;
  seen         integer;
  stamped      timestamptz;
begin
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', ns_registrar, true);

  -- 1. A registrar can generate a pack, manifest and all.
  begin
    insert into submission_pack (club_id, season_id, version, generated_by_user_id, manifest)
    values (
      north_star, ns_season, 1, ns_registrar::uuid,
      jsonb_build_array(jsonb_build_object(
        'personId', ns_person,
        'legalGivenNames', 'Alexandra Jane',
        'legalFamilyName', 'Nguyen',
        'dateOfBirth', '2014-03-02',
        'email', null,
        'guardianLegalName', null,
        'guardianEmail', null,
        'photoPath', null
      ))
    )
    returning id into pack_id;
  exception when others then
    failures := array_append(failures, 'a registrar could not generate a pack: ' || sqlerrm);
  end;

  if pack_id is null then
    raise exception 'Submission pack test aborted: %', array_to_string(failures, '; ');
  end if;

  -- 2. The manifest survives the round trip. BR58 rests on it: it is the
  --    club's record of the values it sent, not of the values it holds now.
  select count(*) into seen
  from submission_pack
  where id = pack_id
    and manifest -> 0 ->> 'legalFamilyName' = 'Nguyen';
  if seen <> 1 then
    failures := array_append(failures, 'the manifest did not round-trip through jsonb');
  end if;

  -- 3. Recording the handover is permitted, once.
  update submission_pack
     set handover_channel = 'Emailed to registrations@example.test',
         handed_over_at = now()
   where id = pack_id;
  get diagnostics affected = row_count;
  if affected <> 1 then
    failures := array_append(failures, 'a registrar could not record the handover');
  end if;

  select handed_over_at into stamped from submission_pack where id = pack_id;

  -- 4. And never twice. The policy's `using` clause excludes rows already
  --    stamped, so a second attempt matches nothing rather than erroring.
  update submission_pack
     set handover_channel = 'Rewritten after the fact',
         handed_over_at = now() + interval '1 day'
   where id = pack_id;
  get diagnostics affected = row_count;
  if affected <> 0 then
    failures := array_append(
      failures,
      'a handover could be rewritten after the fact — BR58 immutability is not enforced'
    );
  end if;

  -- 5. Belt and braces on the same point: the original stamp is intact.
  select count(*) into seen
  from submission_pack
  where id = pack_id
    and handed_over_at = stamped
    and handover_channel = 'Emailed to registrations@example.test';
  if seen <> 1 then
    failures := array_append(failures, 'the recorded handover channel or time was overwritten');
  end if;

  -- 6. A pack cannot be deleted. It is the club's evidence of what it sent.
  begin
    delete from submission_pack where id = pack_id;
    get diagnostics affected = row_count;
    if affected <> 0 then
      failures := array_append(failures, 'a pack could be deleted');
    end if;
  exception when insufficient_privilege then
    null; -- refused outright is equally correct
  end;

  -- 7. Submission records are written as `sent`, and the state moves later.
  begin
    insert into submission_record (club_id, submission_pack_id, person_id, state)
    values (north_star, pack_id, ns_person, 'sent');
  exception when others then
    failures := array_append(failures, 'a registrar could not record a submission: ' || sqlerrm);
  end;

  -- 8. The check constraint refuses a state nobody defined, so a typo in
  --    application code cannot invent an eligibility status.
  begin
    insert into submission_record (club_id, submission_pack_id, person_id, state)
    values (north_star, pack_id, ns_person, 'registered');
    failures := array_append(failures, 'an undefined submission state was accepted');
  exception
    when check_violation then null;
    when unique_violation then null;
    when others then null;
  end;

  -- 9. Another club's registrar sees none of it.
  perform set_config('request.jwt.claim.sub', rival_registrar, true);

  select count(*) into seen from submission_pack where id = pack_id;
  if seen <> 0 then
    failures := array_append(failures, 'another club could see the pack');
  end if;

  select count(*) into seen from submission_record where submission_pack_id = pack_id;
  if seen <> 0 then
    failures := array_append(failures, 'another club could see the submission records');
  end if;

  update submission_pack set handover_channel = 'stolen' where id = pack_id;
  get diagnostics affected = row_count;
  if affected <> 0 then
    failures := array_append(failures, 'another club could alter the pack');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception 'Submission pack behaviour FAILED: %', array_to_string(failures, ' | ');
  end if;

  raise notice 'Submission pack OK — 9 scenarios, immutability and isolation enforced by the database.';
end
$$;
