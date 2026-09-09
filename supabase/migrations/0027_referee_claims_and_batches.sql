-- 0027 — What the club owes, who approved it, and what it paid
-- (scope 34, WP3–WP4).
--
-- Six rules about referee money have been written since the bootstrap and
-- none has ever run. This is where BR13, BR14, BR16, BR17 and BR18 stop
-- being prose.
--
-- **Nothing here moves money.** Square is chosen and unintegrated, exactly
-- as in the player finance slice. A treasurer records what they paid,
-- because the club's books have to be right whether or not an integration
-- ever arrives — and building the ledger around a provider's webhook makes
-- the books a projection of somebody else's system (BR118).

-- ------------------------------------------------------ referee_payment_batch
-- BR117: closed before paid, and a closed batch admits no further claims.
--
-- A batch that can still gain rows after the treasurer has taken its total
-- to the bank is a batch whose total is a guess. Closing is the moment the
-- number becomes a fact — which is why it is a separate act from paying,
-- and why both are recorded with who did them.

create table referee_payment_batch (
  club_id     uuid not null references club(id) on delete cascade,
  id          uuid primary key default gen_random_uuid(),

  reference   text,
  note        text,

  created_by  uuid,
  created_at  timestamptz not null default now(),

  closed_at   timestamptz,
  closed_by   uuid,

  -- BR118: the remittance. Not a separate table — a batch is paid once, so
  -- a second table would be a one-to-one join that only ever adds a way for
  -- the two halves to disagree.
  paid_at     timestamptz,
  paid_by     uuid,
  paid_reference text,

  -- Paying an open batch is paying a number that can still change.
  check (paid_at is null or closed_at is not null),

  unique (club_id, id)
);

alter table referee_payment_batch enable row level security;

create policy referee_payment_batch_select on referee_payment_batch
  for select using (app_has_role(club_id, array['admin','registrar','coordinator','treasurer']));
-- Money moves under the treasurer, as BR78 already has it for player money.
create policy referee_payment_batch_manage on referee_payment_batch
  for all using (app_has_role(club_id, array['admin','treasurer']))
  with check (app_has_role(club_id, array['admin','treasurer']));

-- ------------------------------------------------------- referee_payment_claim
create table referee_payment_claim (
  id             uuid primary key default gen_random_uuid(),
  club_id        uuid not null references club(id) on delete cascade,

  -- BR14: one claim per appointment, enforced by the key rather than by a
  -- screen remembering to look.
  appointment_id uuid not null references match_official_appointment(id) on delete cascade,

  -- BR116: **the amount it was computed at**, stored. A rate resolved at
  -- read time means a claim's value depends on when somebody opens the
  -- screen — and BR58 froze a submission pack's manifest for exactly this
  -- reason: what was owed has to stay answerable after the source moves.
  amount_cents   integer not null check (amount_cents >= 0),
  -- Which schedule produced it, so the arithmetic is re-checkable years
  -- later without guessing which version was in force.
  schedule_id    uuid references referee_fee_schedule(id),

  state          text not null default 'raised'
    check (state in ('raised','approved','rejected')),

  raised_by      uuid,
  raised_at      timestamptz not null default now(),

  decided_by     uuid,
  decided_at     timestamptz,
  -- A rejection says why. An unexplained rejection is a decision the
  -- official cannot answer, and the coordinator who raised it cannot fix.
  decision_note  text,

  batch_id       uuid,

  check (state <> 'rejected' or btrim(coalesce(decision_note, '')) <> ''),

  unique (club_id, appointment_id),
  foreign key (club_id, batch_id) references referee_payment_batch (club_id, id)
);

create index referee_payment_claim_batch_idx on referee_payment_claim (club_id, batch_id);
create index referee_payment_claim_state_idx on referee_payment_claim (club_id, state);

alter table referee_payment_claim enable row level security;

create policy referee_payment_claim_select on referee_payment_claim
  for select using (app_has_role(club_id, array['admin','registrar','coordinator','treasurer']));

-- **Raising and approving are different jobs**, so they are different
-- policies. The coordinator who chose the official raises the claim; the
-- treasurer approves it. Open question #71 — adopted rather than assumed,
-- and matching BR78's separation for player money.
create policy referee_payment_claim_raise on referee_payment_claim
  for insert with check (app_has_role(club_id, array['admin','registrar','coordinator']));

