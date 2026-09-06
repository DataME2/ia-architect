import { notFound, redirect } from 'next/navigation';

import { loadRegistrationDetail, loadSeasons, loadTenantContext } from '../../../../data/queries.ts';
import { loadAppearances, loadFixtures, loadPlayerProfile } from '../../../../data/performance.ts';
import { createRequestClient, currentUser } from '../../../../data/server.ts';
import { mostRecentFirst, seasonRecord } from '../../../../domain/performance/season-record.ts';
import { displayNameFor, fullLegalName } from '../../../../web/queue-view.ts';
import {
  FOOT_LABEL,
  POSITION_LABEL,
  hasPhysique,
  heightLabel,
  ineligibleAppearances,
  recordSummary,
  weightLabel,
} from '../../../../web/player-view.ts';
import { todayIn } from '../../../../web/today.ts';
import { StatusPill } from '../../../_components/rules.tsx';
import { AppearanceForm, PlayerProfileForm } from './PlayerForms.tsx';

export const dynamic = 'force-dynamic';

/**
 * One player's record for one season.
 *
 * Staff-facing only, and that is what keeps the photograph inside the
 * consent it was collected under: BR56 grants the headshot for
 * identification, and a registrar looking at a player record is still
 * identifying that player. Showing this card to a family, a player, or
 * anyone outside the club is a different purpose and needs its own consent
 * (BR100) — which is why there is no share button and no export.
 */
export default async function PlayerPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly registrationId: string }>;
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const { registrationId } = await params;
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  const seasons = await loadSeasons(client, tenant.clubId);
  const params2 = await searchParams;
  const season = seasons.find((s) => s.id === params2.season) ?? seasons[0];
  if (season === undefined) notFound();

  const detail = await loadRegistrationDetail(
    client,
    tenant.clubId,
    season.id,
    registrationId,
    todayIn(),
  );
  if (detail === null) notFound();

  const [profile, appearances, fixtures] = await Promise.all([
    loadPlayerProfile(client, registrationId),
    loadAppearances(client, registrationId),
    loadFixtures(client, tenant.clubId, season.id),
  ]);

  const record = seasonRecord(appearances);
  const recent = mostRecentFirst(appearances);
  const flags = ineligibleAppearances({
    appearances: record.appearances,
    outstandingCents: detail.entry.outstandingCents,
    federationConfirmed: detail.entry.status === 'COMPLETE',
  });

  const fixtureOptions = fixtures.map((f) => ({
    id: f.id,
    label: `${f.played_on} · ${f.home_away === 'home' ? 'v' : 'at'} ${f.opponent}`,
  }));

  return (
    <>
      <p style={{ marginBottom: '0.25rem' }}>
        <a href={`/registrar/${registrationId}?season=${season.id}`}>
          &larr; Back to the registration
        </a>
      </p>

      <h2>
        {displayNameFor(detail.person)} &mdash; {season.name}
      </h2>
      <p className="lede">Legal name: {fullLegalName(detail.person)}</p>

      {/* The card. Photograph, physique and the season's record together —
          which is the only place in the product they appear together, and
          the reason BR100 draws a line around who may see it. */}
      <div className="card player-card">
        <div className="player-card-head">
          <div className="player-photo" aria-hidden={detail.person.photoPath === null}>
            {detail.person.photoPath === null ? (
              <span className="player-photo-empty">No photo</span>
            ) : (
              <span className="player-photo-empty">Photo on file</span>
            )}
          </div>

          <div style={{ flex: '1 1 14rem', minWidth: 0 }}>
            <p className="name" style={{ margin: 0 }}>
              {profile?.squadNumber != null && (
                <span className="squad-number">{profile.squadNumber}</span>
              )}
              {displayNameFor(detail.person)}
            </p>
            <p className="hint" style={{ margin: '0.2rem 0 0.6rem' }}>
              {profile?.preferredPosition != null
                ? POSITION_LABEL[profile.preferredPosition]
                : 'Position not recorded'}
              {profile?.secondaryPosition != null && (
                <> &middot; also {POSITION_LABEL[profile.secondaryPosition]?.toLowerCase()}</>
              )}
              {profile?.preferredFoot != null && (
                <> &middot; {FOOT_LABEL[profile.preferredFoot]?.toLowerCase()} footed</>
              )}
            </p>
            <StatusPill status={detail.entry.status} />
          </div>

          <div className="player-figures">
            <div className="stat">
              <span className="n">{record.appearances}</span>
              <span className="label">appearances</span>
            </div>
            <div className="stat">
              <span className="n">{record.minutesPlayed}</span>
              <span className="label">minutes</span>
            </div>
            <div className="stat">
              <span className="n">{record.goals}</span>
              <span className="label">goals</span>
            </div>
            <div className="stat">
              <span className="n">{record.assists}</span>
              <span className="label">assists</span>
            </div>
          </div>
        </div>

        <p className="prose" style={{ margin: '0.9rem 0 0' }}>
          {recordSummary(record)}
        </p>

        {hasPhysique(profile) && (
          <p className="hint" style={{ margin: '0.35rem 0 0' }}>
            {heightLabel(profile?.heightCm ?? null) ?? 'Height not recorded'} &middot;{' '}
            {weightLabel(profile?.weightKg ?? null) ?? 'weight not recorded'}
            {profile != null && <> &middot; recorded {profile.recordedOn}</>}
          </p>
        )}
      </div>

      {flags.map((flag) => (
        <p key={flag.reason} className="notice" role="status">
          <strong>Took the field while ineligible.</strong> {flag.reason}
        </p>
      ))}

      <PlayerProfileForm registrationId={registrationId} profile={profile} />
      <AppearanceForm
        registrationId={registrationId}
        personId={detail.person.id}
        fixtures={fixtureOptions}
      />

      <h3>Appearances</h3>
      {recent.length === 0 ? (
        <p className="hint">
          Nothing recorded yet. Every number on this page comes from somebody who was at the
          game &mdash; there is no fixture feed and no match report to read from.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Min</th>
                <th>G</th>
                <th>A</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.fixtureId}>
                  <td>{a.playedOn}</td>
                  <td>
                    {a.homeAway === 'home' ? 'v' : a.homeAway === 'away' ? 'at' : 'vs'}{' '}
                    {a.opponent}
                    {a.competition !== null && <span className="hint"> &middot; {a.competition}</span>}
                    {!a.started && <span className="hint"> &middot; substitute</span>}
                  </td>
                  <td>{a.minutesPlayed}</td>
                  <td>{a.goals}</td>
                  <td>{a.assists}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="hint">
        <strong>Where these numbers come from.</strong> Somebody at the club entered them after
        the game. There is no fixture feed, no referee report and no opposition cross-check, so
        every figure here is one person&rsquo;s recollection and each row records whose (BR101).
        Shots, big chances and expected goals need event data with pitch coordinates &mdash;
        designed in <span className="mono">scope 30 §5</span> and deliberately not built.
      </p>
    </>
  );
}
