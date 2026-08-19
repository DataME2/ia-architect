import { RegistrationForm } from '../../_components/RegistrationForm.tsx';
import { submitJoinAction } from './actions.ts';

export const dynamic = 'force-dynamic';

/**
 * The public registration link (BR72).
 *
 * No session, no account. The page deliberately shows **nothing about the
 * club or the season** — not even whether the token is valid — because it is
 * reachable by anyone with the URL and rendering club details would turn a
 * write-only link into a read of tenant data. The token is checked when the
 * form is submitted, by the database.
 */
export default async function JoinPage({
  params,
}: {
  readonly params: Promise<{ readonly token: string }>;
}) {
  const { token } = await params;

  return (
    <>
      <h2>Register a player</h2>
      <p className="lede">
        Your club sent you this link. Fill it in once and the club takes it from there — you do
        not need an account, and you will not be asked to type these details again.
      </p>

      <RegistrationForm action={submitJoinAction} token={token} />
    </>
  );
}
