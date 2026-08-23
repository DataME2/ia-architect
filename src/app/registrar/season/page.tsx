import { redirect } from 'next/navigation';

import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { formatCents } from '../../../web/money.ts';
import { RequirementsForm } from './RequirementsForm.tsx';

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

  return (
    <>

      <h2>What {season.name} requires</h2>
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

      <p className="hint">
        Currently: {season.required_document_types.length === 0
          ? 'no documents required'
          : `${season.required_document_types.length} required document${season.required_document_types.length === 1 ? '' : 's'}`}
        , fee {formatCents(season.registration_fee_cents)}.
      </p>
    </>
  );
}
