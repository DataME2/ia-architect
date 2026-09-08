import { redirect } from 'next/navigation';

import { loadLinkCandidates, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import type { ClubAccount } from '../../../web/access-view.ts';
import { AccessForms } from './AccessForms.tsx';

export const dynamic = 'force-dynamic';

/**
 * Who may act at this club, and in what capacity.
 *
 * Until this screen existed, granting a registrar meant emailing the
 * platform owner, who ran `insert into club_membership` by hand against
 * production. The policy always allowed an admin to do it
 * (`club_membership_manage`); there was simply nowhere to do it from.
 *
 * Admin only, and the database says so too: every function this page calls
 * derives the club from the caller's own admin membership and refuses
 * anyone else, so the guard below is a courtesy rather than the control.
 */
export default async function AccessPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar%2Faccess');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  if (!tenant.roles.includes('admin')) {
    return (
      <>
        <h2>Who has access</h2>
        <p className="notice">
          <strong>Only a club administrator can see or change this.</strong> You are signed in
          as {tenant.roles.join(', ')} at {tenant.clubName}. Ask an administrator if you need
          somebody added.
        </p>
      </>
    );
  }

  const { data, error } = await client.rpc('app_club_accounts');
  if (error !== null) {
    return (
      <>
        <h2>Who has access</h2>
        <div className="errors">
          <strong>Could not read the access list: {error.message}</strong>
        </div>
      </>
    );
  }

  const accounts: ClubAccount[] = (data ?? []).map(
    (row: {
      user_id: string;
      email: string;
      roles: string[];
      granted_at: string;
      is_self: boolean;
      person_id: string | null;
      legal_name: string | null;
      preferred_name: string | null;
    }) => ({
      userId: row.user_id,
      email: row.email,
      roles: row.roles,
      grantedAt: row.granted_at,
      isSelf: row.is_self,
      personId: row.person_id,
      legalName: row.legal_name,
      preferredName: row.preferred_name,
    }),
  );

  const candidates = await loadLinkCandidates(client, tenant.clubId);

  return (
    <>
      <h2>Who has access to {tenant.clubName}</h2>
      <p className="lede">
        An account here can sign in and act at this club. Roles are additive &mdash; one person
        is routinely both registrar and treasurer, and holds a row for each.
      </p>
      <p className="hint">
        <strong>Saying who an account belongs to is a decision you make, not one the system
        guesses.</strong> Two families share an inbox and a club address outlives three
        secretaries, so matching email addresses would quietly get this wrong &mdash; an account
        stays <em>not linked</em> until somebody here says otherwise. It changes no
        permissions: it is what lets the audit log and this screen name a person instead of an
        address.
      </p>

      <AccessForms accounts={accounts} candidates={candidates} />
    </>
  );
}
