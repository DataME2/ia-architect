import { safeDestination } from '../../web/safe-destination.ts';
import { BrandMark } from '../_components/BrandMark.tsx';
import { ResetForm } from './ResetForm.tsx';
import { SignInForm } from './SignInForm.tsx';

export const dynamic = 'force-dynamic';

/**
 * Sign-in, in two halves.
 *
 * The reef panel on the left says what one sign-in gets you — every role
 * you hold, one record, no second account — before you have typed anything,
 * because the person most likely to open this page is a parent who already
 * has a coaching login and is about to make a second one. The form on the
 * right is unchanged in what it does.
 */
export default async function SignInPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="auth-shell">
      <aside className="auth-aside" aria-label="What one sign-in gives you">
        <div className="auth-brand">
          <BrandMark />
          <span>
            <span className="brand-name">Let&rsquo;sDataTalk</span>
            <span className="brand-region">Football &middot; AU &amp; NZ</span>
          </span>
        </div>
        <p className="eyebrow">One sign-in</p>
        <h2>Every role you hold, one record, no second account.</h2>
        <p>
          Play, coach, referee, look after a child, sit on the committee &mdash; the same sign-in carries all
          of it. You choose which role you are acting in; the app never guesses.
        </p>
        <ul className="auth-ledger" aria-label="What is enforced">
          <li>
            <b>1</b>
            <span>sign-in for every role</span>
          </li>
          <li>
            <b>0</b>
            <span>duplicate accounts</span>
          </li>
          <li>
            <b>P5</b>
            <span>your club&rsquo;s data, and only your club&rsquo;s &mdash; enforced by the database</span>
          </li>
        </ul>
      </aside>

      <section className="auth-main">
        <h2>Sign in</h2>
        <p className="lede">
          Your session decides which club&rsquo;s data you can see &mdash; the database enforces it, not the
          screen.
        </p>
        <SignInForm next={safeDestination(next)} />
        <ResetForm />
        <p className="hint" style={{ marginTop: '1.25rem' }}>
          No account yet? A club administrator links a sign-in to the person it belongs to &mdash; it is
          never inferred from an email address. Just looking?{' '}
          <a href="/demo">Open the demonstration club</a> without one.
        </p>
      </section>
    </div>
  );
}
