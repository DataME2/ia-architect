/**
 * What the verification and claim screens decide, as pure functions.
 *
 * Every rule that matters here is already enforced by a trigger — BR13,
 * BR14, BR17, BR18, BR117, BR119 (migrations 0026, 0027). The screen's job
 * is the one scope 53's fee editor and scope 51's designation answer both
 * took: **name the refusal in words a person can act on**, and **never
 * offer an act the database will refuse**, so nobody presses a button only
 * to be told no by a trigger they cannot see.
 *
 * `claimable()` and `rateFor()` already exist in
 * `src/domain/officiating/fees.ts` and are reused rather than restated —
 * a second definition of either would drift, and BR13/BR116 are exactly
 * the rules a drift would break.
 */
import { rateFor, type Claimable, type FeeRate, type Priceable } from '../domain/officiating/fees.ts';

// ------------------------------------------------------------ verification

export interface VerifiableAppointment {
  readonly appointmentId: string;
  readonly officialName: string;
  readonly role: string;
  readonly opponent: string;
  readonly playedOn: string;
  readonly fixtureStatus: 'scheduled' | 'played' | 'cancelled' | 'abandoned' | 'forfeited';
  readonly verifierIsOfficial: boolean;
}

/**
 * Which accepted appointments still need somebody to say what happened.
 *
 * Only fixtures that are no longer merely *scheduled* — BR13 asks whether
 * a match was officiated, and a match still ahead of us has no answer to
 * that question yet. A cancelled or forfeited fixture is included: BR17
 * still needs a verification saying so, because "nobody looked" and
 * "confirmed nothing to pay for" are different facts a claim's refusal
 * has to be able to tell apart later.
 */
export function needsVerification(
  appointments: readonly VerifiableAppointment[],
): readonly VerifiableAppointment[] {
  return appointments.filter((a) => a.fixtureStatus !== 'scheduled');
}

export type ParsedVerification =
  | {
      readonly ok: true;
      readonly appointmentId: string;
      readonly officiated: boolean;
      readonly abandonmentNote: string | null;
      readonly note: string | null;
    }
  | { readonly ok: false; readonly error: string };

/**
 * A coordinator's account of what happened.
 *
 * `officiated` defaults to true rather than being required, because the
 * ordinary case — the match was played and the official did their job — is
 * the one that should take one click, not a radio button every time.
 * BR18's explanation is required only when the fixture is recorded as
 * abandoned; the database enforces the same thing, and this exists so the
 * coordinator is told *now* rather than after a refused insert.
 */
export function parseVerification(fields: {
  readonly appointmentId?: string | null;
  readonly officiated?: string | null;
  readonly fixtureStatus?: string | null;
  readonly abandonmentNote?: string | null;
  readonly note?: string | null;
}): ParsedVerification {
  const appointmentId = (fields.appointmentId ?? '').trim();
  if (appointmentId === '') return { ok: false, error: 'Which appointment?' };

  const officiated = (fields.officiated ?? 'yes') !== 'no';
  const abandonmentNote = (fields.abandonmentNote ?? '').trim();

  if (fields.fixtureStatus === 'abandoned' && officiated && abandonmentNote === '') {
    return {
      ok: false,
      error: 'The match was abandoned — the official’s explanation is required before this can be verified (BR18).',
    };
  }

  const note = (fields.note ?? '').trim();
  return {
    ok: true,
    appointmentId,
    officiated,
    abandonmentNote: abandonmentNote === '' ? null : abandonmentNote,
    note: note === '' ? null : note,
  };
}

// ------------------------------------------------------------------ claims

export interface ClaimCandidate {
  readonly appointmentId: string;
  readonly officialName: string;
  readonly opponent: string;
  readonly playedOn: string;
  readonly priceable: Priceable;
  readonly claimable: Claimable;
}

/**
 * What a claim would be raised for, restated for the screen.
 *
 * `claimable()` already says *whether*; this adds *how much*, by calling
 * `rateFor()` exactly once, against the same rates the schedule editor
 * shows — so a coordinator sees the identical number the treasurer will
 * later see stored on the claim, before either of them commits to it.
 */
export type ClaimPreview =
  | { readonly kind: 'ready'; readonly amountCents: number; readonly matched: FeeRate }
  | { readonly kind: 'ambiguous'; readonly candidates: readonly FeeRate[] }
  | { readonly kind: 'no-rate' }
  | { readonly kind: 'blocked'; readonly rule: string; readonly because: string };

