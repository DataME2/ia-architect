import type { SupabaseClient } from '@supabase/supabase-js';

import { loadNightAnswers, loadNightMarks, loadNights } from '../../../data/academy.ts';
import { addDays, nightLabel } from '../../../web/academy.ts';
import { participationBanner } from '../../../web/participation-answer.ts';
import { AvailabilityAnswer } from '../_participation/AvailabilityAnswer.tsx';
import { Panel } from '../_workspaces/shared.tsx';

/**
 * A player's next seven days of training, answered like a fixture (BR62),
 * and how many nights they trained this season. For the player from
 * thirteen and for the guardian; under thirteen the player only reads.
 */
export async function TrainingWeek({
  client,
  clubId,
  teamId,
  personId,
  seasonFrom,
  today,
  canAnswer,
}: {
  readonly client: SupabaseClient;
  readonly clubId: string;
  readonly teamId: string;
  readonly personId: string;
  readonly seasonFrom: string;
  readonly today: string;
  readonly canAnswer: boolean;
}) {
  const [coming, past] = await Promise.all([
    loadNights(client, clubId, [teamId], today, addDays(today, 6)),
    loadNights(client, clubId, [teamId], seasonFrom, addDays(today, -1)),
  ]);
  const open = coming.filter((n) => !n.cancelled);
  const [answers, marks] = await Promise.all([
    loadNightAnswers(client, clubId, open.map((n) => n.id)),
    loadNightMarks(client, clubId, past.map((n) => n.id)),
  ]);
  const mine = marks.filter((m) => m.personId === personId);
  const trained = mine.filter((m) => m.mark !== 'absent').length;

  return (
    <Panel title="Training this week" meta={mine.length === 0 ? undefined : `TRAINED ${trained} OF ${mine.length} MARKED`}>
      {coming.length === 0 ? (
        <p className="empty" style={{ margin: 0 }}>
          No training night entered for the next seven days.
        </p>
      ) : (
        <ul className="roster">
          {coming.map((night) => {
            const a = answers.find((x) => x.sessionId === night.id && x.personId === personId);
            const response = a === undefined ? null : { status: a.available ? 'available' : 'not_available', reason: a.reason } as const;
            const banner = participationBanner(response);
            return (
              <li key={night.id} className="stack">
                <span className="who">{nightLabel(night)}</span>
                {night.cancelled ? (
                  <span className="pill">Cancelled</span>
                ) : canAnswer ? (
                  <AvailabilityAnswer clubId={clubId} sessionId={night.id} personId={personId} response={response} />
                ) : (
                  <span className={banner.className}>{banner.label}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
