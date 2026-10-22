import { MAKER, PRODUCT_NAME, TAGLINE } from '../web/brand.ts';

/**
 * The landing page.
 *
 * Three audiences arrive here and want different things: a family with a
 * child to register, a club officer starting a shift, and a prospect who
 * wants to see the thing work before talking to anyone. The hero separates
 * the first two before either has to read a menu; the cards below carry the
 * rest, each saying what the screen behind it actually does rather than
 * naming it. Each card is a pastel of clay (`.landing-cards`, scope 100).
 */
export default function HomePage() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">{PRODUCT_NAME} · Football clubs in Australia &amp; New Zealand</p>
        <h2>{TAGLINE}</h2>
        <p className="lede">
          Registration, money, documents and match officials, around one Person who can play,
          coach, referee, look after a child and sit on the committee &mdash; with one sign-in.
          A family enters a player&rsquo;s details one time, and the club hands the governing body a
          complete submission instead of a guess that comes back weeks later.
        </p>
        <p className="hint">{MAKER}</p>
        <div className="hero-actions">
          <a className="button" href="/sign-in?next=/me">
            Sign in to your roles
          </a>
          <a className="button secondary" href="/register">
            Start a registration
          </a>
        </div>
      </section>

      <div className="card-grid landing-cards">
        <article className="card card-link">
          <h3>Your roles</h3>
          <p className="hint">
            Player, coach, referee, guardian, committee &mdash; one sign-in, one record. Switch role in the
            rail; the person never changes, only the lens does.
          </p>
          <p>
            <a className="button secondary" href="/me">
              Open your roles
            </a>
          </p>
        </article>

        <article className="card card-link">
          <h3>Registrar</h3>
          <p className="hint">
            The season queue: who is ready, who is blocked, and which rule is holding up the most
            registrations.
          </p>
          <p>
            <a className="button secondary" href="/registrar">
              Open the queue
            </a>
          </p>
        </article>

        <article className="card card-link">
          <h3>New registration</h3>
          <p className="hint">
            The family form &mdash; legal name and preferred name kept apart, guardian required for
            a minor, and the three consents recorded separately.
          </p>
          <p>
            <a className="button secondary" href="/register">
              Start a registration
            </a>
          </p>
        </article>

        <article className="card card-link">
          <h3>For clubs</h3>
          <p className="hint">
            Not using this yet? Tell us about your club and we will reply directly. No account,
            nothing to set up, and no free trial &mdash; an empty system is worth nothing to a
            club.
          </p>
          <p>
            <a className="button secondary" href="/interest">
              Talk to us about your club
            </a>
          </p>
        </article>

        <article className="card card-link">
          <h3>Demonstration club</h3>
          <p className="hint">
            Which club the current session is in, and whether what it shows is fictional or a real
            club&rsquo;s real records. Worth checking before reading anything.
          </p>
          <p>
            <a className="button secondary" href="/demo">
              Which club am I in?
            </a>
          </p>
        </article>
      </div>
    </>
  );
}
