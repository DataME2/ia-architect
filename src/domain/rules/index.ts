/**
 * The registration rule set, and the evaluator that runs it.
 *
 * Adding a rule means adding it to `REGISTRATION_RULES`. Nothing else in the
 * application knows the list, so the registry is the single place the code
 * and `docs/ea/2_business/5_domain-context-and-rules.md` are compared.
 */
import { br1GuardianRequired } from './br1-guardian-required.ts';
import { br2RequiredDocuments } from './br2-required-documents.ts';
import { br3OutstandingPayment } from './br3-outstanding-payment.ts';
import { br48ConsentRecorded } from './br48-consent-recorded.ts';
import { br55LegalNameVerified } from './br55-legal-name-verified.ts';
import type { RegistrationContext, RegistrationRule, RuleOutcome } from './types.ts';

export const REGISTRATION_RULES: readonly RegistrationRule[] = [
  br55LegalNameVerified,
  br1GuardianRequired,
  br48ConsentRecorded,
  br2RequiredDocuments,
  br3OutstandingPayment,
];

/**
 * Runs every rule and returns every outcome — passes included.
 *
 * Returning passes as well as failures is deliberate: the registrar's screen
 * shows what is done as well as what is left, and a persisted pass is what
 * lets question #32's decomposition be a query later rather than a new
 * instrumentation project.
 */
export function evaluateRegistration(context: RegistrationContext): readonly RuleOutcome[] {
  return REGISTRATION_RULES.map((rule) => rule.evaluate(context));
}

/** The failures only, in rule order. */
export function blockers(outcomes: readonly RuleOutcome[]): readonly RuleOutcome[] {
  return outcomes.filter((o) => o.status === 'fail');
}

/**
 * Whether the registration may move to COMPLETE.
 *
 * Note what this does *not* say: a complete registration is not an eligible
 * one. Eligibility is the governing body's to confer (BR43, BR60), and the
 * status after this passes is `PENDING_EXTERNAL_REGISTRATION`, not
 * `COMPLETE`, until the player is confirmed present in their system.
 */
export function canComplete(context: RegistrationContext): boolean {
  return blockers(evaluateRegistration(context)).length === 0;
}

export * from './types.ts';
