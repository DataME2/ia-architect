import { notFound, redirect } from 'next/navigation';

import { CountUp } from '../../../../components/ui/CountUp.tsx';
import { PinnedCard } from '../../../../components/ui/PinnedCard.tsx';
import { loadOfficialAppointments } from '../../../../data/official-record.ts';
import { loadReferees } from '../../../../data/officiating.ts';
import { loadTenantContext } from '../../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../../data/server.ts';
import { roleLabel } from '../../../../web/designation-answer.ts';
import { initialsOf, shortDate } from '../../../../web/me-view.ts';
import { historyWord, officialFigures } from '../../../../web/official-figures.ts';
import { classificationOn } from '../../../../web/referee-view.ts';
import { todayIn } from '../../../../web/today.ts';

export const dynamic = 'force-dynamic';

const TILTS = [-1.2, 0.8, -0.6, 1.1] as const;

/**
 * One match official, as the coordinator sees them (scope 126, WP3), after
 * the Superdesign draft *Referee Profile Detail*: who they are, four
 * figures, what is coming up, and every appointment at this club.
 *
 * The figures are computed from the appointments on every visit
 * (`src/web/official-figures.ts`) and count up as they appear. Hours wait for
 * the governing body's match lengths (open question 120), so those two
 * figures say so rather than guess. There is no ranking against other
 * officials: comparing volunteers is not what the figures are for.
 */
export default async function OfficialPage({ params }: { readonly params: Promise<{ readonly personId: string }> }) {
  const { personId } = await params;
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect(`/sign-in?next=${encodeURIComponent(`/registrar/referees/${personId}`)}`);

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');
  // The appointing roles only, as on Match officials: the tables refuse the rest.
  if (!tenant.roles.some((r) => ['admin', 'registrar', 'coordinator'].includes(r))) redirect('/registrar/referees');

  const [referees, appointments] = await Promise.all([
    loadReferees(client, tenant.clubId),
    loadOfficialAppointments(client, tenant.clubId, personId),
  ]);
  const referee = referees.find((r) => r.personId === personId);
  if (referee === undefined) notFound();

  const today = todayIn();
  const figures = officialFigures(appointments, today);
  const level = classificationOn(referee.classifications, today);
  const coming = appointments
    .filter((a) => a.playedOn >= today && (a.state === 'accepted' || a.state === 'proposed'))
    .sort((a, b) => a.playedOn.localeCompare(b.playedOn))
    .slice(0, 4);
  const history = appointments.filter((a) => !coming.includes(a));

  return (
    <div className="official">
      <p style={{ margin: 0 }}>
        <a href="/registrar/referees">&larr; Match officials</a>
      </p>

      <section className="official-head" aria-labelledby="official-name">
        <span className="official-badge" aria-hidden="true">
          {initialsOf(referee.name)}
        </span>
        <div>
          <p className="eyebrow">Match official</p>
          <h2 id="official-name">{referee.name}</h2>
          <p className="official-facts">
            {level === null ? <span className="pill">No classification recorded</span> : <span className="pill pill-info">{level.level}</span>}
            {referee.officialNumber !== null && <span className="mono">{referee.officialNumber}</span>}
            {referee.retiredOn !== null ? (
              <span className="pill">Retired {shortDate(referee.retiredOn)}</span>
            ) : (
              <span className="pill pill-ok">On the club&rsquo;s list</span>
            )}
          </p>
        </div>
        <a className="button" href="/registrar/designations">
          Propose for a fixture
        </a>
      </section>

      <div className="dash-metrics official-figures">
        <div className="dash-metric is-green">
          <p className="dash-metric-label">Reliability</p>
          <p className="dash-metric-n">{figures.reliability === null ? '—' : <CountUp value={figures.reliability} suffix="%" />}</p>
          <p className="dash-metric-note">
            {figures.officiated} officiated of {figures.officiated + figures.withdrawn} due
          </p>
        </div>
        <div className="dash-metric is-light">
          <p className="dash-metric-label">Cancellation rate</p>
          <p className="dash-metric-n">
            {figures.cancellationRate === null ? '—' : <CountUp value={figures.cancellationRate} suffix="%" />}
          </p>
          <p className="dash-metric-note">{figures.withdrawn} withdrawn, each with a reason</p>
        </div>
        <div className="dash-metric is-light">
          <p className="dash-metric-label">Total hours</p>
          <p className="dash-metric-n">—</p>
          <p className="dash-metric-note">
            <span className="pill pill-warn">Waiting</span> for the governing body&rsquo;s match lengths
          </p>
        </div>
        <div className="dash-metric is-light">
          <p className="dash-metric-label">Average per season</p>
          <p className="dash-metric-n">—</p>
          <p className="dash-metric-note">
            <span className="pill pill-warn">Waiting</span> for the same lengths
          </p>
        </div>
      </div>

      <h3 className="official-section">Coming up</h3>
      {coming.length === 0 ? (
        <p className="empty">Nothing accepted or offered from today.</p>
      ) : (
        <div className="club-cards">
          {coming.map((a, i) => {
            const word = historyWord(a, today);
            return (
              <PinnedCard key={a.id} tilt={TILTS[i % TILTS.length]!} style={{ animationDelay: `${i * 90}ms` }}>
                <p className="dash-metric-label" style={{ margin: 0 }}>
                  {shortDate(a.playedOn)}
                  {a.kickOff !== null && ` · ${a.kickOff.slice(0, 5)}`}
                </p>
                <h4 className="club-card-title">
                  {a.homeAway === 'away' ? 'at' : 'v'} {a.opponent}
                </h4>
                <p style={{ margin: '0 0 0.5rem' }}>
                  {roleLabel(a.role)}
                  {a.competition !== null && ` · ${a.competition}`}
                </p>
                <span className={word.tone === 'neutral' ? 'pill' : `pill pill-${word.tone}`}>{word.word}</span>
              </PinnedCard>
            );
          })}
        </div>
      )}

      <section className="card official-history" aria-labelledby="official-history">
        <h3 id="official-history" style={{ marginTop: 0 }}>
          Every appointment at {tenant.clubName}
        </h3>
        {history.length === 0 ? (
          <p className="empty" style={{ margin: 0 }}>
            No appointment recorded yet.
          </p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Fixture</th>
                  <th scope="col">Role</th>
                  <th scope="col">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {history.map((a) => {
                  const word = historyWord(a, today);
                  return (
                    <tr key={a.id}>
                      <td className="mono">{a.playedOn}</td>
                      <td>
                        {a.homeAway === 'away' ? 'at' : 'v'} {a.opponent}
                        {a.reason !== null && <span className="hint"> &middot; {a.reason}</span>}
                      </td>
                      <td>{roleLabel(a.role)}</td>
                      <td>
                        <span className={word.tone === 'neutral' ? 'pill' : `pill pill-${word.tone}`}>{word.word}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
