import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  batchStanding, canClose, canPay, needsVerification, parseDecision, parseSettlement, parseVerification,
  previewClaim,
  type BatchSummary, type ClaimCandidate, type VerifiableAppointment,
} from './claim-view.ts';
import type { FeeRate } from '../domain/officiating/fees.ts';

const appointment = (over: Partial<VerifiableAppointment> = {}): VerifiableAppointment => ({
  appointmentId: 'a1',
  officialName: 'Sam Reece',
  role: 'referee',
  opponent: 'Rivals',
  playedOn: '2026-09-01',
  fixtureStatus: 'played',
  verifierIsOfficial: false,
  ...over,
});

describe('needsVerification — a match that has not yet happened has nothing to verify', () => {
  it('excludes a fixture still scheduled', () => {
    const rows = needsVerification([appointment({ fixtureStatus: 'scheduled' }), appointment()]);
    assert.equal(rows.length, 1);
  });

  it('includes a cancelled and a forfeited fixture — BR17 still needs the record', () => {
    const rows = needsVerification([
      appointment({ fixtureStatus: 'cancelled' }),
      appointment({ fixtureStatus: 'forfeited' }),
    ]);
    assert.equal(rows.length, 2);
  });

  it('does not reorder its argument', () => {
    const given = [appointment({ appointmentId: 'b' }), appointment({ appointmentId: 'a' })];
    needsVerification(given);
    assert.deepEqual(given.map((a) => a.appointmentId), ['b', 'a']);
  });
});

describe('parseVerification — BR18 before the database has to say it', () => {
  it('defaults to officiated, one click for the ordinary case', () => {
    const parsed = parseVerification({ appointmentId: 'a1' });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.officiated, true);
  });

  it('takes officiated: no as a real answer', () => {
    const parsed = parseVerification({ appointmentId: 'a1', officiated: 'no' });
    assert.equal(parsed.ok && parsed.officiated, false);
  });

  it('refuses an abandoned match with no explanation', () => {
    const parsed = parseVerification({ appointmentId: 'a1', fixtureStatus: 'abandoned' });
    assert.equal(parsed.ok, false);
    assert.match(parsed.ok === false ? parsed.error : '', /BR18/);
  });

  it('takes an abandoned match with an explanation', () => {
    const parsed = parseVerification({
      appointmentId: 'a1', fixtureStatus: 'abandoned', abandonmentNote: 'Lightning, called off at half time.',
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.abandonmentNote, 'Lightning, called off at half time.');
  });

  it('does not require an explanation when the official did not officiate at all', () => {
    // "Abandoned and did not officiate" is BR17's territory, not BR18's —
    // there is nothing for them to explain if they were never there.
    const parsed = parseVerification({ appointmentId: 'a1', fixtureStatus: 'abandoned', officiated: 'no' });
    assert.equal(parsed.ok, true);
  });

  it('refuses nothing to verify', () => {
    assert.equal(parseVerification({}).ok, false);
  });

  it('treats whitespace as no note', () => {
    const parsed = parseVerification({ appointmentId: 'a1', note: '   ' });
    assert.equal(parsed.ok && parsed.note, null);
  });
});

describe('previewClaim — what a claim would be for, before it is raised', () => {
  const rate = (over: Partial<FeeRate> = {}): FeeRate => ({
    role: 'referee', competition: null, classification: null, appointedBy: null, amountCents: 4500, ...over,
  });
  const candidate = (over: Partial<Pick<ClaimCandidate, 'claimable' | 'priceable'>> = {}) => ({
    claimable: { kind: 'yes' as const },
    priceable: { role: 'referee' as const, competition: null, classification: null, appointedBy: 'club' as const },
    ...over,
  });

  it('reports the rate that would be stored', () => {
    const preview = previewClaim(candidate(), [rate()]);
    assert.equal(preview.kind, 'ready');
    assert.equal(preview.kind === 'ready' && preview.amountCents, 4500);
  });

  it('reports no-rate distinctly from a rate of zero', () => {
    const preview = previewClaim(candidate(), []);
    assert.equal(preview.kind, 'no-rate');
  });

  it('reports an ambiguous match rather than guessing', () => {
    // Two rows that both say "any competition, any classification, any
    // appointing party" for the same role are two answers to one cell —
    // the same clash the fee editor refuses at write time (scope 53). A
    // read path has to name it rather than pick one silently.
    const preview = previewClaim(candidate(), [rate({ amountCents: 4500 }), rate({ amountCents: 5000 })]);
    assert.equal(preview.kind, 'ambiguous');
  });

  it('is blocked before the rate is even looked up, when claimable() already says no', () => {
    const preview = previewClaim(
      candidate({ claimable: { kind: 'no', rule: 'BR14', because: 'Already claimed.' } }),
      [rate()],
    );
    assert.equal(preview.kind, 'blocked');
    assert.equal(preview.kind === 'blocked' && preview.rule, 'BR14');
  });
});

