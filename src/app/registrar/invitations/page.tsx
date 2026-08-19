import { redirect } from 'next/navigation';

import { loadInvitations } from '../../../data/invitations.ts';
import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import {
  INVITATION_STATUS_LABEL,
  invitationStatus,
} from '../../../web/invitation-view.ts';
import { revokeInvitationAction } from './actions.ts';
import { IssueForm } from './IssueForm.tsx';

export const dynamic = 'force-dynamic';

const STATUS_TONE = {
  live: 'pill-ok',
  expired: 'pill-warn',
  revoked: 'pill-stop',
} as const;

export default async function InvitationsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) {
    return (
      <>
        <h2>No club yet</h2>
        <p className="lede">This account is not a member of any club.</p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  if (seasons.length === 0) {
    return (
      <>
        <h2>No seasons configured</h2>
        <p className="lede">A registration link points at one season, and there are none yet.</p>
      </>
    );
  }

  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0]!;
  const invitations = await loadInvitations(client, tenant.clubId, season.id);

  return (
    <>
      <p style={{ marginBottom: '0.25rem' }}>
        <a href="/registrar">&larr; Back to the queue</a>
      </p>

      <h2>Registration links — {season.name}</h2>
      <p className="lede">
        Send one of these to a family and they can register without an account. The link writes
        one registration into {tenant.clubName} and this season, and reads nothing at all — so a
        link that leaks is a nuisance, not a disclosure.
      </p>

      <IssueForm seasons={seasons} />

      <h2>Existing links</h2>
      {invitations.length === 0 ? (
        <p className="empty">None yet.</p>
      ) : (
        <div className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Used</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => {
                  const status = invitationStatus({
                    expiresAt: invitation.expires_at,
                    revokedAt: invitation.revoked_at,
                  });
                  return (
                    <tr key={invitation.id}>
                      <td>{invitation.label}</td>
                      <td>
                        <span className={`pill ${STATUS_TONE[status]}`}>
                          {INVITATION_STATUS_LABEL[status]}
                        </span>
                      </td>
                      <td>{new Date(invitation.expires_at).toLocaleDateString('en-AU')}</td>
                      <td>
                        {invitation.use_count}{' '}
                        {invitation.use_count === 1 ? 'registration' : 'registrations'}
                      </td>
                      <td>
                        {status === 'live' && (
                          <form action={revokeInvitationAction}>
                            <input type="hidden" name="invitationId" value={invitation.id} />
                            <button type="submit" className="secondary">
                              Revoke
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            Revoking takes effect immediately — the next submission through that link is
            refused. The link itself cannot be shown again; only its fingerprint is stored.
          </p>
        </div>
      )}
    </>
  );
}
