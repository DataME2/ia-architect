-- The demo club.
--
-- ============================================================!!==========
-- THIS FILE IS NOT A MIGRATION AND MUST NEVER BECOME ONE.
--
-- `supabase/migrations/` runs against production automatically when a
-- change merges to main. A demo club appearing in the pilot club's project
-- because somebody moved a file is exactly the failure this warning exists
-- to prevent. This script is run deliberately, by hand, against whichever
-- project is meant to hold a demo.
-- ========================================================================
--
-- What it is for: showing a prospective club the parts of this product that
-- are hard to describe in a sentence. Not an empty tenant -- an empty
-- tenant demonstrates nothing, and the pitch is that the platform tells you
-- *which rule* is blocking a child and *why*.
--
-- Three constraints, from docs/scope/28_onboarding-a-club-and-its-history.md:
--
--   1. It is a REAL tenant. Not a mode, not a flag, not a bypass. P5
--      protects it exactly like any other club, which is the point --
--      a demo that lived outside the security model would demonstrate a
--      product that does not exist.
--   2. Obviously fictional data only. Never a real child, never a real card
--      number, never a real family's contact details, and never anonymised
--      production data -- which is a different and worse idea.
--   3. One shared demo, not a trial per prospect.
--
-- Every email is on `example.test`, which is reserved by RFC 6761 and can
-- never be a real mailbox. Every card number is visibly fake.
--
-- Dates are RELATIVE to the day it is seeded, so the demo does not rot: an
-- AGM that is three months overdue stays three months overdue rather than
-- becoming eight hundred days overdue and looking like a bug.
--
-- Registrations are created by calling `app_create_registration` -- the
-- same function both real surfaces call -- rather than by hand-writing
-- rows. Hand-built demo data drifts from real behaviour, and a demo that
-- drifts is a demo that lies.

\set ON_ERROR_STOP on

do $$
declare
  ---------------------------------------------------------------------------
  -- Paste the auth user id that should administer the demo, or leave the
  -- placeholder to seed the data without granting anyone access.
  --
  -- Create the user first in Supabase: Authentication -> Users -> Add user.
  -- This is the same bootstrap as any other tenant, and for the same reason
  -- -- see docs/annexes/tenant-provisioning.md.
  ---------------------------------------------------------------------------
  v_admin_user uuid := null;  -- e.g. '00000000-1111-2222-3333-444444444444'

  -- Fixed ids, so re-running is idempotent and teardown is exact.
  v_club    uuid := 'dede0000-0000-0000-0000-0000000000c1';
  v_season  uuid := 'dede0000-0000-0000-0000-0000000000a1';
  v_term    uuid := 'dede0000-0000-0000-0000-0000000000e1';
  v_team_u9 uuid := 'dede0000-0000-0000-0000-0000000000d1';

  v_season_end date := current_date + interval '3 months';

  -- People and registrations, filled in as we go.
  v_reg_clean      uuid;
  v_reg_no_docs    uuid;
  v_reg_owing      uuid;
  v_reg_plan       uuid;
  v_reg_voucher    uuid;
  v_reg_registered uuid;
  v_reg_sibling    uuid;

  v_coach     uuid := 'dede1111-0000-0000-0000-000000000001';
  v_uncleared uuid := 'dede1111-0000-0000-0000-000000000002';
  v_president uuid := 'dede1111-0000-0000-0000-000000000003';
  v_treasurer uuid := 'dede1111-0000-0000-0000-000000000004';
  v_dupe_a    uuid := 'dede1111-0000-0000-0000-00000000000a';
  v_dupe_b    uuid := 'dede1111-0000-0000-0000-00000000000b';

  v_person uuid;
  v_plan   uuid;
  v_pay    uuid;
