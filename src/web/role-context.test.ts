import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  appointmentConflict,
  buildContexts,
  chipCount,
  offerableAppointments,
  resolveActive,
  ROLE_ORDER,
  type FixtureRoleClaim,
  type RoleHolding,
} from './role-context.ts';

const DANI = 'person-dani';

function holding(over: Partial<RoleHolding> & Pick<RoleHolding, 'key'>): RoleHolding {
  return {
    clubId: 'club-bcfc',
    clubName: 'Brisbane City FC',
    scope: null,
    pending: 0,
    ...over,
  };
}

const FIVE: readonly RoleHolding[] = [
  holding({ key: 'committee', scope: 'Secretary', pending: 1 }),
  holding({ key: 'coach', scope: 'U12 Girls', pending: 4 }),
  holding({ key: 'guardian', clubId: 'club-redlands', clubName: 'Redlands United', scope: 'for Tané', pending: 3 }),
  holding({ key: 'player', scope: 'Women’s Div 3', pending: 1 }),
  holding({ key: 'referee', scope: 'Junior panel', pending: 2 }),
];

describe('buildContexts', () => {
  it('presents roles in a fixed order regardless of the order supplied', () => {
    const keys = buildContexts(FIVE).map((h) => h.key);
    assert.deepEqual(keys, [...ROLE_ORDER]);
  });

  it('collapses two holdings of one role at one club into a single lens', () => {
    const two = buildContexts([
      holding({ key: 'coach', scope: 'U12 Girls', pending: 4 }),
      holding({ key: 'coach', scope: 'U14 Boys', pending: 2 }),
    ]);
    assert.equal(two.length, 1, 'coaching two teams at one club is one lens, not two');
    assert.equal(two[0]?.pending, 6, 'and it carries what both are waiting on');
  });

  it('keeps one role held at two clubs as two lenses', () => {
    const both = buildContexts([
      holding({ key: 'guardian', clubId: 'club-a', clubName: 'A' }),
      holding({ key: 'guardian', clubId: 'club-b', clubName: 'B' }),
    ]);
    assert.equal(both.length, 2, 'a different club is a different context');
  });
});

describe('resolveActive — BR61, switching is explicit', () => {
  it('refuses to guess when several roles are held and none was chosen', () => {
    assert.equal(
      resolveActive(buildContexts(FIVE)),
      null,
      'falling back to the first role is a switch the Person did not make',
    );
  });

  it('does not fall back to the busiest role either', () => {
    // Coach has the most pending. A "helpful" default would pick it.
    assert.equal(resolveActive(buildContexts(FIVE), { key: null }), null);
  });

  it('resolves a single holding without calling it a switch', () => {
    const only = buildContexts([holding({ key: 'player' })]);
    const active = resolveActive(only);
    assert.equal(active?.how, 'sole', 'one role is not a choice the user made');
    assert.equal(active?.holding.key, 'player');
  });

  it('records an explicit choice as chosen', () => {
    const active = resolveActive(buildContexts(FIVE), { key: 'referee' });
    assert.equal(active?.how, 'chosen');
    assert.equal(active?.holding.scope, 'Junior panel');
  });

  it('needs a club named when one role is held at more than one', () => {
    const two = buildContexts([
      holding({ key: 'guardian', clubId: 'club-a', clubName: 'A' }),
      holding({ key: 'guardian', clubId: 'club-b', clubName: 'B' }),
    ]);
    assert.equal(resolveActive(two, { key: 'guardian' }), null, 'ambiguous is not resolved');
    assert.equal(resolveActive(two, { key: 'guardian', clubId: 'club-b' })?.holding.clubName, 'B');
  });

  it('refuses a role the Person does not hold', () => {
    const contexts = buildContexts([holding({ key: 'player' })]);
    assert.equal(resolveActive(contexts, { key: 'committee' }), null);
  });

  it('refuses a club the Person does not hold that role at', () => {
    const contexts = buildContexts(FIVE);
    assert.equal(resolveActive(contexts, { key: 'coach', clubId: 'club-redlands' }), null);
  });

  it('has nothing to resolve for a Person with no roles', () => {
    assert.equal(resolveActive([]), null);
    assert.equal(resolveActive([], { key: 'coach' }), null);
  });
});

