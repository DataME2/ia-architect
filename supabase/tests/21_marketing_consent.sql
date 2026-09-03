-- Is the marketing consent recorded at the demonstration door worth having?
--
-- A consent record is only evidence if three things hold, and each one has
-- a way of quietly not holding:
--
--   * **Refusing costs nothing.** A permission that is a condition of entry
--     was never freely given, so the unticked visitor must reach the same
--     demonstration club as the ticked one.
--   * **The words are kept.** Consent to wording that was later edited
--     proves nothing, and the wording is the thing in dispute.
--   * **Silence is never consent, and never withdrawal.** An unticked box
--     grants nothing; an unticked box on a *return* visit takes nothing
--     away, because somebody who did not notice a checkbox has not
--     withdrawn anything.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('dccccccc-0000-0000-0000-00000000000a', null),  -- refuses
  ('dccccccc-0000-0000-0000-00000000000b', null),  -- consents
  ('dccccccc-0000-0000-0000-00000000000c', null);  -- refuses, then consents

commit;

-- ----------------------------------------------------------- the assertions

do $$
declare
  demo_club uuid := 'dede0000-0000-0000-0000-0000000000c1';
  refuser   uuid := 'dccccccc-0000-0000-0000-00000000000a';
  consenter uuid := 'dccccccc-0000-0000-0000-00000000000b';
  laterer   uuid := 'dccccccc-0000-0000-0000-00000000000c';
  wording   text := 'Send me occasional emails. Optional. Privacy Act 1988.';
  edited    text := 'Completely different words nobody ever agreed to.';
  got       uuid;
  n         integer;
  ts        timestamptz;
  kept      text;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);

  -- 1. Refusing costs nothing: same club, same access, no consent recorded.
  perform set_config('request.jwt.claim.sub', refuser::text, true);
  got := enter_demo('refuser@example.test', null, false, null);
  if got is distinct from demo_club then
    failures := array_append(failures, 'refusing consent changed which club was opened');
  end if;

  select count(*) into n from person where club_id = demo_club;
  if n < 1 then
    failures := array_append(failures, 'a visitor who refused consent could not see the demo');
  end if;

  -- 2. Consent given is consent recorded, with its words and its moment.
  perform set_config('request.jwt.claim.sub', consenter::text, true);
  perform enter_demo('consenter@example.test', '0400 000 001', true, wording);

  perform set_config('role', 'postgres', true);
  select marketing_consent_at, marketing_consent_wording
    into ts, kept
    from prospect where email = 'consenter@example.test';
  if ts is null then
    failures := array_append(failures, 'consent was given and no moment was recorded');
  end if;
  if kept is distinct from wording then
    failures := array_append(failures, 'the wording consented to was not stored verbatim');
  end if;

  select marketing_consent_at into ts from prospect where email = 'refuser@example.test';
  if ts is not null then
    failures := array_append(failures, 'an unticked box was recorded as consent');
  end if;

  -- 3. Consent with no wording is a boolean wearing a timestamp: refused.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', laterer::text, true);
  begin
    perform enter_demo('laterer@example.test', null, true, null);
    failures := array_append(failures, 'consent was accepted with no wording recorded');
  exception when others then null;
  end;
  begin
    perform enter_demo('laterer@example.test', null, true, '   ');
    failures := array_append(failures, 'blank wording was accepted as the words consented to');
  exception when others then null;
  end;

  -- 4. A later visit may GRANT what was refused before.
  perform enter_demo('laterer@example.test', null, false, null);
  perform set_config('role', 'postgres', true);
  select marketing_consent_at into ts from prospect where email = 'laterer@example.test';
  if ts is not null then
    failures := array_append(failures, 'a refusal on the first visit was recorded as consent');
  end if;

  perform set_config('role', 'authenticated', true);
  perform enter_demo('laterer@example.test', null, true, wording);
  perform set_config('role', 'postgres', true);
  select marketing_consent_at into ts from prospect where email = 'laterer@example.test';
  if ts is null then
    failures := array_append(failures, 'consent given on a later visit was not recorded');
  end if;

  -- 5. **A later visit may not take consent away by silence.** The visitor
  --    returns without ticking; the permission they actually gave stands,
  --    and so do the words they gave it against.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', consenter::text, true);
  perform enter_demo('consenter@example.test', null, false, null);
  perform set_config('role', 'postgres', true);
  select marketing_consent_at, marketing_consent_wording
    into ts, kept from prospect where email = 'consenter@example.test';
  if ts is null then
    failures := array_append(failures, 'an unticked return visit silently withdrew consent');
  end if;
  if kept is distinct from wording then
    failures := array_append(failures, 'a return visit overwrote the wording consented to');
  end if;

  -- 6. Editing the wording later does not rewrite an existing consent.
  --    This is the entire reason the text is stored rather than referenced.
  perform set_config('role', 'authenticated', true);
  perform enter_demo('consenter@example.test', null, true, edited);
  perform set_config('role', 'postgres', true);
  select marketing_consent_wording into kept
    from prospect where email = 'consenter@example.test';
  if kept is distinct from wording then
    failures := array_append(failures,
      'a later visit rewrote the words an earlier consent was given against');
  end if;

  -- 7. The database refuses the invalid shapes directly, not just through
  --    the function — a hand-typed UPDATE is a writer too.
  begin
    update prospect set marketing_consent_at = now(), marketing_consent_wording = null
     where email = 'refuser@example.test';
    failures := array_append(failures, 'a consent with no wording could be written directly');
  exception when others then null;
  end;

  begin
    update prospect set marketing_consent_revoked_at = now()
     where email = 'refuser@example.test';
    failures := array_append(failures, 'a consent never granted could be revoked');
  exception when others then null;
  end;

  -- 8. Revocation is possible where consent exists — the column is not
  --    decorative, even though nothing sets it yet.
  begin
    update prospect set marketing_consent_revoked_at = now()
     where email = 'consenter@example.test';
  exception when others then
    failures := array_append(failures, 'a granted consent could not be revoked');
  end;

  -- 9. Still none of it readable through the API, consent or no consent.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', consenter::text, true);
  select count(*) into n from prospect;
  if n <> 0 then
    failures := array_append(failures, 'the prospect list was readable through the API');
  end if;
  perform set_config('role', 'postgres', true);

  if array_length(failures, 1) > 0 then
    raise exception E'Marketing consent FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Marketing consent OK — 9 scenarios; refusing costs nothing, and silence is neither consent nor withdrawal';
end
$$;
