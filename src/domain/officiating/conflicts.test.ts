import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assess,
  needsOverride,
  offerable,
  type Candidate,
  type FixtureContext,
} from './conflicts.ts';

const fixture: FixtureContext = { playedOn: '2026-06-06', hasKickOff: true };

const candidate = (over: Partial<Candidate> = {}): Candidate => ({
  personId: 'p1',
  name: 'Neutral Nina',
  classification: 'Level 4',
  accreditations: [{ kind: 'fitness', expiresOn: '2027-01-01', verifiedAt: '2026-01-01' }],
  playedInFixture: false,
  inFixtureTeam: false,
  guardianInFixture: false,
  suspended: false,
  clashesAtKickOff: false,
  clubRoles: [],
  sameDayAppointments: 0,
  available: true,
  ...over,
});

const rules = (findings: readonly { rule: string }[]) => findings.map((f) => f.rule);

test('assess — blocking', async (t) => {
  await t.test('a clean candidate is offerable with nothing said', () => {
    const a = assess(candidate(), fixture);
    assert.deepEqual(a.blockers, []);
    assert.deepEqual(a.warnings, []);
    assert.equal(a.offerable, true);
  });

  await t.test('BR6 — played in this fixture', () => {
    const a = assess(candidate({ playedInFixture: true }), fixture);
    assert.deepEqual(rules(a.blockers), ['BR6']);
    assert.equal(a.offerable, false);
  });

  await t.test('BR109 — in a team contesting it, or guardian of somebody in it', () => {
    assert.deepEqual(rules(assess(candidate({ inFixtureTeam: true }), fixture).blockers), ['BR109']);
    assert.deepEqual(
      rules(assess(candidate({ guardianInFixture: true }), fixture).blockers),
      ['BR109'],
    );
  });

  await t.test('BR9 and BR7', () => {
    assert.deepEqual(rules(assess(candidate({ suspended: true }), fixture).blockers), ['BR9']);
    assert.deepEqual(rules(assess(candidate({ clashesAtKickOff: true }), fixture).blockers), ['BR7']);
  });

  await t.test('several blockers are all reported, not just the first', () => {
    // A coordinator fixing one and finding another is a coordinator who
    // stops trusting the screen.
    const a = assess(candidate({ playedInFixture: true, suspended: true }), fixture);
    assert.equal(a.blockers.length, 2);
  });
});

test('assess — BR11 same-club affiliation', async (t) => {
  await t.test('warns when the official is also club personnel', () => {
    // The case this exists for: the committee member who referees a grade
    // because nobody else can.
    const a = assess(candidate({ clubRoles: ['committee'] }), fixture);
    assert.deepEqual(rules(a.warnings), ['BR11']);
    assert.equal(a.warnings[0]?.message, 'Also committee at this club.');
    // A warning informs a designation; it does not stop one.
    assert.equal(a.offerable, true);
  });

  await t.test('reads several roles as a sentence', () => {
    const a = assess(candidate({ clubRoles: ['committee', 'admin'] }), fixture);
    assert.equal(a.warnings[0]?.message, 'Also admin and committee at this club.');
  });

  await t.test('does not repeat a role held twice', () => {
    const a = assess(candidate({ clubRoles: ['coach', 'coach'] }), fixture);
    assert.equal(a.warnings[0]?.message, 'Also coach at this club.');
  });

  await t.test('says nothing about an official with no club role', () => {
    // Every candidate is a person at this club, so a warning keyed on that
    // would appear on every row and teach a coordinator to ignore all of
    // them. It has to mean something narrower to mean anything.
    assert.deepEqual(assess(candidate({ clubRoles: [] }), fixture).warnings, []);
  });
});

