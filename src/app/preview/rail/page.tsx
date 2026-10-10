import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { RegistrarRail } from '../../../components/ui/RegistrarRail.tsx';
import { RegistrarShell } from '../../../components/ui/RegistrarShell.tsx';
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
      <p className="lede">Sample content beside the rail.</p>
    </RegistrarShell>
  );
}
