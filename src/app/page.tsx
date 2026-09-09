/**
 * The landing page.
 *
 * Three audiences arrive here and want different things: a family with a
 * child to register, a club officer starting a shift, and a prospect who
 * wants to see the thing work before talking to anyone. The hero separates
 * the first two before either has to read a menu; the cards below carry the
 * rest, each saying what the screen behind it actually does rather than
 * naming it.
 */
export default function HomePage() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Football club operations · Australia &amp; New Zealand</p>
        <h2>Registration, collected once</h2>
        <p className="lede">
          A family enters a player&rsquo;s details one time. Deterministic rules say immediately
          what is missing. The club hands the governing body a complete submission instead of a
          guess that errors and comes back weeks later.
        </p>
        <div className="hero-actions">
          <a className="button" href="/register">
            Start a registration
          </a>
          <a className="button secondary" href="/registrar">
            Open the club queue
          </a>
        </div>
      </section>

      <div className="card-grid">
        <article className="card card-link">
          <h3 style={{ marginTop: 0 }}>Registrar</h3>
          <p className="hint">
            The season queue: who is ready, who is blocked, and which rule is holding up the most
            registrations.
          </p>
          <p style={{ marginBottom: 0 }}>
            <a className="button secondary" href="/registrar">
              Open the queue
            </a>
          </p>
        </article>

        <article className="card card-link">
          <h3 style={{ marginTop: 0 }}>New registration</h3>
          <p className="hint">
            The family form &mdash; legal name and preferred name kept apart, guardian required for
            a minor, and the three consents recorded separately.
          </p>
          <p style={{ marginBottom: 0 }}>
            <a className="button secondary" href="/register">
              Start a registration
            </a>
          </p>
        </article>

        <article className="card card-link">
          <h3 style={{ marginTop: 0 }}>Demonstration club</h3>
          <p className="hint">
            Which club the current session is in, and whether what it shows is fictional or a real
            club&rsquo;s real records. Worth checking before reading anything.
          </p>
          <p style={{ marginBottom: 0 }}>
            <a className="button secondary" href="/demo">
              Which club am I in?
            </a>
          </p>
        </article>
      </div>
    </>
  );
}
