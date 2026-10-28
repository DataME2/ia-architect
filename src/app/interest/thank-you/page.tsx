/**
 * Where `/interest` lands after an enquiry is recorded (scope 116).
 *
 * It says what happens next rather than only "thank you": a club that has
 * just typed its name wants to know whether somebody will reply, and
 * roughly when. A demo request is told the reply will arrange a time
 * (BR188).
 *
 * Reads nothing but the query string, and the query string carries nothing
 * personal: `request=demo` at most. The club's name is not repeated back,
 * because putting it in the URL would put it in browser history and in
 * logs.
 */
export const metadata = {
  title: 'Thank you · PitchPeople',
  robots: { index: false },
};

export default async function ThankYouPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const demo = (await searchParams)['request'] === 'demo';

  return (
    <>
      <section className="hero">
        <p className="eyebrow">{demo ? 'Demo requested' : 'Enquiry received'}</p>
        <h2>{demo ? 'Thank you — let’s find a time' : 'Thank you — it’s with us'}</h2>
        <p className="lede">
          A person reads every enquiry. We will reply to the address you gave, usually within two
          business days.
        </p>
      </section>

      <div className="card-grid">
        <article className="card">
          <h3 style={{ marginTop: 0 }}>What happens next</h3>
          {demo ? (
            <ol style={{ marginBottom: 0 }}>
              <li>We read what you told us about your club.</li>
              <li>We email you to arrange a time that suits you.</li>
              <li>
                On the call we walk through a season with your club in mind, including what
                moving off your current system would involve.
              </li>
            </ol>
          ) : (
            <ol style={{ marginBottom: 0 }}>
              <li>We read what you told us about your club.</li>
              <li>We reply with an answer about your club, not a brochure.</li>
            </ol>
          )}
        </article>

        <article className="card card-link">
          <h3 style={{ marginTop: 0 }}>While you wait</h3>
          <p className="hint">
            The demonstration club is a real tenant with invented families. It needs an email
            address and no password, and nothing in it belongs to a real child.
          </p>
          <p style={{ marginBottom: 0 }}>
            <a className="button secondary" href="/demo">
              See the demonstration club
            </a>
          </p>
        </article>

        <article className="card">
          <h3 style={{ marginTop: 0 }}>Nothing has been set up</h3>
          <p className="hint" style={{ marginBottom: 0 }}>
            An enquiry creates no account, no club and no access. If you sent it by
            mistake, there is nothing to undo.
          </p>
        </article>
      </div>

      <p>
        <a href="/">Back to the home page</a>
      </p>
    </>
  );
}
