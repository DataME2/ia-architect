-- 0067: the bell carries what is already waiting (BR159).
--
--   * a waiting item is added once, however often the sync runs,
--   * it retires when no longer waiting, and reopens when waiting again,
--   * a dismissal survives the sync,
--   * nothing lands at a club the caller is not linked to, of a kind BR159
--     does not name, or with a link outside the app,
--   * scope 58's event-written notification, and another club's items, are
--     never retired by a sync that is not their authority,
--   * an anonymous caller writes nothing, and nobody reads another's inbox.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('99990067-0000-0000-0000-000000000001', 'Bell Test FC', 'AU-QLD'),
  ('99990067-0000-0000-0000-000000000002', 'Bell Second Club FC', 'AU-QLD'),
  ('99990067-0000-0000-0000-000000000003', 'Bell Stranger FC', 'AU-QLD');

insert into auth.users (id, email) values
  ('e0067000-0000-0000-0000-000000000001', 'parent@bell.test'),
  ('e0067000-0000-0000-0000-000000000002', 'other@bell.test');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b0067000-0000-0000-0000-000000000001', '99990067-0000-0000-0000-000000000001', 'Karen', 'Bell', '1987-01-01'),
  ('b0067000-0000-0000-0000-000000000002', '99990067-0000-0000-0000-000000000002', 'Karen', 'Bell', '1987-01-01'),
  ('b0067000-0000-0000-0000-000000000003', '99990067-0000-0000-0000-000000000001', 'Oscar', 'Other', '1982-01-01');

insert into account_person (club_id, user_id, person_id) values
  ('99990067-0000-0000-0000-000000000001', 'e0067000-0000-0000-0000-000000000001', 'b0067000-0000-0000-0000-000000000001'),
  ('99990067-0000-0000-0000-000000000002', 'e0067000-0000-0000-0000-000000000001', 'b0067000-0000-0000-0000-000000000002'),
  ('99990067-0000-0000-0000-000000000001', 'e0067000-0000-0000-0000-000000000002', 'b0067000-0000-0000-0000-000000000003');

-- Scope 58's kind, event-written, already in the parent's inbox.
insert into notification (club_id, recipient_user_id, kind, headline, link_path) values
  ('99990067-0000-0000-0000-000000000001', 'e0067000-0000-0000-0000-000000000001',
   'officiating_interest_declared', 'Sebastian would like to officiate', '/registrar/referees');

commit;

