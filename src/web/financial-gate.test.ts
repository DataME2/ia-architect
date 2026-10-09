import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { PlanState } from '../domain/finance/types.ts';
import { financialGate, type GateInput } from './financial-gate.ts';

const base: GateInput = {
  eligibility: { mayPlay: true, reason: 'Registered and paid up.' },
  readsMoney: true,
  outstandingCents: 0,
  receivedCents: 25000,
  vouchers: [],
  plan: null,
  earlier: [],
};

const plan = (arrearsCents: number): PlanState => ({
  totalCents: 30000,
  paidCents: 10000,
  outstandingCents: 20000,
  arrearsCents,
  installments: [
    { installment: { sequence: 1, dueOn: '2026-08-01', amountCents: 10000 }, paidCents: 10000, outstandingCents: 0, overdue: false },
    { installment: { sequence: 2, dueOn: '2026-09-01', amountCents: 10000 }, paidCents: 0, outstandingCents: 10000, overdue: arrearsCents > 0 },
    { installment: { sequence: 3, dueOn: '2026-11-01', amountCents: 10000 }, paidCents: 0, outstandingCents: 10000, overdue: false },
  ],
  nextDue: { installment: { sequence: 2, dueOn: '2026-09-01', amountCents: 10000 }, paidCents: 0, outstandingCents: 10000, overdue: arrearsCents > 0 },
});

const line = (g: ReturnType<typeof financialGate>, key: string) => g.lines.find((l) => l.key === key)!;

describe('the Financial Gate', () => {
  it('shows a role that reads no money the verdict and no figures (BR78)', () => {
    const g = financialGate({ ...base, readsMoney: false });
    assert.equal(g.verdict, 'Clear to play');
    assert.deepEqual(g.lines, []);
  });

  it('calls a credit a credit, never an obstacle (BR3)', () => {
    const g = financialGate({ ...base, outstandingCents: -500 });
    assert.equal(line(g, 'outstanding').value, '$5.00 credit');
    assert.equal(line(g, 'outstanding').tone, 'ok');
  });

  it('marks a plan on track as pending, and one in arrears as blocked', () => {
    const onTrack = financialGate({ ...base, outstandingCents: 20000, plan: plan(0) });
    assert.equal(line(onTrack, 'outstanding').tone, 'pending');
    assert.equal(line(onTrack, 'plan').value, 'On track');
    assert.match(line(onTrack, 'plan').note!, /1 of 3 instalments paid; next \$100\.00 due 2026-09-01/);
    const behind = financialGate({ ...base, outstandingCents: 20000, plan: plan(10000), eligibility: { mayPlay: false, reason: 'In arrears.' } });
    assert.equal(line(behind, 'plan').value, '$100.00 in arrears');
    assert.equal(line(behind, 'plan').tone, 'blocked');
    assert.equal(behind.verdict, 'Not clear to play');
  });

  it('separates verified vouchers from those waiting for the treasurer', () => {
    const g = financialGate({
      ...base,
      vouchers: [
        { state: 'VERIFIED', faceValueCents: 10000 },
        { state: 'ATTACHED', faceValueCents: 5000 },
        { state: 'REJECTED', faceValueCents: 9900 },
      ],
    });
    assert.equal(line(g, 'vouchers').value, '$100.00');
    assert.equal(line(g, 'vouchers').tone, 'pending');
    assert.match(line(g, 'vouchers').note!, /1 \(\$50\.00\) waiting/);
  });

  it('names earlier seasons still owing, and says when the report is not the reader’s', () => {
    const owing = financialGate({ ...base, earlier: [{ seasonName: '2025', outstandingCents: 7500 }] });
    assert.equal(line(owing, 'earlier').value, '$75.00');
    assert.equal(line(owing, 'earlier').tone, 'pending');
    assert.match(line(owing, 'earlier').note!, /2025: \$75\.00/);
    assert.equal(line(financialGate({ ...base, earlier: null }), 'earlier').value, 'Not shown');
  });
});
