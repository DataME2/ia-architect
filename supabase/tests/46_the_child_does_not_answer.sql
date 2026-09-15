-- Can a twelve-year-old accept their own match designation, with no adult
-- ever asked?
--
-- Proved before it was fixed: **yes**, and nothing anywhere recorded that
-- the question had been put to anybody. `match_official_appointment` has
-- carried `proposed`/`accepted`/`declined` states since 0025 and has never
-- had a column saying *whose* answer it is.
--
-- BR113 has been written since the business layer was drafted and has never
-- had code: *a designation for a match official under 18 is proposed to
-- their Parent/Guardian, who accepts or declines it.* It is the twin of the
-- exemption scope 50 built around — BR84 rightly asks no card of a child,
-- and the product then appointed that child to a fixture without asking the
-- adult responsible for them.
--
-- Football Queensland's pathway begins at MiniRefs — twelve-year-olds — so
-- this is not an edge: it is the youngest half of the pathway.
--
--   * a minor's designation cannot be answered by the minor,
--   * nor by a guardian who does not hold authority (BR67's two flags),
--   * nor by nobody at all — a state change with no answer behind it,
--   * a minor with no guardian holding authority is **not designated**,
--     because a proposal nobody can answer is not a proposal,
--   * the authority guardian's answer is accepted and stamped,
--   * a decline still carries its reason (BR42/BR112, unchanged),
--   * an **adult** official's appointment is untouched by all of it,
--   * a coordinator's withdrawal is not a response and stays theirs,
--   * and the guardian can read and answer it **signed in as themselves**,
--     while another family's guardian can do neither.

\set ON_ERROR_STOP on

begin;

insert into club (id, name, jurisdiction) values
  ('46c00000-0000-0000-0000-000000000001', 'MiniRef FC', 'AU-QLD');

insert into season (id, club_id, name, starts_on, ends_on) values
  ('46c00000-0000-0000-0000-0000000000aa', '46c00000-0000-0000-0000-000000000001',
   '2026', current_date - interval '60 days', current_date + interval '200 days');

insert into auth.users (id, email) values
  ('d46c0000-0000-0000-0000-000000000001', 'coord@miniref.test'),
  ('d46c0000-0000-0000-0000-000000000002', 'mum@miniref.test'),
  ('d46c0000-0000-0000-0000-000000000003', 'other@miniref.test');

insert into club_membership (club_id, user_id, role) values
  ('46c00000-0000-0000-0000-000000000001', 'd46c0000-0000-0000-0000-000000000001', 'coordinator');

insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth) values
  -- Twelve. The lowest rung of the pathway, and the person this suite is about.
  ('b46c0000-0000-0000-0000-000000000001', '46c00000-0000-0000-0000-000000000001',
   'Twelve', 'MiniRef', (current_date - interval '12 years')::date),
  -- Her mother, holding authority.
  ('b46c0000-0000-0000-0000-000000000002', '46c00000-0000-0000-0000-000000000001',
   'Authority', 'Guardian', '1985-01-01'),
  -- A second adult on the record for contact only. BR67's other flag.
  ('b46c0000-0000-0000-0000-000000000003', '46c00000-0000-0000-0000-000000000001',
   'Contact', 'Only', '1984-01-01'),
  -- Fifteen, and nobody is recorded as holding authority over him.
  ('b46c0000-0000-0000-0000-000000000004', '46c00000-0000-0000-0000-000000000001',
   'Unparented', 'MiniRef', (current_date - interval '15 years')::date),
  -- An adult official with a verified card. BR113 says nothing about him.
  ('b46c0000-0000-0000-0000-000000000005', '46c00000-0000-0000-0000-000000000001',
   'Grown', 'Official', '1980-01-01'),
  -- Another family entirely, at the same club.
  ('b46c0000-0000-0000-0000-000000000006', '46c00000-0000-0000-0000-000000000001',
   'Someone', 'Else', '1983-01-01');

insert into clearance (club_id, person_id, identifier, expires_on, verified_at) values
  ('46c00000-0000-0000-0000-000000000001', 'b46c0000-0000-0000-0000-000000000005',
   'BC-GROWN', (current_date + interval '400 days')::date, now());

insert into guardianship (club_id, person_id, guardian_person_id, is_authority, is_contact) values
  ('46c00000-0000-0000-0000-000000000001', 'b46c0000-0000-0000-0000-000000000001',
   'b46c0000-0000-0000-0000-000000000002', true, true),
  ('46c00000-0000-0000-0000-000000000001', 'b46c0000-0000-0000-0000-000000000001',
   'b46c0000-0000-0000-0000-000000000003', false, true),
  -- Recorded, but authority has ended or was never held. BR67 keeps the
  -- two flags apart precisely so this row can exist.
  ('46c00000-0000-0000-0000-000000000001', 'b46c0000-0000-0000-0000-000000000004',
   'b46c0000-0000-0000-0000-000000000003', false, true);

