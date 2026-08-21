import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { fail, pass } from '../domain/rules/types.ts';
import type { RegistrationStatus } from '../domain/types.ts';
import {
  blockerSummary,
  displayNameFor,
  failing,
  fullLegalName,
  groupFor,
  groupQueue,
  eligibilityOf,
  moneyNote,
  owing,
  unpaidButRegistered,
  type QueueEntry,
} from './queue-view.ts';

function entry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    registrationId: 'reg-1',
    personId: 'person-1',
    displayName: 'Alex Nguyen',
    legalName: 'Alexandra Marie Nguyen',
    status: 'DRAFT' as RegistrationStatus,
    outcomes: [pass('BR55', 'Legal name verified.')],
    duplicateCount: 0,
    outstandingCents: 0,
    ...overrides,
  };
}

describe('naming (BR55)', () => {
  test('shows a human the name they are actually called', () => {
    const name = displayNameFor({
      preferredName: 'Alex',
      legalName: { givenNames: 'Alexandra Marie', familyName: 'Nguyen' },
    });
    assert.equal(name, 'Alex Nguyen');
  });

  test('falls back to the legal given names when there is no preferred name', () => {
    const name = displayNameFor({
      preferredName: null,
      legalName: { givenNames: 'Alexandra Marie', familyName: 'Nguyen' },
    });
    assert.equal(name, 'Alexandra Marie Nguyen');
  });

  test('ignores a preferred name that is only whitespace', () => {
    const name = displayNameFor({
      preferredName: '   ',
      legalName: { givenNames: 'Alexandra', familyName: 'Nguyen' },
    });
    assert.equal(name, 'Alexandra Nguyen');
  });

  test('the legal name is never the preferred one', () => {
    const legal = fullLegalName({
      legalName: { givenNames: 'Alexandra Marie', familyName: 'Nguyen' },
    });
    assert.equal(legal, 'Alexandra Marie Nguyen');
  });
});

describe('grouping', () => {
  test('sends a failing registration to the action pile', () => {
    const e = entry({ outcomes: [fail('BR55', 'Legal name not verified.')] });
    assert.equal(groupFor(e), 'needs-action');
  });

  test('sends an unresolved duplicate to the action pile even when every rule passes', () => {
    // BR5: a pack excludes an unresolved duplicate rather than guessing, so
    // it has to reach a human before submission, not after.
    const e = entry({ duplicateCount: 1 });
    assert.equal(groupFor(e), 'needs-action');
  });

  test('marks a clean registration ready to submit', () => {
    assert.equal(groupFor(entry()), 'ready-to-submit');
  });

  test('keeps a submitted registration apart from a complete one (BR60)', () => {
    // The failure this guards: a child put on the field because the club's
    // own screen said the submission went out. Sending is not registering.
    const sent = entry({ status: 'PENDING_EXTERNAL_REGISTRATION' });
    const done = entry({ status: 'COMPLETE' });
    assert.equal(groupFor(sent), 'awaiting-federation');
    assert.equal(groupFor(done), 'complete');
    assert.notEqual(groupFor(sent), groupFor(done));
  });

  test('a complete registration stays complete even with a stale failing outcome', () => {
    const e = entry({ status: 'COMPLETE', outcomes: [fail('BR3', 'Owes $10.00.')] });
    assert.equal(groupFor(e), 'complete');
  });

  test('splits a mixed queue into its four piles', () => {
    const grouped = groupQueue([
      entry({ registrationId: 'a', outcomes: [fail('BR55', 'x')] }),
      entry({ registrationId: 'b' }),
      entry({ registrationId: 'c', status: 'PENDING_EXTERNAL_REGISTRATION' }),
      entry({ registrationId: 'd', status: 'COMPLETE' }),
    ]);

    assert.deepEqual(grouped.needsAction.map((e) => e.registrationId), ['a']);
    assert.deepEqual(grouped.readyToSubmit.map((e) => e.registrationId), ['b']);
    assert.deepEqual(grouped.awaitingFederation.map((e) => e.registrationId), ['c']);
    assert.deepEqual(grouped.complete.map((e) => e.registrationId), ['d']);
  });
});

