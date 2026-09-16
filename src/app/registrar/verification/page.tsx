import { redirect } from 'next/navigation';

import { loadVerifiable } from '../../../data/claims.ts';
import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { needsVerification } from '../../../web/claim-view.ts';
import { VerificationRow } from './VerificationForm.tsx';

export const dynamic = 'force-dynamic';

/**
 * Did the match happen the way the appointment said it would (BR13,
 * BR17, BR18, BR119)?
 *
 * A separate act from raising a claim, and deliberately: BR119 keeps the
 * person who watched the match apart from the person who is paid, so
 * verification cannot be folded into the same form a claim is raised
 * from without inviting exactly that.
 */
export default async function VerificationPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar%2Fverification');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  const mayVerify = tenant.roles.some((r) => ['admin', 'registrar', 'coordinator'].includes(r));
  if (!mayVerify) {
    return (
      <>
        <h2>Verify a match</h2>
        <p className="notice">
          <strong>Only an administrator, registrar or coordinator can see this.</strong> You are
          signed in as {tenant.roles.join(', ')} at {tenant.clubName}.
        </p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0];

  if (season === undefined) {
    return (
      <>
        <h2>Verify a match</h2>
        <p className="lede">This club has no season yet.</p>
      </>
    );
  }

  const appointments = await loadVerifiable(client, tenant.clubId, season.id, user.id);
  const waiting = needsVerification(appointments);

  return (
    <>
      <h2>Verify a match</h2>
      <p className="lede">
        Confirm what actually happened, before a claim can be raised for it. A claim needs this
        first (BR13) &mdash; and the person being paid is never the one who confirms it.
      </p>

      {waiting.length === 0 ? (
        <p className="hint">Nothing is waiting to be verified.</p>
      ) : (
        <div className="stack">
          {waiting.map((a) => (
            <div className="card" key={a.appointmentId}>
              <VerificationRow appointment={a} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
