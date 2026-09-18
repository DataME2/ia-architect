'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { invitePlayerAction } from '../actions.ts';
import type { PlayerInvitationStatus } from '../../../data/player-invitation.ts';

/**
 * Invite the player themselves to their own workspace (BR150, scope 64).
 *
 * `GuardianInvite`'s shape for one person rather than a list — a
 * registration has exactly one player. Only rendered by the caller once
 * both BR150 conditions plausibly hold (COMPLETE, thirteen or over); the
 * database enforces both independently regardless.
 */
export function PlayerInvite({
  registrationId,
  personId,
  email,
  status,
}: {
  readonly registrationId: string;
  readonly personId: string;
  readonly email: string | null;
  readonly status: PlayerInvitationStatus | null;
}) {
  const [state, formAction, pending] = useActionState(invitePlayerAction, IDLE_FORM);

  return (
    <div className="stack">
      <FormNotice result={state} />
      <ul className="check" style={{ margin: 0 }}>
        <li>
          <span className={`box ${status?.claimedAt != null ? 'done' : 'todo'}`} aria-hidden="true" />
          <span>
            <span className="ctitle">Player workspace</span>
            <br />
            <span className="cnote">
              {status?.claimedAt != null
                ? 'Signed in to their own workspace'
                : status?.invitedAt != null
                  ? 'Invited, not yet signed in'
                  : email === null
                    ? 'No email address on record'
                    : email}
            </span>
          </span>
          {status?.claimedAt == null && email !== null && (
            <form action={formAction}>
              <input type="hidden" name="registrationId" value={registrationId} />
              <input type="hidden" name="personId" value={personId} />
              <input type="hidden" name="email" value={email} />
              <button type="submit" className="secondary" disabled={pending}>
                {pending ? 'Sending…' : status?.invitedAt != null ? 'Resend' : 'Invite'}
              </button>
            </form>
          )}
        </li>
      </ul>
    </div>
  );
}
