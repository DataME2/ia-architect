import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bars, share } from './dashboard-view.ts';

test('a share of nothing is unknown, not zero', () => {
  assert.equal(share(0, 0), null);
  assert.equal(share(1, 3), 33);
  assert.equal(share(3, 3), 100);
});

test('bars are longest first and measured against the longest', () => {
  const out = bars([
    { label: 'Coach', count: 2 },
    { label: 'Player', count: 8 },
    { label: 'Referee', count: 0 },
  ]);
  assert.deepEqual(out.map((b) => [b.label, b.width]), [['Player', 100], ['Coach', 25], ['Referee', 2]]);
});

test('all-zero bars keep a sliver each', () => {
  assert.deepEqual(bars([{ label: 'A', count: 0 }]).map((b) => b.width), [2]);
});