describe('parseDecision — BR18’s shape, for a rejection', () => {
  it('approves with no reason required', () => {
    const parsed = parseDecision({ claimId: 'c1', decision: 'approve' });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.approve, true);
  });

  it('refuses a reasonless rejection', () => {
    const parsed = parseDecision({ claimId: 'c1', decision: 'reject' });
    assert.equal(parsed.ok, false);
  });

  it('takes a rejection with its reason', () => {
    const parsed = parseDecision({ claimId: 'c1', decision: 'reject', note: 'Wrong appointment.' });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.note, 'Wrong appointment.');
  });

  it('refuses neither approve nor reject', () => {
    assert.equal(parseDecision({ claimId: 'c1', decision: 'maybe' }).ok, false);
  });

  it('refuses a decision on nothing', () => {
    assert.equal(parseDecision({ decision: 'approve' }).ok, false);
  });
});

describe('batches — open, closed, paid, in that order', () => {
  const batch = (over: Partial<BatchSummary> = {}): BatchSummary => ({
    id: 'b1', reference: null, totalCents: 4500, claimCount: 1, closedAt: null, paidAt: null, ...over,
  });

  it('reads standing from the two timestamps', () => {
    assert.equal(batchStanding(batch()), 'open');
    assert.equal(batchStanding(batch({ closedAt: '2026-09-01' })), 'closed');
    assert.equal(batchStanding(batch({ closedAt: '2026-09-01', paidAt: '2026-09-02' })), 'paid');
  });

  it('refuses to close an empty batch', () => {
    const result = canClose(batch({ claimCount: 0 }));
    assert.equal(result.allowed, false);
    assert.match(result.reason ?? '', /no approved claims/);
  });

  it('closes an open batch with claims in it', () => {
    assert.equal(canClose(batch()).allowed, true);
  });

  it('refuses to close an already-closed batch', () => {
    assert.equal(canClose(batch({ closedAt: '2026-09-01' })).allowed, false);
  });

  it('refuses to pay an open batch — BR117', () => {
    const result = canPay(batch());
    assert.equal(result.allowed, false);
    assert.match(result.reason ?? '', /BR117/);
  });

  it('pays a closed batch', () => {
    assert.equal(canPay(batch({ closedAt: '2026-09-01' })).allowed, true);
  });

  it('refuses to pay an already-paid batch', () => {
    assert.equal(canPay(batch({ closedAt: '2026-09-01', paidAt: '2026-09-02' })).allowed, false);
  });
});

describe('parseSettlement — a family\'s choice for an approved claim', () => {
  it('accepts pay', () => {
    assert.deepEqual(parseSettlement({ claimId: 'c1', settlement: 'pay' }), { ok: true, claimId: 'c1', settlement: 'pay' });
  });

  it('accepts credit', () => {
    assert.deepEqual(parseSettlement({ claimId: 'c1', settlement: 'credit' }), { ok: true, claimId: 'c1', settlement: 'credit' });
  });

  it('refuses anything else', () => {
    assert.equal(parseSettlement({ claimId: 'c1', settlement: 'cash' }).ok, false);
    assert.equal(parseSettlement({ claimId: 'c1' }).ok, false);
  });

  it('refuses with no claim named', () => {
    assert.equal(parseSettlement({ settlement: 'pay' }).ok, false);
  });
});
