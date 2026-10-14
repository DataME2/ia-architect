import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  TD_NOT_PERMITTED,
  TD_PERMISSIONS,
  activityByDay,
  activityLine,
  checkCorrectionSource,
} from './technical-director.ts';

describe('the Technical Director (scope 98)', () => {
  it('documents every permission against where it is enforced', () => {
    for (const p of [...TD_PERMISSIONS, ...TD_NOT_PERMITTED]) {
      assert.ok(p.source.length > 0, p.area);
    }
    // BR78: money is never among what the role may do.
    assert.ok(!TD_PERMISSIONS.some((p) => /balance|payment|voucher/i.test(p.may)));
    assert.ok(TD_NOT_PERMITTED.some((p) => p.area === 'Money'));
  });

  it('reads an activity row as a sentence, naming who did it when known', () => {
    const row = { occurredAt: '2026-10-14T05:00:00Z', action: 'team_member_added', personId: 'p', personName: 'Riley Striker', actorName: 'Sam Coach' };
    assert.equal(activityLine(row), 'Riley Striker was added to a team sheet — by Sam Coach');
    assert.equal(activityLine({ ...row, actorName: null, action: 'appearance.changed' }), 'Riley Striker had an appearance corrected');
    assert.equal(activityLine({ ...row, actorName: null, action: 'something.new' }), 'Riley Striker changed');
  });

  it('groups activity by day, newest first', () => {
    const r = (occurredAt: string) => ({ occurredAt, action: 'x', personId: 'p', personName: 'P', actorName: null });
    const days = activityByDay([r('2026-10-12T01:00:00Z'), r('2026-10-14T02:00:00Z'), r('2026-10-14T09:00:00Z')]);
    assert.deepEqual(days.map((d) => [d.day, d.rows.length]), [['2026-10-14', 2], ['2026-10-12', 1]]);
    assert.equal(days[0]!.rows[0]!.occurredAt, '2026-10-14T09:00:00Z');
  });

  it('BR177: a correction names its source', () => {
    assert.equal(checkCorrectionSource('trust').ok, false);
    assert.equal(checkCorrectionSource('        ').ok, false);
    assert.deepEqual(checkCorrectionSource('  Referee match report '), { ok: true, source: 'Referee match report' });
    assert.equal(checkCorrectionSource('x'.repeat(501)).ok, false);
  });
});
