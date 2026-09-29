import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  planWorkspaceInvites,
  workspaceRows,
  type InviteCandidate,
  type InviteInput,
  type WorkspaceHolder,
} from './workspace-invite-view.ts';

const who = (personId: string, email: string | null, alreadyInvited = false): InviteCandidate => ({
  personId, name: personId, email, alreadyInvited,
});

const input = (age: number, over: Partial<InviteInput> = {}): InviteInput => ({
  age,
  isPlayerThisSeason: true,
  registrationComplete: true,
  player: who('kid', 'kid@x.test'),
  authorityGuardians: [who('mum', 'mum@x.test')],
  ...over,
});

const sentTo = (i: InviteInput) => planWorkspaceInvites(i).send.map((r) => `${r.kind}:${r.personId}`);

test('under 13 — the guardian only (BR63)', () => {
  assert.deepEqual(sentTo(input(11)), ['guardian:mum']);
});

test('13 to 17 — the guardian and the player', () => {
  assert.deepEqual(sentTo(input(15)), ['guardian:mum', 'player:kid']);
});

test('18 and over — the player only', () => {
  assert.deepEqual(sentTo(input(19)), ['player:kid']);
});

test('nothing is sent until the player is PLAYER this season and COMPLETE', () => {
  assert.deepEqual(sentTo(input(15, { isPlayerThisSeason: false })), []);
  assert.deepEqual(sentTo(input(15, { registrationComplete: false })), []);
});

test('an existing invitation is not sent again', () => {
  assert.deepEqual(sentTo(input(15, { player: who('kid', 'kid@x.test', true) })), ['guardian:mum']);
});

test('a guardian without authority is not invited', () => {
  // is_authority is filtered by the caller; an empty list is the result.
  assert.deepEqual(sentTo(input(10, { authorityGuardians: [] })), []);
  assert.equal(planWorkspaceInvites(input(10, { authorityGuardians: [] })).noGuardian, true);
});

test('workspaceRows — who is listed follows the same ages as who is sent', () => {
  const h = (personId: string, over: Partial<WorkspaceHolder> = {}): WorkspaceHolder => ({
    personId, name: personId, email: `${personId}@x.test`, invited: false, claimed: false, linkLost: false, ...over,
  });
  const rows = (age: number, complete: boolean, player = h('kid'), guardians = [h('mum')]) =>
    workspaceRows({ age, registrationComplete: complete, player, authorityGuardians: guardians })
      .map((r) => `${r.kind}:${r.personId}:${r.state}`);

  assert.deepEqual(rows(11, true), ['guardian:mum:not-sent'], 'under 13: guardian only');
  assert.deepEqual(rows(19, true), ['player:kid:not-sent'], '18+: player only');
  assert.deepEqual(rows(13, false), ['guardian:mum:waiting-complete', 'player:kid:waiting-complete']);
  assert.deepEqual(
    rows(15, true, h('kid', { email: null }), [h('mum', { invited: true }), h('dad', { invited: true, claimed: true })]),
    ['guardian:mum:link-sent', 'guardian:dad:active', 'player:kid:no-email'],
  );
  // The case that locked a guardian out: claimed once, login since unlinked.
  // It must never read as active.
  assert.deepEqual(
    rows(11, true, h('kid'), [h('mum', { invited: true, linkLost: true })]),
    ['guardian:mum:unlinked'],
  );
});

test('no email is reported, not silently skipped', () => {
  const plan = planWorkspaceInvites(input(15, { player: who('kid', null), authorityGuardians: [who('dad', '  ')] }));
  assert.deepEqual(plan.send, []);
  assert.deepEqual(plan.missingEmail.map((m) => m.kind), ['guardian', 'player']);
});
