-- Does a form that anyone on the internet can post grant anything?
--
-- `record_interest()` is the third public write path in this schema, after
-- the registration link (decision 6) and the demonstration door (decision
-- 8). Each was safe for a reason it had to argue, and the argument here is
-- the narrowest of the three: the function takes no club id, no role and
-- no flag, so there is nothing a caller can vary to make it do something
-- other than add a row to a list.
--
-- What is worth proving is therefore not "an enquiry is recorded":
--
--   * **BR145 — it grants nothing.** No club, no membership, no account
--     appears because somebody filled in a form.
--   * The lead list is **still unreadable** through the API by the session
--     that wrote to it, exactly as 0013 established.
--   * Only the platform owner can read it, and a club admin — the most
--     privileged ordinary actor there is — cannot.
--   * A returning enquirer is **one lead with fresher facts**, and a blank
--     field never erases what an earlier visit supplied.
--   * BR93: an unticked box on a second visit is **not a withdrawal** of
--     consent given on the first.
--   * BR144's two required fields are enforced in the database, because a
--     public function is reachable without the form.
--   * **A failed alert is a recorded state, not an absent one** (BR146):
--     nobody-was-told must look different from never-attempted, or a
--     provider outage reads as a quiet week.
--   * A second enquiry's alert outcome **replaces** the first's rather than
--     inheriting it — unlike every other field, where a blank preserves
--     what was already there.
--   * **Delivery is terminal** (BR147): recording an outcome against an
--     already-delivered alert is refused, so a double-clicked retry
--     button, a second operator or a future scheduler cannot overwrite a
--     success — nor email one club three times.
--   * Only the platform owner may record a retry's outcome. The enquiry
--     path is anonymous by definition, and this is the function scope 45
--     refused to create for it.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d40a0000-0000-0000-0000-000000000001', 'enquiry.owner@datame.test'),
  ('d40a0000-0000-0000-0000-000000000002', null);  -- an anonymous visitor

insert into platform_admin (user_id, note)
values ('d40a0000-0000-0000-0000-000000000001', 'test platform owner for 40');

commit;

do $$
declare
  owner      uuid := 'd40a0000-0000-0000-0000-000000000001';
  visitor    uuid := 'd40a0000-0000-0000-0000-000000000002';
  club_admin uuid := 'd1111111-1111-1111-1111-111111111111';  -- admin at North Star
  clubs_before   integer;
  members_before integer;
  n          integer;
  v_text     text;
  v_when     timestamptz;
  failures   text[] := '{}';
