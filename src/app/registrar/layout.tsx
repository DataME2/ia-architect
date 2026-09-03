import { Suspense, type ReactNode } from 'react';

import { loadTenantContext } from '../../data/queries.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { isDemoClub } from '../../web/nav.ts';
import { RegistrarNav } from './_components/RegistrarNav.tsx';
import { SessionStrip } from './_components/SessionStrip.tsx';

/**
 * Wraps the club-facing screens so every one of them says who you are, which
 * club you are in, and where you are.
 *
 * Deliberately **not** the root layout. Putting a session lookup there would
 * make the landing page and the public registration link dynamic, and the
 * join page in particular is built to show nothing at all to someone who is
 * not signed in — adding an auth call to its render would be the wrong
 * shape even though it would leak nothing.
 */
export default async function RegistrarLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  const tenant = user === null ? null : await loadTenantContext(client, user.id);
  const demo = tenant !== null && isDemoClub(tenant.clubName);

  return (
    <>
      {demo && (
        <p className="demo-banner" role="status">
          <strong>Demonstration club.</strong> Every person, payment and card below is
          fictional. This is a real tenant with the real rules — nothing here is a mock-up —
          but nothing here is a real child.
        </p>
      )}
      <SessionStrip user={user} tenant={tenant} demo={demo} />
      {user !== null && tenant !== null && (
        <Suspense fallback={null}>
          <RegistrarNav />
        </Suspense>
      )}
      {children}
    </>
  );
}
