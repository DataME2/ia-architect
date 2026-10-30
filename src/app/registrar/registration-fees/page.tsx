import { redirect } from 'next/navigation';

import { Tabs } from '../../../components/ui/Tabs.tsx';
import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { loadRegistrationFees, loadTeamLines, previewSeasonPrices } from '../../../data/registration-fees.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { formatCents } from '../../../web/money.ts';
import { STARTER_TERMS } from '../../../web/registration-fee-form.ts';
import type { FeeKind, FeeLine } from '../../../web/registration-price.ts';
import { AddFeeLine, DiscountForm, FamilyPreview, RepricePanel, RetireFeeLine, TeamLineSelect, TermsEditor } from './FeeScheduleForms.tsx';

export const dynamic = 'force-dynamic';

const GROUPS: readonly { readonly kind: FeeKind; readonly title: string }[] = [
  { kind: 'club', title: 'Club registration' },
  { kind: 'governing', title: 'Governing body fees' },
  { kind: 'levy', title: 'Levies' },
];

const TABS = [
  { id: 'schedule', label: 'Fee schedule' },
  { id: 'teams', label: 'Teams' },
  { id: 'discount', label: 'Sibling discount' },
  { id: 'players', label: 'Current players' },
  { id: 'terms', label: 'Terms' },
] as const;

function ages(l: FeeLine): string | null {
  if (l.minAge === null && l.maxAge === null) return null;
  if (l.minAge !== null && l.maxAge !== null) return l.minAge === l.maxAge ? `Age ${l.minAge}` : `Ages ${l.minAge}–${l.maxAge}`;
  return l.minAge !== null ? `Age ${l.minAge} and over` : `Up to age ${l.maxAge}`;
}

/**
 * The club's registration fees (scope 130; BR195, BR196), after the pilot
 * club's own schedule: its registration lines, the governing body's fees
 * and its levies for a season, the sibling discount, and the terms a family
 * accepts. Read by the admin, the registrar and the treasurer; changed by the
 * admin and the treasurer only, which 0099's policies enforce whatever this
 * page offers.
 *
 * Since 0100 every registration opens owing what this schedule says:
 * its team's line, else the standard line for the player's age (BR195). The
 * Teams tab says which line each team is charged, and Current players brings
 * the season's existing registrations onto the schedule, every change shown
 * before it is applied.
 */
