import type { TenantContext } from '../../../data/queries.ts';
import type { SignedInUser } from '../../../data/server.ts';
import { signOutAction } from '../../sign-in/actions.ts';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  registrar: 'Registrar',
  treasurer: 'Treasurer',
  committee: 'Committee',
  coach: 'Coach',
  coordinator: 'Coordinator',
  // Named for what it is rather than what it is called, because this is the
  // one role whose holder did not choose it and needs to know why a button
  // is refusing them.
  viewer: 'Viewer — read-only',
};

/**
 * Who you are signed in as, and the way out.
 *
 * Worth its own strip rather than a line in the masthead because the roles
 * are load-bearing: what these screens let you do is decided by them, and
 * more than one rule turns on the difference. A registrar who cannot see the
 * verify button on a voucher needs to be able to tell at a glance that it is
 * because they are signed in as a registrar and not an admin (BR78) — rather
 * than concluding the button is broken.
 */
export function SessionStrip({
  user,
  tenant,
  demo = false,
}: {
  readonly user: SignedInUser | null;
  readonly tenant: TenantContext | null;
  /** Marks the strip itself, so the club is named as the demo everywhere. */
  readonly demo?: boolean;
}) {
  if (user === null) return null;

  return (
    <div className={demo ? 'session-strip is-demo' : 'session-strip'}>
      <div>
        <span className="session-who">{user.email ?? 'Signed in'}</span>
        {tenant !== null && (
          <>
            <span className="session-sep">·</span>
            <span>{tenant.clubName}</span>
            {demo && <span className="pill pill-warn" style={{ marginLeft: '0.45rem' }}>Demo</span>}
            <span className="session-sep">·</span>
            {tenant.roles.map((role) => (
              <span className="pill" key={role} style={{ marginRight: '0.3rem' }}>
                {ROLE_LABEL[role] ?? role}
              </span>
            ))}
          </>
        )}
        {tenant === null && (
          <>
            <span className="session-sep">·</span>
            <span>No club membership</span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {user.lastSignInAt !== null && (
          <span className="session-since">
            since {new Date(user.lastSignInAt).toLocaleString('en-AU')}
          </span>
        )}
        <form action={signOutAction}>
          <button type="submit" className="secondary" style={{ padding: '0.25rem 0.7rem' }}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
