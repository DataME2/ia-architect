import { createRequestClient, currentUser } from '../../data/server.ts';
import { ResetForm } from '../sign-in/ResetForm.tsx';
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
 *
 * **And it no longer bounces a signed-out visitor to `/sign-in`.** That
 * redirect closed a circle: the page that exists to hand out a password
 * demanded one to get in, so a person whose link had expired had no door
 * left except asking somebody to send another by hand — the support burden
 * the invitation flow exists to remove. Without a session this asks for the
 * address instead and sends a fresh link (BR98: the credential is a
 * single-use link, never a password in an email).
 */
export default async function SetPasswordPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);

  if (user === null) {
    return (
      <>
        <h2>Get a link to set your password</h2>
        <p className="lede">
          You are not signed in, so there is nothing to change yet &mdash; and asking you for a
          password here would be asking for the thing you came to create. Give us the address your
          club holds for you and we will send a link that signs you in once, so you can choose one.
        </p>
        <ResetForm open summary="Send me a link" />
        <p className="hint" style={{ marginTop: '1.25rem' }}>
          Already have a password? <a href="/sign-in">Sign in</a>. We never send a password by
          email &mdash; only a link, good for one use.
        </p>
      </>
    );
  }

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
