-- The Technical Director's workspace (0093, BR176, BR177).
--
--   * a TD records a missing appearance, corrects it and removes it — each
--     only with a source, each leaving one append-only correction row,
--   * a correction without a source is refused,
--   * a committee member (who records no appearances) is refused,
--   * a correction row cannot be changed or removed,
--   * the TD reads player activity, with the subject named and no money,
--   * a committee member reads no activity at all,
--   * the TD reads Saturday's answers (BR62), and another club reads
--     nothing of any of it.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d9300000-0000-0000-0000-000000000001', 'td@techdirector.test'),
  ('d9300000-0000-0000-0000-000000000002', 'committee@techdirector.test'),
  ('d9300000-0000-0000-0000-0000000000ee', 'td@rival.test');

insert into club (id, name, jurisdiction) values
  ('c9300000-0000-0000-0000-000000000001', 'Technical FC', 'QLD'),
  ('c9300000-0000-0000-0000-000000000002', 'Rival Technical FC', 'QLD');

insert into club_membership (club_id, user_id, role) values
  ('c9300000-0000-0000-0000-000000000001', 'd9300000-0000-0000-0000-000000000001', 'technical_director'),
  ('c9300000-0000-0000-0000-000000000001', 'd9300000-0000-0000-0000-000000000002', 'committee'),
  ('c9300000-0000-0000-0000-000000000002', 'd9300000-0000-0000-0000-0000000000ee', 'technical_director');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('a9300000-0000-0000-0000-000000000001', 'c9300000-0000-0000-0000-000000000001', '2026', '2026-01-01', '2026-12-31');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  ('b9300000-0000-0000-0000-000000000001', 'c9300000-0000-0000-0000-000000000001', 'Riley', 'Striker', '2010-03-03');

insert into registration (id, club_id, person_id, season_id) values
  ('e9300000-0000-0000-0000-000000000001', 'c9300000-0000-0000-0000-000000000001',
   'b9300000-0000-0000-0000-000000000001', 'a9300000-0000-0000-0000-000000000001');

insert into fixture (id, club_id, season_id, played_on, opponent, home_away, status) values
  ('f9300000-0000-0000-0000-000000000001', 'c9300000-0000-0000-0000-000000000001',
   'a9300000-0000-0000-0000-000000000001', '2026-05-02', 'Rival United', 'home', 'played');

insert into participation_response (club_id, fixture_id, person_id, status, responded_by_person_id) values
  ('c9300000-0000-0000-0000-000000000001', 'f9300000-0000-0000-0000-000000000001',
   'b9300000-0000-0000-0000-000000000001', 'available', 'b9300000-0000-0000-0000-000000000001');

-- Two facts already in the log: one about the player, one about money.
insert into audit_event (club_id, action, entity, entity_id, detail) values
  ('c9300000-0000-0000-0000-000000000001', 'season_role_granted', 'person_role',
   'b9300000-0000-0000-0000-000000000001', '{"role":"player"}'),
  ('c9300000-0000-0000-0000-000000000001', 'outstanding_amount_set', 'registration',
   'e9300000-0000-0000-0000-000000000001', '{"cents":5000}');

commit;

