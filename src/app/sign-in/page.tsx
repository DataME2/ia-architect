import { safeDestination } from '../../web/safe-destination.ts';
import { ResetForm } from './ResetForm.tsx';
import { SignInForm } from './SignInForm.tsx';

export const dynamic = 'force-dynamic';

export default async function SignInPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <>
      <h2>Club sign-in</h2>
      <p className="lede">
        For club officers. Your session decides which club&rsquo;s data you can see — the
        database enforces it, not the screen.
      </p>
      <SignInForm next={safeDestination(next)} />
      <ResetForm />
    </>
  );
}
