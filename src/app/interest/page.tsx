import { InterestForm } from './InterestForm.tsx';

/**
 * The page a club lands on when it wants to talk to us.
 *
 * Scope 28 §3 specified the marketing surface as **explain, qualify,
 * capture — never provision**, and only *capture* was ever built, as a side
 * effect of the demonstration door. So a cold enquiry arrived as an email
 * address with no club attached, and the first reply was a round of
 * questions.
 *
 * Static, like `/`: no session lookup, nothing read before the visitor
 * acts, and therefore nothing to leak to somebody who is not a customer.
 * **Nothing here grants access** (BR145) — the page says so in words,
 * because the absence of a "create your club" button is not an
 * explanation, and a club that expected one deserves to know why there
 * isn't one rather than concluding the product is half-built.
 */
export const metadata = {
  title: 'Talk to us about your club · Let’sDataTalk',
  description:
    'Tell us about your club and we will reply directly. No account, and nothing to set up.',
};

export default function InterestPage() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">For clubs · Australia &amp; New Zealand</p>
        <h2>Talk to us about your club</h2>
        <p className="lede">
          Tell us who you are and what you run today, and we will reply directly. There is no
          account to create here and nothing to set up — this is a conversation, not a sign-up.
        </p>
      </section>

      <div className="card-grid">
        <article className="card">
          <h3 style={{ marginTop: 0 }}>What happens next</h3>
          <p className="hint" style={{ marginBottom: 0 }}>
            A person reads it — there is no queue and no sales team. We reply to you directly,
            usually within two business days, with an answer about <em>your</em> club rather
            than a brochure.
          </p>
        </article>

        <article className="card">
          <h3 style={{ marginTop: 0 }}>Why there is no “start free trial”</h3>
          <p className="hint" style={{ marginBottom: 0 }}>
            An empty system is worth nothing to a club. What makes this useful is{' '}
            <strong>your</strong> players, history and money already in it — so joining starts
            with a migration we do with you, not a password you choose alone. That is also why
            we ask what you run today.
          </p>
        </article>

        <article className="card card-link">
          <h3 style={{ marginTop: 0 }}>Would rather look first?</h3>
          <p className="hint">
            The demonstration club is a real tenant with invented families, and it needs an
            email address and no password. Nothing in it belongs to a real child.
          </p>
          <p style={{ marginBottom: 0 }}>
            <a className="button secondary" href="/demo">
              See the demonstration club
            </a>
          </p>
        </article>
      </div>

      <section className="card">
        <InterestForm />
      </section>

      <p className="hint">
        We handle what you send under the Australian Privacy Principles (Privacy Act 1988) and,
        for New Zealand clubs, the Privacy Act 2020. We will not sell your details and we will
        not pass them to a football club or a governing body.
      </p>
    </>
  );
}
