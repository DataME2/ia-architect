import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lineUp, playerStatus, shortName, type DugoutPlayer, type Position } from './dugout.ts';

let seq = 0;
function p(preferred: Position | null, over: Partial<DugoutPlayer> = {}): DugoutPlayer {
  seq += 1;
  return {
    id: `p${seq}`,
    name: `Player ${seq}`,
    shortName: `P${seq}`,
    number: seq,
    preferred,
    secondary: null,
    status: 'clear',
    availability: null,
    ...over,
  };
}

describe('the Team Dugout (scope 99)', () => {
  it('a registration reads as its verdict, never an amount (BR78, BR79)', () => {
    assert.equal(playerStatus(null), 'unregistered');
    assert.equal(playerStatus({ status: 'COMPLETE', owes: true, hardshipUntil: null }), 'not-clear');
    assert.equal(playerStatus({ status: 'COMPLETE', owes: true, hardshipUntil: '2026-12-31' }), 'clear');
    assert.equal(playerStatus({ status: 'BLOCKED', owes: false, hardshipUntil: null }), 'awaiting');
    assert.equal(playerStatus({ status: 'COMPLETE', owes: false, hardshipUntil: null }), 'clear');
    // An earlier season's unpaid debt stops play too (BR79 amended, scope 92).
    assert.equal(playerStatus({ status: 'COMPLETE', owes: false, hardshipUntil: null, owesEarlier: true }), 'not-clear');
  });

  it('fits a name on a shirt', () => {
    assert.equal(shortName('Riley', 'striker'), 'Riley S.');
    assert.equal(shortName('Mo', ''), 'Mo');
  });

  it('puts specialists where they play and fills a 4-3-3 from eleven fit players', () => {
    const squad = [p('goalkeeper'), ...Array.from({ length: 4 }, () => p('defender')), ...Array.from({ length: 3 }, () => p('midfielder')), ...Array.from({ length: 3 }, () => p('forward'))];
    const { slots, bench } = lineUp(squad, '4-3-3');
    assert.equal(slots.length, 11);
    assert.ok(slots.every((s) => s.player !== null));
    assert.ok(slots.every((s) => s.player!.preferred === s.line));
    assert.equal(bench.length, 0);
  });

  it('switching to 4-4-2 moves a forward into midfield rather than leaving a hole', () => {
    const squad = [p('goalkeeper'), ...Array.from({ length: 4 }, () => p('defender')), ...Array.from({ length: 3 }, () => p('midfielder')), ...Array.from({ length: 3 }, () => p('forward'))];
    const { slots } = lineUp(squad, '4-4-2');
    assert.ok(slots.every((s) => s.player !== null));
    assert.equal(slots.filter((s) => s.line === 'midfielder').length, 4);
  });

  it('never starts a player who cannot take the field, and says why on the bench', () => {
    const owes = p('forward', { status: 'not-clear' });
    const away = p('forward', { availability: 'not_available' });
    const unregistered = p('midfielder', { status: 'unregistered' });
    const { slots, bench } = lineUp([p('goalkeeper'), owes, away, unregistered], '4-3-3');
    const starting = new Set(slots.flatMap((s) => (s.player === null ? [] : [s.player.id])));
    assert.ok(!starting.has(owes.id) && !starting.has(away.id) && !starting.has(unregistered.id));
    assert.deepEqual(
      bench.map((b) => b.reason),
      ['Not clear to play', 'Not available this week', 'Not registered'],
    );
  });

  it('leaves the goal open rather than putting an outfield player in it', () => {
    const { slots } = lineUp([p('forward'), p('defender')], '4-3-3');
    assert.equal(slots.find((s) => s.line === 'goalkeeper')!.player, null);
  });

  it('a fit substitute sits on the bench with no reason, ahead of those who cannot play', () => {
    const squad = [p('goalkeeper'), p('goalkeeper'), p('forward', { status: 'awaiting' })];
    const { bench } = lineUp(squad, '4-3-3');
    assert.deepEqual(bench.map((b) => b.reason), [null, 'Registration incomplete']);
  });
});
