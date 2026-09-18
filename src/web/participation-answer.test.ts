import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { needsAvailabilityAnswer, parseParticipationAnswer, participationBanner } from './participation-answer.ts';

describe('parseParticipationAnswer — a decline always carries a reason (BR62)', () => {
  it('accepts an available answer with no reason', () => {
    const parsed = parseParticipationAnswer({ personId: 'p1', fixtureId: 'f1', answer: 'available' });
    assert.deepEqual(parsed, { ok: true, personId: 'p1', fixtureId: 'f1', status: 'available', reason: null });
  });

  it('refuses a not-available answer with no reason', () => {
    const parsed = parseParticipationAnswer({ personId: 'p1', fixtureId: 'f1', answer: 'not_available' });
    assert.equal(parsed.ok, false);
  });

  it('accepts a not-available answer once a reason is given', () => {
    const parsed = parseParticipationAnswer({
      personId: 'p1', fixtureId: 'f1', answer: 'not_available', reason: 'Has a test that morning.',
    });
    assert.deepEqual(parsed, {
      ok: true, personId: 'p1', fixtureId: 'f1', status: 'not_available', reason: 'Has a test that morning.',
    });
  });

  it('refuses with nothing to answer when identifiers are missing', () => {
    assert.equal(parseParticipationAnswer({ answer: 'available' }).ok, false);
  });
});

describe('participationBanner — the coach\'s at-a-glance colour', () => {
  it('is amber with no answer yet', () => {
    assert.equal(participationBanner(null).className, 'pill pill-warn');
  });

  it('is green for available, red for not available', () => {
    assert.equal(participationBanner({ status: 'available', reason: null }).className, 'pill pill-ok');
    assert.equal(participationBanner({ status: 'not_available', reason: 'Injured.' }).className, 'pill pill-stop');
  });
});

describe('needsAvailabilityAnswer — the guardian\'s exclamation mark', () => {
  it('is true only with an upcoming fixture and no answer yet', () => {
    assert.equal(needsAvailabilityAnswer(true, false), true);
    assert.equal(needsAvailabilityAnswer(true, true), false);
    assert.equal(needsAvailabilityAnswer(false, false), false);
  });
});
