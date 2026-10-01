import { SessionStrip as DesignSessionStrip } from '../../../components/ui/SessionStrip.tsx';
import type { TenantContext } from '../../../data/queries.ts';
import type { SignedInUser } from '../../../data/server.ts';
import { accessLabel } from '../../../web/access-view.ts';
import { signOutAction } from '../../sign-in/actions.ts';

/**
 * Who you are signed in as, and the way out — rendered by the design
 * system's SessionStrip (scope 69); this adapter keeps every screen's call
 * unchanged.
 *
 * Worth its own strip rather than a line in the masthead because the roles
 * are load-bearing: what these screens let you do is decided by them, and
 * more than one rule turns on the difference. A registrar who cannot see the
 * verify button on a voucher needs to be able to tell at a glance that it is
 * because they are signed in as a registrar and not an admin (BR78) — rather
 * than concluding the button is broken.
 *
 * The name where there is one, the email where there is not — and never the
 * email dressed as a name (BR108).
 */
export function SessionStrip({
  user,
  tenant,
  demo = false,
  platform = false,
}: {
  readonly user: SignedInUser | null;
  readonly tenant: TenantContext | null;
  /** Marks the strip itself, so the club is named as the demo everywhere. */
  readonly demo?: boolean;
  /** The platform owner, who has no club and is not missing one. */
  readonly platform?: boolean;
}) {
  if (user === null) return null;

  const person = tenant?.person ?? null;

  return (
    <DesignSessionStrip
      user={{
        ...(user.email !== null && user.email !== undefined ? { email: user.email } : {}),
        lastSignInAt: user.lastSignInAt,
      }}
      tenant={
        tenant === null
          ? null
          : {
              clubName: tenant.clubName,
              person:
                person === null
                  ? null
                  : {
                      legalName: person.legalName,
                      ...(person.preferredName ? { preferredName: person.preferredName } : {}),
                    },
              // `viewer` is named for what it is — its holder did not choose
              // it and needs to know why a button refuses them.
              roles: tenant.roles.map((role) =>
                (role as string) === 'viewer' ? 'Viewer — read-only' : accessLabel(role)),
            }
      }
      demo={demo}
      platform={platform}
      signOutAction={signOutAction}
    />
  );
}
