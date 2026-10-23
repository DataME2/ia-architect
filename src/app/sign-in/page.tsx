import { PRODUCT_NAME } from '../../web/brand.ts';
import { safeDestination } from '../../web/safe-destination.ts';
import { BrandMark } from '../_components/BrandMark.tsx';
import { ResetForm } from './ResetForm.tsx';
import { SignInForm } from './SignInForm.tsx';

export const dynamic = 'force-dynamic';

/**
 * Sign-in, after the Superdesign login draft (scope 105): the form first,
 * then a rich-blue panel.
 *
 * The draft's panel sold the product with figures nobody has measured — 500
 * clubs, ten hours a week, a testimonial. This one says what one sign-in
 * actually enforces, because the person most likely to open the page is a
 * parent who already has a coaching login and is about to make a second
 * one.
 *
 * Google and Microsoft are shown because they are coming, and disabled
 * because they are not here: how an external account would be linked to a
 * Person is still open (question #99). Today a sign-in is linked only by a
 * club's invitation, never inferred from an email address.
 */
export default async function SignInPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="auth-shell">
      <section className="auth-main" aria-labelledby="sign-in-title">
        <div className="auth-form">
          <div className="auth-brand">
            <BrandMark />
            <span className="brand-name">{PRODUCT_NAME}</span>
          </div>
          <h2 id="sign-in-title">Welcome back</h2>
          <p className="lede">Sign in to every role you hold at your club.</p>

          <div className="auth-providers">
            <button type="button" className="auth-provider" disabled>
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
              </svg>
              Continue with Google
              <span className="auth-soon">Coming soon</span>
            </button>
            <button type="button" className="auth-provider" disabled>
              <svg viewBox="0 0 23 23" aria-hidden="true">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              Microsoft
              <span className="auth-soon">Coming soon</span>
            </button>
          </div>

          <p className="auth-divider">Or continue with email</p>
          <SignInForm next={safeDestination(next) ?? ''} />
          <ResetForm />
          <p className="auth-note">
            No account yet? A club administrator links a sign-in to the person it belongs to &mdash; it is
            never inferred from an email address. Just looking?{' '}
            <a href="/demo">Open the demonstration club</a> without one.
          </p>
        </div>
      </section>

      <aside className="auth-aside" aria-label="What one sign-in gives you">
        <p className="auth-badge">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          One sign-in for every role
        </p>

        <ul className="auth-benefits">
          <li>
            <span className="auth-benefit-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect width="8" height="4" x="8" y="2" rx="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <path d="m9 14 2 2 4-4" />
              </svg>
            </span>
            <div>
              <h3>A player is entered once</h3>
              <p>
                A family enters a player&rsquo;s details one time, and the club hands the governing body a complete
                submission.
              </p>
            </div>
          </li>
          <li>
            <span className="auth-benefit-icon is-gold">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <div>
              <h3>Your club&rsquo;s data, and only yours</h3>
              <p>Your session decides which club&rsquo;s records you see. The database enforces it, not the screen.</p>
            </div>
          </li>
        </ul>

        <figure className="auth-card">
          <p className="eyebrow">One sign-in</p>
          <p className="auth-card-title">Every role you hold, one record, no second account.</p>
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
        </figure>
      </aside>
    </div>
  );
}
