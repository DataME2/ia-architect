import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { RegistrarRail } from '../../../components/ui/RegistrarRail.tsx';
import { RegistrarShell } from '../../../components/ui/RegistrarShell.tsx';
import { Marker, MetricTile, NameWithAvatar, QueueTable } from '../../../components/ui/QueueTable.tsx';
import { RegistrarNav } from '../../registrar/_components/RegistrarNav.tsx';

/** The club screens' rail on sample data, for a reviewer with no club (development only). */
export default function RailPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <RegistrarShell
      railPosition="left"
      nav={
        <RegistrarRail
          clubName="North Star FC"
          roles={['Registrar', 'Treasurer']}
          personName="Casey Vale"
          switchHref="/me"
          nav={
            <Suspense fallback={null}>
              <RegistrarNav />
            </Suspense>
          }
        />
      }
    >
      <h2>Keep the season moving.</h2>
      <div className="grid gap-ds-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ marginBottom: 'var(--space-5)' }}>
        <MetricTile icon="people" label="Registrations" value="48" />
        <MetricTile icon="alert" label="Need action" value="9" chip={{ tone: 'pending', text: 'Waiting' }} />
        <MetricTile icon="send" label="Sent, not yet registered" value="6" />
        <MetricTile icon="coins" label="Owed by 5 families" value="$1,240.00" chip={{ tone: 'stop', text: 'Blocking play' }} />
      </div>
      <QueueTable
        title="Document and identity blockers"
        columns={['Player', 'Registration state', 'Play eligibility', 'Blocking check', 'Next action']}
        rows={[{ key: 'm', cells: [<NameWithAvatar key="n" name="Mia Rodriguez" detail="Mia Isabel Rodriguez" href="#" />, <Marker key="s" tone="pending">Awaiting documents</Marker>, <Marker key="e" tone="stop">Cannot be selected</Marker>, 'BR2 · proof of age missing', 'Open checklist'] }]}
        empty="Nothing is blocked."
      />
    </RegistrarShell>
  );
}