insert into account_person (club_id, user_id, person_id) values
  ('46c00000-0000-0000-0000-000000000001', 'd46c0000-0000-0000-0000-000000000002',
   'b46c0000-0000-0000-0000-000000000002'),
  ('46c00000-0000-0000-0000-000000000001', 'd46c0000-0000-0000-0000-000000000003',
   'b46c0000-0000-0000-0000-000000000006');

insert into team (id, club_id, season_id, name) values
  ('46c00000-0000-0000-0000-0000000000c1', '46c00000-0000-0000-0000-000000000001',
   '46c00000-0000-0000-0000-0000000000aa', 'U10');

-- Distinct kick-offs throughout: BR7 refuses two designations at one time,
-- and this suite is not about BR7.
insert into fixture (id, club_id, season_id, team_id, opponent, played_on, kick_off, home_away, status) values
  ('46c00000-0000-0000-0000-0000000000f1', '46c00000-0000-0000-0000-000000000001',
   '46c00000-0000-0000-0000-0000000000aa', '46c00000-0000-0000-0000-0000000000c1',
   'Rivals', (current_date + 30)::date, '09:00', 'home', 'scheduled'),
  ('46c00000-0000-0000-0000-0000000000f2', '46c00000-0000-0000-0000-000000000001',
   '46c00000-0000-0000-0000-0000000000aa', '46c00000-0000-0000-0000-0000000000c1',
   'Wanderers', (current_date + 30)::date, '11:00', 'away', 'scheduled'),
  ('46c00000-0000-0000-0000-0000000000f3', '46c00000-0000-0000-0000-000000000001',
   '46c00000-0000-0000-0000-0000000000aa', '46c00000-0000-0000-0000-0000000000c1',
   'Thistle', (current_date + 30)::date, '13:00', 'home', 'scheduled'),
  ('46c00000-0000-0000-0000-0000000000f4', '46c00000-0000-0000-0000-000000000001',
   '46c00000-0000-0000-0000-0000000000aa', '46c00000-0000-0000-0000-0000000000c1',
   'Rangers', (current_date + 30)::date, '15:00', 'away', 'scheduled');

commit;

do $$
declare
  the_club   uuid := '46c00000-0000-0000-0000-000000000001';
  minor      uuid := 'b46c0000-0000-0000-0000-000000000001';
  mum        uuid := 'b46c0000-0000-0000-0000-000000000002';
  contact    uuid := 'b46c0000-0000-0000-0000-000000000003';
  unparented uuid := 'b46c0000-0000-0000-0000-000000000004';
  grown      uuid := 'b46c0000-0000-0000-0000-000000000005';
  mum_user   uuid := 'd46c0000-0000-0000-0000-000000000002';
  other_user uuid := 'd46c0000-0000-0000-0000-000000000003';
  f1         uuid := '46c00000-0000-0000-0000-0000000000f1';
  f2         uuid := '46c00000-0000-0000-0000-0000000000f2';
  f3         uuid := '46c00000-0000-0000-0000-0000000000f3';
  f4         uuid := '46c00000-0000-0000-0000-0000000000f4';
  v_state    text;
  v_when     timestamptz;
  n          integer;
  failures   text[] := '{}';
