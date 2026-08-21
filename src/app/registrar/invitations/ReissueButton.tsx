'use client';

import { useActionState } from 'react';

import { EMPTY_ISSUE_STATE } from '../../../web/invitation-view.ts';
import { reissueInvitationAction } from './actions.ts';

/**
 * Replace a link nobody can find any more.
 *
 * There is no "show the current link" button, and there cannot be: only the
 * token's hash is stored (BR73). This is the honest version of that request.
 */
export function ReissueButton({
  invitationId,
  seasonId,
  label,
  expiryDays,
}: {
  readonly invitationId: string;
  readonly seasonId: string;
  readonly label: string;
  readonly expiryDays: number;
}) {
  const [state, formAction, pending] = useActionState(reissueInvitationAction, EMPTY_ISSUE_STATE);

  return (
    <>
      <form action={formAction}>
        <input type="hidden" name="invitationId" value={invitationId} />
        <input type="hidden" name="seasonId" value={seasonId} />
        <input type="hidden" name="label" value={label} />
        <input type="hidden" name="expiryDays" value={expiryDays} />
        <button
          type="submit"
          className="secondary"
          disabled={pending}
          title="The old link cannot be shown again — only its fingerprint is stored"
        >
          {pending ? 'Replacing…' : 'Lost it? Reissue'}
        </button>
      </form>

      {state.error !== null && (
        <p className="hint" style={{ color: 'var(--stop-text)', fontWeight: 600 }}>
          {state.error}
        </p>
      )}

      {state.link !== null && (
        <div className="notice" style={{ marginTop: '0.6rem' }}>
          <p style={{ marginTop: 0 }}>
            <strong>New link for {state.label} — copy it now.</strong> The old one is revoked and
            no longer works. This is shown once and cannot be recovered (BR73).
          </p>
          <input
            type="text"
            readOnly
            value={state.link}
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Replacement registration link"
          />
        </div>
      )}
    </>
  );
}