do $$
declare
  club_a   uuid := '99990067-0000-0000-0000-000000000001';
  club_b   uuid := '99990067-0000-0000-0000-000000000002';
  stranger uuid := '99990067-0000-0000-0000-000000000003';
  parent   uuid := 'e0067000-0000-0000-0000-000000000001';
  other    uuid := 'e0067000-0000-0000-0000-000000000002';
  kinds    text[] := array['correction_proposed','availability_unanswered','designation_unanswered',
                           'match_unconfirmed','claim_unsettled'];
  match_a  jsonb := jsonb_build_object('club_id', '99990067-0000-0000-0000-000000000001',
                      'kind', 'match_unconfirmed', 'subject_key', 'fixture-1:child-1',
                      'headline', 'Did Sebastian''s match against Robina go ahead?',
                      'link_path', '/me?role=guardian&club=a&child=c');
  claim_b  jsonb := jsonb_build_object('club_id', '99990067-0000-0000-0000-000000000002',
                      'kind', 'claim_unsettled', 'subject_key', 'claim-9',
                      'headline', 'Sebastian is owed $30.00', 'link_path', '/me');
  n        integer;
  settled  timestamptz;
  failures text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', parent::text, true);

  -- 1. Added once, however often the sync runs.
  perform app_sync_waiting(array[club_a, club_b], kinds, jsonb_build_array(match_a, claim_b));
  perform app_sync_waiting(array[club_a, club_b], kinds, jsonb_build_array(match_a, claim_b));
  select count(*) into n from notification where subject_key is not null;
  if n <> 2 then
    failures := array_append(failures, format('%s synchronised items after two syncs, expected 2', n));
  end if;

  -- 2. No longer waiting at club A: retired, not deleted. Club B's item and
  --    scope 58's notification are not this call's to retire.
  perform app_sync_waiting(array[club_a], kinds, '[]'::jsonb);
  select settled_at into settled from notification where subject_key = 'fixture-1:child-1';
  if settled is null then
    failures := array_append(failures, 'an answered item was not retired');
  end if;
  if exists (select 1 from notification where subject_key = 'claim-9' and settled_at is not null) then
    failures := array_append(failures, 'a sync for club A retired an item at club B');
  end if;
  if exists (select 1 from notification where kind = 'officiating_interest_declared' and settled_at is not null) then
    failures := array_append(failures, 'a sync retired scope 58''s event-written notification');
  end if;

  -- 3. Waiting again: reopened.
  perform app_sync_waiting(array[club_a], kinds, jsonb_build_array(match_a));
  select settled_at into settled from notification where subject_key = 'fixture-1:child-1';
  if settled is not null then
    failures := array_append(failures, 'an item waiting again was not reopened');
  end if;

  -- 4. Dismissed by the account: stays dismissed through the next sync.
  update notification set read_at = now() where subject_key = 'fixture-1:child-1';
  perform app_sync_waiting(array[club_a], kinds, jsonb_build_array(match_a));
  if exists (select 1 from notification where subject_key = 'fixture-1:child-1' and read_at is null) then
    failures := array_append(failures, 'a sync undid the account''s own dismissal');
  end if;

  -- 5. Refused, silently: a club the caller is not linked to, a kind BR159
  --    does not name, and links that leave the app.
  perform app_sync_waiting(
    array[club_a, stranger],
    kinds || array['officiating_interest_declared'],
    jsonb_build_array(
      jsonb_build_object('club_id', stranger, 'kind', 'claim_unsettled', 'subject_key', 's1',
                         'headline', 'x', 'link_path', '/me'),
      jsonb_build_object('club_id', club_a, 'kind', 'officiating_interest_declared', 'subject_key', 's2',
                         'headline', 'x', 'link_path', '/me'),
      jsonb_build_object('club_id', club_a, 'kind', 'claim_unsettled', 'subject_key', 's3',
                         'headline', 'x', 'link_path', 'https://example.com/'),
      jsonb_build_object('club_id', club_a, 'kind', 'claim_unsettled', 'subject_key', 's4',
                         'headline', 'x', 'link_path', '//example.com/'),
      match_a));
  select count(*) into n from notification where subject_key in ('s1','s2','s3','s4');
  if n <> 0 then
    failures := array_append(failures, format('%s malformed or foreign items were written', n));
  end if;

  -- 6. Another account reads none of the parent's inbox.
  perform set_config('request.jwt.claim.sub', other::text, true);
  select count(*) into n from notification;
  if n <> 0 then
    failures := array_append(failures, 'another account read the parent''s inbox');
  end if;

  -- 7. An anonymous caller writes nothing.
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform app_sync_waiting(array[club_a], kinds, jsonb_build_array(
    jsonb_build_object('club_id', club_a, 'kind', 'claim_unsettled', 'subject_key', 'anon-1',
                       'headline', 'x', 'link_path', '/me')));

  perform set_config('role', 'postgres', true);
  if exists (select 1 from notification where subject_key = 'anon-1') then
    failures := array_append(failures, 'an anonymous caller wrote an item');
  end if;
  select count(*) into n from notification where recipient_user_id = parent and subject_key is not null;
  if n <> 2 then
    failures := array_append(failures, format('the parent holds %s synchronised items, expected 2', n));
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'The bell carries what is waiting FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'The bell carries what is waiting OK — 7 scenarios';
end
$$;
