import type { CSSProperties } from 'react';

import { MAKER, PRODUCT_NAME, TAGLINE } from '../web/brand.ts';
import type { Status } from '../web/home-story.ts';
import { PersonLens } from './_components/PersonLens.tsx';
import { RoleWorkspaces } from './_components/RoleWorkspaces.tsx';

/**
 * The landing page (scope 100): the product's one idea — one Person, every
 * role — told as a scroll from the front door to matchday.
 *
 * Three audiences arrive here: a family with a child to register, a club
 * officer starting a shift, and a prospect. The hero's two actions separate
 * the first two before either reads further; For clubs closes for the third.
 *
 * **Still prerendered, still no auth call** — which is why the masthead has
 * no Sign in. The motion is CSS: the timeline, the reveals and the line-up
 * are scroll-driven animations, so no script runs on scroll, and a browser
 * without them, or a reader who asks for reduced motion, gets every section
 * in its finished state. Only the lens and the roles phone are client
 * components, because a reader chooses in them.
 */

const JOURNEY: readonly { readonly step: string; readonly status: Status }[] = [
  { step: 'Family enters details once', status: { tone: 'info', word: 'Entered' } },
  { step: 'Documents checked', status: { tone: 'warn', word: 'Waiting' } },
  { step: 'Fee settled', status: { tone: 'ok', word: 'Ready' } },
  { step: 'Registered', status: { tone: 'ok', word: 'Ready' } },
  { step: 'Submitted to the governing body', status: { tone: 'ok', word: 'Submitted' } },
];

/** A 4-3-3, left to right from the goalkeeper, as % of the pitch. */
const LINE_UP: readonly { readonly line: string; readonly x: number; readonly y: number }[] = [
  { line: 'GK', x: 6, y: 50 },
  ...[18, 39, 61, 82].map((y) => ({ line: 'DF', x: 23, y })),
  ...[28, 50, 72].map((y) => ({ line: 'MF', x: 45, y })),
  ...[22, 50, 78].map((y) => ({ line: 'FW', x: 68, y })),
];

const FIXTURES: readonly { readonly when: string; readonly match: string; readonly status: Status }[] = [
  { when: 'Sat 7 · 10:00', match: 'U14 Girls v Harbour', status: { tone: 'ok', word: 'Set' } },
  { when: 'Sat 14 · 13:00', match: 'U16 Boys v Rovers', status: { tone: 'warn', word: 'Referee due' } },
  { when: 'Sat 21 · 09:00', match: 'Seniors v City', status: { tone: 'ok', word: 'Set' } },
  { when: 'Sat 28 · 11:00', match: 'U12 Mixed v Bay', status: { tone: 'info', word: 'Scheduled' } },
];

/** Each shirt pops in a little after the one before it. */
const at = (i: number) => ({ '--at': `${i * 3}%` }) as CSSProperties;