test('assess — the other warnings', async (t) => {
  await t.test('BR11 — consecutive matches, at two and not at one', () => {
    assert.deepEqual(rules(assess(candidate({ sameDayAppointments: 1 }), fixture).warnings), []);
    const a = assess(candidate({ sameDayAppointments: 2 }), fixture);
    assert.deepEqual(rules(a.warnings), ['BR11']);
    assert.equal(a.warnings[0]?.message, 'Already officiating 2 other matches that day.');
  });

  await t.test('BR10 — an accreditation expired before the fixture', () => {
    const a = assess(
      candidate({
        accreditations: [{ kind: 'fitness', expiresOn: '2026-05-01', verifiedAt: '2026-01-01' }],
      }),
      fixture,
    );
    assert.deepEqual(rules(a.warnings), ['BR10']);
    // A warning, not a blocker: nothing records which accreditations are
    // mandatory, so refusing on any expiry would refuse an official over a
    // certificate no rule required of them.
    assert.equal(a.offerable, true);
  });

  await t.test('BR10 — measured against the fixture, not against anything else', () => {
    const later: FixtureContext = { playedOn: '2026-04-01', hasKickOff: true };
    const c = candidate({
      accreditations: [{ kind: 'fitness', expiresOn: '2026-05-01', verifiedAt: '2026-01-01' }],
    });
    assert.deepEqual(assess(c, later).warnings, []);
  });

  await t.test('BR10 — an unverified accreditation is not an expired one', () => {
    // Saying "expired" implies somebody once verified it. Nobody did.
    const a = assess(
      candidate({
        accreditations: [{ kind: 'laws', expiresOn: '2020-01-01', verifiedAt: null }],
      }),
      fixture,
    );
    assert.deepEqual(rules(a.warnings), []);
  });

  await t.test('BR8 — no classification means eligibility cannot be judged', () => {
    const a = assess(candidate({ classification: null }), fixture);
    assert.deepEqual(rules(a.warnings), ['BR8']);
  });

  await t.test('an undeclared official is flagged but still offerable', () => {
    const a = assess(candidate({ available: false }), fixture);
    assert.deepEqual(rules(a.warnings), ['—']);
    assert.equal(a.offerable, true);
  });

  await t.test('the undeclared message follows whether the fixture has a time', () => {
    const noTime: FixtureContext = { playedOn: '2026-06-06', hasKickOff: false };
    assert.match(
      assess(candidate({ available: false }), noTime).warnings[0]!.message,
      /that day/,
    );
  });
});

test('offerable', async (t) => {
  const clean = candidate({ personId: 'clean', name: 'Zoe Clean' });
  const warned = candidate({ personId: 'warned', name: 'Adam Warned', clubRoles: ['committee'] });
  const blocked = candidate({ personId: 'blocked', name: 'Bea Blocked', suspended: true });

  await t.test('removes blocked candidates rather than showing them disabled', () => {
    // BR109: never offered, not offered-and-refused. A greyed-out row
    // invites somebody to ask why and then find a way round it.
    const shown = offerable([clean, warned, blocked], fixture);
    assert.deepEqual(shown.map((r) => r.candidate.personId), ['clean', 'warned']);
  });

  await t.test('puts the person with nothing against them first', () => {
    // Even though Adam sorts before Zoe by name.
    const shown = offerable([warned, clean], fixture);
    assert.equal(shown[0]?.candidate.personId, 'clean');
  });

  await t.test('falls back to name when warnings tie', () => {
    const a = candidate({ personId: 'a', name: 'Ana Silva', clubRoles: ['coach'] });
    const b = candidate({ personId: 'b', name: 'Zara Ali', clubRoles: ['coach'] });
    assert.deepEqual(offerable([b, a], fixture).map((r) => r.candidate.personId), ['a', 'b']);
  });

  await t.test('offers nobody rather than everybody when all are blocked', () => {
    assert.deepEqual(offerable([blocked], fixture), []);
  });
});

test('needsOverride', async (t) => {
  await t.test('a designation with no warnings is not an override', () => {
    // Writing an audit row saying an override happened, when it did not,
    // makes the audit log worth less than not having one.
    assert.equal(needsOverride(assess(candidate(), fixture)), false);
  });

  await t.test('a rule-based warning is', () => {
    assert.equal(needsOverride(assess(candidate({ clubRoles: ['committee'] }), fixture)), true);
  });

  await t.test('an undeclared availability alone is not — it names no rule', () => {
    assert.equal(needsOverride(assess(candidate({ available: false }), fixture)), false);
  });
});
