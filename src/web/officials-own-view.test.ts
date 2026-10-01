import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { claimStanding, credentialStanding } from './officials-own-view.ts';

describe('claimStanding', () => {
  const claim = (over: Partial<Parameters<typeof claimStanding>[0]>) =>
    ({ state: 'approved', settlement: null, batchId: null, ...over }) as const;

  it('says who a claim waits on', () => {
    assert.match(claimStanding(claim({ state: 'raised' }), true), /treasurer/);
    assert.equal(claimStanding(claim({ state: 'rejected' }), true), 'Not approved.');
  });

  it('asks an adult to choose, and tells a minor their guardian chooses (BR152)', () => {
    assert.equal(claimStanding(claim({}), true), 'Approved: choose pay or credit.');
    assert.match(claimStanding(claim({}), false), /Parent\/Guardian chooses.*BR152/);
  });

  it('follows a chosen claim to its batch', () => {
    assert.match(claimStanding(claim({ settlement: 'credit' }), true), /credited/);
    assert.match(claimStanding(claim({ settlement: 'pay' }), true), /to be paid/);
    assert.match(claimStanding(claim({ settlement: 'pay', batchId: 'b' }), true), /payment batch/);
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
