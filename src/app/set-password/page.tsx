import { redirect } from 'next/navigation';

import { createRequestClient, currentUser } from '../../data/server.ts';
import { SetPasswordForm } from './SetPasswordForm.tsx';

export const dynamic = 'force-dynamic';

/**
 * The step between arriving on an emailed link and being able to come back.
 *
 * Somebody invited to a club signs in without a password and can work
 * immediately — and then cannot return, because `/sign-in` asks for one
 * they never had. This is where they get one.
 *
 * It does not redirect people who already have a password away: they may
 * legitimately be here to change it. What it will not do is let somebody
 * who needs one wander off, which is enforced by the registrar layout.
 */
export default async function SetPasswordPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fset-password');

  const { data: needs } = await client.rpc('app_needs_password');

  return (
    <>
      <h2>{needs === true ? 'Choose a password' : 'Change your password'}</h2>
      <p className="lede">
        {needs === true ? (
          <>
            You signed in with a link from your email. That link was for once only &mdash; choose
            a password now and you can sign in normally from here on, without waiting for
            anybody to send you another.
          </>
        ) : (
          <>Signed in as {user.email}. Setting a new password signs out nobody else.</>
        )}
      </p>
      <SetPasswordForm />
    </>
  );
}
