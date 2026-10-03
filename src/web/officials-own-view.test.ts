import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { claimStanding, credentialStanding } from './officials-own-view.ts';

describe('claimStanding', () => {
  const claim = (over: Partial<Parameters<typeof claimStanding>[0]>) =>
    ({ state: 'approved', settlement: null, batchId: null, ...over }) as const;

  it('says who a claim waits on', () => {
    assert.match(claimStanding(claim({ state: 'raised' })), /treasurer/);
    assert.equal(claimStanding(claim({ state: 'rejected' })), 'Not approved.');
  });

  it('pays every approved claim out, with no credit to choose (BR152, scope 79)', () => {
    assert.equal(claimStanding(claim({})), 'Approved: it will be paid to the nominated account.');
    assert.match(claimStanding(claim({ batchId: 'b' })), /payment run/);
    assert.doesNotMatch(claimStanding(claim({})), /credit/i);
  });

  it('says a simulated payout is a simulation', () => {
    assert.equal(claimStanding(claim({ batchId: 'b' }), { reference: 'SIM-1-1', simulated: true }), 'Paid online (simulated) · SIM-1-1.');
  });
});

describe('credentialStanding', () => {
  const today = '2026-10-01';

  it('flags an expired credential', () => {
    assert.equal(credentialStanding({ label: 'x', expiresOn: '2026-09-30', sighted: true }, today).tone, 'stop');
  });

  it('warns thirty days out, and when the club has not sighted it', () => {
    const soon = credentialStanding({ label: 'x', expiresOn: '2026-10-21', sighted: true }, today);
    assert.equal(soon.tone, 'warn');
    assert.match(soon.text, /in 20 days/);
    assert.equal(credentialStanding({ label: 'x', expiresOn: '2027-06-01', sighted: false }, today).tone, 'warn');
  });

  it('is fine when current and sighted', () => {
    const ok = credentialStanding({ label: 'x', expiresOn: '2027-06-01', sighted: true }, today);
    assert.equal(ok.tone, 'ok');
    assert.match(ok.text, /Valid until 2027-06-01; sighted/);
  });
});
