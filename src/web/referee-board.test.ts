import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  appointmentAlerts,
  cellKey,
  gridFromWindows,
  ledger,
  parseCells,
  windowsFromGrid,
  type UpcomingAppointment,
} from './referee-board.ts';

const w = (weekday: number, fromTime: string | null, toTime: string | null) => ({ weekday, fromTime, toTime });

describe('the availability grid — BR174', () => {
  it('reads a whole day as every slot', () => {
    const { cells, custom } = gridFromWindows([w(6, null, null)]);
    assert.deepEqual([...cells].sort(), ['6:afternoon', '6:evening', '6:morning']);
    assert.equal(custom, false);
  });

  it('reads a slot-aligned window exactly, and flags one that is not', () => {
    assert.equal(gridFromWindows([w(0, '06:00:00', '12:00:00')]).custom, false);
    const odd = gridFromWindows([w(3, '09:00', '14:00')]);
    assert.deepEqual([...odd.cells].sort(), ['3:afternoon', '3:morning']);
    assert.equal(odd.custom, true);
  });

  it('merges adjacent slots and makes all three the whole day', () => {
    const cells = new Set([cellKey(6, 'morning'), cellKey(6, 'afternoon'), cellKey(6, 'evening'), cellKey(0, 'morning'), cellKey(0, 'afternoon'), cellKey(3, 'morning'), cellKey(3, 'evening')]);
    assert.deepEqual(windowsFromGrid(cells), [
      { weekday: 3, from_time: '06:00', to_time: '12:00' },
      { weekday: 3, from_time: '17:00', to_time: '22:00' },
      { weekday: 6, from_time: null, to_time: null },
      { weekday: 0, from_time: '06:00', to_time: '17:00' },
    ]);
  });

  it('round-trips a grid through its windows', () => {
    const cells = new Set([cellKey(2, 'evening'), cellKey(6, 'morning')]);
    const back = gridFromWindows(windowsFromGrid(cells).map((g) => w(g.weekday, g.from_time, g.to_time)));
    assert.deepEqual([...back.cells].sort(), [...cells].sort());
  });

  it('keeps only real cells from a submission, and refuses what is not a list', () => {
    assert.deepEqual([...parseCells('["6:morning","9:morning","6:night",3]')!], ['6:morning']);
    assert.equal(parseCells('{"a":1}'), null);
    assert.equal(parseCells('not json'), null);
  });
});

const appt = (id: string, playedOn: string, kickOff: string | null, state: UpcomingAppointment['state'] = 'accepted'): UpcomingAppointment => ({
  id,
  opponent: `Team ${id}`,
  playedOn,
  kickOff,
  role: 'referee',
  state,
});

// 2026-10-10 is a Saturday.
const saturdays = [w(6, null, null)];
const ctx = { today: '2026-10-09', credentials: [], windows: saturdays, away: [] };

describe('the conflict and card check', () => {
  it('is green with nothing against it', () => {
    const [a] = appointmentAlerts([appt('a', '2026-10-10', '09:00')], ctx);
    assert.equal(a!.tone, 'clear');
  });

  it('is red when away that day, or a card expires before the match', () => {
    const away = appointmentAlerts([appt('a', '2026-10-10', '09:00')], { ...ctx, away: [{ startsOn: '2026-10-10', endsOn: '2026-10-11' }] });
    assert.equal(away[0]!.tone, 'blocked');
    const expired = appointmentAlerts([appt('a', '2026-10-10', '09:00')], {
      ...ctx,
      credentials: [{ label: 'Clearance: Blue Card', expiresOn: '2026-10-09', sighted: true }],
    });
    assert.deepEqual(expired[0]!.reasons.map((r) => [r.rule, r.tone]), [['BR111', 'blocked']]);
  });

  it('is red for the same kick-off twice, amber for two close together (BR7)', () => {
    const same = appointmentAlerts([appt('a', '2026-10-10', '09:00'), appt('b', '2026-10-10', '09:00:00')], ctx);
    assert.equal(same[0]!.tone, 'blocked');
    const close = appointmentAlerts([appt('a', '2026-10-10', '09:00'), appt('b', '2026-10-10', '10:30')], ctx);
    assert.equal(close[0]!.tone, 'check');
    const apart = appointmentAlerts([appt('a', '2026-10-10', '08:00'), appt('b', '2026-10-10', '13:00')], ctx);
    assert.equal(apart[0]!.tone, 'clear');
  });

  it('is amber outside the declared week, with none declared, or with a card not sighted', () => {
    assert.equal(appointmentAlerts([appt('a', '2026-10-11', '09:00')], ctx)[0]!.tone, 'check'); // a Sunday
    assert.equal(appointmentAlerts([appt('a', '2026-10-10', '09:00')], { ...ctx, windows: [] })[0]!.tone, 'check');
    const unsighted = appointmentAlerts([appt('a', '2026-10-10', '09:00')], {
      ...ctx,
      credentials: [{ label: 'Accreditation: FQ Level 2', expiresOn: null, sighted: false }],
    });
    assert.equal(unsighted[0]!.reasons[0]!.rule, 'BR10');
  });

  it('leaves out past, declined and withdrawn appointments, and orders by date', () => {
    const alerts = appointmentAlerts(
      [appt('late', '2026-10-17', '09:00'), appt('past', '2026-10-03', '09:00'), appt('no', '2026-10-10', '09:00', 'declined'), appt('soon', '2026-10-10', '09:00', 'proposed')],
      ctx,
    );
    assert.deepEqual(alerts.map((a) => a.appointment.id), ['soon', 'late']);
  });
});

describe('the claims ledger', () => {
  const claim = (id: string, playedOn: string, state: 'raised' | 'approved' | 'rejected', batchId: string | null = null) => ({
    id,
    opponent: id,
    playedOn,
    amountCents: 4500,
    state,
    batchId,
  });

  it('names every standing and totals owed and paid', () => {
    const { lines, owed, paid } = ledger(
      [claim('raised', '2026-09-01', 'raised'), claim('ok', '2026-09-08', 'approved'), claim('run', '2026-09-15', 'approved', 'b1'), claim('paid', '2026-09-22', 'approved', 'b1'), claim('no', '2026-09-29', 'rejected')],
      new Map([['paid', { reference: 'SIM-AB12CD34EF', simulated: true }]]),
    );
    assert.deepEqual(lines.map((l) => [l.id, l.status]), [
      ['no', 'rejected'],
      ['paid', 'paid'],
      ['run', 'batched'],
      ['ok', 'approved'],
      ['raised', 'pending'],
    ]);
    assert.equal(lines[1]!.reference, 'SIM-AB12CD34EF');
    assert.equal(lines[1]!.label, 'Paid (simulated)');
    assert.equal(owed, '$135.00');
    assert.equal(paid, '$45.00');
  });
});
