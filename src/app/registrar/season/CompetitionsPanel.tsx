'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import type { Competition } from '../../../domain/competition/types.ts';
import { setClubCompetitionAction } from './actions.ts';

/**
 * Which competitions this club plays in (BR134).
 *
 * The catalogue itself is shared and read-only here — a club that could
 * edit it is how per-club copies start disagreeing again
 * (decision 15). What *is* the club's own business is which of them it
 * plays in, and that is an ordinary tenant-scoped row.
 */
export function CompetitionsPanel({
  seasonId,
  catalogue,
  playing,
}: {
  readonly seasonId: string;
  readonly catalogue: readonly Competition[];
  readonly playing: readonly string[];
}) {
  const [result, action, pending] = useActionState(setClubCompetitionAction, IDLE_FORM);

  if (catalogue.length === 0) {
    return (
      <p className="hint" style={{ margin: 0 }}>
        The competition catalogue is empty. It is maintained centrally, so ask the platform owner to
        add your association&rsquo;s competitions — until then a fixture can still be recorded with
        no competition, and BR8 will say it has nothing to compare an official against.
      </p>
    );
  }

  return (
    <div className="stack">
      <FormNotice result={result} />
      <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
        {catalogue.map((c) => {
          const plays = playing.includes(c.id);
          return (
            <li key={c.id}>
              <form action={action} style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
                <input type="hidden" name="seasonId" value={seasonId} />
                <input type="hidden" name="competitionId" value={c.id} />
                <input type="hidden" name="plays" value={plays ? 'no' : 'yes'} />
                <span style={{ flex: '1 1 auto' }}>
                  <strong>{c.name}</strong>
                  {c.tier !== null && <> · {c.tier}</>}
                  {c.playingFormat !== null && <> · {c.playingFormat}</>}
                  <br />
                  <span className="hint">
                    {c.minimum === null
                      ? 'No minimum classification stated — BR8 has nothing to compare against.'
                      : `Officials must be ${c.minimum.name} or above (BR8).`}
                  </span>
                </span>
                <button type="submit" disabled={pending}>
                  {plays ? 'Remove' : 'We play in this'}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
