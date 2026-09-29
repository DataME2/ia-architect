import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planWorkspaceInvites, type InviteCandidate, type InviteInput } from './workspace-invite-view.ts';

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

test('no email is reported, not silently skipped', () => {
  const plan = planWorkspaceInvites(input(15, { player: who('kid', null), authorityGuardians: [who('dad', '  ')] }));
  assert.deepEqual(plan.send, []);
  assert.deepEqual(plan.missingEmail.map((m) => m.kind), ['guardian', 'player']);
});
