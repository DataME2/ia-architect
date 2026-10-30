import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CLUB_TABS, clubTab, clubTabHref } from './club-tabs.ts';

test('a tab the URL does not name, or names wrongly, is Profile', () => {
  assert.equal(clubTab(undefined), 'profile');
  assert.equal(clubTab('settings'), 'profile');
  assert.equal(clubTab('licence'), 'licence');
});

test('every tab has a distinct id, and Profile needs no query', () => {
  assert.equal(new Set(CLUB_TABS.map((t) => t.id)).size, CLUB_TABS.length);
  assert.equal(clubTabHref('profile', null), '/registrar/club');
});

test('a tab keeps the season the page is showing', () => {
  assert.equal(clubTabHref('teams', 's1'), '/registrar/club?tab=teams&season=s1');
  assert.equal(clubTabHref('profile', 's1'), '/registrar/club?season=s1');
});
