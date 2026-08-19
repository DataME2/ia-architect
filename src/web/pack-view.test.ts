import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import type { ExcludedCandidate, SubmissionPack } from '../domain/submission/types.ts';
import {
  canHandOver,
  exclusionSummary,
  packFileName,
  recordStateSummary,
} from './pack-view.ts';

function pack(excluded: readonly ExcludedCandidate[]): SubmissionPack {
  return {
    clubId: 'club-1',
    seasonId: 'season-1',
    version: 1,
    generatedAt: '2026-08-19T00:00:00.000Z',
    generatedByUserId: 'user-1',
    includesPhotographs: false,
    rows: [],
    manifest: [],
    excluded,
  };
}

function excluded(
  personId: string,
  reason: ExcludedCandidate['reason'],
): ExcludedCandidate {
  return { personId, reason, ruleIds: [], detail: 'x' };
}

describe('exclusionSummary', () => {
  test('groups by reason, most common first', () => {
    const summary = exclusionSummary(
      pack([
        excluded('a', 'validation-failed'),
        excluded('b', 'unresolved-duplicate'),
        excluded('c', 'validation-failed'),
        excluded('d', 'validation-failed'),
      ]),
    );

    assert.deepEqual(
      summary.map((g) => [g.reason, g.count]),
      [
        ['validation-failed', 3],
        ['unresolved-duplicate', 1],
      ],
    );
  });

  test('carries the people, so the group is actionable', () => {
    const summary = exclusionSummary([
      excluded('a', 'unresolved-duplicate'),
      excluded('b', 'unresolved-duplicate'),
    ].reduce((acc, e) => pack([...acc.excluded, e]), pack([])));

    assert.deepEqual(summary[0]?.personIds, ['a', 'b']);
  });

  test('labels each reason in words a registrar can act on', () => {
    const summary = exclusionSummary(pack([excluded('a', 'unresolved-duplicate')]));
    assert.equal(summary[0]?.label, 'Possible duplicate not yet resolved');
  });

  test('is empty when nothing was excluded', () => {
    assert.deepEqual(exclusionSummary(pack([])), []);
  });
});

describe('recordStateSummary (BR60)', () => {
  test('never adds sent and confirmed together', () => {
    // The distinction is the rule. A single "submitted" count would hide
    // that only the confirmed players may take the field.
    const summary = recordStateSummary([
      { state: 'sent' },
      { state: 'sent' },
      { state: 'confirmed_present' },
      { state: 'rejected' },
    ]);
    assert.deepEqual(summary, { sent: 2, confirmed: 1, rejected: 1 });
  });

  test('counts nothing for an empty pack', () => {
    assert.deepEqual(recordStateSummary([]), { sent: 0, confirmed: 0, rejected: 0 });
  });
});

describe('canHandOver', () => {
  test('allows a pack with rows that has not gone yet', () => {
    assert.equal(canHandOver({ rowCount: 3, handedOverAt: null }), true);
  });

  test('refuses an empty pack', () => {
    assert.equal(canHandOver({ rowCount: 0, handedOverAt: null }), false);
  });

  test('refuses a pack already handed over (BR58)', () => {
    // Handover is stamped once. A second one would rewrite the club's own
    // evidence of when it sent what.
    assert.equal(canHandOver({ rowCount: 3, handedOverAt: '2026-08-19T00:00:00Z' }), false);
  });
});

describe('packFileName', () => {
  test('names the version, because v2 is a different artifact from v1', () => {
    assert.equal(
      packFileName('North Star FC', '2026 Season', 2, 'pack'),
      'north-star-fc-2026-season-v2-pack.csv',
    );
  });

  test('distinguishes the exclusion list from the pack', () => {
    assert.equal(
      packFileName('North Star FC', '2026 Season', 1, 'exclusions'),
      'north-star-fc-2026-season-v1-exclusions.csv',
    );
  });

  test('makes a hostile club name safe', () => {
    // "St. Mary's / U12" is an ordinary club name and a bad filename.
    const name = packFileName("St. Mary's / U12", '2026/27', 1, 'pack');
    assert.equal(name, 'st-mary-s-u12-2026-27-v1-pack.csv');
    assert.ok(!name.includes('/'));
  });

  test('strips accents rather than emitting them into a filename', () => {
    assert.match(packFileName('Fútbol Club', 'Temporada', 1, 'pack'), /^futbol-club-/);
  });

  test('falls back rather than producing a nameless file', () => {
    assert.equal(packFileName('...', '...', 1, 'pack'), 'club-club-v1-pack.csv');
  });
});