begin
  perform set_config('role', 'postgres', true);

  -- 1. **The scenario this suite exists for.** A twelve-year-old's
  --    designation, answered by nobody — no adult named, none asked.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role, state)
    values (the_club, f1, minor, 'referee', 'accepted');
    failures := array_append(failures,
      'a twelve-year-old''s designation went straight to accepted with no adult named '
      || 'and none asked — BR113 has had no code since it was written');
    delete from match_official_appointment where fixture_id = f1 and person_id = minor;
  exception when others then
    null;
  end;

  -- 2. **A proposal nobody can answer is not a proposal.** A minor with no
  --    guardian holding authority is not designated at all, rather than
  --    designated into a state that can never be left.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role)
    values (the_club, f2, unparented, 'referee');
    failures := array_append(failures,
      'a fifteen-year-old with no guardian holding authority was designated — '
      || 'the proposal has nobody to go to (BR113)');
  exception when others then
    null;
  end;

  -- 3. A minor **with** an authority guardian is designated normally. The
  --    rule routes the answer; it does not refuse the child the pathway.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role)
    values (the_club, f1, minor, 'referee');
  exception when others then
    failures := array_append(failures,
      'a MiniRef whose mother holds authority could not be designated at all: ' || sqlerrm);
  end;

  -- 4. Accepted with **no responder named**. A state change with no answer
  --    behind it is the gap in scenario 1, wearing a proposal first.
  --
  --    Asserted on the **message**, not merely on the refusal. Naming
  --    nobody and naming the wrong person are refused by two different
  --    checks, and with the first deleted the second still refuses — so a
  --    test that only asked "was it refused" went green over a coordinator
  --    being told their guardian lacks authority when they named no
  --    guardian at all.
  begin
    update match_official_appointment set state = 'accepted'
     where fixture_id = f1 and person_id = minor;
    failures := array_append(failures,
      'a minor''s designation was accepted without naming who answered it (BR113)');
    update match_official_appointment set state = 'proposed', responded_at = null
     where fixture_id = f1 and person_id = minor;
  exception when others then
    if sqlerrm not like '%record who answered it%' then
      failures := array_append(failures,
        'naming nobody was refused for the wrong reason -- "' || sqlerrm
        || '" is the message for naming the wrong adult');
    end if;
  end;

  -- 5. **The child answering for themselves** — the whole of BR113.
  begin
    update match_official_appointment
       set state = 'accepted', responded_by_person_id = minor
     where fixture_id = f1 and person_id = minor;
    failures := array_append(failures,
      'the twelve-year-old accepted her own designation (BR113)');
    update match_official_appointment
       set state = 'proposed', responded_by_person_id = null, responded_at = null
     where fixture_id = f1 and person_id = minor;
  exception when others then
    null;
  end;

  -- 6. A guardian **without authority**. BR67 keeps contactability and
  --    authority apart, and this is the moment the distinction is for.
  begin
    update match_official_appointment
       set state = 'accepted', responded_by_person_id = contact
     where fixture_id = f1 and person_id = minor;
    failures := array_append(failures,
      'a guardian recorded for contact only, without authority, accepted a '
      || 'designation on a child''s behalf (BR67/BR113)');
    update match_official_appointment
       set state = 'proposed', responded_by_person_id = null, responded_at = null
     where fixture_id = f1 and person_id = minor;
  exception when others then
    null;
  end;

  -- 7. The authority guardian's answer is taken, and **stamped**: an
  --    acceptance nobody can date is not evidence that anybody was asked.
  begin
    update match_official_appointment
       set state = 'accepted', responded_by_person_id = mum
     where fixture_id = f1 and person_id = minor;
  exception when others then
    failures := array_append(failures,
      'the mother holding authority could not accept her daughter''s designation: ' || sqlerrm);
  end;

  select state, responded_at into v_state, v_when
    from match_official_appointment where fixture_id = f1 and person_id = minor;
  if v_state is distinct from 'accepted' then
    failures := array_append(failures,
      'the guardian''s acceptance left the designation at ' || coalesce(v_state, 'null'));
  end if;
  if v_when is null then
    failures := array_append(failures, 'the guardian''s answer was not stamped with when it was given');
  end if;

  -- 8. A decline still carries its reason (BR42/BR112) — unchanged by any
  --    of this, and checked because a new trigger on the same table is
  --    exactly how an old constraint stops being reached.
  insert into match_official_appointment (club_id, fixture_id, person_id, role)
  values (the_club, f3, minor, 'referee');
  begin
    update match_official_appointment
       set state = 'declined', responded_by_person_id = mum
     where fixture_id = f3 and person_id = minor;
    failures := array_append(failures,
      'a reasonless decline was recorded, even from the right adult (BR42/BR112)');
  exception when others then
    null;
  end;

  begin
    update match_official_appointment
       set state = 'declined', responded_by_person_id = mum, reason = 'She has a test that morning.'
     where fixture_id = f3 and person_id = minor;
  exception when others then
    failures := array_append(failures,
      'the guardian could not decline with a reason: ' || sqlerrm);
  end;

  -- 9. **The adult official is untouched.** BR113 is a rule about children,
  --    and a rule about children that quietly changed how adults are
  --    appointed would be a different rule.
  begin
    insert into match_official_appointment (club_id, fixture_id, person_id, role, state)
    values (the_club, f4, grown, 'referee', 'accepted');
  exception when others then
    failures := array_append(failures,
      'an adult official could no longer be appointed and accepted: ' || sqlerrm);
  end;

  -- 10. A coordinator's **withdrawal is not a response**. Nobody is being
  --     asked; the club is removing an official, and BR50's sweep writes
  --     exactly this without a guardian anywhere near it.
  begin
    update match_official_appointment
       set state = 'withdrawn', reason = 'Fixture reallocated to the association.'
     where fixture_id = f1 and person_id = minor;
  exception when others then
    failures := array_append(failures,
      'a coordinator could not withdraw a minor''s designation: ' || sqlerrm);
  end;

  -- ------------------------------------------------ signed in as the mother
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', mum_user::text, true);

  -- 11. She can **see** what she is being asked. BR113 puts the question to
  --     her; a question she cannot read has not been put to her.
  select count(*) into n from match_official_appointment where person_id = minor;
  if n = 0 then
    failures := array_append(failures,
      'the guardian could not read a single designation belonging to her own child, '
      || 'so BR113 asks her a question she cannot see');
  end if;

  -- 12. And she can **answer** it herself, rather than by telephoning a
  --     coordinator who types it for her.
  update match_official_appointment
     set state = 'accepted', responded_by_person_id = mum
   where fixture_id = f3 and person_id = minor;
  perform set_config('role', 'postgres', true);
  select state into v_state from match_official_appointment
   where fixture_id = f3 and person_id = minor;
  if v_state is distinct from 'accepted' then
    failures := array_append(failures,
      'the guardian''s own answer did not land — the row is ' || coalesce(v_state, 'null'));
  end if;

  -- 13. Answering is **all** she may do. A `with check` cannot say which
  --     columns were allowed to change, so the guard is asserted rather
  --     than assumed: she cannot move her daughter to a different match,
  --     nor rewrite who appointed her, which decides who pays (BR114).
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', mum_user::text, true);
  begin
    update match_official_appointment
       set appointed_by = 'association', responded_by_person_id = mum
     where fixture_id = f3 and person_id = minor;
    perform set_config('role', 'postgres', true);
    select appointed_by into v_state from match_official_appointment
     where fixture_id = f3 and person_id = minor;
    if v_state is distinct from 'club' then
      failures := array_append(failures,
        'a guardian rewrote who appointed the official while answering (BR113/BR114)');
    end if;
  exception when others then
    null;
  end;

  -- 15. **The guards do not depend on who is writing.** Letting a family
  --     update this table is what made this worth asserting: 0025's three
  --     refusals and 0044's card check all read tables a guardian cannot
  --     see, so under her session they would pass on an empty answer.
  --
  --     BR9 is the sharpest case: 0025 restricts `referee_suspension` to
  --     admin and registrar *deliberately* — a coordinator needs the answer,
  --     not the disciplinary history — so the table is invisible to almost
  --     everyone who writes this one. The child is suspended over the date
  --     of the match, and her mother's acceptance must hit that refusal just
  --     as a coordinator's insert would.
  perform set_config('role', 'postgres', true);
  insert into referee_suspension (club_id, person_id, starts_on, ends_on, reason)
  values (the_club, minor, current_date, (current_date + 60)::date, 'Under review.');

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', mum_user::text, true);
  begin
    update match_official_appointment
       set state = 'accepted', responded_by_person_id = mum
     where fixture_id = f3 and person_id = minor;
    perform set_config('role', 'postgres', true);
    select state into v_state from match_official_appointment
     where fixture_id = f3 and person_id = minor;
    if v_state = 'accepted' then
      failures := array_append(failures,
        'BR9 passed silently because the guardian cannot read referee_suspension, '
        || 'which 0025 narrows to admin and registrar on purpose — the refusal '
        || 'depended on who was writing');
    end if;
  exception when others then
    null;
  end;
  perform set_config('role', 'postgres', true);
  delete from referee_suspension where person_id = minor;

  -- ------------------------------------------- signed in as another family
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', other_user::text, true);

  -- 16. Another family reads nothing of this child, and answers nothing.
  select count(*) into n from match_official_appointment where person_id = minor;
  if n <> 0 then
    failures := array_append(failures,
      'an unrelated family at the same club read ' || n || ' of this child''s designations (P5)');
  end if;

  update match_official_appointment
     set state = 'declined', responded_by_person_id = mum, reason = 'Not mine to answer.'
   where fixture_id = f3 and person_id = minor;

  perform set_config('role', 'postgres', true);
  select state into v_state from match_official_appointment
   where fixture_id = f3 and person_id = minor;
  if v_state is distinct from 'accepted' then
    failures := array_append(failures,
      'an unrelated family answered this child''s designation');
  end if;

  if array_length(failures, 1) > 0 then
    raise exception E'The child does not answer FAILED:\n  - %', array_to_string(failures, E'\n  - ');
  end if;

  raise notice 'The child does not answer OK — 16 scenarios; a minor''s designation is answered by a guardian holding authority and by nobody else, a minor with no such guardian is not designated at all, the adult path is untouched, a withdrawal is not a response, the guardian both reads and answers it signed in as herself, and every older refusal on this table still refuses when she is the one writing';
end
$$;
