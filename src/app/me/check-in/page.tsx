import { notFound, redirect } from 'next/navigation';

import { loadCheckInStatus, loadSessions, loadWellbeing } from '../../../data/check-in.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { ageAt } from '../../../domain/types.ts';
import { scoresLine, sessionLine, whoSeesLine } from '../../../web/check-in.ts';
import { shortDate } from '../../../web/me-view.ts';
import { isoWeek, todayIn } from '../../../web/today.ts';
import { CheckInConsent } from '../_academy/CheckInConsent.tsx';
import { CheckInForm } from '../_academy/CheckInForm.tsx';
import { SessionForm, SessionRow } from '../_academy/CheckInSession.tsx';

/**
 * Today's check-in (scope 113, BR186): one screen, drawn for a phone. The
 * player answers five scales and adds the sessions they did; once saved,
 * the day reads *Done for today*. Offered only to the players BR184 names,
 * and only once BR185's consent is given.
 */
export default async function CheckInPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly club?: string; readonly edit?: string }>;
}) {
  const { club, edit } = await searchParams;
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/me');
  if (club === undefined) notFound();

  const [{ data: link }, { data: clubRow }] = await Promise.all([
    client.from('account_person').select('person_id').eq('club_id', club).eq('user_id', user.id).maybeSingle(),
    client.from('club').select('name').eq('id', club).maybeSingle(),
  ]);
  const personId = (link as { person_id: string } | null)?.person_id;
  if (personId === undefined || clubRow === null) notFound();
  const { data: person } = await client
    .from('person')
    .select('preferred_name, legal_given_names, date_of_birth')
    .eq('id', personId)
    .maybeSingle();
  const p = person as { preferred_name: string | null; legal_given_names: string; date_of_birth: string | null } | null;
  if (p === null) notFound();

  const today = todayIn();
  const adult = p.date_of_birth !== null && ageAt(p.date_of_birth, today) >= 18;
  const status = await loadCheckInStatus(client, club, personId);
  const [entries, sessions] = status.consent === null
    ? [[], []]
    : await Promise.all([loadWellbeing(client, club, [personId], today, today), loadSessions(client, club, [personId], today, today)]);
  const entry = entries[0] ?? null;
  const done = entry !== null && edit === undefined;
  const back = `/me?${new URLSearchParams({ role: 'player', club })}`;
  const clubName = (clubRow as { name: string }).name;

  return (
    <main className="ci-page" id="main">
      <header className="ci-head">
        <p className="ci-back">
          <a href={back}>&larr; Your workspace</a>
        </p>
        <p className="mono ci-date">
          {shortDate(today).toUpperCase()} · WEEK {isoWeek(today).week}
        </p>
        <h1>Today&rsquo;s check-in</h1>
        {status.consent !== null && (
          <span className={done ? 'pill pill-ok' : 'pill pill-warn'}>{done ? 'Done for today' : 'Not done yet today'}</span>
        )}
      </header>

      {!status.applies ? (
        <section className="ci-section">
          <p className="ci-card">
            The daily check-in is for players on the club&rsquo;s academy teams, U13 and older. None of your teams is
            asked to check in.
          </p>
        </section>
      ) : status.consent === null ? (
        <section className="ci-section">
          <h2>Before the first check-in</h2>
          {adult ? (
            <div className="ci-card">
              <CheckInConsent clubId={club} clubName={clubName} personId={personId} playerName={p.preferred_name ?? p.legal_given_names} self />
            </div>
          ) : (
            <p className="ci-card">
              Your parent or guardian needs to agree first, on their workspace. Nothing is asked of you until they do.
            </p>
          )}
        </section>
      ) : done ? (
        <section className="ci-section">
          <div className="ci-card">
            <p className="mono ci-label">How you felt</p>
            <p style={{ margin: 0 }}>{scoresLine(entry)}</p>
          </div>
          <div className="ci-card">
            <p className="mono ci-label">Training today</p>
            {sessions.length === 0 ? (
              <p style={{ margin: 0 }}>No session added.</p>
            ) : (
              sessions.map((s) => (
                <p key={s.id} style={{ margin: 0 }}>
                  {sessionLine(s)}
                </p>
              ))
            )}
          </div>
          <p className="ci-center">
            <a href={`/me/check-in?${new URLSearchParams({ club, edit: '1' })}`}>Change today&rsquo;s answers</a>
          </p>
        </section>
      ) : (
        <CheckInForm clubId={club} personId={personId} scores={entry}>
          <section className="ci-section" aria-labelledby="ci-sport">
            <h2 id="ci-sport">Training and sport today</h2>
            <p className="ci-hint">Add every session you did.</p>
            {sessions.length > 0 && (
              <ul className="ci-sessions">
                {sessions.map((s) => (
                  <SessionRow key={s.id} clubId={club} session={s} />
                ))}
              </ul>
            )}
            <SessionForm clubId={club} personId={personId} today={today} />
            <p className="ci-card ci-private">
              <span aria-hidden="true">🔒</span>{' '}
              {whoSeesLine({ adult, consentedOn: status.consent.on, bySelf: status.consent.bySelf })}
            </p>
          </section>
        </CheckInForm>
      )}
    </main>
  );
}
