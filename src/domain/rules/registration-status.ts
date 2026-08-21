/**
 * Where a registration's status should stand, given what the rules said.
 *
 * The player registration process
 * (`docs/ea/2_business/3_business-processes.md#player-registration-process`)
 * moves a registration from draft, through review, to complete. Until now
 * nothing in the code moved it at all: a registration created by a family
 * sat at `DRAFT` until a submission pack carried it away, and the two
 * statuses that exist to say *why* it is waiting — `PENDING_DOCUMENTS` and
 * `PENDING_PAYMENT` — were never once written. The queue could say a
 * registration was blocked; the registration itself could not.
 *
 * Deriving the status rather than storing a hand-set one is deliberate. A
 * status a human sets by hand drifts from the rules that justify it within
 * a season, and then two screens disagree about the same child.
 */
import type { RegistrationStatus } from '../types.ts';
import type { RuleId, RuleOutcome } from './types.ts';

/**
 * The order the club works in: a registration is not chased for money
 * until its paperwork stands up. So documents outrank payment, and
 * anything else outranks both — a missing guardian (BR1) or an unrecorded
 * collection notice (BR48) is not a reason to ask a family for money.
 */
const BLOCKING_STATUS: readonly (readonly [RuleId, RegistrationStatus])[] = [
  ['BR2', 'PENDING_DOCUMENTS'],
  ['BR3', 'PENDING_PAYMENT'],
];

/**
 * The status a registration should hold after evaluation.
 *
 * Two statuses are **never** derived here, and that is the load-bearing
 * part. `PENDING_EXTERNAL_REGISTRATION` is set when a pack is handed over,
 * and `COMPLETE` only when the federation confirms the player is present in
 * its system (BR43, BR60). Letting a clean rule sweep produce either would
 * mean the club's own screen could declare a child eligible to take the
 * field — which is precisely the mistake `src/domain/submission/status.ts`
 * exists to prevent, and it would be no better for being made here.
 */
export function statusFromValidation(
  current: RegistrationStatus,
  outcomes: readonly RuleOutcome[],
): RegistrationStatus {
  if (current === 'COMPLETE' || current === 'PENDING_EXTERNAL_REGISTRATION') {
    return current;
  }

  const failed = new Set(outcomes.filter((o) => o.status === 'fail').map((o) => o.ruleId));
  if (failed.size === 0) return 'DRAFT';

  for (const [ruleId, status] of BLOCKING_STATUS) {
    if (failed.has(ruleId)) return status;
  }

  // Blocked by something that is neither documents nor money — a missing
  // guardian, an unverified legal name. There is no status for "not valid
  // yet" other than the one it started in, and inventing one would be a
  // schema change to describe what the rule outcomes already say.
  return 'DRAFT';
}
