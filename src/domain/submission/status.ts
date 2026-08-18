/**
 * Registration status transitions around submission.
 *
 * Isolated here because this is where BR60 is easiest to get wrong: the
 * tempting shortcut is to mark a registration COMPLETE when the pack goes
 * out, which would put a child on a team sheet who the federation has never
 * heard of.
 */
import type { RegistrationStatus } from '../types.ts';
import type { SubmissionState } from './types.ts';

/**
 * After a pack carrying this registration is handed over.
 *
 * Always `PENDING_EXTERNAL_REGISTRATION` — the eligibility gate (BR43) —
 * and never `COMPLETE`.
 */
export function statusAfterHandover(current: RegistrationStatus): RegistrationStatus {
  if (current === 'COMPLETE') return 'COMPLETE';
  return 'PENDING_EXTERNAL_REGISTRATION';
}

/**
 * After the federation tells us what happened to a record.
 *
 * Only a confirmed presence in the governing body's system completes a
 * registration. A rejection sends it back to the registrar; silence changes
 * nothing, which is why there is no third case here.
 */
export function statusAfterSubmissionOutcome(
  current: RegistrationStatus,
  outcome: SubmissionState,
): RegistrationStatus {
  switch (outcome) {
    case 'confirmed_present':
      return 'COMPLETE';
    case 'rejected':
      return 'PENDING_DOCUMENTS';
    case 'sent':
      return statusAfterHandover(current);
  }
}

/** Whether a Player may take the field (BR43, BR60). */
export function isEligibleToPlay(status: RegistrationStatus): boolean {
  return status === 'COMPLETE';
}
