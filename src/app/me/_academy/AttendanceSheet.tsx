'use client';

import { useActionState } from 'react';

import { MARK_LABEL, type AttendanceMark } from '../../../web/academy.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { participationBanner } from '../../../web/participation-answer.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { markAttendanceAction } from './actions.ts';

export interface SheetRow {
  readonly personId: string;
  readonly name: string;
  /** The player's own answer (BR62), shown to the coach with its reason. */
  readonly answer: { readonly available: boolean; readonly reason: string | null } | null;
  readonly mark: { readonly mark: AttendanceMark; readonly reason: string | null } | null;
}

/**
 * One training night's sheet: each player's answer beside the coach's mark.
 * A night still to come shows the answers only; nobody is missing from it yet.
 */
export function AttendanceSheet({
  clubId,
  sessionId,
  held,
  rows,
}: {
  readonly clubId: string;
  readonly sessionId: string;
  readonly held: boolean;
  readonly rows: readonly SheetRow[];
}) {
  const [state, formAction, pending] = useActionState(markAttendanceAction, IDLE_FORM);
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <table className="sheet">
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Said</th>
            {held && <th scope="col">Came</th>}
            {held && <th scope="col">Why not (optional)</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const said = participationBanner(
              r.answer === null ? null : { status: r.answer.available ? 'available' : 'not_available', reason: r.answer.reason },
            );
            return (
              <tr key={r.personId}>
                <th scope="row">
                  {r.name}
                  <input type="hidden" name="player" value={r.personId} />
                </th>
                <td>
                  <span className={said.className}>{said.label}</span>
                  {r.answer?.reason != null && <span className="hint"> {r.answer.reason}</span>}
                </td>
                {held && (
                  <td>
                    <select name={`mark:${r.personId}`} defaultValue={r.mark?.mark ?? ''} aria-label={`Did ${r.name} train?`}>
                      <option value="">Not marked</option>
                      {(Object.keys(MARK_LABEL) as AttendanceMark[]).map((m) => (
                        <option key={m} value={m}>
                          {MARK_LABEL[m]}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                {held && (
                  <td>
                    <input
                      name={`reason:${r.personId}`}
                      type="text"
                      maxLength={300}
                      defaultValue={r.mark?.reason ?? ''}
                      aria-label={`Why ${r.name} did not train`}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {held && (
        <>
          <FormNotice result={state} />
          <p style={{ margin: 0 }}>
            <button type="submit" disabled={pending}>
              {pending ? 'Working…' : 'Save marks'}
            </button>
          </p>
        </>
      )}
    </form>
  );
}
