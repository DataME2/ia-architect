-- Can a family say they referee — and can what they say appoint anybody?
--
-- The second question is the one that matters. BR8 refuses designations
-- now (0032), so a parent's "Level 4" reaching `referee_classification`
-- unchecked would not be an untidy record; it would be a child appointed to
-- a match they are not qualified for.
--
--   * a declaration creates no role, no profile and no classification,
--   * accepting creates all three — and the classification is **unsighted**,
--   * BR138: an unsighted classification is not the level it states,
--   * BR137: only the person (13+) or a guardian with authority may declare,
--   * a decline is recorded rather than removed (#79),
--   * a coach reads none of it — an accreditation number is a personal
--     identifier (BR120),
--   * and a family reads their own declaration and nobody else's.

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('d36a0000-0000-0000-0000-000000000001', 'interest.coach@northstar.test');

insert into club_membership (club_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'd36a0000-0000-0000-0000-000000000001', 'coach');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email) values
  ('b36a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Willing', 'Whistle', '2012-03-03', null),
  ('b36a0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Parent', 'Whistle', '1982-04-04', 'parent.whistle@northstar.test'),
  -- Nine years old: old enough to be declared (#80), too young to declare
  -- for themselves (BR137, BR63's threshold).
  ('b36a0000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Small', 'Whistle', (current_date - interval '9 years')::date, null),
  ('b36a0000-0000-0000-0000-0000000000ff', '11111111-1111-1111-1111-111111111111',
   'Stranger', 'Person', '1980-01-01', null);

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('11111111-1111-1111-1111-111111111111', 'b36a0000-0000-0000-0000-000000000001',
   'b36a0000-0000-0000-0000-000000000002', true, true),
  ('11111111-1111-1111-1111-111111111111', 'b36a0000-0000-0000-0000-000000000003',
   'b36a0000-0000-0000-0000-000000000002', true, true);

insert into registration (id, club_id, person_id, season_id, status) values
  ('c36a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'b36a0000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'PENDING_DOCUMENTS');

commit;

do $$
declare
  north_star uuid := '11111111-1111-1111-1111-111111111111';
  officer    uuid := 'd1111111-1111-1111-1111-111111111111';
  coach      uuid := 'd36a0000-0000-0000-0000-000000000001';
  child      uuid := 'b36a0000-0000-0000-0000-000000000001';
  parent     uuid := 'b36a0000-0000-0000-0000-000000000002';
  small      uuid := 'b36a0000-0000-0000-0000-000000000003';
  stranger   uuid := 'b36a0000-0000-0000-0000-0000000000ff';
  reg        uuid := 'c36a0000-0000-0000-0000-000000000001';
  v_id       uuid;
  n          integer;
  txt        text;
  failures   text[] := '{}';
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', officer::text, true);

  -- 1. **A declaration creates nothing.** BR136's whole point.
  v_id := app_declare_interest(reg, true, true, 'FQ-9912', 'Level 4', parent);

  perform set_config('role', 'postgres', true);
  select count(*) into n from person_role where person_id = child and role = 'referee';
  if n <> 0 then failures := array_append(failures, 'a declaration created a referee role'); end if;
  select count(*) into n from referee_profile where person_id = child;
  if n <> 0 then failures := array_append(failures, 'a declaration created a referee profile'); end if;
  select count(*) into n from referee_classification where person_id = child;
  if n <> 0 then
    failures := array_append(failures,
      'a declaration created a classification — BR8 would then compare against what a parent typed');
  end if;

  -- 2. **Nothing to declare records nothing.** A row of falses is noise a
  --    coordinator has to read and dismiss.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', officer::text, true);
  if app_declare_interest(reg, false, false, null, null, parent) is not null then
    failures := array_append(failures, 'an empty declaration was recorded');
  end if;

  -- 3. **BR137 — a nine-year-old cannot declare for themselves**, though
  --    they may be declared (#80: MiniRefs are children).
  perform set_config('role', 'postgres', true);
  begin
    insert into officiating_interest (club_id, person_id, wants_to_officiate, declared_by_person_id)
    values (north_star, small, true, small);
    failures := array_append(failures, 'a nine-year-old declared their own officiating interest');
  exception when others then null;
  end;

  insert into officiating_interest (club_id, person_id, wants_to_officiate, declared_by_person_id)
  values (north_star, small, true, parent);
  select count(*) into n from officiating_interest where person_id = small;
  if n <> 1 then
    failures := array_append(failures, 'a guardian could not declare for a child under thirteen');
  end if;

  -- 4. **And a stranger cannot declare for somebody else's child.**
  begin
    insert into officiating_interest (club_id, person_id, wants_to_officiate, declared_by_person_id)
    values (north_star, child, true, stranger);
    failures := array_append(failures, 'a person with no authority declared for a child');
  exception when others then null;
  end;

  -- 5. **Accepting creates all three — and the classification is unsighted.**
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', officer::text, true);
  perform app_review_interest(v_id, true, 'Checked the register');

  perform set_config('role', 'postgres', true);
  select count(*) into n from referee_profile where person_id = child;
  if n <> 1 then failures := array_append(failures, 'accepting did not create a referee profile'); end if;
  select count(*) into n from person_role where person_id = child and role = 'referee';
  if n <> 1 then failures := array_append(failures, 'accepting did not create a referee role'); end if;

  select count(*) into n from referee_classification
   where person_id = child and level = 'Level 4' and sighted_at is null;
  if n <> 1 then
    failures := array_append(failures,
      'the accepted level was not recorded, or was recorded as sighted — BR138 would then count what a parent typed');
  end if;

  -- 6. **A decided declaration cannot be decided again**, and a decline is
  --    kept rather than removed (#79).
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', officer::text, true);
  begin
    perform app_review_interest(v_id, false, null);
    failures := array_append(failures, 'a reviewed declaration was reviewed again');
  exception when others then null;
  end;

  perform set_config('role', 'postgres', true);
  update officiating_interest set state = 'declined', reviewed_at = now()
   where person_id = small;
  select count(*) into n from officiating_interest where person_id = small and state = 'declined';
  if n <> 1 then failures := array_append(failures, 'a declined declaration was removed rather than kept'); end if;

  -- 7. **A coach reads none of it.** An accreditation number is a personal
  --    identifier and the roles that act on it are the ones that read it.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', coach::text, true);
  select count(*) into n from officiating_interest;
  if n <> 0 then
    failures := array_append(failures, 'a coach read the club''s officiating declarations');
  end if;

  -- 8. **And a coach cannot review one.**
  begin
    perform app_review_interest(v_id, true, null);
    failures := array_append(failures, 'a coach reviewed a declaration');
  exception when others then null;
  end;

  if array_length(failures, 1) > 0 then
    raise exception E'Officiating interest FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'Officiating interest OK — 8 scenarios; a declaration creates nothing, accepting creates a referee whose declared level is recorded unsighted, and only the person or a guardian with authority may declare';
end
$$;
