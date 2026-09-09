import { redirect } from 'next/navigation';

import {
  loadDeclaredAvailability,
  loadRefereeCandidates,
  loadReferees,
} from '../../../data/officiating.ts';
import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { rosterOrder } from '../../../web/referee-view.ts';
import { todayIn } from '../../../web/today.ts';
import { AddRefereeForm, RefereeRoster } from './RefereeForms.tsx';

export const dynamic = 'force-dynamic';

/**
 * The club's match officials, and what they are qualified for.
 *
 * C4's first screen. Until this existed a referee was a role on a `person`
 * row and a Working with Children Check the database insisted on — BR8
 * ("classification meets the competition's minimum") and BR10 ("no expired
 * accreditation") were documented against data the schema could not hold.
 *
 * **Narrowed to the roles that appoint.** The tables refuse a treasurer, so
 * the guard below explains rather than controls — but it has to exist,
 * because the alternative is a screen that renders an empty roster and
 * looks like a club with no referees.
 */
export default async function RefereesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar%2Freferees');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  const mayAppoint = tenant.roles.some((r) =>
    ['admin', 'registrar', 'coordinator'].includes(r),
  );

  if (!mayAppoint) {
    return (
      <>
        <h2>Match officials</h2>
        <p className="notice">
          <strong>Only an administrator, registrar or coordinator can see this.</strong> A
          match official&rsquo;s classification history is a record of somebody&rsquo;s
          professional standing &mdash; and the pathway starts with twelve-year-old MiniRefs, so
          for many of them it is a record about a child. You are signed in as{' '}
          {tenant.roles.join(', ')} at {tenant.clubName}.
        </p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0];

  const [referees, candidates, declared] = await Promise.all([
    loadReferees(client, tenant.clubId),
    loadRefereeCandidates(client, tenant.clubId),
    season === undefined
      ? Promise.resolve({ windows: new Map(), ranges: new Map() })
      : loadDeclaredAvailability(client, tenant.clubId, season.id),
  ]);

  const asOf = todayIn();
  const rostered = new Set(referees.map((r) => r.personId));

  return (
    <>
      <h2>Match officials</h2>
      <p className="lede">
        What this club has recorded about the people who officiate for it: their standing on the
        Football Queensland pathway, and the accreditations that standing depends on.
      </p>
      <p className="hint">
        <strong>A classification is a history, not a setting.</strong> Eligibility for a match is
        judged on the day it was played, so recording a promotion does not rewrite what somebody
        was in March. And what the club has <em>checked</em> is kept apart from what somebody{' '}
        <em>said</em> &mdash; an unverified record is shown as unverified rather than counted.
      </p>

      {seasons.length > 1 && (
        <p className="hint">
          Availability is declared per season.{' '}
          {seasons.map((s) => (
            <a
              key={s.id}
              href={`/registrar/referees?season=${s.id}`}
              style={{ marginRight: '0.6rem', fontWeight: s.id === season?.id ? 700 : 400 }}
            >
              {s.name}
            </a>
          ))}
        </p>
      )}

      <RefereeRoster
        referees={rosterOrder(referees, asOf)}
        asOf={asOf}
        seasonId={season?.id ?? null}
        windows={declared.windows}
        ranges={declared.ranges}
      />

      <AddRefereeForm candidates={candidates.filter((c) => !rostered.has(c.personId))} />

      <p className="hint">
        <strong>Silence is not availability.</strong> An official who has declared no window is
        not offered for any fixture &mdash; the alternative reads silence as consent and puts
        somebody on a match sheet who never said they could do it. Designations are made on{' '}
        <a href="/registrar/designations">Designations</a>.
      </p>
    </>
  );
}