export function previewClaim(
  candidate: Pick<ClaimCandidate, 'claimable' | 'priceable'>,
  rates: readonly FeeRate[],
): ClaimPreview {
  if (candidate.claimable.kind === 'no') {
    return { kind: 'blocked', rule: candidate.claimable.rule, because: candidate.claimable.because };
  }

  const outcome = rateFor(rates, candidate.priceable);
  if (outcome.kind === 'none') return { kind: 'no-rate' };
  if (outcome.kind === 'ambiguous') return { kind: 'ambiguous', candidates: outcome.candidates };
  return { kind: 'ready', amountCents: outcome.amountCents, matched: outcome.matched };
}

export type ClaimSettlement = 'pay' | 'credit';

export type ParsedSettlement =
  | { readonly ok: true; readonly claimId: string; readonly settlement: ClaimSettlement }
  | { readonly ok: false; readonly error: string };

/**
 * A family's choice for an approved claim (BR152).
 *
 * Whether the choice is theirs to make at all is the database's question —
 * `app_may_answer_designation`, reused rather than re-derived (0045's own
 * comment on drift applies here too). This only reads the form.
 */
export function parseSettlement(fields: {
  readonly claimId?: string | null;
  readonly settlement?: string | null;
}): ParsedSettlement {
  const claimId = (fields.claimId ?? '').trim();
  if (claimId === '') return { ok: false, error: 'Which claim?' };

  const settlement = fields.settlement ?? '';
  if (settlement !== 'pay' && settlement !== 'credit') {
    return { ok: false, error: 'Paid, or credited toward next season?' };
  }

  return { ok: true, claimId, settlement };
}

export type ParsedDecision =
  | { readonly ok: true; readonly claimId: string; readonly approve: boolean; readonly note: string | null }
  | { readonly ok: false; readonly error: string };

/**
 * A treasurer's decision on a raised claim.
 *
 * BR18's shape again, for the reason 0027's own comment gives: an
 * unexplained rejection is a decision the official cannot answer and the
 * coordinator who raised it cannot fix. The database refuses a reasonless
 * rejection; this says so before the treasurer loses the rest of the form.
 */
export function parseDecision(fields: {
  readonly claimId?: string | null;
  readonly decision?: string | null;
  readonly note?: string | null;
}): ParsedDecision {
  const claimId = (fields.claimId ?? '').trim();
  if (claimId === '') return { ok: false, error: 'Which claim?' };

  const decision = fields.decision ?? '';
  if (decision !== 'approve' && decision !== 'reject') {
    return { ok: false, error: 'Approve or reject it.' };
  }

  const note = (fields.note ?? '').trim();
  if (decision === 'reject' && note === '') {
    return { ok: false, error: 'A rejection carries a brief reason (BR18’s shape) — the official is owed an answer they can act on.' };
  }

  return { ok: true, claimId, approve: decision === 'approve', note: note === '' ? null : note };
}

// ----------------------------------------------------------------- batches

export interface BatchSummary {
  readonly id: string;
  readonly reference: string | null;
  readonly totalCents: number;
  readonly claimCount: number;
  readonly closedAt: string | null;
  readonly paidAt: string | null;
}

export type BatchStanding = 'open' | 'closed' | 'paid';

export function batchStanding(batch: Pick<BatchSummary, 'closedAt' | 'paidAt'>): BatchStanding {
  if (batch.paidAt !== null) return 'paid';
  if (batch.closedAt !== null) return 'closed';
  return 'open';
}

/**
 * Whether a batch can still be closed, and why not.
 *
 * BR117 refuses an empty batch's closure at the database only implicitly —
 * closing zero claims is not itself wrong, but a treasurer closing an empty
 * batch by mistake has nothing to undo it with (0027 has no reopen). Said
 * here, before the act, rather than left to a treasurer noticing a $0
 * batch a week later.
 */
export function canClose(batch: BatchSummary): { readonly allowed: boolean; readonly reason: string | null } {
  if (batchStanding(batch) !== 'open') {
    return { allowed: false, reason: 'This batch is already closed.' };
  }
  if (batch.claimCount === 0) {
    return { allowed: false, reason: 'This batch has no approved claims in it yet — closing it now would fix a total of zero.' };
  }
  return { allowed: true, reason: null };
}

export function canPay(batch: BatchSummary): { readonly allowed: boolean; readonly reason: string | null } {
  if (batchStanding(batch) === 'paid') return { allowed: false, reason: 'This batch is already recorded as paid.' };
  if (batchStanding(batch) === 'open') {
    return { allowed: false, reason: 'Close the batch first — paying an open total is paying a number that can still change (BR117).' };
  }
  return { allowed: true, reason: null };
}
