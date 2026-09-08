import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  REGISTRAR_NAV,
  isActive,
  isDemoClub,
  navHref,
  whereAmI,
  type NavItem,
} from './nav.ts';

const item = (href: string): NavItem =>
  REGISTRAR_NAV.find((i) => i.href === href) ?? assert.fail(`no nav item ${href}`);

test('the season travels with a season-scoped link', () => {
  assert.equal(navHref(item('/registrar/teams'), 's1'), '/registrar/teams?season=s1');
  assert.equal(navHref(item('/registrar/duplicates'), 's1'), '/registrar/duplicates');
  assert.equal(navHref(item('/registrar/teams'), null), '/registrar/teams');
});

test('the queue is not active merely because it prefixes everything', () => {
  assert.equal(isActive('/registrar/teams', item('/registrar')), false);
  assert.equal(isActive('/registrar/teams', item('/registrar/teams')), true);
  assert.equal(isActive('/registrar', item('/registrar')), true);
});

test('a child page keeps its parent lit', () => {
  assert.equal(isActive('/registrar/pack/3', item('/registrar/pack')), true);
});

test('one registration belongs to the queue it was opened from', () => {
  const uuid = '/registrar/2f1c8b6e-0000-4000-8000-000000000000';
  assert.equal(isActive(uuid, item('/registrar')), true);
  assert.equal(isActive(uuid, item('/registrar/pack')), false);
});

test('exactly one destination is active for every path', () => {
  for (const path of ['/registrar', '/registrar/teams', '/registrar/pack/3', '/registrar/x']) {
    const lit = REGISTRAR_NAV.filter((i) => isActive(path, i));
    assert.equal(lit.length, 1, `${path} lit ${lit.length}`);
  }
});

test('the demo club is recognised by the marker teardown.sql also insists on', () => {
  assert.equal(isDemoClub('Riverbend Rovers FC (DEMO)'), true);
  assert.equal(isDemoClub('North Star FC'), false);
  assert.equal(isDemoClub('Demolition FC'), false);
});

test('signed out and signed into a real club never look alike', () => {
  assert.equal(whereAmI(false, null).kind, 'signed-out');
  assert.equal(whereAmI(true, null).kind, 'no-membership');
  assert.equal(whereAmI(true, 'North Star FC').kind, 'real');
  assert.equal(whereAmI(true, 'Riverbend Rovers FC (DEMO)').kind, 'demo');
});

test('a club with no demo marker is never reported as the demo', () => {
  for (const name of ['North Star FC', 'Demolition FC', 'DEMO United']) {
    assert.equal(whereAmI(true, name).kind, 'real', name);
  }
});