do $$
declare
  club      uuid := 'c9300000-0000-0000-0000-000000000001';
  reg       uuid := 'e9300000-0000-0000-0000-000000000001';
  fix       uuid := 'f9300000-0000-0000-0000-000000000001';
  td        uuid := 'd9300000-0000-0000-0000-000000000001';
  committee uuid := 'd9300000-0000-0000-0000-000000000002';
  rival_td  uuid := 'd9300000-0000-0000-0000-0000000000ee';
  n         integer;
  g         integer;
  failures  text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', td::text, true);

  -- 1. Recorded late, with a source.
  perform app_correct_appearance(reg, fix, 70, true, 1, 0, 'Referee match report, 2 May', false);
  select count(*) into n from appearance where fixture_id = fix;
  if n <> 1 then failures := array_append(failures, 'the TD could not record a missing appearance'); end if;

  -- 2. Corrected, with a source; the figure changes.
  perform app_correct_appearance(reg, fix, 90, true, 2, 1, 'Official result sheet, signed', false);
  select goals into g from appearance where fixture_id = fix;
  if g <> 2 then failures := array_append(failures, 'the TD''s correction did not change the figure'); end if;

  -- 3. Without a source, refused.
  begin
    perform app_correct_appearance(reg, fix, 10, true, 9, 9, 'trust', false);
    perform app_correct_appearance(reg, fix, 10, true, 9, 9, '   ', false);
    failures := array_append(failures, 'a correction without a source was accepted');
  exception when check_violation then null;
  end;

  -- 4. Two correction rows so far, each with its source.
  select count(*) into n from appearance_correction where registration_id = reg and char_length(source) >= 8;
  if n <> 2 then failures := array_append(failures, format('expected 2 correction rows, found %s', n)); end if;

  -- 5. A correction row cannot be changed or removed.
  update appearance_correction set source = 'rewritten afterwards' where registration_id = reg;
  delete from appearance_correction where registration_id = reg;
  select count(*) into n from appearance_correction where registration_id = reg and source <> 'rewritten afterwards';
  if n <> 2 then failures := array_append(failures, 'a correction row was changed or removed'); end if;

  -- 6. The TD reads player activity: the role grant and the appearances, never the money.
  select count(*) into n from app_player_activity(club, 30) where action = 'season_role_granted' and person_name = 'Riley Striker';
  if n <> 1 then failures := array_append(failures, 'the TD did not see the player''s role grant'); end if;
  select count(*) into n from app_player_activity(club, 30) where action like 'appearance.%';
  if n < 2 then failures := array_append(failures, 'the TD did not see the appearance changes'); end if;
  select count(*) into n from app_player_activity(club, 30) where action = 'outstanding_amount_set';
  if n <> 0 then failures := array_append(failures, 'the TD''s activity carried money'); end if;

  -- 7. The TD reads Saturday's answers (BR62).
  select count(*) into n from participation_response where club_id = club;
  if n <> 1 then failures := array_append(failures, 'the TD could not read Saturday''s answers'); end if;

  -- 8. Removed, with a source.
  perform app_correct_appearance(reg, fix, 0, false, 0, 0, 'Video shows another player wore 9', true);
  select count(*) into n from appearance where fixture_id = fix;
  if n <> 0 then failures := array_append(failures, 'the TD could not remove a wrong appearance'); end if;

  -- 9. A committee member corrects nothing and reads no activity.
  perform set_config('request.jwt.claim.sub', committee::text, true);
  begin
    perform app_correct_appearance(reg, fix, 90, true, 5, 5, 'I was at the game myself', false);
    failures := array_append(failures, 'a committee member corrected an appearance');
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from app_player_activity(club, 30);
  if n <> 0 then failures := array_append(failures, 'a committee member read player activity'); end if;

  -- 10. Another club's TD reads nothing of this club.
  perform set_config('request.jwt.claim.sub', rival_td::text, true);
  select count(*) into n from app_player_activity(club, 30);
  if n <> 0 then failures := array_append(failures, 'another club''s TD read this club''s activity'); end if;
  select count(*) into n from appearance_correction where club_id = club;
  if n <> 0 then failures := array_append(failures, 'another club''s TD read this club''s corrections'); end if;
  begin
    perform app_correct_appearance(reg, fix, 90, true, 5, 5, 'Rival club match report', false);
    failures := array_append(failures, 'another club''s TD corrected this club''s appearance');
  exception when insufficient_privilege then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'The Technical Director''s workspace FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'The Technical Director''s workspace OK — 10 scenarios; corrections need a source and stay append-only, activity names the player and carries no money, and nothing crosses a club';
end
$$;
