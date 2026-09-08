import { notFound } from 'next/navigation';

import { createRequestClient, currentUser } from '../../data/server.ts';
import {
  hasDeputy,
  outstanding,
  summarise,
  type ClubLicence,
  type PlatformClub,
} from '../../web/platform-view.ts';
import { todayIn } from '../../web/today.ts';
import { LicenceForm, LicencePill } from './LicenceForm.tsx';
import { ProvisionForm } from './ProvisionForm.tsx';

export const dynamic = 'force-dynamic';

/**
 * The platform owner's console: create clubs, and see which ones are not
 * finished.
 *
 * See [decision 9]. Two things about it are deliberate and easy to
 * misread as oversights.
 *
 * **It is not hidden by its URL.** The control is `platform_admin`, checked
 * inside every function this page calls, so the page is useless to anyone
 * not on that list even if they find it. A path nobody has published is
 * still a path, and the day it leaks is the day an obscurity boundary is
 * gone.
 *
 * **It answers "not found" rather than "forbidden."** That is a courtesy on
 * top of the control rather than a substitute for it: there is no reason to
 * confirm the route exists to somebody who may not use it.
 *
 * **It shows no tenant data.** Club names, jurisdictions and whether a club
 * is finished — never a person, a registration, a payment or a card. That
 * boundary is the reason this console needed a decision record at all.
 */
export default async function PlatformPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) notFound();

  const { data: isPlatform, error: checkError } = await client.rpc('app_is_platform');
  if (checkError !== null || isPlatform !== true) notFound();

  const { data, error } = await client.rpc('platform_clubs');
  if (error !== null) {
    return (
      <>
        <h2>Platform</h2>
        <div className="errors">
          <strong>Could not read the club list: {error.message}</strong>
        </div>
      </>
    );
  }

  type Row = PlatformClub & { licence: ClubLicence | null; isDemo: boolean };

  const clubs: Row[] = (data ?? []).map((row: Record<string, unknown>) => ({
    clubId: String(row.club_id),
    name: String(row.name),
    jurisdiction: String(row.jurisdiction),
    createdAt: String(row.created_at),
    adminCount: Number(row.admin_count),
    seasonCount: Number(row.season_count),
    primary:
      row.primary_email === null || row.primary_email === undefined
        ? null
        : {
            name: String(row.primary_name),
            email: String(row.primary_email),
            phone: row.primary_phone === null ? null : String(row.primary_phone),
            claimed: row.primary_claimed === true,
          },
    secondary:
      row.secondary_email === null || row.secondary_email === undefined
        ? null
        : {
            name: String(row.secondary_name),
            email: String(row.secondary_email),
            phone: row.secondary_phone === null ? null : String(row.secondary_phone),
            claimed: row.secondary_claimed === true,
          },
    isDemo: row.is_demo === true,
    licence:
      row.licence_state === null || row.licence_state === undefined
        ? null
        : {
            state: String(row.licence_state) as ClubLicence['state'],
            startsOn: String(row.licence_starts_on),
            endsOn: String(row.licence_ends_on),
            feeCents: row.licence_fee_cents === null ? null : Number(row.licence_fee_cents),
            currency: String(row.licence_currency ?? 'AUD'),
            note: row.licence_note === null ? null : String(row.licence_note),
          },
  }));

  const today = todayIn();
  const summary = summarise(clubs, today);
  const money = (cents: number) =>
    (cents / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

  return (
    <>
      <h2>Every club we support</h2>
      <p className="lede">
        Signed in as <strong>{user.email}</strong> &mdash; the platform owner, which is why this
        page exists and the club queue has nothing to show you. This account holds{' '}
        <strong>no membership at any club</strong>, deliberately: that is what keeps every
        ordinary policy denying it, and it is why you can see the whole portfolio here without
        being able to read inside any of it.
      </p>
      <p className="hint">
        <strong>What follows is club metadata and nothing else</strong> &mdash; names,
        jurisdictions, who is answerable, what was agreed commercially, and whether each tenant
        is finished. Never a person, a registration, a payment, a consent or a Working with
        Children Check. Reading a club&rsquo;s records means being given a role at that club by
        its own administrator, like anybody else.
      </p>

      <div className="summary-grid">
        <div className="stat">
          <span className="n">{summary.supported}</span>
          <span className="label">clubs supported</span>
        </div>
        <div className="stat">
          <span className="n">{summary.licensed}</span>
          <span className="label">licensed to use it</span>
        </div>
        <div className="stat">
          <span className="n">{summary.expiring}</span>
          <span className="label">renewal due</span>
        </div>
        <div className="stat">
          <span className="n">{summary.lapsed + summary.unlicensed}</span>
          <span className="label">lapsed or unlicensed</span>
        </div>
        <div className="stat">
          <span className="n">{money(summary.annualValueCents)}</span>
          <span className="label">agreed, per term</span>
        </div>
      </div>

      <p className="hint">
        The demonstration club is excluded from every count above &mdash; it is ours, not a
        customer. Only fees actually agreed are totalled, so a trial with no fee contributes
        nothing.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Clubs ({clubs.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Club</th>
              <th>Responsible</th>
              <th>Deputy</th>
              <th>Licence</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {clubs.map((club) => {
              const gaps = outstanding(club);
              return (
                <tr key={club.clubId}>
                  <td>
                    <strong>{club.name}</strong>
                    <br />
                    <span className="hint">
                      {club.jurisdiction} &middot;{' '}
                      {new Date(club.createdAt).toLocaleDateString('en-AU')}
                    </span>
                  </td>
                  <td>
                    {club.primary === null ? (
                      <span className="hint">&mdash;</span>
                    ) : (
                      <>
                        {club.primary.name}
                        <br />
                        <span className="hint">
                          {club.primary.email}
                          {club.primary.phone !== null && <> &middot; {club.primary.phone}</>}
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    {club.secondary === null ? (
                      <span className="pill pill-warn">none &mdash; single point of failure</span>
                    ) : (
                      <>
                        {club.secondary.name}
                        <br />
                        <span className="hint">
                          {club.secondary.email}
                          {club.secondary.phone !== null && <> &middot; {club.secondary.phone}</>}
                        </span>
                      </>
                    )}
                  </td>
                  <td>
                    {club.isDemo ? (
                      <span className="pill">demonstration &mdash; not a customer</span>
                    ) : (
                      <>
                        <LicencePill licence={club.licence} today={today} />
                        {club.licence?.feeCents != null && (
                          <>
                            <br />
                            <span className="hint">
                              {money(club.licence.feeCents)} {club.licence.currency} &middot;{' '}
                              {club.licence.startsOn} to {club.licence.endsOn}
                            </span>
                          </>
                        )}
                        {club.licence?.note != null && (
                          <>
                            <br />
                            <span className="hint">{club.licence.note}</span>
                          </>
                        )}
                        <LicenceForm
                          clubId={club.clubId}
                          clubName={club.name}
                          licence={club.licence}
                        />
                      </>
                    )}
                  </td>
                  <td>
                    {gaps.length === 0 ? (
                      <span className="pill pill-ok">ready</span>
                    ) : (
                      gaps.map((gap) => (
                        <span key={gap} className="pill pill-warn" style={{ marginRight: '0.3rem' }}>
                          {gap}
                        </span>
                      ))
                    )}
                    {gaps.length === 0 && !hasDeputy(club) && (
                      <span className="pill pill-warn" style={{ marginLeft: '0.3rem' }}>
                        no deputy
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ProvisionForm />
    </>
  );
}
