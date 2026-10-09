import { notFound } from 'next/navigation';

import { AppointmentAlerts } from '../../../components/ui/AppointmentAlerts.tsx';
import { AvailabilityGrid, type AvailabilityGridResult } from '../../../components/ui/AvailabilityGrid.tsx';
import { ClaimsLedger } from '../../../components/ui/ClaimsLedger.tsx';
import { roleLabel } from '../../../web/designation-answer.ts';
import { shortDate } from '../../../web/me-view.ts';
import {
  GRID_DAYS,
  SLOTS,
  appointmentAlerts,
  gridFromWindows,
  ledger,
  type Credential,
  type LedgerClaim,
  type UpcomingAppointment,
} from '../../../web/referee-board.ts';
import { Panel, WorkspaceHead } from '../../me/_workspaces/shared.tsx';

/**
 * A design preview of the match official board (scope 90), on sample data.
 *
 * **Development only**: a production build answers 404. The fixtures have the
 * shapes the real loaders return (`loadFamilyDesignations`,
 * `loadOwnCredentials`, `loadDeclaredAvailability`, `loadSettleableClaims`,
 * `loadPayouts`) and go through the same decisions, so this is what an
 * official sees without signing in as one. Saving the grid here saves
 * nothing.
 */

const TODAY = '2026-10-09';

const APPOINTMENTS: readonly UpcomingAppointment[] = [
  { id: 'a1', opponent: 'Souths United', playedOn: '2026-10-10', kickOff: '09:00:00', role: 'referee', state: 'accepted' },
  { id: 'a2', opponent: 'Eastern Lions', playedOn: '2026-10-10', kickOff: '10:30:00', role: 'assistant_referee', state: 'proposed' },
  { id: 'a3', opponent: 'Bayside Rovers', playedOn: '2026-10-12', kickOff: '15:00:00', role: 'referee', state: 'accepted' },
  { id: 'a4', opponent: 'Westside FC', playedOn: '2026-10-25', kickOff: '08:30:00', role: 'referee', state: 'proposed' },
  { id: 'a5', opponent: 'Northern Stars', playedOn: '2026-11-07', kickOff: '09:00:00', role: 'referee', state: 'accepted' },
];

const CREDENTIALS: readonly Credential[] = [
  { label: 'Accreditation: FQ Level 2', expiresOn: '2027-03-01', sighted: true },
  { label: 'Clearance: Blue Card', expiresOn: '2026-11-01', sighted: true },
];

const WINDOWS = [
  { weekday: 6, fromTime: null, toTime: null },
  { weekday: 0, fromTime: '06:00:00', toTime: '12:00:00' },
];

const AWAY = [{ startsOn: '2026-10-24', endsOn: '2026-10-26' }];

const CLAIMS: readonly LedgerClaim[] = [
  { id: 'c1', opponent: 'Riverside', playedOn: '2026-10-04', amountCents: 4500, state: 'raised', batchId: null },
  { id: 'c2', opponent: 'Hilltop', playedOn: '2026-09-27', amountCents: 4500, state: 'approved', batchId: 'b2' },
  { id: 'c3', opponent: 'Lakeside', playedOn: '2026-09-20', amountCents: 6000, state: 'approved', batchId: 'b1' },
  { id: 'c4', opponent: 'Coastal', playedOn: '2026-09-13', amountCents: 4500, state: 'rejected', batchId: null },
];
const PAYOUTS = new Map([['c3', { reference: 'SIM-7F3A91C2D0', simulated: true }]]);

async function previewSave(_previous: AvailabilityGridResult, _formData: FormData): Promise<AvailabilityGridResult> {
  'use server';
  return { status: 'ok', message: 'Preview only: nothing was saved.' };
}

export default function RefereePreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  const grid = gridFromWindows(WINDOWS);
  const alerts = appointmentAlerts(APPOINTMENTS, { today: TODAY, credentials: CREDENTIALS, windows: WINDOWS, away: AWAY });
  const owed = ledger(CLAIMS, PAYOUTS);
  return (
    <main className="work-body" id="main" style={{ padding: 'var(--space-5)' }}>
      <p className="hint" style={{ marginTop: 0 }}>
        Design preview on sample data (development only). Today is {TODAY} here.
      </p>
      <WorkspaceHead title="Your match official board">Sample official, North Star FC.</WorkspaceHead>
      <div className="cols">
        <div className="stack">
          <Panel title="Your week" meta="2026">
            <AvailabilityGrid
              days={GRID_DAYS}
              slots={SLOTS}
              initialCells={[...grid.cells]}
              custom={grid.custom}
              fields={{ clubId: 'preview' }}
              action={previewSave}
            />
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Conflict and card check" meta={`${alerts.length} UPCOMING`}>
            <AppointmentAlerts
              items={alerts.map((a) => ({
                id: a.appointment.id,
                title: `vs ${a.appointment.opponent}`,
                when: [
                  shortDate(a.appointment.playedOn),
                  a.appointment.kickOff?.slice(0, 5) ?? 'time to be set',
                  roleLabel(a.appointment.role),
                  a.appointment.state === 'proposed' ? 'offered' : 'accepted',
                ].join(' · '),
                tone: a.tone,
                reasons: a.reasons,
              }))}
            />
          </Panel>
          <Panel title="Owed to you" meta={`${CLAIMS.length} CLAIMS`}>
            <ClaimsLedger lines={owed.lines} owed={owed.owed} paid={owed.paid} />
          </Panel>
        </div>
      </div>
    </main>
  );
}
