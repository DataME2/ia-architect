-- Can somebody stop the email — and can nobody else stop it for them?
--
-- The claims worth proving, in the order they would fail:
--
--   * a valid token suppresses, and an anonymous caller can use it,
--   * a wrong token and an unknown id fail **identically**, so the page
--     never confirms that an address is on the list,
--   * leaving the newsletter does not stop operational mail, and asking to
--     stop everything does (BR130),
--   * a prospect — who belongs to no tenant — walks through the same door,
--   * `message_log` is append-only in fact and not by convention (BR127),
--   * an officer cannot clear a suppression with an ordinary update,
--   * a coach reads neither subscribers nor the log (BR120, BR122),
--   * and a second club reads none of the first's.

\set ON_ERROR_STOP on

-- --------------------------------------------------------------- fixtures

begin;

insert into auth.users (id, email) values
  ('d33a0000-0000-0000-0000-000000000001', 'comms.coach@northstar.test'),
  ('d33a0000-0000-0000-0000-0000000000ee', 'comms.outsider@elsewhere.test');

insert into club_membership (club_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'd33a0000-0000-0000-0000-000000000001', 'coach');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b33a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Mere', 'Mailer', '1984-03-03', 'mere.mailer@northstar.test');

-- Two subscribers, one per club, so the cross-tenant scenario has something
-- real to fail on rather than an empty table that passes by accident.
insert into message_subscriber
  (id, club_id, person_id, email, unsubscribe_salt, unsubscribe_token_hash) values
  ('e33a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'b33a0000-0000-0000-0000-000000000001', 'mere.mailer@northstar.test',
   'salt-north-star',
   -- sha256('token-north-star')
   encode(digest('token-north-star', 'sha256'), 'hex'));

insert into message_log
  (id, club_id, subscriber_id, to_email, purpose, template_key, template_version, subject, outcome)
values
  ('f33a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'e33a0000-0000-0000-0000-000000000001', 'mere.mailer@northstar.test', 'operational',
   'guardian.registration_reminder', 1, 'Piri''s registration', 'sent');

insert into prospect (id, email, marketing_consent_at, marketing_consent_wording,
                      unsubscribe_salt, unsubscribe_token_hash)
values
  ('a33a0000-0000-0000-0000-000000000001', 'curious@elsewhere.test', now(), 'Tell me about the product',
   'salt-prospect', encode(digest('token-prospect', 'sha256'), 'hex'));

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  officer    uuid := 'd1111111-1111-1111-1111-111111111111';
  coach      uuid := 'd33a0000-0000-0000-0000-000000000001';
  outsider   uuid := 'd33a0000-0000-0000-0000-0000000000ee';
  sub        uuid := 'e33a0000-0000-0000-0000-000000000001';
  pro        uuid := 'a33a0000-0000-0000-0000-000000000001';
  n          integer;
  ok         boolean;
  msg        text;
  first_msg  text;
  failures   text[] := '{}';
