import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  QUIET_DAYS, daysBetween, planReminders, summarise, type RemindableEntry,
} from './bulk-reminders.ts';

const entry = (over: Partial<RemindableEntry> & { displayName: string }): RemindableEntry => ({
  registrationId: `r-${over.displayName}`,
  personId: `p-${over.displayName}`,
  outstanding: 2,
  lastRemindedOn: null,
  ...over,
});

const TODAY = '2026-09-15';

describe('planReminders — who a bulk send actually reaches', () => {
  it('chases everybody with something outstanding and nobody else', () => {
    const plan = planReminders([
      entry({ displayName: 'Ana', outstanding: 1 }),
      entry({ displayName: 'Bo', outstanding: 0 }),
      entry({ displayName: 'Cy', outstanding: 3 }),
    ], TODAY);

    assert.deepEqual(plan.toSend.map((e) => e.displayName), ['Ana', 'Cy']);
    assert.deepEqual(plan.skipped.map((s) => s.displayName), ['Bo']);
    assert.equal(plan.skipped[0]?.reason, 'nothing-outstanding');
  });

  it('leaves a family alone for a week after being reminded', () => {
    const plan = planReminders([
      entry({ displayName: 'Ana', lastRemindedOn: '2026-09-14' }),
      entry({ displayName: 'Bo', lastRemindedOn: '2026-09-15' }),
      entry({ displayName: 'Cy', lastRemindedOn: '2026-09-01' }),
    ], TODAY);

    assert.deepEqual(plan.toSend.map((e) => e.displayName), ['Cy']);
    assert.deepEqual(plan.skipped.map((s) => s.reason), ['reminded-recently', 'reminded-recently']);
  });

  it('holds the quiet period on both edges', () => {
    // Six days ago is inside it; seven is out. An off-by-one here is a
    // family chased twice in a week or left an extra week.
    const six = planReminders([entry({ displayName: 'Ana', lastRemindedOn: '2026-09-09' })], TODAY);
    const seven = planReminders([entry({ displayName: 'Ana', lastRemindedOn: '2026-09-08' })], TODAY);
    assert.equal(six.toSend.length, 0);
    assert.equal(seven.toSend.length, 1);
    assert.equal(QUIET_DAYS, 7);
  });

  it('says how long ago, in words a registrar can act on', () => {
    const plan = planReminders([
      entry({ displayName: 'Ana', lastRemindedOn: TODAY }),
      entry({ displayName: 'Bo', lastRemindedOn: '2026-09-14' }),
      entry({ displayName: 'Cy', lastRemindedOn: '2026-09-12' }),
    ], TODAY);

    assert.equal(plan.skipped[0]?.detail, 'Reminded today already.');
    assert.equal(plan.skipped[1]?.detail, 'Reminded 1 day ago.');
    assert.equal(plan.skipped[2]?.detail, 'Reminded 3 days ago.');
  });

  it('accepts a different quiet period without changing the default', () => {
    const plan = planReminders(
      [entry({ displayName: 'Ana', lastRemindedOn: '2026-09-14' })], TODAY, 1);
    assert.equal(plan.toSend.length, 1);
  });

  it('orders by name, so the list reads the same way twice', () => {
    const plan = planReminders([
      entry({ displayName: 'Cy' }), entry({ displayName: 'Ana' }), entry({ displayName: 'Bo' }),
    ], TODAY);
    assert.deepEqual(plan.toSend.map((e) => e.displayName), ['Ana', 'Bo', 'Cy']);
  });

  it('does not reorder its argument', () => {
    const given = [entry({ displayName: 'Cy' }), entry({ displayName: 'Ana' })];
    planReminders(given, TODAY);
    assert.deepEqual(given.map((e) => e.displayName), ['Cy', 'Ana']);
  });

  it('has nothing to do with an empty queue', () => {
    const plan = planReminders([], TODAY);
    assert.deepEqual(plan.toSend, []);
    assert.deepEqual(plan.skipped, []);
  });
});

describe('daysBetween — calendar days, not a duration', () => {
  it('counts whole days across a month boundary', () => {
    assert.equal(daysBetween('2026-08-31', '2026-09-01'), 1);
    assert.equal(daysBetween('2026-09-01', '2026-09-15'), 14);
  });

  it('counts a leap day', () => {
    assert.equal(daysBetween('2028-02-28', '2028-03-01'), 2);
  });

  it('is zero on the same day and ignores a timestamp’s time', () => {
    assert.equal(daysBetween('2026-09-15', '2026-09-15'), 0);
    assert.equal(daysBetween('2026-09-15T23:59:00Z', '2026-09-16T00:01:00Z'), 1);
  });
});

describe('summarise — never one averaged verdict', () => {
  it('reports what was sent', () => {
    assert.equal(
      summarise({ families: 3, sent: 5, withheld: 0 }, 0),
      'Reminded 3 families (5 messages).',
    );
  });

  it('names recipients who were not written to at all', () => {
    // The household where one guardian is reachable and the other has
    // unsubscribed is the ordinary case, not an edge.
    const line = summarise({ families: 3, sent: 4, withheld: 2 }, 0);
    assert.match(line, /2 recipients were not written to/);
  });

  it('never hides the skipped', () => {
    assert.match(summarise({ families: 2, sent: 2, withheld: 0 }, 3), /3 skipped/);
  });

  it('says plainly when everybody was skipped', () => {
    assert.match(summarise({ families: 0, sent: 0, withheld: 0 }, 4), /all 4 were skipped/);
  });

  it('says nobody needed chasing rather than reporting a zero', () => {
    assert.equal(summarise({ families: 0, sent: 0, withheld: 0 }, 0), 'Nobody needed chasing.');
  });

  it('reads in the singular for one family and one message', () => {
    assert.equal(
      summarise({ families: 1, sent: 1, withheld: 1 }, 1),
      'Reminded 1 family (1 message). 1 recipient was not written to — unsubscribed, or with no address recorded. 1 skipped, listed below.',
    );
  });
});