export default async function RegistrationFeesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string; readonly tab?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar%2Fregistration-fees');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  const mayRead = tenant.roles.some((r) => ['admin', 'registrar', 'treasurer'].includes(r));
  const mayWrite = tenant.roles.some((r) => ['admin', 'treasurer'].includes(r));
  if (!mayRead) {
    return (
      <>
        <h2>Registration fees</h2>
        <p className="lede">
          The club&rsquo;s fees are read by its admin, registrar and treasurer. You are signed in as {tenant.roles.join(', ')}.
        </p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0] ?? null;
  if (season === null) {
    return (
      <>
        <h2>Registration fees</h2>
        <p className="lede">No seasons are configured yet. A fee belongs to one.</p>
      </>
    );
  }

  const tab = TABS.find((t) => t.id === params.tab)?.id ?? 'schedule';
  const [fees, teams, repricing] = await Promise.all([
    loadRegistrationFees(client, tenant.clubId, season.id),
    loadTeamLines(client, tenant.clubId, season.id),
    // The preview is the admin's and the treasurer's (0100); the registrar does not see it.
    tab === 'players' && mayWrite ? previewSeasonPrices(client, tenant.clubId, season.id) : Promise.resolve([]),
  ]);
  const clubLines = fees.lines.filter((l) => l.kind === 'club');
  const query = (id: string) => {
    const q = new URLSearchParams({ season: season.id });
    if (id !== 'schedule') q.set('tab', id);
    return `/registrar/registration-fees?${q}`;
  };

  return (
    <>
      <h2>Registration fees &mdash; {season.name}</h2>
      <p className="lede">
        What a registration costs at {tenant.clubName}: the club&rsquo;s own line for the player, the governing body&rsquo;s fee
        and any levy, less a sibling discount for every child after the first (BR195).{' '}
        {mayWrite ? 'Only the admin and the treasurer can change them (BR196).' : 'The admin and the treasurer set them (BR196).'}
      </p>

      {seasons.length > 1 && (
        <form method="get" className="dash-season">
          {tab !== 'schedule' && <input type="hidden" name="tab" value={tab} />}
          <label htmlFor="season">Season</label>
          <select id="season" name="season" defaultValue={season.id}>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="submit" className="secondary">
            Show
          </button>
        </form>
      )}

      <Tabs items={TABS.map((t) => ({ ...t, href: query(t.id) }))} current={tab} label="Registration fees" className="club-tabs" />

      <div key={tab} className="tab-panel">
        {tab === 'schedule' && (
          <div className="cols">
            <div className="stack">
              {GROUPS.map((g) => {
                const lines = fees.lines.filter((l) => l.kind === g.kind);
                return (
                  <section key={g.kind} className="card fee-group" aria-labelledby={`fees-${g.kind}`}>
                    <h3 id={`fees-${g.kind}`} style={{ marginTop: 0 }}>
                      {g.title}
                    </h3>
                    {lines.length === 0 ? (
                      <p className="empty" style={{ margin: 0 }}>
                        None this season.
                      </p>
                    ) : (
                      <ul className="fee-lines">
                        {lines.map((l) => (
                          <li key={l.id}>
                            <span className="fee-name">
                              {l.name}
                              {l.adminOnly && <em className="fee-admin"> Admin only</em>}
                              {l.standard && <span className="pill pill-ok fee-standard">Standard</span>}
                              {ages(l) !== null && <span className="hint"> &middot; {ages(l)}</span>}
                            </span>
                            <span className="fee-amount">
                              <b>{formatCents(l.amountCents)}</b>
                              {l.depositCents !== null && <span className="hint">Fixed deposit {formatCents(l.depositCents)}</span>}
                            </span>
                            {mayWrite && <RetireFeeLine id={l.id} name={l.name} />}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
            <div className="stack">
              <section className="card" aria-labelledby="fees-preview">
                <h3 id="fees-preview" style={{ marginTop: 0 }}>
                  What would a family pay?
                </h3>
                <FamilyPreview lines={fees.lines} bps={fees.discountBps} teams={teams} />
              </section>
              {mayWrite && (
                <section className="card" aria-labelledby="fees-add">
                  <h3 id="fees-add" style={{ marginTop: 0 }}>
                    Add a fee
                  </h3>
                  <AddFeeLine seasonId={season.id} />
                </section>
              )}
            </div>
          </div>
        )}

        {tab === 'teams' && (
          <section className="card" aria-labelledby="fees-teams" style={{ maxWidth: '52rem' }}>
            <h3 id="fees-teams" style={{ marginTop: 0 }}>
              Which line each team&rsquo;s players are charged
            </h3>
            <p className="hint" style={{ marginTop: 0 }}>
              A player in a team pays its line; a player not yet in one pays the standard line for their age. Siblings in
              different teams each pay their own team&rsquo;s line, and the discount comes off each later sibling&rsquo;s own.
            </p>
            {teams.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No teams in {season.name} yet.
              </p>
            ) : !mayWrite ? (
              <ul className="fee-lines">
                {teams.map((t) => (
                  <li key={t.teamId}>
                    <span className="fee-name">{t.teamName}</span>
                    <span>{clubLines.find((l) => l.id === t.feeLineId)?.name ?? <span className="hint">The standard line</span>}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="team-lines">
                {teams.map((t) => (
                  <TeamLineSelect key={t.teamId} team={t} clubLines={clubLines} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'players' && (
          <section className="card" aria-labelledby="fees-players">
            <h3 id="fees-players" style={{ marginTop: 0 }}>
              Bring this season&rsquo;s players onto the schedule
            </h3>
            {!mayWrite ? (
              <p style={{ margin: 0 }}>The admin and the treasurer re-price the season&rsquo;s registrations (BR196).</p>
            ) : repricing.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                {fees.lines.length === 0 ? 'Add the fee schedule first: with no lines, registrations keep the season’s own fee.' : 'No registrations in this season yet.'}
              </p>
            ) : (
              <>
                <p className="hint" style={{ marginTop: 0 }}>
                  Each registration&rsquo;s price under the schedule today, less what has been paid. Nothing changes until you
                  apply it, and each change is kept with what it was priced from.
                </p>
                <RepricePanel seasonId={season.id} rows={repricing} />
              </>
            )}
          </section>
        )}

        {tab === 'discount' && (
          <section className="card" aria-labelledby="fees-discount" style={{ maxWidth: '46rem' }}>
            <h3 id="fees-discount" style={{ marginTop: 0 }}>
              Sibling discount
            </h3>
            {mayWrite ? (
              <DiscountForm bps={fees.discountBps} />
            ) : (
              <p style={{ margin: 0 }}>
                Each sibling after the first gets <b>{fees.discountBps / 100}%</b> off their club fee. The governing body&rsquo;s fee
                and the levy are never discounted.
              </p>
            )}
          </section>
        )}

        {tab === 'terms' && (
          <TermsEditor
            body={fees.terms?.body ?? STARTER_TERMS}
            values={fees.terms?.values ?? { club: tenant.clubName }}
            canEdit={mayWrite}
          />
        )}
      </div>
    </>
  );
}
