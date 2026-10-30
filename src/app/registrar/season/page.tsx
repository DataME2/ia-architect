import { redirect } from 'next/navigation';

import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { RequirementsForm } from './RequirementsForm.tsx';
import { loadClubCompetitions, loadCompetitions } from '../../../data/competitions.ts';
import { CompetitionsPanel } from './CompetitionsPanel.tsx';
import { CountUp } from '../../../components/ui/CountUp.tsx';
import { loadRegistrationFees } from '../../../data/registration-fees.ts';
import { seasonProgress } from '../../../web/season-progress.ts';
import { todayIn } from '../../../web/today.ts';

export const dynamic = 'force-dynamic';

export default async function SeasonPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) {
    return (
      <>
        <h2>No club yet</h2>
        <p className="lede">This account is not a member of any club.</p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  if (seasons.length === 0) {
    return (
      <>
        <h2>{tenant.clubName}</h2>
        <p className="lede">No seasons are configured yet.</p>
      </>
    );
  }

  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0]!;


  // The shared catalogue, and which of it this club plays in (scope 38), and
  // the season's fees (scope 130), which 0099's policies show only to the
  // admin, the registrar and the treasurer.
  const [catalogue, playing, fees] = await Promise.all([
    loadCompetitions(client),
    loadClubCompetitions(client, tenant.clubId, season.id),
    loadRegistrationFees(client, tenant.clubId, season.id),
  ]);
  const progress = seasonProgress(season.starts_on, season.ends_on, todayIn());
  const lines = (kind: string) => fees.lines.filter((l) => l.kind === kind).length;

  return (
    <>

      <h2>What {season.name} requires</h2>

      {/* Scope 130: where the season stands, drawn in chalk from its first day
          to today. */}
      <div className="season-timeline" style={{ ['--progress' as string]: `${progress.percent}%` }}>
        <div className="season-track" aria-hidden="true">
          <span className="season-fill" />
          <span className="season-today" />
        </div>
        <p className="season-dates">
          <span className="mono">{season.starts_on}</span>
          <b>
            {progress.phase === 'before'
              ? `Starts in ${progress.daysLeft} days`
              : progress.phase === 'after'
                ? 'Season over'
                : `Week ${progress.week} of ${progress.weeks} · ${progress.daysLeft} days to go`}
          </b>
          <span className="mono">{season.ends_on}</span>
        </p>
      </div>
      <p className="lede">
        The checklist below is copied onto every registration made in this season, at the
        moment it is made. That is what gives BR2 something to check — a rule asking which
        required documents are missing has no answer, and reports <em>pass</em>, when nothing
        was ever required.
      </p>

      {seasons.length > 1 && (
        <form method="get" className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="season">Season</label>
            <select id="season" name="season" defaultValue={season.id}>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="secondary">
            Show
          </button>
        </form>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Registration requirements</h3>
        <RequirementsForm season={season} />
      </section>

      <p className="notice">
        Changing this does not change registrations that already exist. A family cannot be
        held to a requirement they were never told about, so an existing registration keeps
        the checklist it was created with — a registrar can apply the new one from the
        registration&rsquo;s own page, deliberately, and that act is audited.
      </p>

      <section className="card season-fees" aria-labelledby="season-fees">
        <div>
          <h3 id="season-fees" style={{ marginTop: 0 }}>
            What a registration costs
          </h3>
          <p className="hint" style={{ margin: 0 }}>
            Fees are set by the treasurer in <b>Registration fees</b>, under Money: each team&rsquo;s line, the governing
            body&rsquo;s fees, levies and the sibling discount. Every registration in {season.name} opens owing what that schedule
            says (BR195).
          </p>
        </div>
        <dl className="season-fees-figures">
          <div>
            <dt>Club lines</dt>
            <dd>
              <CountUp value={lines('club')} />
            </dd>
          </div>
          <div>
            <dt>Governing body</dt>
            <dd>
              <CountUp value={lines('governing')} />
            </dd>
          </div>
          <div>
            <dt>Levies</dt>
            <dd>
              <CountUp value={lines('levy')} />
            </dd>
          </div>
          <div>
            <dt>Sibling discount</dt>
            <dd>
              <CountUp value={fees.discountBps / 100} suffix="%" />
            </dd>
          </div>
        </dl>
        <a className="button" href={`/registrar/registration-fees?season=${season.id}`}>
          Open Registration fees
        </a>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Competitions this season (BR134)</h3>
        <CompetitionsPanel
          seasonId={season.id}
          catalogue={catalogue}
          playing={playing.map((c) => c.id)}
        />
      </section>

    </>
  );
}
