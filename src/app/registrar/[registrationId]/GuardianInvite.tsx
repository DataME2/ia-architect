'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { inviteGuardianAction } from '../actions.ts';
import type { GuardianCandidate } from '../../../data/family.ts';

/**
 * Invite a guardian to their own workspace (BR126, scope 35 WP4).
 *
 * Only rendered by the caller once the registration is COMPLETE — the
 * database enforces the same gate independently (BR126's trigger), so this
 * component's job is showing the *reason* clearly, not re-deriving the rule.
 */
export function GuardianInvite({
  registrationId,
  guardians,
}: {
  readonly registrationId: string;
  readonly guardians: readonly GuardianCandidate[];
}) {
  const [state, formAction, pending] = useActionState(inviteGuardianAction, IDLE_FORM);

  if (guardians.length === 0) {
    return (
      <p className="hint" style={{ margin: 0 }}>
        No guardian is recorded for this player, so there is nobody to invite.
      </p>
    );
  }

  return (
    <div className="stack">
      <FormNotice result={state} />
      <ul className="check" style={{ margin: 0 }}>
        {guardians.map((g) => (
          <li key={g.personId}>
            <span className={`box ${g.claimedAt !== null ? 'done' : 'todo'}`} aria-hidden="true" />
            <span>
              <span className="ctitle">{g.name}</span>
              <br />
              <span className="cnote">
                {g.claimedAt !== null
                  ? `Signed in to their workspace`
                  : g.invitedAt !== null
                    ? `Invited, not yet signed in`
                    : g.email === null
                      ? 'No email address on record'
                      : g.email}
              </span>
            </span>
            {g.claimedAt === null && g.email !== null && (
              <form action={formAction}>
                <input type="hidden" name="registrationId" value={registrationId} />
                <input type="hidden" name="guardianPersonId" value={g.personId} />
                <input type="hidden" name="email" value={g.email} />
                <button type="submit" className="secondary" disabled={pending}>
                  {pending ? 'Sending…' : g.invitedAt !== null ? 'Resend' : 'Invite'}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
