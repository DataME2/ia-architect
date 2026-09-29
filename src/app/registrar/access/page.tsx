import { redirect } from 'next/navigation';

import { loadAppointmentAccess, loadFunctionAppointments } from '../../../data/appointments.ts';
import { loadGovernance } from '../../../data/governance.ts';
import { loadLinkCandidates, loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { loadWorkspaceStatus } from '../../../data/workspace-invitations.ts';
import { buildDirectory } from '../../../web/access-directory.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { governingTerm } from '../../../domain/governance/term.ts';
import { MIN_ACCOUNT_AGE, candidateAge, type ClubAccount } from '../../../web/access-view.ts';
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

  const today = todayIn();
  const [candidates, accessRows, functions, governance, seasons] = await Promise.all([
    loadLinkCandidates(client, tenant.clubId),
    loadAppointmentAccess(client, tenant.clubId),
    loadFunctionAppointments(client, tenant.clubId),
    loadGovernance(client, tenant.clubId),
    loadSeasons(client, tenant.clubId),
  ]);
  // The season People opens on by default, so the two screens agree.
  const season = seasons[0];
  const workspaces =
    season === undefined ? [] : await loadWorkspaceStatus(client, tenant.clubId, season.id, today);

  // Why each account holds what it holds: the appointment behind an access,
  // and whether that appointment has since ended (BR154 keeps the access).
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

  const children = new Set(
    candidates
      .filter((c) => {
        const age = candidateAge(c.dateOfBirth, today);
        return age !== null && age < MIN_ACCOUNT_AGE;
      })
      .map((c) => c.personId),
  );
  const entries = buildDirectory(accounts, workspaces, sources, children);

  return (
    <>
      <div className="card-row" style={{ alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 20rem' }}>
          <h2 style={{ marginBottom: '0.25rem' }}>Access</h2>
          <p className="lede" style={{ marginTop: 0 }}>
            Everyone who can sign in at {tenant.clubName}
            {season === undefined ? '' : ` (${season.name})`}, and what they can do. Open a person
            to see why, or to change it.
          </p>
        </div>
        <a className="button" href="/registrar/governance">
          Appoint someone
        </a>
      </div>
      <p className="hint" style={{ marginTop: 0 }}>
        Staff access comes from an office or club function confirmed on Governance; player and
        family workspaces go out on their own once a player is COMPLETE. Nothing here needs to be
        picked by hand unless an account arrived some other way.
      </p>

      <AccessForms entries={entries} accounts={accounts} candidates={candidates} today={today} />
    </>
  );
}
