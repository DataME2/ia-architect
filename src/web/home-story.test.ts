import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LENSES, ROLE_PREVIEWS, lensAt, nextLens } from './home-story.ts';

describe('the landing page story (scope 100)', () => {
  it('the lens turns through every role and back to the first', () => {
    const seen = [0];
    let at = 0;
    for (let i = 0; i < LENSES.length; i += 1) {
      at = nextLens(at);
      seen.push(at);
    }
    assert.deepEqual(seen, [0, 1, 2, 3, 4, 0]);
    assert.equal(lensAt(99).role, 'Player');
  });

  it('the lens holds one person’s five roles, and each workspace is previewed once (P1)', () => {
    assert.deepEqual(
      LENSES.map((l) => l.role),
      ['Player', 'Coach', 'Referee', 'Guardian', 'Committee'],
    );
    assert.equal(new Set(ROLE_PREVIEWS.map((p) => p.role)).size, ROLE_PREVIEWS.length);
  });

  it('every status is a word as well as a tone, and none is an amount (BR78)', () => {
    const words = [
      ...LENSES.map((l) => l.line),
      ...ROLE_PREVIEWS.flatMap((p) => p.rows.flatMap((r) => [r.label, r.status?.word ?? '', r.aside ?? ''])),
    ];
    for (const p of ROLE_PREVIEWS) for (const r of p.rows) if (r.status) assert.ok(r.status.word.trim());
    for (const w of words) assert.doesNotMatch(w, /[$€£]|\d+\.\d{2}\b|owes|owing/i, w);
  });
});
