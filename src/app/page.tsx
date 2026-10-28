import { HEADLINE, MAKER, PITCH, TAGLINE } from '../web/brand.ts';
import { CONNECTIONS, TRUST } from '../web/home-story.ts';
import { HeroPreview } from './_components/HeroPreview.tsx';
import { RegistrationWalkthrough } from './_components/RegistrationWalkthrough.tsx';
import { RoleExplorer } from './_components/RoleExplorer.tsx';
import { ScrollReveal } from './_components/ScrollReveal.tsx';

/**
 * The front door (scope 118): what PitchPeople does for a club, shown
 * rather than described, for the people who run one.
 *
 * The first screen answers three questions: what it does (the headline and
 * the line under it), why it matters (the preview of a club's week), and
 * what to do next (explore the demonstration club, or discuss a pilot).
 * A family or an officer who arrives here still has one line, and the top
 * bar, to register or sign in.
 *
 * **Still prerendered, still no auth call, and still no data.** Everything
 * shown is `src/web/home-story.ts`, a fictional club that the page labels as
 * fictional. The interactive parts are four small client islands; the rest
 * is server-rendered and reads the same without JavaScript.
 */
export default function HomePage() {
  // The headline is two sentences, and the hero sets each on its own line.
  const headline = HEADLINE.split(/(?<=\.)\s+/);

  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="home-title">
        <svg className="home-pitch" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect pathLength={1} x="60" y="80" width="1320" height="640" rx="2" />
          <line pathLength={1} x1="720" y1="80" x2="720" y2="720" />
          <circle pathLength={1} cx="720" cy="400" r="130" />
          <rect pathLength={1} x="60" y="250" width="170" height="300" />
          <rect pathLength={1} x="1210" y="250" width="170" height="300" />
        </svg>

        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <p className="eyebrow">{TAGLINE}</p>
            <h2 id="home-title" className="home-title">
              {headline.map((sentence) => (
                <span key={sentence}>{sentence}</span>
              ))}
            </h2>
            <p className="lede">{PITCH}</p>
            <div className="hero-actions">
              <a className="button" href="/demo">
                Explore the demonstration club
              </a>
              <a className="button secondary" href="/interest">
                Discuss a pilot for your club
              </a>
            </div>
            <p className="home-note">
              The demonstration club asks for an email address, not a password. You can read
              everything and change nothing, and its families are invented.
            </p>
            <p className="home-families">
              Registering a player? <a href="/register">Start a registration</a>. Already with a club?{' '}
              <a href="/sign-in?next=/me">Sign in to your roles</a>.
            </p>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section className="home-panel" aria-labelledby="explore-title">
        <div className="home-inner" data-reveal="">
          <p className="eyebrow">Role explorer</p>
          <h2 id="explore-title" className="home-heading">
            One person. Every role they hold. Only what each role should see.
          </h2>
          <p className="lede">
            Everyone at a club is one Person record, however many jobs they do. Choose a role to see
            what that person handles, what their screen holds, and the roles they switch between.
          </p>
          <RoleExplorer />
        </div>
      </section>

      <section className="home-sunk" aria-labelledby="walk-title">
        <div className="home-inner" data-reveal="">
          <p className="eyebrow">Walkthrough · one registration</p>
          <h2 id="walk-title" className="home-heading">
            From the club’s link to clear to play.
          </h2>
          <p className="lede">
            Step through a player’s registration. Each step names who acts, what PitchPeople checks
            and where a person decides. It explains the product: it submits, approves and pays
            nothing.
          </p>
          <RegistrationWalkthrough />
          <p className="home-more">
            Want every condition, for every path? <a href="/season-paths">See the season paths</a>.
          </p>
        </div>
      </section>

      <section className="home-panel" aria-labelledby="connect-title">
        <div className="home-inner home-split" data-reveal="">
          <div>
            <p className="eyebrow">Connected operations</p>
            <h2 id="connect-title" className="home-heading">
              Entered once. Used by every role that needs it.
            </h2>
            <p className="lede">
              The same record carries a registration from the family to the registrar, the treasurer,
              the coach and the referee coordinator, with each seeing only their part. PitchPeople
              works on the club’s side: it follows the governing body’s published season and prepares
              the club’s submission for Squadi, which stays the competition system.
            </p>
          </div>
          <ol className="home-chain">
            {CONNECTIONS.map((c) => (
              <li key={c.when}>
                <p className="home-chain-when">{c.when}</p>
                <p className="home-chain-then">{c.then}</p>
                <code>{c.rules}</code>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-dark" aria-labelledby="trust-title">
        <div className="home-inner" data-reveal="">
          <p className="eyebrow">Trust</p>
          <h2 id="trust-title" className="home-heading">
            Built for children’s records and volunteer committees.
          </h2>
          <div className="home-trust">
            <dl>
              {TRUST.map((t) => (
                <div key={t.title}>
                  <dt>{t.title}</dt>
                  <dd>{t.text}</dd>
                </div>
              ))}
            </dl>
            {/*
              A note the coach's workspace really shows, set as it appears:
              in the Assistant's colour, which nothing else on the site uses.
              An illustration, not the component, which has a Dismiss button
              that would do nothing here.
            */}
            <figure className="home-ai">
              <figcaption>
                <span className="home-ai-mark" aria-hidden="true" />
                Assistant · explaining
              </figcaption>
              <p>
                A decline’s reason is visible to you as the responsible coach and to nobody else in
                the squad (BR62).
              </p>
              <p className="home-ai-foot">As a coach sees it. It never sends; you do.</p>
            </figure>
          </div>
        </div>
      </section>

      <section className="home-close" aria-labelledby="pilot-title">
        <div className="home-inner" data-reveal="">
          <p className="eyebrow">For clubs and academies</p>
          <h2 id="pilot-title" className="home-heading">
            Discuss a pilot for your club.
          </h2>
          <p className="lede">
            Tell us your club’s name, roughly how many registrations it takes a season, what it runs
            today and your role. A person reads every enquiry and replies directly. Sending one sets
            nothing up: joining starts with moving your club’s records across, with you.
          </p>
          <div className="hero-actions">
            <a className="button" href="/interest">
              Discuss a pilot for your club
            </a>
            <a className="button secondary" href="/demo">
              Explore the demonstration club
            </a>
          </div>
          <p className="home-note">
            Want to walk every role yourself? Ask for a QA Test Pass in your enquiry.
          </p>
          <p className="home-maker">{MAKER}</p>
        </div>
      </section>

      <ScrollReveal />
    </div>
  );
}
