/**
 * The shape every business rule takes.
 *
 * A rule is a pure function from a context to an outcome. No I/O, no
 * database, no framework — so BR1–BR55 are unit-testable in isolation and
 * the rule set can be diffed against
 * `docs/ea/2_business/5_domain-context-and-rules.md` by a human.
 */
import type { PaymentPlan, Payment } from '../finance/types.ts';
import type { Consent, Guardianship, IsoDate, Person, Registration } from '../types.ts';

/**
 * The business rule's number, e.g. `BR1`.
 *
 * Persisted on every `validation_result` row rather than the prose, because
 * the wording can be reworded and the identifier is the join between the
 * running system and the architecture.
 */
export type RuleId = `BR${number}`;

export type RuleStatus = 'pass' | 'fail';

export interface RuleOutcome {
  readonly ruleId: RuleId;
  readonly status: RuleStatus;
  /** Plain enough for a registrar or a guardian to act on. */
  readonly message: string;
}

export interface RegistrationContext {
  readonly registration: Registration;
  readonly person: Person;
  /** Guardianships where `personId` is the registering Person. */
  readonly guardianships: readonly Guardianship[];
  /** Consents held for the registering Person. */
  readonly consents: readonly Consent[];
  /** The live payment plan for this registration, or `null` if the fee is due in full. */
  readonly paymentPlan: PaymentPlan | null;
  /** Everything received against this registration, oldest first. */
  readonly payments: readonly Payment[];
  /** The date the rules are evaluated against. */
  readonly asAt: IsoDate;
}

export interface RegistrationRule {
  readonly id: RuleId;
  /** One line, matching the business rule's intent. */
  readonly summary: string;
  readonly evaluate: (context: RegistrationContext) => RuleOutcome;
}

export function pass(ruleId: RuleId, message: string): RuleOutcome {
  return { ruleId, status: 'pass', message };
}

export function fail(ruleId: RuleId, message: string): RuleOutcome {
  return { ruleId, status: 'fail', message };
}
