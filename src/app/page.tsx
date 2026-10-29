import type { CSSProperties } from 'react';

import { COMPANY, HEADLINE, PITCH, TAGLINE } from '../web/brand.ts';
import { BOUNDARIES, DEFINITIONS, PRACTICE, workByArea, type PracticeRow } from '../web/home-story.ts';
import { ProgrammeStudy } from './_components/ProgrammeStudy.tsx';
import { RegistrationWalkthrough } from './_components/RegistrationWalkthrough.tsx';
import { ScrollReveal } from './_components/ScrollReveal.tsx';
import { ScrollStage } from './_components/ScrollStage.tsx';
import { TheDraw } from './_components/TheDraw.tsx';

/** The headline's payoff, set in oxide italic. */
const PAYOFF = 'running your club.';

/** Stagger order for the reveal grammar: each step is 70ms later. */
const nth = (i: number) => ({ '--i': i }) as CSSProperties;
const pad = (n: number) => String(n).padStart(2, '0');

function Rows({ rows, label, from = 0 }: { readonly rows: readonly PracticeRow[]; readonly label: string; readonly from?: number }) {
  return (
    <ol className="ed-rows" aria-label={label}>
      {rows.map((r, i) => (
        <li key={r.label} data-reveal="" style={nth(i)}>
          <span className="ed-row-label">
            <span className="ed-row-no">No. {pad(from + i + 1)}</span>
            {r.label}
          </span>
          <div className="ed-row-body">
            <p className="ed-row-q">{r.question}</p>
            <p className="ed-row-a">{r.answer}</p>
          </div>
          <span className="ed-row-class">{r.classification}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The front door as a matchday programme (scope 122). It is written for the
 * people who run a club, and set like the programme handed out at the
 * gate: warm paper, near-black type and one oxide pigment.
 *
 * The page runs, top to bottom:
 * - a masthead split by the halfway line, a coach on the centre spot rising
 *   between PITCH and PEOPLE;
 * - the draw, from one record to five roles;
 * - the programme: a page per role, turned by the scroll;
 * - one registration, step by step;
 * - what the platform connects and where it stops;
 * - the team sheet of capabilities;
 * - the pilot, and the closing wordmark.
 *
 * **Still prerendered, no auth call, no data.** Every person and club shown
 * is invented (`src/web/home-story.ts`), and every claim is traceable to a
 * delivered component or a business rule (`home-story.test.ts`). The
 * interactive parts are small client islands. The rest is server-rendered
 * and reads the same without script and with reduced motion. The palette
 * and type are scoped to `.ed` and the chrome around it, so no workspace
 * changes.
 */
export default function HomePage() {
  const lead = HEADLINE.endsWith(PAYOFF) ? HEADLINE.slice(0, -PAYOFF.length) : HEADLINE;
  const payoff = HEADLINE.endsWith(PAYOFF) ? PAYOFF : '';

  return (
    <div className="ed">
      <ScrollStage mode="hero" intro className="ed-hero" aria-labelledby="ed-title">
        <div className="ed-hero-stage" data-stage="">
          <div className="ed-hero-copy">
            <p className="ed-eyebrow ed-in" style={nth(0)}>
              PitchPeople · Matchday programme · {TAGLINE}
            </p>
            <h2 id="ed-title" className="ed-headline ed-in" style={nth(1)}>
              {lead}
              {payoff && <em>{payoff}</em>}
            </h2>
            <p className="ed-support ed-in" style={nth(2)}>
              {PITCH}
            </p>
            <div className="ed-actions">
              <a className="ed-button" href="/demo">
                Explore the demonstration club
              </a>
              <a className="ed-button ed-button-quiet" href="/interest">
                Discuss a pilot for your club
              </a>
            </div>
            <p className="ed-families ed-in" style={nth(3)}>
              Registering a player? <a href="/register">Start a registration</a>. Already with a club?{' '}
              <a href="/sign-in?next=/me">Sign in to your roles</a>.
            </p>
          </div>

          {/* The masthead, split by the halfway line. PITCH sits in front of
              the coach and PEOPLE behind, so the figure stands in the gap,
              on the centre spot, pointing up behind PITCH. */}
          <div className="ed-mark" aria-hidden="true">
            <span className="ed-pitch">
              <svg className="ed-pitch-halfway" viewBox="0 0 100 2" preserveAspectRatio="none">
                <line pathLength={1} x1="0" y1="1" x2="100" y2="1" />
              </svg>
              <svg className="ed-pitch-circle" viewBox="0 0 100 100">
                <circle pathLength={1} cx="50" cy="50" r="49" />
                <circle className="ed-pitch-spot" cx="50" cy="50" r="1.4" />
              </svg>
              <span className="ed-pitch-label">
                <span>Halfway line · centre circle</span>
              </span>
            </span>
            <span className="ed-mark-top">
              <span className="ed-mark-in">Pitch</span>
            </span>
            <span className="ed-figure">
              <img className="ed-figure-in" src="/figures/coach.svg" alt="" width={480} height={1040} />
            </span>
            <span className="ed-mark-bottom">
              <span className="ed-mark-in">People</span>
            </span>
          </div>

          <p className="ed-caption">Fig. 1 — A club coach on the centre spot. Original illustration.</p>
        </div>
      </ScrollStage>

      <section className="ed-section ed-identity" aria-labelledby="identity-title">
        <div className="ed-wrap ed-identity-grid">
          <div>
            <p className="ed-eyebrow" data-reveal="" style={nth(0)}>
              § 01 — The draw
            </p>
            <h2 id="identity-title" className="ed-h2" data-reveal="" style={nth(1)}>
              One record. <em>Five roles</em> drawn from it.
            </h2>
            <p className="ed-intro" data-reveal="" style={nth(2)}>
              The parent who coaches on Saturday and referees on Sunday is one person, not three
              accounts. PitchPeople keeps one record for them, and each role reads only its own part.
            </p>
            <dl className="ed-defs">
              {DEFINITIONS.map((d, i) => (
                <div key={d.term} data-reveal="" style={nth(3 + i)}>
                  <dt>{d.term}</dt>
                  <dd>{d.text}</dd>
                </div>
              ))}
            </dl>
          </div>
          <TheDraw />
        </div>
      </section>

      <section className="ed-study" aria-labelledby="study-title">
        <ProgrammeStudy />
      </section>

      <section className="ed-section ed-walk" aria-labelledby="walk-title">
        <div className="ed-wrap">
          <p className="ed-eyebrow" data-reveal="" style={nth(0)}>
            § 03 — One registration
          </p>
          <h2 id="walk-title" className="ed-h2" data-reveal="" style={nth(1)}>
            From the club’s link <em>to clear to play.</em>
          </h2>
          <p className="ed-intro" data-reveal="" style={nth(2)}>
            Step through a player’s registration. Each step names who acts, what PitchPeople checks
            and where a person decides. It explains the product; it submits, approves and pays nothing.
          </p>
          <RegistrationWalkthrough />
          <p className="ed-more">
            Every condition, for every path: <a href="/season-paths">the season paths</a>.
          </p>
        </div>
      </section>

      <section className="ed-section ed-practice" aria-labelledby="practice-title">
        <div className="ed-wrap ed-split">
          <div className="ed-split-head">
            <p className="ed-eyebrow" data-reveal="" style={nth(0)}>
              § 04 — Questions from the committee room
            </p>
            <h2 id="practice-title" className="ed-h2" data-reveal="" style={nth(1)}>
              What the platform <em>connects.</em>
            </h2>
            <p className="ed-intro" data-reveal="" style={nth(2)}>
              One record, entered once, read by every role that needs it. Each row answers a question
              a club asks about its own administration. PitchPeople works on the club’s side: it
              follows the governing body’s published season and prepares the club’s submission for
              Squadi, which stays the competition system.
            </p>
          </div>
          <Rows rows={PRACTICE} label="What the platform connects" />
        </div>

        <div className="ed-wrap ed-split ed-bounds">
          <div className="ed-split-head">
            <h2 className="ed-h2 ed-h2-small" data-reveal="" style={nth(0)}>
              And where it <em>stops.</em>
            </h2>
            <p className="ed-intro" data-reveal="" style={nth(1)}>
              Children’s records and a volunteer committee deserve plain answers. These are the
              boundaries the product keeps, and the rules that keep them.
            </p>
          </div>
          <Rows rows={BOUNDARIES} label="Where PitchPeople stops" from={PRACTICE.length} />
        </div>
      </section>

      <section className="ed-section ed-work" aria-labelledby="work-title">
        <div className="ed-wrap">
          <p className="ed-eyebrow" data-reveal="" style={nth(0)}>
            § 05 — The team sheet
          </p>
          <h2 id="work-title" className="ed-h2" data-reveal="" style={nth(1)}>
            Capabilities, <em>as built.</em>
          </h2>
          <table className="ed-table" role="table">
            <caption className="sr-only">PitchPeople’s capabilities by area, who each serves, and whether it is delivered</caption>
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">Capability</th>
                <th role="columnheader" scope="col">Addresses</th>
                <th role="columnheader" scope="col">For</th>
                <th role="columnheader" scope="col">Status</th>
              </tr>
            </thead>
            {workByArea().map((g) => (
              <tbody key={g.area} role="rowgroup">
                <tr role="row" className="ed-table-area" data-reveal="">
                  <th role="rowheader" scope="rowgroup" colSpan={4}>
                    {g.area}
                  </th>
                </tr>
                {g.rows.map((w, i) => (
                  <tr key={w.capability} role="row" data-reveal="" style={nth(i + 1)}>
                    <th role="rowheader" scope="row">
                      {w.capability}
                    </th>
                    <td role="cell" className="ed-td-addr">
                      {w.addresses}
                    </td>
                    <td role="cell" className="ed-td-who">
                      {w.who}
                    </td>
                    <td role="cell" className="ed-td-status">
                      <span className={`ed-mark-status is-${w.status.toLowerCase()}`}>{w.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
          <p className="ed-note">
            Delivered: built and in the product. Simulated: no payment provider is connected, and no
            money moves. Advisory: it explains and drafts, and decides nothing.
          </p>
        </div>
      </section>

      <ScrollStage mode="enter" className="ed-close" aria-labelledby="pilot-title">
        <div className="ed-wrap">
          <p className="ed-eyebrow" data-reveal="" style={nth(0)}>
            For clubs and academies
          </p>
          <h2 id="pilot-title" className="ed-h2 ed-close-title" data-reveal="" style={nth(1)}>
            Discuss a pilot <em>for your club.</em>
          </h2>
          <p className="ed-intro" data-reveal="" style={nth(2)}>
            Tell us your club’s name, roughly how many registrations it takes a season, what it runs
            today and your role. A person reads every enquiry and replies directly. Sending one sets
            nothing up: joining starts with moving your club’s records across, with you.
          </p>
          <div className="ed-actions">
            <a className="ed-button" href="/demo">
              Explore the demonstration club
            </a>
            <a className="ed-button ed-button-quiet" href="/interest">
              Discuss a pilot for your club
            </a>
          </div>
          <p className="ed-note">
            The demonstration club asks for an email address, not a password. You can read everything
            and change nothing, and its families are invented. Want to walk every role yourself? Ask
            for a QA Test Pass in your enquiry.
          </p>
          <p className="ed-colophon">
            <span>
              &copy; {new Date().getFullYear()} {COMPANY}
            </span>
            <span>Hosted in Sydney; tenant isolation is enforced by the database.</span>
          </p>
        </div>
        <p className="ed-endmark" aria-hidden="true">
          PitchPeople
        </p>
      </ScrollStage>

      <ScrollReveal />
    </div>
  );
}
