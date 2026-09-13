import { UnsubscribeForm } from './UnsubscribeForm.tsx';

export const dynamic = 'force-dynamic';

/**
 * Stop the email (BR128).
 *
 * No session, no account, and **nothing read before the person acts**. The
 * page does not say whose address this is, which club sent the message, or
 * whether the link is even valid — a URL in an inbox is a URL anyone
 * forwarded can open, and confirming that an address is on a list is itself
 * a disclosure (the reason BR73's three failure cases are indistinguishable).
 *
 * Two choices rather than one, because BR130 makes them different things:
 * leaving the club's news is not the same as asking not to be emailed at
 * all, and a page offering only the first tells someone who wants the
 * second that they may not have it.
 */
export default async function UnsubscribePage({
  params,
}: {
  readonly params: Promise<{ readonly token: string }>;
}) {
  const { token } = await params;

  return (
    <>
      <h2>Stop these emails</h2>
      <p className="lede">
        You can stop hearing from us. Choose which, and we will act on it straight away — you do
        not need an account, and you will not be asked to sign in.
      </p>

      <UnsubscribeForm link={token} />

      <p className="note">
        Changed your mind later? Your club can turn contact back on if you ask them.
      </p>
    </>
  );
}