create policy referee_payment_claim_decide on referee_payment_claim
  for update using (app_has_role(club_id, array['admin','treasurer']))
  with check (app_has_role(club_id, array['admin','treasurer']));

-- **No delete policy, deliberately.** With RLS on, an operation with no
-- policy is denied — the same way `payment` is append-only (BR77). A claim
-- raised in error is rejected with a reason, which leaves the mistake and
-- its correction both answerable.

-- ------------------------------------------------------------- the guards
/**
 * BR13, BR17 and BR18, at the point the claim is created.
 *
 * All three are questions about the *match*, so the claim is where they are
 * asked — a screen that checked them would be one of several, and the one
 * that forgot would be the one a treasurer trusted.
 */
create or replace function assert_claim_is_payable()
returns trigger
language plpgsql
as $$
declare
  v_status      text;
  v_officiated  boolean;
  v_note        text;
  v_verified    boolean;
begin
  select f.status into v_status
  from match_official_appointment m
  join fixture f on f.id = m.fixture_id
  where m.id = new.appointment_id;

  -- BR17. No service was delivered, so nothing is owed — and this is asked
  -- before verification, because a cancelled match is not a match somebody
  -- failed to verify.
  if v_status = 'cancelled' then
    raise exception 'The fixture was cancelled, so there is nothing to claim (BR17).'
      using errcode = '23514';
  end if;

  select true, v.officiated, v.abandonment_note
    into v_verified, v_officiated, v_note
  from appointment_verification v
  where v.appointment_id = new.appointment_id;

  -- BR13.
  if v_verified is not true then
    raise exception 'That match has not been verified yet (BR13).'
      using errcode = '23514';
  end if;

  if v_officiated is not true then
    raise exception 'The verification records that they did not officiate (BR13).'
      using errcode = '23514';
  end if;

  -- BR18. Asked here rather than at approval, because collecting the
  -- explanation while the claim is being raised is what makes it available
  -- when the treasurer looks — instead of a fortnight later, from memory.
  if v_status = 'abandoned' and btrim(coalesce(v_note, '')) = '' then
    raise exception 'The match was abandoned and the official has not explained why (BR18).'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger claim_is_payable
before insert on referee_payment_claim
for each row execute function assert_claim_is_payable();

/**
 * BR117 — what a batch admits, and when.
 *
 * Two refusals. **A closed batch takes no more claims**, because its total
 * has already been treated as a fact. And **only an approved claim joins a
 * batch**, because a batch is a payment instruction and an unapproved claim
 * is a question.
 */
create or replace function assert_batch_admits_claim()
returns trigger
language plpgsql
as $$
declare
  v_closed timestamptz;
begin
  if new.batch_id is null then return new; end if;

  if new.state <> 'approved' then
    raise exception 'Only an approved claim can join a payment batch (BR117).'
      using errcode = '23514';
  end if;

  select closed_at into v_closed
  from referee_payment_batch where id = new.batch_id;

  if v_closed is not null
     and (tg_op = 'INSERT' or old.batch_id is distinct from new.batch_id) then
    raise exception 'That batch is closed and its total has already been acted on (BR117).'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger batch_admits_claim
before insert or update on referee_payment_claim
for each row execute function assert_batch_admits_claim();

-- ------------------------------------------------------------- the totals
/**
 * What a batch comes to.
 *
 * Computed, never stored. Once a batch is closed no claim can join or
 * leave it, so the sum is already stable — and a stored total is a second
 * place for the number to live, which is where the two start disagreeing.
 * `payment` allocation is computed at read time for the same reason.
 */
create or replace function app_batch_total_cents(p_batch_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(amount_cents), 0)::integer
  from referee_payment_claim
  where batch_id = p_batch_id and state = 'approved'
$$;

revoke all on function app_batch_total_cents(uuid) from public;
grant execute on function app_batch_total_cents(uuid) to authenticated;

comment on table referee_payment_claim is
  'A match official''s claim against a verified appointment, carrying the '
  'amount it was computed at (BR116). Raised by a coordinator, approved by '
  'a treasurer (#71), and never deleted — a claim raised in error is '
  'rejected with a reason, so the mistake and its correction both stay '
  'answerable.';
