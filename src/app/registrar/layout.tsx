import { redirect } from 'next/navigation';
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

  // Somebody who arrived on an emailed link has no password yet, and would
  // discover that the next time they tried to sign in — by which point the
  // only way back is another link from the platform owner. Made unavoidable
  // here rather than suggested, because a prompt somebody can walk past is
  // a prompt that gets walked past.
  if (user !== null) {
    const { data: needsPassword } = await client.rpc('app_needs_password');
    if (needsPassword === true) redirect('/set-password');
  }

  const tenant = user === null ? null : await loadTenantContext(client, user.id);
  const demo = tenant !== null && isDemoClub(tenant.clubName);

  // Only asked when there is no club to show, which is the only case where
  // the answer changes anything — and the case the platform identity is
  // always in.
  let platform = false;
  if (user !== null && tenant === null) {
    const { data } = await client.rpc('app_is_platform');
    platform = data === true;
  }

  return (
    <>
      {demo && (
        <p className="demo-banner" role="status">
          <strong>Demonstration club.</strong> Every person, payment and card below is
          fictional. This is a real tenant with the real rules — nothing here is a mock-up —
          but nothing here is a real child.
        </p>
      )}
      <SessionStrip user={user} tenant={tenant} demo={demo} platform={platform} />
      {user !== null && tenant !== null && (
        <Suspense fallback={null}>
          <RegistrarNav />
        </Suspense>
      )}
      {children}
    </>
  );
}
