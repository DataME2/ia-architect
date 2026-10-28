import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { initialConditions, SEASON_PATHS, walkPath, type Conditions } from './season-paths.ts';

const path = (id: string) => {
  const found = SEASON_PATHS.find((p) => p.id === id);
  if (found === undefined) throw new Error(id);
  return found;
};
const walk = (id: string, changes: Conditions = {}) =>
  walkPath(path(id), { ...initialConditions(path(id)), ...changes });

describe('Season paths — scope 117', () => {
  it('every path ends well under its starting conditions', () => {
    for (const p of SEASON_PATHS) {
      assert.equal(walkPath(p, initialConditions(p)).outcome.tone, 'ok', p.id);
    }
  });

  it('stops a registration without a guardian at the form, and greys out what follows (BR1)', () => {
    const w = walk('register', { guardian: false });
    assert.equal(w.outcome.state, 'Stopped');
    const stopAt = w.steps.findIndex((s) => s.stop !== null);
    assert.equal(w.steps[stopAt]?.step.title, 'The family fills in the form');
    assert.ok(w.steps.slice(stopAt + 1).every((s) => s.after && s.status === null));
  });

  it('lists every hold-up a registration is waiting on, first one leading', () => {
    const w = walk('register', { docs: false, paid: false });
    assert.equal(w.outcome.tone, 'warn');
    assert.equal(w.outcome.state, 'Pending documents');
    assert.match(w.outcome.text, /Pending documents, Pending payment/);
  });

  it('shows a conditional step only when its condition holds', () => {
    const titles = (id: string, c: Conditions) => walk(id, c).steps.map((s) => s.step.title);
    assert.ok(!titles('register', {}).includes('International clearance'));
    assert.ok(titles('register', { overseas: true }).includes('International clearance'));
  });

  it('explains the QA Test Pass at path 1, step 1 (BR190)', () => {
    const first = walk('register').steps[0];
    assert.equal(first?.number, 1);
    assert.match(first?.step.aside?.text ?? '', /QA Test Pass/);
    assert.equal(first?.step.aside?.href, '/interest');
  });

  it('never offers a blocked referee, and only warns for the same club (BR11)', () => {
    assert.equal(walk('designate', { suspended: true }).outcome.state, 'Not offered');
    assert.equal(walk('designate', { sameClub: true }).outcome.state, 'Covered, with a warning');
    // BR19 reads adults only: a referee under 18 is not blocked for a WWCC.
    assert.equal(walk('designate', { nowwcc: true, minor: true }).outcome.tone, 'ok');
  });

  it('never pays a cancelled match, nor one its referee verified (BR17, BR119)', () => {
    assert.equal(walk('payment', { status: 'cancelled' }).outcome.state, 'No claim');
    assert.equal(walk('payment', { selfVerify: true }).outcome.state, 'Waiting for verification');
    assert.equal(walk('payment', { status: 'abandoned' }).outcome.tone, 'warn');
    assert.equal(walk('payment', { status: 'abandoned', explained: true }).outcome.state, 'Paid');
  });

  it('links only to screens that exist', async () => {
    const { existsSync } = await import('node:fs');
    for (const p of SEASON_PATHS) {
      for (const s of p.steps.filter((x) => x.linkable)) {
        assert.ok(existsSync(new URL(`../app${s.route}/page.tsx`, import.meta.url)), s.route);
      }
    }
  });
});