describe('ordering', () => {
  test('leads with the registration furthest from done', () => {
    const grouped = groupQueue([
      entry({ registrationId: 'one-problem', displayName: 'A', outcomes: [fail('BR3', 'x')] }),
      entry({
        registrationId: 'three-problems',
        displayName: 'Z',
        outcomes: [fail('BR55', 'x'), fail('BR1', 'y'), fail('BR2', 'z')],
      }),
    ]);
    assert.deepEqual(grouped.needsAction.map((e) => e.registrationId), [
      'three-problems',
      'one-problem',
    ]);
  });

  test('falls back to name order so the list is stable between refreshes', () => {
    const grouped = groupQueue([
      entry({ registrationId: 'z', displayName: 'Zoe Adams' }),
      entry({ registrationId: 'a', displayName: 'Aaron Blake' }),
    ]);
    assert.deepEqual(grouped.readyToSubmit.map((e) => e.displayName), [
      'Aaron Blake',
      'Zoe Adams',
    ]);
  });
});

describe('blocker summary (open question #32)', () => {
  test('counts how many registrations each rule is holding up, worst first', () => {
    const summary = blockerSummary([
      entry({ outcomes: [fail('BR55', 'Legal name not verified.'), fail('BR2', 'Missing passport.')] }),
      entry({ outcomes: [fail('BR55', 'Legal name not verified.')] }),
      entry({ outcomes: [fail('BR55', 'Legal name not verified.')] }),
      entry({ outcomes: [fail('BR2', 'Missing passport.')] }),
    ]);

    assert.deepEqual(
      summary.map((s) => [s.ruleId, s.count]),
      [
        ['BR55', 3],
        ['BR2', 2],
      ],
    );
  });

  test('carries a readable example so the summary needs no lookup', () => {
    const summary = blockerSummary([entry({ outcomes: [fail('BR3', 'Owes $120.00.')] })]);
    assert.equal(summary[0]?.example, 'Owes $120.00.');
  });

  test('counts nothing when the queue is clean', () => {
    assert.deepEqual(blockerSummary([entry(), entry()]), []);
  });

  test('ignores passes', () => {
    const summary = blockerSummary([
      entry({ outcomes: [pass('BR55', 'ok'), fail('BR1', 'No guardian with authority.')] }),
    ]);
    assert.deepEqual(summary.map((s) => s.ruleId), ['BR1']);
  });
});

describe('failing()', () => {
  test('returns only the failures, in rule order', () => {
    const e = entry({
      outcomes: [pass('BR55', 'ok'), fail('BR1', 'a'), pass('BR48', 'ok'), fail('BR2', 'b')],
    });
    assert.deepEqual(failing(e).map((o) => o.ruleId), ['BR1', 'BR2']);
  });
});

test('the money note shows a balance whether or not it is blocking', () => {
  assert.equal(moneyNote(entry({ outstandingCents: 8032 })), '$80.32 outstanding');
  assert.equal(moneyNote(entry({ outstandingCents: -500 })), '$5.00 in credit');
  assert.equal(moneyNote(entry({ outstandingCents: 0 })), null);
});

test('a registered player who owes money is separated out (BR79)', () => {
  const entries = [
    entry({ registrationId: 'r1', status: 'COMPLETE', outstandingCents: 0 }),
    entry({ registrationId: 'r2', status: 'COMPLETE', outstandingCents: 1500 }),
    entry({ registrationId: 'r3', status: 'COMPLETE', outstandingCents: 8032 }),
    entry({ registrationId: 'r4', status: 'PENDING_PAYMENT', outstandingCents: 4000 }),
  ];

  assert.deepEqual(
    unpaidButRegistered(entries).map((e) => e.registrationId),
    ['r3', 'r2'],
    'most owed first, and only the ones that look finished',
  );
});

test('owing lists every debtor, including those still in the queue', () => {
  const entries = [
    entry({ registrationId: 'r1', status: 'COMPLETE', outstandingCents: 0 }),
    entry({ registrationId: 'r2', status: 'PENDING_PAYMENT', outstandingCents: 4000 }),
    entry({ registrationId: 'r3', status: 'COMPLETE', outstandingCents: 1500 }),
  ];
  assert.deepEqual(
    owing(entries).map((e) => e.registrationId),
    ['r2', 'r3'],
  );
});

test('eligibility is asked of the entry, not stored on it', () => {
  const paid = entry({ status: 'COMPLETE', outstandingCents: 0 });
  const owes = entry({ status: 'COMPLETE', outstandingCents: 1 });
  assert.equal(eligibilityOf(paid).mayPlay, true);
  assert.equal(eligibilityOf(owes).mayPlay, false, 'one cent is still owing money');
});
