import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clearanceLapsedCoordinator, clearanceLapsedHolder } from './templates.ts';

const ctx = {
  clubName: 'North Star FC',
  unsubscribeUrl: 'https://x.test/unsubscribe/abc',
  asAt: '2026-09-15' as const,
};

const vacancies = [
  { describes: 'Assistant Referee — Rivals, 15 October 2026', occursOn: '2026-10-15' },
  { describes: 'Coach — U8', occursOn: '2027-03-31' },
];

describe('clearanceLapsedHolder — BR50, the holder is told they were withdrawn', () => {
  it('names every commitment they have been taken off', () => {
    const { subject, body } = clearanceLapsedHolder.compose(
      { holderName: 'Sam Reece', vacancies }, ctx);

    assert.match(subject, /withdrawn from 2 commitments/);
    assert.match(body, /Assistant Referee — Rivals, 15 October 2026 \(2026-10-15\)/);
    assert.match(body, /Coach — U8 \(2027-03-31\)/);
  });

  it('counts one commitment in the singular', () => {
    const { subject } = clearanceLapsedHolder.compose(
      { holderName: 'Sam Reece', vacancies: [vacancies[0]!] }, ctx);
    assert.match(subject, /withdrawn from 1 commitment$/);
  });

  it('says it is about the club’s record, not an accusation', () => {
    // A card lapses for ordinary reasons — a renewal in the post, a card
    // recorded and not yet re-verified. A message that reads as a finding
    // about the person is one the club has to apologise for.
    const { body } = clearanceLapsedHolder.compose(
      { holderName: 'Sam Reece', vacancies }, ctx);
    assert.match(body, /record of your Working with Children Check/);
    assert.match(body, /not about you/);
    assert.match(body, /can be undone/);
  });

  it('still asks them not to attend in the meantime', () => {
    // The reassurance must not read as "so carry on".
    const { body } = clearanceLapsedHolder.compose(
      { holderName: 'Sam Reece', vacancies }, ctx);
    assert.match(body, /do not attend/);
  });

  it('carries the way out (BR128)', () => {
    const { body } = clearanceLapsedHolder.compose(
      { holderName: 'Sam Reece', vacancies }, ctx);
    assert.match(body, /https:\/\/x\.test\/unsubscribe\/abc/);
  });
});

describe('clearanceLapsedCoordinator — BR50, the vacancies need re-filling', () => {
  it('names the official and lists what needs filling', () => {
    const { subject, body } = clearanceLapsedCoordinator.compose(
      { coordinatorName: 'Kiri', holderName: 'Sam Reece', vacancies }, ctx);

    assert.match(subject, /2 vacancies — Sam Reece's clearance/);
    assert.match(body, /Assistant Referee — Rivals, 15 October 2026/);
    assert.match(body, /need re-filling/);
  });

  it('reads in the singular for one vacancy', () => {
    const { subject, body } = clearanceLapsedCoordinator.compose(
      { coordinatorName: 'Kiri', holderName: 'Sam Reece', vacancies: [vacancies[0]!] }, ctx);
    assert.match(subject, /1 vacancy/);
    assert.match(body, /this needs re-filling/);
  });

  it('tells the coordinator the official already knows', () => {
    // Otherwise the first thing a coordinator does is ring them, which is
    // the call the holder's own notice exists to save.
    const { body } = clearanceLapsedCoordinator.compose(
      { coordinatorName: 'Kiri', holderName: 'Sam Reece', vacancies }, ctx);
    assert.match(body, /told as well/);
  });

  it('says what undoes it, since that is usually the answer', () => {
    const { body } = clearanceLapsedCoordinator.compose(
      { coordinatorName: 'Kiri', holderName: 'Sam Reece', vacancies }, ctx);
    assert.match(body, /re-appointing them/);
  });

  it('omits a date it does not have rather than inventing one', () => {
    const { body } = clearanceLapsedCoordinator.compose({
      coordinatorName: 'Kiri',
      holderName: 'Sam Reece',
      vacancies: [{ describes: 'Coach — U8', occursOn: null }],
    }, ctx);
    assert.match(body, /• Coach — U8\n/);
    assert.doesNotMatch(body, /\(null\)/);
  });
});
