import Link from 'next/link';

import { createRequestClient, currentUser } from '../../data/server.ts';
import { PRODUCT_NAME } from '../../web/brand.ts';
import { NO_CREDENTIAL_DESTINATION } from '../../web/safe-destination.ts';
import { linkType } from '../../web/sign-in-link.ts';
import { signOutAction } from '../sign-in/actions.ts';
import { continueAction } from './actions.ts';

export const dynamic = 'force-dynamic';

/**
 * Where a link an administrator sent opens (BR180, scope 109).
 *
 * It signs in only when the person presses Continue. Chat apps fetch an
 * address to draw its preview, and a link that signed in on arrival would
 * be used up by that fetch before the person saw it.
 *
 * It will not sign in over somebody else's session. The administrator who
 * made the link is the person most likely to open it by accident, and
 * doing so would make them the member.
 */
export default async function WelcomePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly token?: string; readonly type?: string }>;
}) {
  const { token, type } = await searchParams;
  const kind = linkType(type);

  if (token === undefined || token === '' || kind === null) {
    return (
      <>
        <h2>This link is incomplete</h2>
        <p className="lede">
          Part of it was lost on the way. Ask your club for a new one, or{' '}
          <Link href={NO_CREDENTIAL_DESTINATION}>get a link by email</Link>.
        </p>
      </>
    );
  }

  const user = await currentUser(await createRequestClient());
  if (user !== null) {
    return (
      <>
        <h2>You are already signed in</h2>
        <p className="lede">
          You are signed in as {user.email ?? 'another account'}, and this link is for somebody
          signing in for the first time. If you made it for them, send it to them: opening it here
          would sign you in as them. If it was sent to you, sign out and open it again.
        </p>
        <form action={signOutAction}>
          <button type="submit" className="secondary">
            Sign out
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <h2>Welcome to {PRODUCT_NAME}</h2>
      <p className="lede">
        Your club made this link for you. Continue to sign in, then choose a password so you can come
        back.
      </p>
      <form action={continueAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="type" value={kind} />
        <button type="submit">Continue</button>
      </form>
      <p className="hint" style={{ marginTop: '1.25rem' }}>
        The link works once. If it has expired,{' '}
        <Link href={NO_CREDENTIAL_DESTINATION}>get a fresh one by email</Link>.
      </p>
    </>
  );
}
