import { redirect } from 'next/navigation';

import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { loadAssignablePeople } from '../../../data/teams.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { displayNameFor, fullLegalName } from '../../../web/queue-view.ts';
import { todayIn } from '../../../web/today.ts';
import { RecordClearanceForm } from '../teams/TeamForms.tsx';

/**
 * Working with Children Checks (scope 125): recording a check, which until
 * now sat at the foot of Teams. It has its own place in the club menu, just
 * below Reports, because it is done for a person before they are given a
 * team, not as part of building one. The form and its action are Teams'
 * own, unchanged (BR54, BR84).
 */
export default async function ClearancesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar/clearances');

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
        <p className="lede">No seasons are configured yet. A check is held against the end of one.</p>
      </>
    );
  }
  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0]!;

  // Adults only: a child is exempt from needing a check (BR84), so offering
  // them would invite a registrar to record something that cannot exist.
  const adults = (await loadAssignablePeople(client, tenant.clubId, { adultsOnly: true, asAt: todayIn() })).map(
    (person) => ({ id: person.id, label: `${displayNameFor(person)} — ${fullLegalName(person)}` }),
  );

  return (
    <>
      <h2>Working with Children Checks</h2>
      <p className="lede">
        Needed before anyone can be added as a coach, manager or team official. The check is held
        against the <strong>end of the season</strong> ({season.name}, {season.ends_on}), not
        against today &mdash; a card expiring mid-season is caught now, with months to replace it,
        rather than on the morning it lapses (BR54).
      </p>
      <section className="card">
        <h3 style={{ marginTop: 0 }}>Record a Working with Children Check</h3>
        <RecordClearanceForm people={adults} />
      </section>
    </>
  );
}
