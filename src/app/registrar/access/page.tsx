import { redirect } from 'next/navigation';

import { loadAppointmentAccess, loadFunctionAppointments } from '../../../data/appointments.ts';
import { loadGovernance } from '../../../data/governance.ts';
import { loadLinkCandidates, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { governingTerm } from '../../../domain/governance/term.ts';
import type { ClubAccount } from '../../../web/access-view.ts';
import {
  FUNCTION_LABEL,
  isCurrentFunction,
  type AccessSource,
} from '../../../web/appointment-view.ts';
import { POSITION_LABEL } from '../../../web/governance-view.ts';
import { todayIn } from '../../../web/today.ts';
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

  const [candidates, accessRows, functions, governance] = await Promise.all([
    loadLinkCandidates(client, tenant.clubId),
    loadAppointmentAccess(client, tenant.clubId),
    loadFunctionAppointments(client, tenant.clubId),
    loadGovernance(client, tenant.clubId),
  ]);

  // Why each account holds what it holds: the appointment behind an access,
  // and whether that appointment has since ended (BR154 keeps the access).
  const today = todayIn();
  const governing = governingTerm(governance.terms, today);
  const termById = new Map(governance.terms.map((t) => [t.id, t]));
  const positionById = new Map(governance.members.map((m) => [m.id, m]));
  const functionById = new Map(functions.map((f) => [f.id, f]));
  const sources: AccessSource[] = accessRows.flatMap((row) => {
    if (row.committeePositionId !== null) {
      const m = positionById.get(row.committeePositionId);
      if (m === undefined) return [];
      return [{
        accessRole: row.accessRole,
        claimedUserId: row.claimedUserId,
        label: `${POSITION_LABEL[m.position]} · ${termById.get(m.termId)?.name ?? ''}`,
        ended: m.resignedOn !== null || governing?.id !== m.termId,
      }];
    }
    if (row.functionAppointmentId !== null) {
      const f = functionById.get(row.functionAppointmentId);
      if (f === undefined) return [];
      return [{
        accessRole: row.accessRole,
        claimedUserId: row.claimedUserId,
        label: FUNCTION_LABEL[f.kind],
        ended: !isCurrentFunction(f, today),
      }];
    }
    return [];
  });

  return (
    <>
      <h2>Who has access to {tenant.clubName}</h2>
      <p className="lede">
        An account here can sign in and act at this club. Access levels add up &mdash; one person
        is routinely both registrar and treasurer, and holds each.
      </p>
      <p className="notice">
        <strong>Most access should not start here.</strong> Appoint the person to their office or
        club function on <a href="/registrar/governance">Governance</a> and confirm it there: they
        receive a link, set a password, and arrive already linked to their record with the right
        access. Use this screen for exceptions, and to remove access nobody needs any more.
      </p>
      <p className="hint">
        <strong>Saying who an account belongs to is a decision you make, not one the system
        guesses.</strong> Two families share an inbox and a club address outlives three
        secretaries, so matching email addresses would quietly get this wrong &mdash; an account
        stays <em>not linked</em> until somebody here says otherwise. It changes no
        permissions: it is what lets the audit log and this screen name a person instead of an
        address.
      </p>

      <AccessForms accounts={accounts} candidates={candidates} sources={sources} />
    </>
  );
}