export default function HomePage() {
  // The tagline is three sentences, and the hero sets each on its own line.
  const tagline = TAGLINE.split(/(?<=\.)\s+/);

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
          <div>
            <p className="eyebrow">{PRODUCT_NAME} · Football clubs in Australia &amp; New Zealand</p>
            <h2 id="home-title" className="home-title">
              {tagline.map((sentence) => (
                <span key={sentence}>{sentence}</span>
              ))}
            </h2>
            <p className="lede">
              Registration, money, documents and match officials, around one Person who can play,
              coach, referee, look after a child and sit on the committee &mdash; with one sign-in.
              A family enters a player&rsquo;s details one time, and the club hands the governing body a
              complete submission instead of a guess that comes back weeks later.
            </p>
            <div className="hero-actions">
              <a className="button" href="/sign-in?next=/me">
                Sign in to your roles
              </a>
              <a className="button secondary" href="/register">
                Start a registration
              </a>
            </div>
            <p className="home-maker">{MAKER}</p>
          </div>
          <PersonLens />
        </div>
      </section>

      <section className="home-panel home-reveal" aria-labelledby="how-title">
        <p className="eyebrow">How it works</p>
        <h2 id="how-title" className="home-heading">
          One registration, start to submitted.
        </h2>
        <p className="lede">
          A family enters a player&rsquo;s details once. The record carries itself through the club and
          lands with the governing body as a complete submission.
        </p>

        <div className="home-journey">
          <div className="home-track" aria-hidden="true">
            <span className="home-track-fill" />
            <span className="home-track-token" />
          </div>
          <ol>
            {JOURNEY.map((j, i) => (
              <li key={j.step}>
                <span className="home-step" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{j.step}</h3>
                <span className={`pill pill-${j.status.tone}`}>{j.status.word}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="home-pack">
          <div>
            <p className="eyebrow">Submission pack</p>
            <p className="home-pack-title">Complete submission</p>
            <p className="home-pack-what">Player, documents, consents and fee</p>
          </div>
          <span className="pill pill-ok">Complete</span>
        </div>
      </section>

      <section className="home-panel home-sunk home-reveal" aria-labelledby="roles-title">
        <p className="eyebrow">Roles · an illustration</p>
        <h2 id="roles-title" className="home-heading">
          One Person, seen five ways.
        </h2>
        <p className="lede">Switch the lens; the person never changes, only what you see does.</p>
        <RoleWorkspaces />
      </section>

      <section className="home-dark home-reveal" aria-labelledby="matchday-title">
        <p className="eyebrow">Matchday · an illustration</p>
        <h2 id="matchday-title" className="home-heading">
          Who&rsquo;s clear to play, and who&rsquo;s got the whistle.
        </h2>
        <p className="lede">The squad takes the field, the officials are appointed, and the fixtures line up.</p>

        <div className="matchday">
          <div className="matchday-field">
            <div
              className="matchday-pitch"
              role="img"
              aria-label="Eleven players in a 4-3-3, two more on the bench not clear to play, and the referee appointed"
            >
              <svg viewBox="0 0 600 400" aria-hidden="true">
                <rect x="10" y="10" width="580" height="380" />
                <line x1="300" y1="10" x2="300" y2="390" />
                <circle cx="300" cy="200" r="55" />
                <rect x="10" y="120" width="70" height="160" />
                <rect x="520" y="120" width="70" height="160" />
              </svg>
              {LINE_UP.map((p, i) => (
                <span
                  key={`${p.line}-${p.y}`}
                  className="matchday-shirt"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, ...at(i) }}
                >
                  {p.line}
                </span>
              ))}
              <span className="matchday-shirt matchday-referee" style={{ left: '55%', top: '38%', ...at(11) }}>
                R
              </span>
            </div>
            <div className="matchday-labels">
              <span className="matchday-bench">
                <span className="matchday-shirt matchday-sub" style={at(12)} />
                <span className="matchday-shirt matchday-sub" style={at(13)} />
                <span className="pill pill-stop">Not clear to play</span>
              </span>
              <span className="matchday-official">
                <span className="pill pill-ok">Referee appointed</span>
              </span>
            </div>
          </div>

          <div className="matchday-fixtures">
            <p className="eyebrow">Competition · March</p>
            <ul>
              {FIXTURES.map((f) => (
                <li key={f.when}>
                  <span>
                    <strong>{f.when}</strong>
                    <span>{f.match}</span>
                  </span>
                  <span className={`pill pill-${f.status.tone}`}>{f.status.word}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="home-dark home-close home-reveal" aria-labelledby="clubs-title">
        <h2 id="clubs-title" className="home-heading">
          Bring your club&rsquo;s season into one place.
        </h2>
        <p className="lede">
          There&rsquo;s no account to create to ask, nothing to set up, and no free trial &mdash; an empty
          system is worth nothing to a club. Tell us about your club and we&rsquo;ll reply directly.
        </p>
        <div className="hero-actions">
          <a className="button" href="/interest">
            Talk to us about your club
          </a>
          <a className="button secondary" href="/demo">
            See the demonstration club
          </a>
        </div>
      </section>
    </div>
  );
}
