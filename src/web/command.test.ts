import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { REGISTRAR_NAV } from './nav.ts';
import { PERSON_DESTINATIONS, clubDestinations, commandResults, peopleSearch, score } from './command.ts';

describe('the command bar (scope 93)', () => {
  it('lists the common places when nothing is typed, and no search', () => {
    const r = commandResults('');
    assert.ok(r.some((d) => d.href === '/me'));
    assert.ok(r.every((d) => d.group !== 'Search'));
  });

  it('offers every club menu destination, from the one list nav.ts keeps', () => {
    assert.equal(clubDestinations().length, REGISTRAR_NAV.length);
    assert.ok(clubDestinations().every((d) => d.group === 'Club administration'));
  });

  it('ranks a label that starts with the query above one that only contains it', () => {
    const r = commandResults('fix');
    assert.equal(r[0]!.label, 'Fixtures');
  });

  it('finds a place by what it is for, not only by its name', () => {
    assert.ok(commandResults('money').some((d) => d.href === '/registrar/arrears'));
    assert.ok(commandResults('agm').some((d) => d.href === '/registrar/governance'));
  });

  it('ends with a people search, encoded, once two characters are typed', () => {
    const r = commandResults('Tané R');
    assert.equal(r[r.length - 1]!.group, 'Search');
    assert.equal(r[r.length - 1]!.href, '/registrar/people?q=Tan%C3%A9%20R');
    assert.ok(commandResults('t').every((d) => d.group !== 'Search'));
  });

  it('never invents a destination: every place is a real route', () => {
    const real = new Set(['/', '/me', '/register', '/demo', '/interest', '/sign-in', ...REGISTRAR_NAV.map((i) => i.href)]);
    for (const d of [...PERSON_DESTINATIONS, ...clubDestinations()]) assert.ok(real.has(d.href), d.href);
    assert.equal(score(PERSON_DESTINATIONS[0]!, ''), 0);
    assert.match(peopleSearch('  ab ').href, /q=ab$/);
  });
});

describe('the acting-as lens on a club screen', () => {
  it('names every club role, since they all apply together', async () => {
    const { clubLens } = await import('./command.ts');
    assert.equal(clubLens(['registrar']), 'Registrar');
    assert.equal(clubLens(['admin', 'registrar', 'treasurer']), 'Administrator, Registrar and Treasurer');
    assert.equal(clubLens(['digital_technology_manager']), 'IT Manager');
    assert.equal(clubLens([]), 'Member');
  });
});
