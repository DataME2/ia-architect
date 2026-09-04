import { notFound } from 'next/navigation';

import { createRequestClient, currentUser } from '../../data/server.ts';
import { hasDeputy, outstanding, type PlatformClub } from '../../web/platform-view.ts';
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

  const clubs: PlatformClub[] = (data ?? []).map((row: Record<string, unknown>) => ({
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
  }));

  return (
    <>
      <h2>Platform</h2>
      <p className="lede">
        Signed in as {user.email}. This console creates clubs and reads nothing inside one
        &mdash; no person, no registration, no payment, no card. That boundary is the whole
        reason it exists in this shape.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Clubs ({clubs.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Club</th>
              <th>Responsible</th>
              <th>Deputy</th>
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