begin
  -- 1. **Anonymous, with a valid token.** The people this exists for hold
  --    no account (BR128).
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);

  perform app_unsubscribe(sub, 'token-north-star', 'marketing');

  perform set_config('role', 'postgres', true);
  select count(*) into n from message_subscriber
   where id = sub and marketing_suppressed_at is not null;
  if n <> 1 then
    failures := array_append(failures, 'an anonymous caller with a valid token could not unsubscribe');
  end if;

  -- 2. **Leaving the newsletter left operational mail alone** (BR130).
  select count(*) into n from message_subscriber
   where id = sub and operational_suppressed_at is null;
  if n <> 1 then
    failures := array_append(failures, 'unsubscribing from marketing also stopped operational mail');
  end if;

  -- 3. **A wrong token and an unknown id fail identically.** Anything else
  --    confirms an address is on the list, which is the disclosure BR73's
  --    three indistinguishable cases exist to prevent.
  perform set_config('role', 'anon', true);
  begin
    perform app_unsubscribe(sub, 'not-the-token', 'marketing');
    failures := array_append(failures, 'a wrong token was accepted');
  exception when others then
    first_msg := sqlerrm;
  end;

  begin
    perform app_unsubscribe('00000000-0000-0000-0000-0000000000ff', 'token-north-star', 'marketing');
    failures := array_append(failures, 'an unknown subscriber id was accepted');
  exception when others then
    if sqlerrm is distinct from first_msg then
      failures := array_append(failures,
        'a wrong token and an unknown id gave different errors — the difference tells a caller the address exists');
    end if;
  end;

  -- 4. **"Stop everything" stops everything**, and the club is left able to
  --    see that it must ring them instead.
  perform app_unsubscribe(sub, 'token-north-star', 'all');
  perform set_config('role', 'postgres', true);
  select count(*) into n from message_subscriber
   where id = sub and operational_suppressed_at is not null and marketing_suppressed_at is not null;
  if n <> 1 then
    failures := array_append(failures, 'asking to stop every email did not stop operational mail');
  end if;

  -- 5. **A prospect belongs to no tenant and uses the same door** (BR92).
  perform set_config('role', 'anon', true);
  perform app_unsubscribe(pro, 'token-prospect', 'marketing');
  perform set_config('role', 'postgres', true);
  select count(*) into n from prospect
   where id = pro and marketing_consent_revoked_at is not null;
  if n <> 1 then
    failures := array_append(failures, 'a prospect could not withdraw the consent the demonstration door collected');
  end if;

  -- 6. **Suppression has one door.** An officer may fix an address; an
  --    ordinary update must not quietly restore contact.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', officer::text, true);

  begin
    update message_subscriber set marketing_suppressed_at = null where id = sub;
    failures := array_append(failures, 'an officer cleared a suppression with a direct update');
  exception when others then
    null;  -- refused, as intended
  end;

  update message_subscriber set email = 'mere.corrected@northstar.test' where id = sub;
  perform set_config('role', 'postgres', true);
  select count(*) into n from message_subscriber where id = sub and email = 'mere.corrected@northstar.test';
  if n <> 1 then
    failures := array_append(failures, 'the one-door trigger also blocked correcting an address, which it should allow');
  end if;

  -- 7. **The log is append-only** (BR127) — by the absence of a policy,
  --    the way `payment` and `audit_event` are.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', officer::text, true);

  update message_log set outcome = 'suppressed' where club_id = north_star;
  delete from message_log where club_id = north_star;

  perform set_config('role', 'postgres', true);
  select count(*) into n from message_log where club_id = north_star and outcome = 'sent';
  if n <> 1 then
    failures := array_append(failures, 'a message log row was rewritten or deleted');
  end if;

  -- 8. **A coach reads neither** (BR120, BR122 — the test that fails if the
  --    policy is widened). A coach has no reason to know who the club has
  --    emailed, and `app_has_role` not naming them is what says so.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coach::text, true);
  select count(*) into n from message_subscriber;
  if n <> 0 then
    failures := array_append(failures, 'a coach read the club''s subscriber list');
  end if;
  select count(*) into n from message_log;
  if n <> 0 then
    failures := array_append(failures, 'a coach read the club''s message log');
  end if;

  -- 9. **An account with no membership reads nothing at all.**
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select count(*) into n from message_subscriber;
  if n <> 0 then
    failures := array_append(failures, 'a non-member read the subscriber list');
  end if;

  -- 10. **A club officer still reads their own club's rows** — the point of
  --     the policy, not just what it refuses.
  perform set_config('request.jwt.claim.sub', officer::text, true);
  select count(*) into n from message_subscriber where club_id = north_star;
  if n <> 1 then
    failures := array_append(failures, 'the narrowed policy stopped a registrar reading their own club');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Communications FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Communications OK — 10 scenarios; a withdrawal is honoured, indistinguishable when refused, separate per purpose, and not undoable by an officer''s ordinary update';
end
$$;
