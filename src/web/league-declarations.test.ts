import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  DECLARATIONS,
  FQ_2027_SEQ_METRO_MEN,
  declarationsFor,
  namesInSeveralLeagues,
  teamCount,
} from './league-declarations.ts';
import { calendarById } from './season-calendars.ts';

describe('declarations of leagues (scope 121, BR191)', () => {
  it('sits each declaration beside a calendar we hold, citing a source we keep', () => {
    for (const d of DECLARATIONS) {
      assert.ok(calendarById(d.calendarId), d.calendarId);
      assert.ok(existsSync(new URL(`../../${d.source}`, import.meta.url)), d.source);
    }
    assert.deepEqual(declarationsFor('fq-2027-seq-advanced-metro'), [FQ_2027_SEQ_METRO_MEN]);
    assert.deepEqual(declarationsFor('nowhere'), []);
  });

  it('carries FQ’s 2027 SEQ Metro Men leagues as printed: seven leagues, 84 places', () => {
    const d = FQ_2027_SEQ_METRO_MEN;
    assert.equal(d.status, 'Provisional');
    assert.deepEqual(
      d.leagues.map((l) => [l.name, l.teams.length]),
      [
        ['NPL', 12],
        ['QPL 1', 12],
        ['QPL 2', 12],
        ['QPL 3 Metro', 14],
        ['QPL 4 Metro', 12],
        ['QPL 5 Metro', 12],
        ['QPL 6 Metro', 10],
      ],
    );
    assert.equal(teamCount(d), 84);
    for (const l of d.leagues) assert.equal(new Set(l.teams).size, l.teams.length, `${l.name} lists a team twice`);
  });

  it('joins every pair of leagues, with play-offs only between QPL 2 and QPL 3 Metro', () => {
    for (const d of DECLARATIONS) assert.equal(d.links.length, d.leagues.length - 1, d.id);
    const d = FQ_2027_SEQ_METRO_MEN;
    const playOffs = d.links.flatMap((link, i) => (link === 'play-offs' ? [[d.leagues[i]?.name, d.leagues[i + 1]?.name]] : []));
    assert.deepEqual(playOffs, [['QPL 2', 'QPL 3 Metro']]);
  });

  it('finds the names printed in two leagues, and says no more about them', () => {
    assert.deepEqual(namesInSeveralLeagues(FQ_2027_SEQ_METRO_MEN), [
      { name: 'Moreton City Excelsior', leagues: ['NPL', 'QPL 2'] },
      { name: 'Olympic FC', leagues: ['NPL', 'QPL 6 Metro'] },
      { name: 'Caboolture Sports FC', leagues: ['QPL 1', 'QPL 6 Metro'] },
      { name: 'Holland Park Hawks', leagues: ['QPL 1', 'QPL 5 Metro'] },
      { name: 'Pine Hills', leagues: ['QPL 2', 'QPL 6 Metro'] },
    ]);
  });
});
