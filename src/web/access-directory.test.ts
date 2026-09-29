import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildDirectory, filterDirectory, workspaceSummary } from './access-directory.ts';
import type { ClubAccount } from './access-view.ts';
import type { AccessSource } from './appointment-view.ts';
import type { WorkspaceRow } from './workspace-invite-view.ts';

const account = (userId: string, roles: string[], personId: string | null, name: string | null): ClubAccount => ({
  userId, email: `${userId}@club.test`, roles, grantedAt: '2026-01-01T00:00:00Z', isSelf: false,
  personId, legalName: name, preferredName: null,
});

const ws = (personId: string, name: string, kind: WorkspaceRow['kind'], state: WorkspaceRow['state']): WorkspaceRow => ({
  kind, personId, name, email: `${personId}@home.test`, state,
});

const accounts = [
  account('u-karen', ['treasurer'], 'p-karen', 'Karen Alfonso'),
  account('u-loose', ['registrar'], null, null),
];
const workspaces = [
  { playerName: 'Santiago', rows: [ws('p-karen', 'Karen Alfonso', 'guardian', 'active')] },
  { playerName: 'Sebastian', rows: [ws('p-karen', 'Karen Alfonso', 'guardian', 'active')] },
  { playerName: 'Ana', rows: [ws('p-ana', 'Ana Silva', 'player', 'no-email')] },
];
const sources: AccessSource[] = [
  { accessRole: 'treasurer', claimedUserId: 'u-karen', label: 'Treasurer · 2025–26', ended: true },
];

test('one row per person — staff access and workspaces merge (P1)', () => {
  const d = buildDirectory(accounts, workspaces, sources);
  const karen = d.find((e) => e.key === 'p-karen')!;
  assert.deepEqual(karen.staff.map((s) => s.label), ['Treasurer']);
  assert.deepEqual(karen.workspaces.map((w) => w.forPlayer), ['Santiago', 'Sebastian']);
  assert.equal(d.filter((e) => e.name === 'Karen Alfonso').length, 1);
});

test('an unlinked account is its own row, and needs attention', () => {
  const d = buildDirectory(accounts, workspaces, sources);
  const loose = d.find((e) => e.key === 'account:u-loose')!;
  assert.equal(loose.name, 'u-loose@club.test');
  assert.deepEqual(loose.attention, ['Account not linked to a person']);
});

test('attention: an ended appointment and a missing email are both surfaced', () => {
  const d = buildDirectory(accounts, workspaces, sources);
  assert.deepEqual(d.find((e) => e.key === 'p-karen')!.attention, ['Treasurer: appointment has ended']);
  assert.deepEqual(d.find((e) => e.key === 'p-ana')!.attention, ['No email on record']);
});

test('a login linked to a child under 13 is flagged (BR63)', () => {
  const d = buildDirectory(accounts, workspaces, sources, new Set(['p-karen']));
  assert.match(d.find((e) => e.key === 'p-karen')!.attention[0]!, /child under 13/);
});

test('filterDirectory — chips and search combine', () => {
  const d = buildDirectory(accounts, workspaces, sources);
  assert.deepEqual(filterDirectory(d, '', 'workspace').map((e) => e.key).sort(), ['p-ana', 'p-karen']);
  assert.deepEqual(filterDirectory(d, '', 'staff').map((e) => e.key).sort(), ['account:u-loose', 'p-karen']);
  assert.deepEqual(filterDirectory(d, 'KAREN', 'all').map((e) => e.key), ['p-karen']);
  assert.deepEqual(filterDirectory(d, 'home.test', 'all').map((e) => e.key), ['p-ana'], 'searches email too');
  assert.equal(filterDirectory(d, '', 'attention').length, 3);
});

test('workspaceSummary names the children, not the rows', () => {
  assert.equal(
    workspaceSummary([
      { kind: 'guardian', forPlayer: 'Santiago', state: 'active' },
      { kind: 'guardian', forPlayer: 'Sebastian', state: 'active' },
    ]),
    'Guardian of Santiago, Sebastian',
  );
  assert.equal(workspaceSummary([{ kind: 'player', forPlayer: 'Ana', state: 'active' }]), 'Player');
});
