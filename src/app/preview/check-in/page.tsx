import { notFound } from 'next/navigation';

import { scoresLine, sessionLine, whoSeesLine, type SessionEntry } from '../../../web/check-in.ts';
import { shortDate } from '../../../web/me-view.ts';
import { isoWeek } from '../../../web/today.ts';
import { CheckInConsent } from '../../me/_academy/CheckInConsent.tsx';
import { CheckInForm } from '../../me/_academy/CheckInForm.tsx';
import { SessionForm, SessionRow } from '../../me/_academy/CheckInSession.tsx';

/**
 * A design preview of the daily check-in (scope 113), as a phone shows it:
 * `?state=form` (the default), `done` or `consent`. Sample data; the
 * components are the real ones.
 *
 * **Development only**: a production build answers 404.
 */

const TODAY = '2026-10-25';
const SESSIONS: SessionEntry[] = [{ id: 's1', personId: 'p1', on: TODAY, kind: 'team_training', rpe: 7 }];
const SCORES = { motivation: 7, mood: 6, sleep_quality: 5, stress: 3, soreness: 8 };

export default async function CheckInPreview({ searchParams }: { readonly searchParams: Promise<{ readonly state?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const state = (await searchParams).state ?? 'form';
  const done = state === 'done';

  return (
    <main className="ci-page" id="main">
      <header className="ci-head">
        <p className="ci-back">
          <a href="/preview/check-in">&larr; Your workspace</a>
        </p>
        <p className="mono ci-date">
          {shortDate(TODAY).toUpperCase()} · WEEK {isoWeek(TODAY).week}
        </p>
        <h1>Today&rsquo;s check-in</h1>
        {state !== 'consent' && (
          <span className={done ? 'pill pill-ok' : 'pill pill-warn'}>{done ? 'Done for today' : 'Not done yet today'}</span>
        )}
      </header>
      {state === 'consent' ? (
        <section className="ci-section">
          <h2>Before the first check-in</h2>
          <div className="ci-card">
            <CheckInConsent clubId="preview" clubName="North Star FC" personId="p1" playerName="Alex" self />
          </div>
        </section>
      ) : done ? (
        <section className="ci-section">
          <div className="ci-card">
            <p className="mono ci-label">How you felt</p>
            <p style={{ margin: 0 }}>{scoresLine(SCORES)}</p>
          </div>
          <div className="ci-card">
            <p className="mono ci-label">Training today</p>
            {SESSIONS.map((s) => (
              <p key={s.id} style={{ margin: 0 }}>
                {sessionLine(s)}
              </p>
            ))}
          </div>
          <p className="ci-center">
            <a href="/preview/check-in">Change today&rsquo;s answers</a>
          </p>
        </section>
      ) : (
        <CheckInForm clubId="preview" personId="p1" scores={null}>
          <section className="ci-section" aria-labelledby="ci-sport">
            <h2 id="ci-sport">Training and sport today</h2>
            <p className="ci-hint">Add every session you did.</p>
            <ul className="ci-sessions">
              {SESSIONS.map((s) => (
                <SessionRow key={s.id} clubId="preview" session={s} />
              ))}
            </ul>
            <SessionForm clubId="preview" personId="p1" today={TODAY} />
            <p className="ci-card ci-private">
              <span aria-hidden="true">🔒</span> {whoSeesLine({ adult: false, consentedOn: '2026-10-03', bySelf: false })}
            </p>
          </section>
        </CheckInForm>
      )}
    </main>
  );
}
