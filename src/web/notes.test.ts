import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { homeNotes, queueNotes, type QueueFigures } from './notes.ts';

const base: QueueFigures = { total: 13, readyToSubmit: 0, unpaidCount: 0, unpaidCents: 0, topBlocker: null, seasonId: 's1' };

describe('the queue’s notes (scope 93)', () => {
  it('says nothing when nothing needs saying', () => {
    assert.deepEqual(queueNotes(base), []);
  });

  it('flags a registered player who cannot play first, with the amount when it may be shown', () => {
    const n = queueNotes({ ...base, unpaidCount: 1, unpaidCents: 5000, topBlocker: { ruleId: 'BR55', count: 4 }, readyToSubmit: 2 });
    assert.equal(n[0]!.kind, 'flagged');
    assert.match(n[0]!.text, /1 registered player cannot play: \$50\.00 is still owed \(BR79\)/);
    assert.equal(n.length, 3);
  });

  it('names no amount to a reader who may not see one (BR78)', () => {
    const n = queueNotes({ ...base, unpaidCount: 2, unpaidCents: null });
    assert.doesNotMatch(n[0]!.text, /\$/);
  });

  it('points every note at a page or section where a person acts, never at an action', () => {
    const n = queueNotes({ ...base, unpaidCount: 1, unpaidCents: 100, topBlocker: { ruleId: 'BR2', count: 1 }, readyToSubmit: 1 });
    assert.deepEqual(n.map((x) => x.href), ['#cannot-play', '#holding', '/registrar/pack?season=s1']);
  });
});

describe('the blocker note', () => {
  it('sets the rule count against every registration, never against a smaller pile', () => {
    const n = queueNotes({ ...base, total: 13, topBlocker: { ruleId: 'BR55', count: 4 } });
    assert.match(n[0]!.text, /BR55, on 4 of the 13 registrations/);
  });
});

describe('the home’s notes', () => {
  const item = (tone: 'pending' | 'blocked', role: string, headline = 'x') => ({ headline, href: `/me?role=${role}&club=c`, roleLabel: role, clubName: 'North Star FC', tone });

  it('flags the first blocked item and links straight to it', () => {
    const n = homeNotes({ items: [item('pending', 'Coach'), item('blocked', 'Guardian', 'Leo’s registration')] });
    assert.equal(n[0]!.kind, 'flagged');
    assert.equal(n[0]!.href, '/me?role=Guardian&club=c');
    assert.match(n[0]!.text, /Leo’s registration/);
  });

  it('summarises how many roles the waiting items span', () => {
    const n = homeNotes({ items: [item('pending', 'Coach'), item('pending', 'Referee'), item('pending', 'Coach')] });
    assert.match(n[0]!.text, /3 things are waiting on you across 2 roles/);
  });

  it('is silent for one pending item: the list already says it', () => {
    assert.deepEqual(homeNotes({ items: [item('pending', 'Coach')] }), []);
  });
});
