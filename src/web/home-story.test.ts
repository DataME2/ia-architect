import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  CONNECTIONS,
  HERO_TABS,
  PEOPLE,
  ROLE_VIEWS,
  TRUST,
  WALK_STEPS,
  alsoHolds,
  citedRules,
  indexAfterKey,
  nextStep,
  previousStep,
  roleView,
  rolesHeldBy,
  type PersonId,
} from './home-story.ts';

const rulesTable = readFileSync(
  new URL('../../docs/ea/2_business/5_domain-context-and-rules.md', import.meta.url),
  'utf8',
);

const everyText = (): string[] => [
  ...HERO_TABS.flatMap((t) => [t.heading, ...t.rows.flatMap((r) => [r.label, r.status.word])]),
  ...ROLE_VIEWS.flatMap((v) => [v.problem, v.boundary, ...v.rows.flatMap((r) => [r.label, r.status.word])]),
  ...WALK_STEPS.flatMap((s) => [s.title, s.next, s.human ?? '', ...s.involves, ...s.checks.map((c) => c.text)]),
  ...CONNECTIONS.flatMap((c) => [c.when, c.then]),
  ...TRUST.map((t) => t.text),
];

describe('the front door (scope 118)', () => {
  it('cites only rules that are rows in the business rules table', () => {
    const cited = citedRules();
    assert.ok(cited.length > 10, 'the page should lean on the rules it describes');
    for (const br of cited) assert.match(rulesTable, new RegExp(`^\\| ${br} \\|`, 'm'), br);
  });

  it('names only screens that exist', () => {
    for (const v of ROLE_VIEWS) {
      for (const route of v.screen.routes) {
        assert.ok(existsSync(new URL(`../app${route}/page.tsx`, import.meta.url)), route);
      }
    }
  });

  it('shows every status as a word, and no amount of money anywhere (BR78)', () => {
    const rows = [...HERO_TABS.flatMap((t) => t.rows), ...ROLE_VIEWS.flatMap((v) => v.rows)];
    for (const r of rows) assert.ok(r.status.word.trim(), r.label);
    for (const s of WALK_STEPS) assert.ok(s.status.word.trim(), s.id);
    for (const text of everyText()) assert.doesNotMatch(text, /[$€£]\s?\d|\d+\.\d{2}\b/, text);
  });

  it('gives nobody every role, and one person several (P1, BR61)', () => {
    const counts = (Object.keys(PEOPLE) as PersonId[]).map((p) => rolesHeldBy(p).length);
    for (const n of counts) assert.ok(n >= 1 && n < ROLE_VIEWS.length);
    assert.ok(Math.max(...counts) >= 3, 'the shared identity needs one person in three roles');
  });

  it('lists the other roles of whoever holds a role, and never the role itself', () => {
    assert.deepEqual(alsoHolds('treasurer').map((r) => r.id), ['coach', 'guardian']);
    assert.deepEqual(alsoHolds('registrar'), []);
    for (const v of ROLE_VIEWS) assert.ok(!alsoHolds(v.id).some((r) => r.id === v.id));
    assert.equal(roleView('nobody').id, ROLE_VIEWS[0]?.id);
  });

  it('moves between tabs with arrows that wrap, and Home and End', () => {
    const n = ROLE_VIEWS.length;
    assert.equal(indexAfterKey(0, 'ArrowRight', n), 1);
    assert.equal(indexAfterKey(n - 1, 'ArrowDown', n), 0);
    assert.equal(indexAfterKey(0, 'ArrowLeft', n), n - 1);
    assert.equal(indexAfterKey(3, 'Home', n), 0);
    assert.equal(indexAfterKey(3, 'End', n), n - 1);
    assert.equal(indexAfterKey(3, 'a', n), 3);
  });

  it('walks the registration forward and back without running off either end', () => {
    const last = WALK_STEPS.length - 1;
    assert.equal(nextStep(0), 1);
    assert.equal(nextStep(last), last);
    assert.equal(previousStep(0), 0);
    assert.equal(previousStep(2), 1);
  });

  it('ends the walkthrough complete only once Squadi confirms (BR43, BR60)', () => {
    const last = WALK_STEPS[WALK_STEPS.length - 1];
    assert.equal(last?.status.word, 'Complete');
    assert.ok(last?.checks.some((c) => c.br === 'BR60'));
    for (const s of WALK_STEPS.slice(0, -1)) assert.notEqual(s.status.word, 'Complete', s.id);
  });
});