describe('chipCount — open question 67', () => {
  it('shows the active role its own count', () => {
    const contexts = buildContexts(FIVE);
    const active = resolveActive(contexts, { key: 'coach' });
    const coach = contexts.find((c) => c.key === 'coach')!;
    assert.equal(chipCount(coach, active), 4);
  });

  it('carries a count across the boundary under the adopted reading', () => {
    const contexts = buildContexts(FIVE);
    const active = resolveActive(contexts, { key: 'coach' });
    const referee = contexts.find((c) => c.key === 'referee')!;
    // If question 67 comes back "no", COUNTS_CROSS_BOUNDARY flips and this
    // becomes null — the assertion is what documents the switch.
    assert.equal(chipCount(referee, active), 2);
  });
});

describe('appointmentConflict — BR6 and BR109', () => {
  const claims: readonly FixtureRoleClaim[] = [
    { fixtureId: 'fx-1', personId: DANI, claim: 'coach' },
    { fixtureId: 'fx-2', personId: DANI, claim: 'player' },
    { fixtureId: 'fx-3', personId: DANI, claim: 'guardian-of-player' },
    { fixtureId: 'fx-4', personId: DANI, claim: 'team-official' },
    { fixtureId: 'fx-5', personId: 'someone-else', claim: 'coach' },
  ];

  it('refuses the referee who is a player in the match, as BR6', () => {
    const c = appointmentConflict(DANI, 'fx-2', claims);
    assert.equal(c?.ruleId, 'BR6');
  });

  it('refuses the referee who coaches a side in the match, as BR109', () => {
    const c = appointmentConflict(DANI, 'fx-1', claims);
    assert.equal(c?.ruleId, 'BR109');
    assert.match(c!.message, /coach a side/i);
  });

  it('refuses the referee whose child is on the field, as BR109', () => {
    assert.equal(appointmentConflict(DANI, 'fx-3', claims)?.ruleId, 'BR109');
  });

  it('refuses a team official of a participating side, as BR109', () => {
    assert.equal(appointmentConflict(DANI, 'fx-4', claims)?.ruleId, 'BR109');
  });

  it('does not refuse on someone else’s conflict', () => {
    assert.equal(appointmentConflict(DANI, 'fx-5', claims), null);
  });

  it('does not refuse a fixture the Person has no other role in', () => {
    assert.equal(appointmentConflict(DANI, 'fx-clean', claims), null);
  });

  it('reports the most direct conflict when several apply', () => {
    const both: readonly FixtureRoleClaim[] = [
      { fixtureId: 'fx-9', personId: DANI, claim: 'guardian-of-player' },
      { fixtureId: 'fx-9', personId: DANI, claim: 'player' },
    ];
    assert.equal(appointmentConflict(DANI, 'fx-9', both)?.ruleId, 'BR6');
  });

  it('spans clubs — the claim list is not filtered by tenant', () => {
    // The guardian case routinely crosses two clubs (BR63). Nothing here
    // narrows by club, and that is the point.
    const crossClub: readonly FixtureRoleClaim[] = [
      { fixtureId: 'fx-redlands', personId: DANI, claim: 'guardian-of-player' },
    ];
    assert.equal(appointmentConflict(DANI, 'fx-redlands', crossClub)?.ruleId, 'BR109');
  });
});

describe('offerableAppointments — never offered, not offered-then-refused', () => {
  it('removes the conflicted fixture from the list entirely', () => {
    const claims: readonly FixtureRoleClaim[] = [
      { fixtureId: 'fx-1', personId: DANI, claim: 'coach' },
    ];
    const offered = offerableAppointments(
      DANI,
      [{ fixtureId: 'fx-1' }, { fixtureId: 'fx-2' }],
      claims,
    );
    assert.deepEqual(
      offered.map((a) => a.fixtureId),
      ['fx-2'],
      'a refusal the official can see invites them to ask for an exception',
    );
  });

  it('offers everything when nothing collides', () => {
    assert.equal(offerableAppointments(DANI, [{ fixtureId: 'a' }, { fixtureId: 'b' }], []).length, 2);
  });
});
