import { redirect } from 'next/navigation';

import { answerersFor } from '../../../data/designations.ts';
import { loadCandidates, loadDesignationFixtures } from '../../../data/officiating.ts';
import { loadFixtureMinimum } from '../../../data/competitions.ts';
import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { assess, offerable } from '../../../domain/officiating/conflicts.ts';
import { proposedTo } from '../../../web/designation-answer.ts';
import { todayIn } from '../../../web/today.ts';
import { DesignationBoard } from './DesignationForms.tsx';

export const dynamic = 'force-dynamic';

/**
 * Who is officiating which game.
 *
 * The checks a coordinator has been doing from memory — did this person
 * play in it, do they coach a side in it, is their child on the field, are
 * they already somewhere else at that hour — are performed here, and the
 * ones that refuse are performed again by the database so no other surface
 * can skip them.
 *
 * **The list is what the platform will accept, not everybody.** BR109 says
 * a conflicted designation is never offered rather than offered and
 * rejected, so blocked officials are absent, and the page says how many and
 * why rather than leaving a shorter list unexplained.
 */
export default async function DesignationsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string; readonly fixture?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar%2Fdesignations');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  const mayAppoint = tenant.roles.some((r) =>
    ['admin', 'registrar', 'coordinator'].includes(r),
  );
  if (!mayAppoint) {
    return (
      <>
        <h2>Designations</h2>
        <p className="notice">
          <strong>Only an administrator, registrar or coordinator can see this.</strong> You are
          signed in as {tenant.roles.join(', ')} at {tenant.clubName}.
        </p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0];

  if (season === undefined) {
    return (
      <>
        <h2>Designations</h2>
        <p className="lede">This club has no season yet, so it has no fixtures to officiate.</p>
      </>
    );
  }

  const fixtures = await loadDesignationFixtures(client, tenant.clubId, season.id);
  const chosen = fixtures.find((f) => f.fixtureId === params.fixture) ?? fixtures[0];

  return (
    <>
      <h2>Designations</h2>
      <p className="lede">
        Who is officiating which game, and what a coordinator should know before deciding. The
        blocking checks are made by the database as well as here &mdash; this screen exists so a
        conflicted official is <strong>never offered</strong>, not so the rules live in a page.
      </p>

      {fixtures.length === 0 ? (
        <p className="hint">
          No fixtures this season. Record one on <a href="/registrar/fixtures">Fixtures</a> and it
          will appear here.
        </p>
      ) : (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Fixture</h3>
            <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', listStyle: 'none', padding: 0 }}>
              {fixtures.map((f) => (
                <li key={f.fixtureId}>
                  <a
                    className={f.fixtureId === chosen?.fixtureId ? 'button' : 'button secondary'}
                    href={`/registrar/designations?season=${season.id}&fixture=${f.fixtureId}`}
                  >
                    {f.playedOn} {f.opponent}
                    {f.appointed.length > 0 && ` · ${f.appointed.length} designated`}
                    {f.status !== 'scheduled' && ` · ${f.status}`}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {chosen !== undefined && <FixtureBoard client={client} tenant={tenant} season={season.id} fixture={chosen} />}
        </>
      )}
    </>
  );
}

async function FixtureBoard({
  client,
  tenant,
  season,
  fixture,
}: {
  readonly client: Awaited<ReturnType<typeof createRequestClient>>;
  readonly tenant: { readonly clubId: string };
  readonly season: string;
  readonly fixture: Awaited<ReturnType<typeof loadDesignationFixtures>>[number];
}) {
  const candidates = await loadCandidates(client, tenant.clubId, season, fixture);
  // BR8's floor for this fixture (scope 38). Null where the fixture is a
  // friendly or the competition states no minimum — both ordinary, and
  // `assess` says nothing rather than inventing a standard.
  const minimumClassification = await loadFixtureMinimum(client, fixture.fixtureId);
  const context = {
    playedOn: fixture.playedOn,
    hasKickOff: fixture.kickOff !== null,
    minimumClassification,
  };
  const offered = offerable(candidates, context);
  const hidden = candidates.filter((c) => !assess(c, context).offerable).length;

  // BR113, on the coordinator's side: whose answer each designation is
  // waiting on. Asked per official on the **chosen** fixture only — three
  // rows at most — rather than for the season, which would be a read per
  // appointment on a page that lists every fixture the club plays.
  //
  // The same function the trigger refuses through, so "proposed to Marta"
  // and "Marta does not hold authority" cannot both be true at once.
  const today = todayIn();
  const proposals: Record<string, string> = {};
  for (const a of fixture.appointed) {
    const who = await answerersFor(client, tenant.clubId, a.personId, today);
    proposals[a.personId] = proposedTo(a.name, who.guardians.map((g) => g.name), !who.self);
  }

  return (
    <>
      <p className="hint">
        <strong>
          {fixture.playedOn}
          {fixture.kickOff !== null && ` at ${fixture.kickOff}`} &mdash; {fixture.homeAway} to{' '}
          {fixture.opponent}
        </strong>
        {fixture.competition !== null && <> &middot; {fixture.competition}</>}
        {fixture.status !== 'scheduled' && (
          <>
            {' '}
            <span className={`pill ${fixture.status === 'played' ? 'pill-ok' : 'pill-warn'}`}>{fixture.status}</span>
          </>
        )}
      </p>

      <DesignationBoard
        fixture={fixture}
        offered={offered}
        hiddenCount={hidden}
        proposals={proposals}
      />

      <p className="hint">
        <strong>Warnings do not stop a designation, they inform one</strong> (BR11). A club
        officer refereeing a grade because nobody else can is the ordinary case, not a scandal
        &mdash; but it is worth recording that somebody knew, which is what the override does.
      </p>
    </>
  );
}