begin
  if exists (select 1 from club where id = v_club) then
    raise notice 'Demo club already present. Run supabase/demo/teardown.sql first to reseed.';
    return;
  end if;

  -- ------------------------------------------------------------ the club
  insert into club (id, name, jurisdiction)
  values (v_club, 'Riverbend Rovers FC (DEMO)', 'AU-QLD');

  -- A season that is under way, with a fee and a checklist -- so BR2 and
  -- BR3 have something to check on every registration below.
  insert into season (id, club_id, name, starts_on, ends_on,
                      required_document_types, registration_fee_cents)
  values (v_season, v_club, to_char(current_date, 'YYYY') || ' Season',
          current_date - interval '5 months', v_season_end,
          array['Birth certificate', 'Proof of address'], 12050);

  if v_admin_user is not null then
    insert into club_membership (club_id, user_id, role)
    values (v_club, v_admin_user, 'admin'),
           (v_club, v_admin_user, 'registrar'),
           (v_club, v_admin_user, 'treasurer')
    on conflict do nothing;
  end if;

  -- ------------------------------------------------- a family, twice over
  -- BR80: two children, one parent, matched on email. The second call
  -- reuses the guardian the first created rather than making a copy.
  v_reg_clean := app_create_registration(
    v_club, v_season, 'Amara', 'Okafor', 'Ammy',
    (current_date - interval '9 years')::date, null,
    'Chidi', 'Okafor', 'chidi.okafor@example.test', true, false, false, null);

  v_reg_sibling := app_create_registration(
    v_club, v_season, 'Emeka', 'Okafor', null,
    (current_date - interval '7 years')::date, null,
    'Chidi', 'Okafor', 'chidi.okafor@example.test', true, false, false, null);

  -- ------------------------------------------- the rest of the queue
  v_reg_no_docs := app_create_registration(
    v_club, v_season, 'Sofia', 'Marchetti', 'Sofi',
    (current_date - interval '11 years')::date, null,
    'Elena', 'Marchetti', 'elena.marchetti@example.test', true, true, false, null);

  v_reg_owing := app_create_registration(
    v_club, v_season, 'Tomas', 'Kowalski', null,
    (current_date - interval '8 years')::date, null,
    'Anka', 'Kowalski', 'anka.kowalski@example.test', true, false, false, null);

  v_reg_plan := app_create_registration(
    v_club, v_season, 'Priya', 'Raman', null,
    (current_date - interval '10 years')::date, null,
    'Deepa', 'Raman', 'deepa.raman@example.test', true, false, true, null);

  v_reg_voucher := app_create_registration(
    v_club, v_season, 'Jack', 'O''Sullivan', 'Jacko',
    (current_date - interval '6 years')::date, null,
    'Mary', 'O''Sullivan', 'mary.osullivan@example.test', true, false, false, null);

  v_reg_registered := app_create_registration(
    v_club, v_season, 'Lena', 'Fischer', null,
    (current_date - interval '12 years')::date, null,
    'Ute', 'Fischer', 'ute.fischer@example.test', true, false, false, null);

  -- 1. CLEAN -- everything satisfied, ready to submit. Documents received,
  --    fee paid, legal name checked against a document (BR55).
  update registration_document set provided_at = now() - interval '2 months'
   where registration_id = v_reg_clean;
  update registration set outstanding_amount_cents = 0 where id = v_reg_clean;
  update person set legal_name_verified_at = now() - interval '2 months'
   where id = (select person_id from registration where id = v_reg_clean);

  update registration_document set provided_at = now() - interval '2 months'
   where registration_id = v_reg_sibling;
  update registration set outstanding_amount_cents = 0 where id = v_reg_sibling;

  -- 2. BLOCKED ON BR2 -- one of the two required documents is missing, and
  --    the queue names which one rather than saying "documents incomplete".
  update registration_document set provided_at = now() - interval '1 month'
   where registration_id = v_reg_no_docs and document_type = 'Birth certificate';
  update registration set outstanding_amount_cents = 0 where id = v_reg_no_docs;

  -- 3. BLOCKED ON BR3 -- the whole fee outstanding, no plan agreed.
  update registration_document set provided_at = now() - interval '1 month'
   where registration_id = v_reg_owing;

  -- 4. ON A PAYMENT PLAN, AND BEHIND -- shows BR3's message carrying the
  --    balance *and* the missed instalment, which are two different phone
  --    calls. Also shows BR79: a plan schedules a debt, it does not buy a
  --    game.
  update registration_document set provided_at = now() - interval '3 months'
   where registration_id = v_reg_plan;

  insert into payment_plan (id, club_id, registration_id, total_cents, cadence, created_by_user_id)
  values (gen_random_uuid(), v_club, v_reg_plan, 12050, 'monthly',
          coalesce(v_admin_user, '00000000-0000-0000-0000-000000000000'))
  returning id into v_plan;

  -- BR74: 4018 + 4016 + 4016 = 12050 exactly, odd cents on the first.
  insert into payment_installment (club_id, payment_plan_id, sequence, due_on, amount_cents)
  values (v_club, v_plan, 1, current_date - interval '3 months', 4018),
         (v_club, v_plan, 2, current_date - interval '2 months', 4016),
         (v_club, v_plan, 3, current_date - interval '1 month',  4016);

  -- Two of three paid: the third is overdue, so BR3 fails on arrears.
  insert into payment (club_id, registration_id, amount_cents, received_on, method, reference, recorded_by_user_id)
  values (v_club, v_reg_plan, 4018, current_date - interval '3 months', 'bank-transfer', 'DEMO-0001',
          coalesce(v_admin_user, '00000000-0000-0000-0000-000000000000')),
         (v_club, v_reg_plan, 4016, current_date - interval '2 months', 'bank-transfer', 'DEMO-0002',
          coalesce(v_admin_user, '00000000-0000-0000-0000-000000000000'));
  update registration set outstanding_amount_cents = 12050 - 8034 where id = v_reg_plan;

  -- 5. VOUCHER ATTACHED, NOT YET VERIFIED -- BR81. The family has done
  --    their part, nothing has come off the balance, and the player stays
  --    pending until a club officer checks the code.
  update registration_document set provided_at = now() - interval '2 months'
   where registration_id = v_reg_voucher;

  insert into registration_voucher
    (club_id, registration_id, program, code, face_value_cents, state, attached_by_user_id)
  values (v_club, v_reg_voucher, 'Play On!', 'DEMO-PO-000001', 10000, 'ATTACHED',
          coalesce(v_admin_user, '00000000-0000-0000-0000-000000000000'));

  -- 6. REGISTERED, BUT CANNOT PLAY -- BR79, and the case that looks
  --    finished on every other screen. Confirmed by the federation, then
  --    charged a mid-season fee.
  update registration_document set provided_at = now() - interval '4 months'
   where registration_id = v_reg_registered;
  update person set legal_name_verified_at = now() - interval '4 months'
   where id = (select person_id from registration where id = v_reg_registered);
  update registration
     set status = 'COMPLETE', outstanding_amount_cents = 4500
   where id = v_reg_registered;

  -- ------------------------------------------------- BR5: one human, twice
  -- Two records of the same volunteer, same address, names spelled
  -- differently -- the shape a club actually accumulates. Surfaced on the
  -- duplicates screen for a human to resolve, never merged automatically.
  insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email)
  values (v_dupe_a, v_club, 'Margaret', 'Whitfield-Brown', date '1900-01-01', 'm.whitfield@example.test'),
         (v_dupe_b, v_club, 'Maggie',   'Whitfield',       date '1900-01-01', 'M.Whitfield@example.test');

  insert into person_role (club_id, person_id, season_id, role)
  values (v_club, v_dupe_a, v_season, 'guardian'),
         (v_club, v_dupe_b, v_season, 'guardian');

  -- --------------------------------------------------- clearances & teams
  insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth, email)
  values (v_coach,     v_club, 'Daniel',  'Achebe',  current_date - interval '41 years', 'daniel.achebe@example.test'),
         (v_uncleared, v_club, 'Rebecca', 'Lindqvist', current_date - interval '35 years', 'r.lindqvist@example.test'),
         (v_president, v_club, 'Grace',   'Tupou',   current_date - interval '52 years', 'grace.tupou@example.test'),
         (v_treasurer, v_club, 'Hamish',  'Bell',    current_date - interval '47 years', 'hamish.bell@example.test');

  -- A verified card covering the whole season: this coach may be appointed.
  insert into clearance (club_id, person_id, kind, identifier, issued_on, expires_on,
                         verified_by_user_id, verified_at)
  values (v_club, v_coach, 'WWCC', 'DEMO-BC-100001',
          current_date - interval '2 years', current_date + interval '2 years',
          v_admin_user, now() - interval '5 months');

  -- A number recorded and NOT verified. Holding a number is not a check
  -- (BR19), so this person still cannot be added as an official -- which is
  -- the block working, and worth showing.
  insert into clearance (club_id, person_id, kind, identifier, issued_on, expires_on)
  values (v_club, v_uncleared, 'WWCC', 'DEMO-BC-100002',
          current_date - interval '1 year', current_date + interval '3 years');

  insert into team (id, club_id, season_id, name, age_group)
  values (v_team_u9, v_club, v_season, 'Under 9 Rovers', 'U9');

  insert into team_member (club_id, team_id, person_id, role)
  values (v_club, v_team_u9, v_coach, 'coach');

  for v_person in
    select person_id from registration
     where id in (v_reg_clean, v_reg_sibling, v_reg_no_docs, v_reg_owing, v_reg_plan)
  loop
    insert into team_member (club_id, team_id, person_id, role)
    values (v_club, v_team_u9, v_person, 'player')
    on conflict do nothing;
  end loop;

  -- --------------------------------------------------------- governance
  -- BR86: the AGM fell due three months ago. The committee is still
  -- governing -- the club has not stopped having one -- but its mandate has
  -- not been renewed, and every approval resting on Committee authority
  -- from here rests on an expired term.
  insert into committee_term (id, club_id, name, agm_held_on, starts_on, next_agm_due_on)
  values (v_term, v_club,
          to_char(current_date - interval '15 months', 'YYYY') || '-' ||
          to_char(current_date - interval '3 months', 'YY'),
          current_date - interval '15 months',
          current_date - interval '15 months',
          current_date - interval '3 months');

  insert into committee_position (club_id, term_id, person_id, position, elected_on)
  values (v_club, v_term, v_president, 'president', current_date - interval '15 months'),
         (v_club, v_term, v_treasurer, 'treasurer', current_date - interval '15 months');

  -- BR88: the treasurer holds no clearance. Surfaced on the governance
  -- screen rather than refused -- a committee has to be identifiable before
  -- its paperwork can be chased. (The president has none either; only the
  -- coach above is cleared.)

  -- ---------------------------------------------------- a live invitation
  -- Token is the literal string 'demo-family-link'. Safe to publish: it
  -- writes into the demo club and nothing else, and reads nothing at all.
  insert into registration_invitation
    (club_id, season_id, token_hash, label, expires_at, created_by_user_id)
  values (v_club, v_season, encode(digest('demo-family-link', 'sha256'), 'hex'),
          'U9s — demo link', now() + interval '10 years',
          coalesce(v_admin_user, '00000000-0000-0000-0000-000000000000'));

  raise notice 'Demo club seeded: Riverbend Rovers FC (DEMO).';
  raise notice 'Family link token: demo-family-link  ->  /join/demo-family-link';
  if v_admin_user is null then
    raise notice 'No admin granted. Set v_admin_user at the top and re-run after teardown.';
  end if;
end
$$;
