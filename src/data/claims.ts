/**
 * Reads and writes for verification, claims and payment batches
 * (scope 34, WP1/WP3/WP4 — database delivered there; the screens here).
 *
 * Every refusal that matters is the database's: BR13, BR14, BR17, BR18 and
 * BR119 on the verification and the claim, BR117 on the batch. This module
 * translates those refusals into words and never claims to enforce them
 * itself — the same division scope 51's `answerDesignation` and scope 53's
 * `createSchedule` both draw.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { classificationOn } from '../web/referee-view.ts';
import type { AppointedBy, FeeRate, OfficialRole } from '../domain/officiating/fees.ts';
import type { ClaimCandidate, VerifiableAppointment } from '../web/claim-view.ts';
import { claimable } from '../domain/officiating/fees.ts';
import { loadReferees } from './officiating.ts';
import { notifyClaimApproved, partyFor } from './notifications.ts';
import { formatMoney } from '../domain/finance/money.ts';

interface PersonNameRow {
  readonly id: string;
  readonly legal_given_names: string;
  readonly legal_family_name: string;
  readonly preferred_name: string | null;
}

function displayName(p: PersonNameRow): string {
  return `${p.preferred_name ?? p.legal_given_names} ${p.legal_family_name}`;
}

// ------------------------------------------------------------ verification

/**
 * Every accepted appointment this season, with the fixture it belongs to.
 *
 * Accepted only: a `proposed` designation nobody has answered has nothing
 * to verify, and a `declined` or `withdrawn` one never happened.
 * `verifierIsOfficial` lets the screen grey the button out before the
 * coordinator finds out from a refused insert — BR119 is enforced by the
 * trigger regardless, so this is a courtesy rather than the guard.
 */
export async function loadVerifiable(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  currentUserId: string,
): Promise<readonly VerifiableAppointment[]> {
  const [{ data: appointments }, { data: verified }, { data: people }, { data: links }] = await Promise.all([
    client
      .from('match_official_appointment')
      .select('id, person_id, role, fixture_id, fixture!inner(played_on, status, season_id, opponent)')
      .eq('club_id', clubId)
      .eq('state', 'accepted'),
    client.from('appointment_verification').select('appointment_id').eq('club_id', clubId),
    client.from('person').select('id, legal_given_names, legal_family_name, preferred_name').eq('club_id', clubId),
    client.from('account_person').select('user_id, person_id').eq('club_id', clubId),
  ]);

  const alreadyVerified = new Set(
    ((verified ?? []) as { appointment_id: string }[]).map((v) => v.appointment_id),
  );
  const nameOf = new Map(((people ?? []) as PersonNameRow[]).map((p) => [p.id, displayName(p)]));
  const myPersonId = ((links ?? []) as { user_id: string; person_id: string }[])
    .find((l) => l.user_id === currentUserId)?.person_id ?? null;

  return ((appointments ?? []) as Record<string, unknown>[])
    .filter((a) => (a.fixture as { season_id: string }).season_id === seasonId)
    .filter((a) => !alreadyVerified.has(a.id as string))
    .map((a) => {
      const fixture = a.fixture as { played_on: string; status: string; opponent: string };
      return {
        appointmentId: a.id as string,
        officialName: nameOf.get(a.person_id as string) ?? 'Unknown person',
        role: a.role as string,
        opponent: fixture.opponent,
        playedOn: fixture.played_on,
        fixtureStatus: fixture.status as VerifiableAppointment['fixtureStatus'],
        verifierIsOfficial: myPersonId !== null && myPersonId === (a.person_id as string),
      };
    });
}

export async function recordVerification(
  client: SupabaseClient,
  clubId: string,
  appointmentId: string,
  officiated: boolean,
  abandonmentNote: string | null,
  note: string | null,
  verifiedBy: string,
): Promise<string | null> {
  const { error } = await client.from('appointment_verification').insert({
    club_id: clubId,
    appointment_id: appointmentId,
    officiated,
    abandonment_note: abandonmentNote,
    note,
    verified_by: verifiedBy,
  });

  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}

// ------------------------------------------------------------------ claims

