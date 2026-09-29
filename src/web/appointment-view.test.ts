import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  FUNCTION_KINDS,
  FUNCTION_LABEL,
  accessFor,
  accessState,
  appointmentsByPerson,
  explainRole,
  isCurrentFunction,
  isFunctionKind,
  type AccessMapEntry,
  type AccessSource,
  type AppointmentAccess,
  type FunctionAppointment,
} from './appointment-view.ts';

const map: AccessMapEntry[] = [
  { source: 'office', value: 'president', accessRole: 'admin' },
  { source: 'function', value: 'it_manager', accessRole: 'digital_technology_manager' },
];

test('accessFor reads the mapping, and says nothing it does not hold', () => {
  assert.equal(accessFor(map, 'office', 'president'), 'admin');
  assert.equal(accessFor(map, 'function', 'it_manager'), 'digital_technology_manager');
  // A function named like an office is a different thing.
  assert.equal(accessFor(map, 'function', 'president'), null);
});

test('every function has a label, and only listed kinds are functions', () => {
  for (const kind of FUNCTION_KINDS) assert.ok(FUNCTION_LABEL[kind].length > 0, kind);
  assert.equal(isFunctionKind('it_manager'), true);
  assert.equal(isFunctionKind('president'), false);
});

test('isCurrentFunction — the end date is the last day held', () => {
  const f = (startsOn: string, endsOn: string | null): FunctionAppointment => ({
    id: 'f', personId: 'p', kind: 'coach', startsOn, endsOn,
  });
  assert.equal(isCurrentFunction(f('2026-01-01', null), '2026-09-29'), true);
  assert.equal(isCurrentFunction(f('2026-10-01', null), '2026-09-29'), false, 'not started');
  assert.equal(isCurrentFunction(f('2026-01-01', '2026-09-29'), '2026-09-29'), true, 'last day');
  assert.equal(isCurrentFunction(f('2026-01-01', '2026-09-28'), '2026-09-29'), false, 'ended');
});

test('appointmentsByPerson — only what they hold today', () => {
  const offices = [
    { personId: 'p1', termId: 't-now', label: 'President', resignedOn: null },
    { personId: 'p1', termId: 't-old', label: 'Treasurer', resignedOn: null },
    { personId: 'p2', termId: 't-now', label: 'Secretary', resignedOn: '2026-08-01' },
  ];
  const functions: FunctionAppointment[] = [
    { id: 'f1', personId: 'p1', kind: 'it_manager', startsOn: '2026-01-01', endsOn: null },
    { id: 'f2', personId: 'p2', kind: 'coach', startsOn: '2025-01-01', endsOn: '2025-12-31' },
  ];
  const by = appointmentsByPerson(offices, 't-now', functions, '2026-09-29');
  assert.deepEqual(by.get('p1'), ['President', 'IT Manager'], 'last term’s office is not held now');
  assert.equal(by.has('p2'), false, 'a resignation and an ended function both leave nothing');
});

test('accessState', async (t) => {
  const row = (claimed: boolean): AppointmentAccess => ({
    id: 'a', personId: 'p', email: 'x@club.test', accessRole: 'treasurer',
    committeePositionId: 'c', functionAppointmentId: null,
    confirmedAt: '2026-09-20T01:00:00Z',
    claimedUserId: claimed ? 'u' : null,
    claimedAt: claimed ? '2026-09-21T01:00:00Z' : null,
  });

  await t.test('nothing confirmed yet', () => {
    assert.deepEqual(accessState(undefined), { kind: 'not-confirmed' });
  });
  await t.test('confirmed, not yet arrived: the link and where it went', () => {
    assert.deepEqual(accessState(row(false)), { kind: 'link-sent', to: 'x@club.test', on: '2026-09-20' });
  });
  await t.test('arrived', () => {
    assert.deepEqual(accessState(row(true)), { kind: 'active', since: '2026-09-21' });
  });
});

test('explainRole', async (t) => {
  const sources: AccessSource[] = [
    { accessRole: 'treasurer', claimedUserId: 'u1', label: 'Treasurer · 2025–26', ended: true },
    { accessRole: 'admin', claimedUserId: 'u1', label: 'President · 2026–27', ended: false },
    { accessRole: 'admin', claimedUserId: 'u2', label: 'Vice-president · 2026–27', ended: false },
  ];

  await t.test('access nobody appointed was granted by hand', () => {
    assert.deepEqual(explainRole('u1', 'registrar', sources), { kind: 'granted-by-hand' });
  });
  await t.test('names the appointment behind an access', () => {
    assert.deepEqual(explainRole('u1', 'admin', sources), {
      kind: 'appointment', labels: ['President · 2026–27'], allEnded: false,
    });
  });
  await t.test('BR154 — access kept after its appointment ended is flagged, not removed', () => {
    const r = explainRole('u1', 'treasurer', sources);
    assert.equal(r.kind === 'appointment' && r.allEnded, true);
  });
  await t.test('another account’s appointment explains nothing about this one', () => {
    assert.deepEqual(explainRole('u2', 'treasurer', sources), { kind: 'granted-by-hand' });
  });
});