begin
  -- Counted as `postgres`, and re-counted as `postgres` below. Counting
  -- them as `anon` would compare nothing to nothing: RLS hides every club
  -- from an anonymous caller, so the test would pass whatever the function
  -- did. The first version did exactly that and reported a false alarm.
  perform set_config('role', 'postgres', true);
  select count(*) into clubs_before from club;
  select count(*) into members_before from club_membership;

  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);

  -- 1. **An enquiry is recorded by somebody with no account at all.**
  perform record_interest(
    'Brisbane Bayside FC', 'secretary@bayside.test', 'A Secretary', 'Secretary',
    'AU-QLD', 'about 400, mostly MiniRoos', 'Majestri', 'Season starts in March.',
    '0400 000 000', 'We may send you occasional news about Let''sDataTalk.',
    -- The alert went out. Sent by the caller before this row was written,
    -- which is why the outcome arrives as an argument rather than through a
    -- second function anybody could call (BR146).
    true, null);

  -- 2. **BR145 — and it granted nothing.** This is the scenario the suite
  --    exists for: the natural next request after an interest form is a
  --    self-serve access code, and decision 7 refuses it on commercial
  --    grounds before security ones.
  perform set_config('role', 'postgres', true);
  select count(*) into n from club;
  if n <> clubs_before then
    failures := array_append(failures, 'an enquiry created a club — BR145 and decision 7');
  end if;

  select count(*) into n from club_membership;
  if n <> members_before then
    failures := array_append(failures, 'an enquiry created a membership — BR145');
  end if;

  -- Back to the caller who wrote the row, for the read-back below.
  perform set_config('role', 'anon', true);

  -- 3. **The writer cannot read what it wrote** (0013's rule, unchanged by
  --    a second door being added to the same table).
  select count(*) into n from prospect;
  if n <> 0 then
    failures := array_append(failures,
      'the anon session read the lead list back — prospect_no_api_access is not holding');
  end if;

  -- 4. **BR144 requires two fields and enforces them here**, not only in
  --    the form: a public function is reachable without the form.
  begin
    perform record_interest(null, 'nameless@bayside.test');
    failures := array_append(failures, 'an enquiry with no club name was accepted');
  exception when others then
    if sqlerrm not like '%BR144%' then
      failures := array_append(failures, 'the missing-club refusal did not cite BR144: ' || sqlerrm);
    end if;
  end;

  begin
    perform record_interest('Nowhere FC', 'not-an-address');
    failures := array_append(failures, 'an enquiry with no usable address was accepted');
  exception when others then null;
  end;

  -- 5. **A returning enquirer is one lead, not two**, and a field left
  --    blank the second time does not erase the first answer.
  perform set_config('request.jwt.claim.sub', visitor::text, true);
  perform set_config('role', 'authenticated', true);
  perform record_interest(
    'Brisbane Bayside FC', 'SECRETARY@bayside.test', null, null,
    null, null, null, 'Following up — has anyone replied?',
    null, null,
    -- And this time it did not.
    false, 'No email provider is configured, so nothing was sent.');

  perform set_config('request.jwt.claim.sub', owner::text, true);

  select count(*) into n from app_enquiries() where email = 'secretary@bayside.test';
  if n <> 1 then
    failures := array_append(failures,
      'the same club appears ' || n || ' times; a lead list where the keenest prospect '
      || 'appears twice is a worse list');
  end if;

  select current_system into v_text from app_enquiries() where email = 'secretary@bayside.test';
  if v_text is distinct from 'Majestri' then
    failures := array_append(failures,
      'the second enquiry blanked out what the first supplied (current_system = '
      || coalesce(v_text, 'null') || ')');
  end if;

  select note into v_text from app_enquiries() where email = 'secretary@bayside.test';
  if v_text is distinct from 'Following up — has anyone replied?' then
    failures := array_append(failures, 'the newer note did not replace the older one');
  end if;

  -- 6. **BR93 — silence is not withdrawal.** The second enquiry passed no
  --    wording, which means the box was not ticked. Somebody who did not
  --    notice a checkbox has withdrawn nothing.
  select marketing_consent_at into v_when
    from app_enquiries() where email = 'secretary@bayside.test';
  if v_when is null then
    failures := array_append(failures,
      'an unticked box on a return visit erased consent given on the first — '
      || 'inferring withdrawal from silence is the same mistake as inferring consent from it');
  end if;

  -- 7. **The list belongs to the platform owner.** A club admin is the most
  --    privileged ordinary actor in the product and is not one.
  perform set_config('request.jwt.claim.sub', club_admin::text, true);
  begin
    perform * from app_enquiries();
    failures := array_append(failures, 'a club admin read the platform owner''s lead list');
  exception when others then null;
  end;

  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform * from app_enquiries();
    failures := array_append(failures, 'an anonymous caller read the lead list');
  exception when others then null;
  end;

  -- 8. **A failed alert is a recorded state, not an absent one.** The
  --    whole point of this column is that a provider outage must not read
  --    as a quiet week (BR146).
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', owner::text, true);
  select notify_error into v_text from app_enquiries() where email = 'secretary@bayside.test';
  if v_text is null then
    failures := array_append(failures,
      'a failed alert left no trace — nobody-was-told is indistinguishable from nobody-enquired');
  end if;

  select notified_at into v_when from app_enquiries() where email = 'secretary@bayside.test';
  if v_when is not null then
    failures := array_append(failures,
      'the first enquiry''s delivered alert still vouches for the second enquiry''s failure — '
      || 'a stale success here is a lie about the message that matters');
  end if;

  -- 9. **The two outcomes cannot both be true.** A row claiming it was both
  --    sent and not sent is not evidence of anything.
  perform set_config('role', 'postgres', true);
  begin
    update prospect set notified_at = now(), notify_error = 'both'
     where email = 'secretary@bayside.test';
    failures := array_append(failures, 'a prospect held a sent time and a failure reason at once');
  exception when check_violation then null;
  end;
  perform set_config('request.jwt.claim.sub', owner::text, true);
  perform set_config('role', 'authenticated', true);

  -- 10. **The attempt counter accumulates across enquiries.** It answers
  --     "how much trouble has this club's alert been", which does not reset
  --     because they wrote in again — and a club enquiring twice because
  --     nobody answered the first time is exactly when the history matters.
  select notify_attempts into n from app_enquiries() where email = 'secretary@bayside.test';
  if n <> 2 then
    failures := array_append(failures,
      'the attempt count read ' || n || ' after two enquiries, expected 2');
  end if;

  -- 11. **A retry records its outcome, and only the owner may.**
  perform app_record_alert_outcome('secretary@bayside.test', true, null);

  select notified_at into v_when from app_enquiries() where email = 'secretary@bayside.test';
  if v_when is null then
    failures := array_append(failures, 'a successful retry was not recorded as delivered');
  end if;

  select notify_error into v_text from app_enquiries() where email = 'secretary@bayside.test';
  if v_text is not null then
    failures := array_append(failures,
      'the old failure survived a successful retry, so the row claims both outcomes');
  end if;

  select notify_attempts into n from app_enquiries() where email = 'secretary@bayside.test';
  if n <> 3 then
    failures := array_append(failures, 'the retry did not count as an attempt (' || n || ')');
  end if;

  -- 12. **Delivery is terminal** (BR147). This is what makes a
  --     double-clicked button harmless, and what stops a future scheduler
  --     emailing one club three times.
  begin
    perform app_record_alert_outcome('secretary@bayside.test', false, 'a late failure');
    failures := array_append(failures,
      'an outcome was recorded against an already-delivered alert — a success can be overwritten');
  exception when others then
    if sqlerrm not like '%BR147%' then
      failures := array_append(failures, 'the terminal-delivery refusal did not cite BR147: ' || sqlerrm);
    end if;
  end;

  -- 13. **Only the platform owner may record an outcome.** Scope 45 refused
  --     to create an outcome function at all, because the enquiry path is
  --     anonymous by definition; this one exists only because a retry
  --     starts from the console.
  --
  --     Asserted against a **second, still-failing** enquiry, and the
  --     reason is a bug this test had first: run against the row above,
  --     which is delivered, every caller is refused by BR147's guard
  --     instead — so the scenario passed with the authorisation check
  --     deleted. A refusal proves nothing unless it is the refusal you
  --     meant, which is why the message is checked and not merely the fact.
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform record_interest(
    'Cairns Crocodiles FC', 'sec@crocs.test', null, null, null, null, null, null, null, null,
    false, 'No email provider is configured, so nothing was sent.');

  --     The two probes below record a *failure*, not a success, so that a
  --     missing authorisation check leaves the row still undelivered — and
  --     the owner's call further down then reports the real assertion
  --     rather than aborting the suite on BR147's guard instead.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', club_admin::text, true);
  begin
    perform app_record_alert_outcome('sec@crocs.test', false, 'written by a club admin');
    failures := array_append(failures, 'a club admin recorded an alert outcome');
  exception when others then
    if sqlerrm not like '%platform owner%' then
      failures := array_append(failures,
        'a club admin was refused, but not for being one: ' || sqlerrm);
    end if;
  end;

  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform app_record_alert_outcome('sec@crocs.test', false, 'written by a stranger');
    failures := array_append(failures, 'an anonymous caller recorded an alert outcome');
  exception when others then
    if sqlerrm not like '%platform owner%' then
      failures := array_append(failures,
        'an anonymous caller was refused, but not for being one: ' || sqlerrm);
    end if;
  end;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', owner::text, true);

  -- And the owner may, on a row that has not been delivered.
  perform app_record_alert_outcome('sec@crocs.test', true, null);
  select notified_at into v_when from app_enquiries() where email = 'sec@crocs.test';
  if v_when is null then
    failures := array_append(failures, 'the owner''s retry was not recorded as delivered');
  end if;

  -- 14. **A prospect still has no tenant** (BR92). The whole isolation
  --    argument for this table rests on it, and a future migration could
  --    add a club_id without anybody noticing.
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'prospect' and column_name = 'club_id';
  if n <> 0 then
    failures := array_append(failures,
      'prospect gained a club_id — BR92 says the marketing surface stays outside '
      || 'the tenant world, and check_rls.py exempts this table on that basis');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'Club enquiry FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Club enquiry OK — 14 scenarios; an enquiry grants no club, no membership and no account, the writer cannot read the list back, only the platform owner can, a returning club stays one lead, an unticked box withdraws nothing, a failed alert is recorded rather than absent, and a delivered one is never sent again';
end
$$;
