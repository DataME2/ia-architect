import type { SupabaseClient } from '@supabase/supabase-js';

import { loadCheckInStatus, loadSessions, loadWellbeing } from '../../../data/check-in.ts';
import type { IsoDate } from '../../../domain/types.ts';
import { weekOf } from '../../../web/academy.ts';
import { entriesMade, scoresLine } from '../../../web/check-in.ts';
import { shortDate } from '../../../web/me-view.ts';
import { Panel } from '../_workspaces/shared.tsx';
import { CheckInConsent, WithdrawCheckIn } from './CheckInConsent.tsx';

/**
 * The daily check-in on a workspace (scope 113). For the player: today's
 * status and the way in. For the guardian: BR185's agreement, then what
 * their child entered this week, read only (#107). Shown only to the
 * players BR184 names.
 */
export async function CheckInCard({
  client,
  clubId,
  clubName,
  personId,
  playerName,
  today,
  viewer,
}: {
  readonly client: SupabaseClient;
  readonly clubId: string;
  readonly clubName: string;
  readonly personId: string;
  readonly playerName: string;
  readonly today: IsoDate;
  /** `adult` is a player of 18 or over, who agrees for themselves. */
  readonly viewer: 'player' | 'adult' | 'guardian';
}) {
  const status = await loadCheckInStatus(client, clubId, personId);
  if (!status.applies) return null;
  const page = `/me/check-in?${new URLSearchParams({ club: clubId })}`;

  if (status.consent === null) {
    return (
      <Panel title="Daily check-in" meta="NOT AGREED YET">
        {viewer === 'guardian' ? (
          <CheckInConsent clubId={clubId} clubName={clubName} personId={personId} playerName={playerName} self={false} />
        ) : viewer === 'adult' ? (
          <p style={{ margin: 0 }}>
            Your academy team asks for a short check-in each day. <a href={page}>Read what it asks, and agree</a>.
          </p>
        ) : (
          <p className="empty" style={{ margin: 0 }}>
            Your academy team asks for a short check-in each day. Your parent or guardian needs to agree first, on
            their workspace.
          </p>
        )}
      </Panel>
    );
  }

  const week = weekOf(today);
  const [wellbeing, sessions] = await Promise.all([
    loadWellbeing(client, clubId, [personId], week.from, week.to),
    loadSessions(client, clubId, [personId], week.from, week.to),
  ]);
  const todays = wellbeing.find((e) => e.on === today);
  const [made] = entriesMade({
    players: [{ personId, consentedOn: status.consent.on }],
    wellbeing,
    sessions,
    from: week.from,
    to: week.to,
    today,
  });

  return (
    <Panel title={viewer === 'guardian' ? `${playerName}'s check-ins` : 'Today’s check-in'} meta={made === undefined ? undefined : `${made.checkedIn} OF ${made.asked} DAYS THIS WEEK`}>
      <p style={{ margin: 0 }}>
        <span className={todays === undefined ? 'pill pill-warn' : 'pill pill-ok'}>
          {todays === undefined ? 'Not done yet today' : 'Done for today'}
        </span>
      </p>
      {todays !== undefined && <p className="hint">{scoresLine(todays)}</p>}
      {viewer === 'guardian' ? (
        <>
          <p className="hint">
            You agreed on {shortDate(status.consent.on)}. You read these; only {playerName} writes them.
          </p>
          <WithdrawCheckIn clubId={clubId} personId={personId} />
        </>
      ) : (
        <p style={{ margin: 0 }}>
          <a className="button" href={page}>
            {todays === undefined ? 'Check in' : 'See today’s check-in'}
          </a>
        </p>
      )}
    </Panel>
  );
}
