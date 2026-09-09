-- 0026 — Verifying a match, and the rates a club sets (scope 34, WP1–WP2).
--
-- BR13 says a payment claim requires a verified match. Nothing verified
-- anything, so C5 could not begin — the dependency was internal and real,
-- whatever scope 33 said about which open questions blocked it.
--
-- BR41's determinants — the appointing party, the official's affiliation,
-- their classification, and the competition — are all recordable now. The
-- rates themselves are not shipped: open question #1 was resolved *by
-- dissolving it*, because there is no single rate table. Each club's
-- Committee sets its own. So this is an editor's schema and seeds nothing.

-- ------------------------------------------------- appointment_verification
-- **Not a state on the appointment.** Verification is a different fact
-- asserted by a different person: the appointment says who was asked to
-- officiate, the verification says somebody watched them do it. Collapsing
-- them into a status column would let the person being paid advance their
-- own claim by editing the row that is about them.

create table appointment_verification (
  id             uuid primary key default gen_random_uuid(),
  club_id        uuid not null references club(id) on delete cascade,
  appointment_id uuid not null references match_official_appointment(id) on delete cascade,

  -- Whether they actually officiated. False is a real answer and the one
  -- BR17 needs: somebody appointed to a match that was called off did not
  -- officiate, and there is nothing to pay for.
  officiated     boolean not null default true,

  -- BR18: an abandoned match needs the official's own account of why before
  -- a claim on it can be approved. Held here rather than on the claim,
  -- because it is a fact about the match and not about the money.
  abandonment_note text,

  verified_by    uuid not null,
  verified_at    timestamptz not null default now(),
  note           text,
  created_at     timestamptz not null default now(),

  -- One verification per appointment. Two would be two answers to whether
  -- the game was officiated.
  unique (club_id, appointment_id)
);

create index appointment_verification_appointment_idx
  on appointment_verification (club_id, appointment_id);

alter table appointment_verification enable row level security;

create policy appointment_verification_select on appointment_verification
  for select using (app_has_role(club_id, array['admin','registrar','coordinator','treasurer']));
-- The treasurer reads it because BR13 makes it the precondition for a claim
-- they must approve, and writes nothing: verifying and paying are different
-- jobs, which is the separation BR78 already draws for player money.
create policy appointment_verification_manage on appointment_verification
  for all using (app_has_role(club_id, array['admin','registrar','coordinator']))
  with check (app_has_role(club_id, array['admin','registrar','coordinator']));

/**
 * BR119 — nobody verifies the match they were paid for.
 *
 * The check is possible only because migration 0022 recorded which Person
 * an account belongs to. Before that link existed the platform could not
 * tell that the coordinator signing this off and the official named on the
 * appointment were the same human, and this rule would have been
 * unenforceable prose.
 *
 * It fires on the *link*, not on a name or an email address — which is
 * decision 10's point: identity here is something an administrator
 * asserted, not something matched.
 */
create or replace function assert_verifier_is_not_the_official()
returns trigger
language plpgsql
as $$
declare
  v_person uuid;
  v_self   uuid;
begin
  select person_id into v_person
  from match_official_appointment where id = new.appointment_id;

  select person_id into v_self
  from account_person
  where club_id = new.club_id and user_id = new.verified_by;

  if v_self is not null and v_self = v_person then
    raise exception 'Somebody else has to verify a match you officiated (BR119).'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger verifier_is_not_the_official
before insert or update on appointment_verification
for each row execute function assert_verifier_is_not_the_official();

-- ---------------------------------------------------- referee_fee_schedule
-- BR115: a dated version, not an edited row.
--
-- A club that raises the assistant referee rate in July has not changed
-- what it owed in May. Editing in place makes every claim already raised
-- unauditable, and the person who notices is the treasurer reconciling a
-- bank statement against a total that has since moved.

create table referee_fee_schedule (
  club_id        uuid not null references club(id) on delete cascade,
  id             uuid primary key default gen_random_uuid(),

  effective_from date not null,
  note           text,
  published_by   uuid,
  created_at     timestamptz not null default now(),

  -- One schedule per club per start date. A second is a second answer to
  -- "what did we pay from March".
  unique (club_id, effective_from),
  -- The key the rate rows point at, so a rate cannot join a schedule at
  -- another club.
  unique (club_id, id)
);

alter table referee_fee_schedule enable row level security;

-- Read by the roles that appoint *and* the treasurer who pays; written by
-- admin and treasurer, because #1's answer is that the club's Committee
-- sets the rates and the treasurer keeps them.
create policy referee_fee_schedule_select on referee_fee_schedule
  for select using (app_has_role(club_id, array['admin','registrar','coordinator','treasurer']));
create policy referee_fee_schedule_manage on referee_fee_schedule
  for all using (app_has_role(club_id, array['admin','treasurer']))
  with check (app_has_role(club_id, array['admin','treasurer']));

-- -------------------------------------------------------- referee_fee_rate
-- One row per cell of the club's own table.
--
-- **Three of the four dimensions are nullable, and null means "any".** A
-- club that pays the same for every competition should write one row, not
-- one per competition — and a club with no classification-based rates
-- should not have to invent levels to express that.

create table referee_fee_rate (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references club(id) on delete cascade,
  schedule_id  uuid not null references referee_fee_schedule(id) on delete cascade,

  role         text not null
    check (role in ('referee','assistant_referee','fourth_official')),

  -- Null = any. `competition` matches `fixture.competition`, which is free
  -- text until C11 exists — so this is a string comparison, and the club
  -- must spell it the same way twice. Recorded as a limitation rather than
  -- solved, because solving it is C11.
  competition  text,
  classification text,
  appointed_by text check (appointed_by is null or appointed_by in ('club','association')),

  amount_cents integer not null check (amount_cents >= 0),

  created_at   timestamptz not null default now(),

  -- `nulls not distinct` so two rows cannot both mean "any competition,
  -- any classification" for one role. Without it Postgres treats each null
  -- as unique and the club can define the same cell twice, which is two
  -- answers to what a game pays.
  unique nulls not distinct (schedule_id, role, competition, classification, appointed_by),

  foreign key (club_id, schedule_id) references referee_fee_schedule (club_id, id) on delete cascade
);

create index referee_fee_rate_schedule_idx on referee_fee_rate (club_id, schedule_id, role);

alter table referee_fee_rate enable row level security;

create policy referee_fee_rate_select on referee_fee_rate
  for select using (app_has_role(club_id, array['admin','registrar','coordinator','treasurer']));
create policy referee_fee_rate_manage on referee_fee_rate
  for all using (app_has_role(club_id, array['admin','treasurer']))
  with check (app_has_role(club_id, array['admin','treasurer']));

-- ------------------------------------------------------------- the lookups
/**
 * The schedule in force on a date (BR115).
 *
 * The latest schedule that had started by then — so a game played in May is
 * priced by May's schedule even after July's is published. That is open
 * question #72's adopted answer, made structural rather than remembered.
 */
create or replace function app_fee_schedule_on(p_club_id uuid, p_as_of date)
returns uuid
language sql
stable
as $$
  select id
  from referee_fee_schedule
  where club_id = p_club_id
    and effective_from <= p_as_of
  order by effective_from desc
  limit 1
$$;

revoke all on function app_fee_schedule_on(uuid, date) from public;
grant execute on function app_fee_schedule_on(uuid, date) to authenticated;

comment on table referee_fee_rate is
  'One cell of a club''s own match-official rate table. Null in a dimension '
  'means "any". The platform seeds none of these: open question #1 was '
  'resolved by dissolving it — there is no single rate table, each club''s '
  'Committee sets its own.';