interface AppointmentForClaimRow {
  readonly id: string;
  readonly person_id: string;
  readonly role: OfficialRole;
  readonly appointed_by: AppointedBy;
  readonly fixture_id: string;
}

/**
 * Every verified appointment not yet claimed for, with what it would take
 * to price it.
 *
 * `classification` is resolved **as of the fixture's date** — the same
 * line BR111 already draws for accreditation — so a promotion the week
 * after a match does not retroactively justify a higher rate for it.
 */
export async function loadClaimCandidates(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<readonly ClaimCandidate[]> {
  const [
    { data: appointments },
    { data: verifications },
    { data: claims },
    { data: fixtures },
    { data: people },
  ] = await Promise.all([
    client
      .from('match_official_appointment')
      .select('id, person_id, role, appointed_by, fixture_id')
      .eq('club_id', clubId)
      .eq('state', 'accepted'),
    client.from('appointment_verification').select('appointment_id, officiated, abandonment_note')
      .eq('club_id', clubId),
    client.from('referee_payment_claim').select('appointment_id').eq('club_id', clubId),
    client.from('fixture').select('id, played_on, opponent, status, competition, season_id')
      .eq('club_id', clubId).eq('season_id', seasonId),
    client.from('person').select('id, legal_given_names, legal_family_name, preferred_name').eq('club_id', clubId),
  ]);

  const fixtureById = new Map(
    ((fixtures ?? []) as Record<string, unknown>[]).map((f) => [f.id as string, f]),
  );
  const verificationOf = new Map(
    ((verifications ?? []) as Record<string, unknown>[]).map((v) => [v.appointment_id as string, v]),
  );
  const claimedAppointments = new Set(
    ((claims ?? []) as { appointment_id: string }[]).map((c) => c.appointment_id),
  );
  const nameOf = new Map(((people ?? []) as PersonNameRow[]).map((p) => [p.id, displayName(p)]));
  const referees = await loadReferees(client, clubId);
  const historyOf = new Map(referees.map((r) => [r.personId, r.classifications]));

  const rows = (appointments ?? []) as AppointmentForClaimRow[];
  const candidates: ClaimCandidate[] = [];

  for (const appt of rows) {
    const fixture = fixtureById.get(appt.fixture_id) as
      | { played_on: string; opponent: string; status: string; competition: string | null; season_id: string }
      | undefined;
    if (fixture === undefined || fixture.season_id !== seasonId) continue;

    const verification = verificationOf.get(appt.id) as
      | { officiated: boolean; abandonment_note: string | null }
      | undefined;

    const verdict = claimable({
      fixtureStatus: fixture.status as 'scheduled' | 'played' | 'cancelled' | 'abandoned' | 'forfeited',
      verified: verification !== undefined,
      officiated: verification?.officiated ?? false,
      abandonmentNote: verification?.abandonment_note ?? null,
      alreadyClaimed: claimedAppointments.has(appt.id),
    });

    // Already-approved-or-rejected claims are BR14's business, not this
    // screen's — a claim once raised belongs on the treasurer's queue, not
    // back on the list of matches still to raise one for.
    if (verdict.kind === 'no' && verdict.rule === 'BR14') continue;

    const level = classificationOn(historyOf.get(appt.person_id) ?? [], fixture.played_on);

    candidates.push({
      appointmentId: appt.id,
      officialName: nameOf.get(appt.person_id) ?? 'Unknown person',
      opponent: fixture.opponent,
      playedOn: fixture.played_on,
      priceable: {
        role: appt.role,
        competition: fixture.competition,
        classification: level?.level ?? null,
        appointedBy: appt.appointed_by,
      },
      claimable: verdict,
    });
  }

  return candidates;
}

export async function raiseClaim(
  client: SupabaseClient,
  clubId: string,
  appointmentId: string,
  amountCents: number,
  scheduleId: string | null,
  raisedBy: string,
): Promise<string | null> {
  const { error } = await client.from('referee_payment_claim').insert({
    club_id: clubId,
    appointment_id: appointmentId,
    amount_cents: amountCents,
    schedule_id: scheduleId,
    raised_by: raisedBy,
  });

  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}

export interface RaisedClaim {
  readonly id: string;
  readonly officialName: string;
  readonly personId: string;
  readonly opponent: string;
  readonly playedOn: string;
  readonly amountCents: number;
  readonly state: 'raised' | 'approved' | 'rejected';
  readonly decisionNote: string | null;
  readonly batchId: string | null;
  /** BR152: how the family chose to settle it, or null until they do. */
  readonly settlement: 'pay' | 'credit' | null;
}

/** The treasurer's queue, and what a coordinator already raised. */
export async function loadClaims(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<readonly RaisedClaim[]> {
  const [{ data: claims }, { data: appointments }, { data: fixtures }, { data: people }] = await Promise.all([
    client.from('referee_payment_claim')
      .select('id, appointment_id, amount_cents, state, decision_note, batch_id, settlement')
      .eq('club_id', clubId),
    client.from('match_official_appointment').select('id, person_id, fixture_id').eq('club_id', clubId),
    client.from('fixture').select('id, opponent, played_on, season_id').eq('club_id', clubId).eq('season_id', seasonId),
    client.from('person').select('id, legal_given_names, legal_family_name, preferred_name').eq('club_id', clubId),
  ]);

  const apptById = new Map(
    ((appointments ?? []) as { id: string; person_id: string; fixture_id: string }[]).map((a) => [a.id, a]),
  );
  const fixtureById = new Map(
    ((fixtures ?? []) as { id: string; opponent: string; played_on: string }[]).map((f) => [f.id, f]),
  );
  const nameOf = new Map(((people ?? []) as PersonNameRow[]).map((p) => [p.id, displayName(p)]));

  const rows: RaisedClaim[] = [];
  for (const c of (claims ?? []) as Record<string, unknown>[]) {
    const appt = apptById.get(c.appointment_id as string);
    if (appt === undefined) continue;
    const fixture = fixtureById.get(appt.fixture_id);
    if (fixture === undefined) continue; // a different season's claim

    rows.push({
      id: c.id as string,
      officialName: nameOf.get(appt.person_id) ?? 'Unknown person',
      personId: appt.person_id,
      opponent: fixture.opponent,
      playedOn: fixture.played_on,
      amountCents: Number(c.amount_cents),
      state: c.state as RaisedClaim['state'],
      decisionNote: (c.decision_note as string | null) ?? null,
      batchId: (c.batch_id as string | null) ?? null,
      settlement: (c.settlement as RaisedClaim['settlement']) ?? null,
    });
  }
  return rows;
}

export async function decideClaim(
  client: SupabaseClient,
  clubId: string,
  claimId: string,
  approve: boolean,
  decisionNote: string | null,
  decidedBy: string,
): Promise<string | null> {
  const { error } = await client
    .from('referee_payment_claim')
    .update({
      state: approve ? 'approved' : 'rejected',
      decision_note: decisionNote,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq('club_id', clubId)
    .eq('id', claimId);

  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}

export interface SettleableClaim {
  readonly id: string;
  readonly officialName: string;
  readonly personId: string;
  readonly opponent: string;
  readonly playedOn: string;
  readonly amountCents: number;
  readonly settlement: 'pay' | 'credit' | null;
}

/**
 * An official's own family's approved claims — BR152's question, read from
 * the family's side. RLS narrows this to the caller's own family on its
 * own (`referee_payment_claim_select_family`); the `personIds` filter here
 * is what the caller already knows, the same belt-and-braces `loadFamilyDesignations`
 * applies for the identical reason.
 */
export async function loadSettleableClaims(
  client: SupabaseClient,
  clubId: string,
  personIds: readonly string[],
): Promise<readonly SettleableClaim[]> {
  if (personIds.length === 0) return [];

  const { data: appointments } = await client
    .from('match_official_appointment')
    .select('id, person_id')
    .eq('club_id', clubId)
    .in('person_id', personIds);
  const apptIds = ((appointments ?? []) as { id: string; person_id: string }[]);
  if (apptIds.length === 0) return [];

  const { data: claims } = await client
    .from('referee_payment_claim')
    .select('id, appointment_id, amount_cents, state, settlement')
    .eq('club_id', clubId)
    .eq('state', 'approved')
    .in('appointment_id', apptIds.map((a) => a.id));
  const rows = (claims ?? []) as { id: string; appointment_id: string; amount_cents: number; settlement: string | null }[];
  if (rows.length === 0) return [];

  const personOfAppt = new Map(apptIds.map((a) => [a.id, a.person_id]));

  const [{ data: fixtureLinks }, { data: people }] = await Promise.all([
    client.from('match_official_appointment').select('id, fixture_id')
      .eq('club_id', clubId).in('id', rows.map((r) => r.appointment_id)),
    client.from('person').select('id, legal_given_names, legal_family_name, preferred_name')
      .eq('club_id', clubId).in('id', personIds),
  ]);
  const fixtureIdOfAppt = new Map(
    ((fixtureLinks ?? []) as { id: string; fixture_id: string }[]).map((a) => [a.id, a.fixture_id]),
  );
  const { data: fixtures } = await client
    .from('fixture')
    .select('id, opponent, played_on')
    .eq('club_id', clubId)
    .in('id', [...new Set([...fixtureIdOfAppt.values()])]);
  const fixtureById = new Map(
    ((fixtures ?? []) as { id: string; opponent: string; played_on: string }[]).map((f) => [f.id, f]),
  );
  const nameOf = new Map(((people ?? []) as PersonNameRow[]).map((p) => [p.id, displayName(p)]));

  const out: SettleableClaim[] = [];
  for (const c of rows) {
    const personId = personOfAppt.get(c.appointment_id);
    const fixtureId = fixtureIdOfAppt.get(c.appointment_id);
    const fixture = fixtureId === undefined ? undefined : fixtureById.get(fixtureId);
    if (personId === undefined || fixture === undefined) continue;
    out.push({
      id: c.id,
      officialName: nameOf.get(personId) ?? 'Unknown person',
      personId,
      opponent: fixture.opponent,
      playedOn: fixture.played_on,
      amountCents: Number(c.amount_cents),
      settlement: (c.settlement as SettleableClaim['settlement']) ?? null,
    });
  }
  return out;
}

/**
 * Record a family's choice (BR152). `chosenByPersonId` is the signed-in
 * person's own Person at this club, never chosen on the screen — the
 * database checks it holds authority for the official and refuses
 * otherwise.
 */
export async function chooseSettlement(
  client: SupabaseClient,
  clubId: string,
  claimId: string,
  settlement: 'pay' | 'credit',
  chosenByPersonId: string,
): Promise<string | null> {
  const { error } = await client
    .from('referee_payment_claim')
    .update({
      settlement,
      settlement_chosen_by: chosenByPersonId,
      settlement_chosen_at: new Date().toISOString(),
    })
    .eq('club_id', clubId)
    .eq('id', claimId);

  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}

// ----------------------------------------------------------------- batches

export interface BatchRow {
  readonly id: string;
  readonly reference: string | null;
  readonly totalCents: number;
  readonly claimCount: number;
  readonly closedAt: string | null;
  readonly paidAt: string | null;
}

/**
 * Every batch, with its total **computed**, never stored — the same
 * choice `app_batch_total_cents` makes in the database, restated on this
 * side because the list screen needs every batch's total in one read
 * rather than one round trip per row.
 */
export async function loadBatches(client: SupabaseClient, clubId: string): Promise<readonly BatchRow[]> {
  const [{ data: batches }, { data: claims }] = await Promise.all([
    client.from('referee_payment_batch').select('id, reference, closed_at, paid_at').eq('club_id', clubId)
      .order('created_at', { ascending: false }),
    client.from('referee_payment_claim').select('batch_id, amount_cents, state').eq('club_id', clubId)
      .eq('state', 'approved').not('batch_id', 'is', null),
  ]);

  const totals = new Map<string, { cents: number; count: number }>();
  for (const c of (claims ?? []) as { batch_id: string; amount_cents: number }[]) {
    const entry = totals.get(c.batch_id) ?? { cents: 0, count: 0 };
    entry.cents += Number(c.amount_cents);
    entry.count += 1;
    totals.set(c.batch_id, entry);
  }

  return ((batches ?? []) as Record<string, unknown>[]).map((b) => {
    const totals_ = totals.get(b.id as string) ?? { cents: 0, count: 0 };
    return {
      id: b.id as string,
      reference: (b.reference as string | null) ?? null,
      totalCents: totals_.cents,
      claimCount: totals_.count,
      closedAt: (b.closed_at as string | null) ?? null,
      paidAt: (b.paid_at as string | null) ?? null,
    };
  });
}

export async function loadApprovedUnbatchedClaims(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<readonly RaisedClaim[]> {
  const claims = await loadClaims(client, clubId, seasonId);
  return claims.filter((c) => c.state === 'approved' && c.batchId === null);
}

export async function createBatch(
  client: SupabaseClient,
  clubId: string,
  reference: string | null,
  createdBy: string,
): Promise<{ readonly id: string } | { readonly error: string }> {
  const { data, error } = await client
    .from('referee_payment_batch')
    .insert({ club_id: clubId, reference, created_by: createdBy })
    .select('id')
    .single();

  if (error !== null) return { error: error.message.replace(/^.*?:\s*/, '') };
  return { id: data.id as string };
}

export async function addClaimsToBatch(
  client: SupabaseClient,
  clubId: string,
  batchId: string,
  claimIds: readonly string[],
): Promise<string | null> {
  if (claimIds.length === 0) return null;
  const { error } = await client
    .from('referee_payment_claim')
    .update({ batch_id: batchId })
    .eq('club_id', clubId)
    .in('id', [...claimIds]);

  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}

export async function closeBatch(
  client: SupabaseClient,
  clubId: string,
  batchId: string,
  closedBy: string,
): Promise<string | null> {
  const { error } = await client
    .from('referee_payment_batch')
    .update({ closed_at: new Date().toISOString(), closed_by: closedBy })
    .eq('club_id', clubId)
    .eq('id', batchId);

  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}

export async function recordBatchPaid(
  client: SupabaseClient,
  clubId: string,
  batchId: string,
  paidReference: string | null,
  paidBy: string,
): Promise<string | null> {
  const { error } = await client
    .from('referee_payment_batch')
    .update({ paid_at: new Date().toISOString(), paid_reference: paidReference, paid_by: paidBy })
    .eq('club_id', clubId)
    .eq('id', batchId);

  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}

// --------------------------------------------------------------- notifying

/**
 * Tell the official their claim was approved (BR15's opposite case: not an
 * AI decision, a treasurer's — the notice is the record of it reaching
 * them).
 *
 * Wires `notifyClaimApproved`, which has existed in `notifications.ts`
 * since scope 36 with no caller. Returns a sentence about the attempt, or
 * `null` when there was nobody to tell — an official with no email on file
 * is an ordinary state, not an error, and the approval itself already
 * happened regardless.
 */
export async function notifyClaimDecision(
  client: SupabaseClient,
  clubId: string,
  clubName: string,
  claimId: string,
): Promise<string | null> {
  const { data: claim } = await client
    .from('referee_payment_claim')
    .select('appointment_id, amount_cents')
    .eq('club_id', clubId)
    .eq('id', claimId)
    .maybeSingle();
  if (claim === null) return null;

  const { data: appointment } = await client
    .from('match_official_appointment')
    .select('person_id, fixture_id')
    .eq('club_id', clubId)
    .eq('id', claim.appointment_id as string)
    .maybeSingle();
  if (appointment === null) return null;

  const [official, fixture] = await Promise.all([
    partyFor(client, clubId, appointment.person_id as string),
    client.from('fixture').select('opponent, played_on').eq('club_id', clubId)
      .eq('id', appointment.fixture_id as string).maybeSingle(),
  ]);
  if (official === null) return 'They have no email on file, so no notice was sent.';

  const fixtureLabel = fixture.data === null
    ? 'a fixture'
    : `${fixture.data.opponent as string}, ${fixture.data.played_on as string}`;

  const result = await notifyClaimApproved(
    client, clubId, clubName, official, fixtureLabel, formatMoney(Number(claim.amount_cents)),
  );

  return result.outcome === 'sent'
    ? `${official.name} has been told.`
    : `${official.name} was not emailed — ${result.detail ?? 'the message did not send'}.`;
}
