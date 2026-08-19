import type { RuleOutcome } from '../../domain/rules/types.ts';
import type { RegistrationStatus } from '../../domain/types.ts';

/**
 * Rule outcomes, showing the business rule number alongside the message.
 *
 * The number is on screen deliberately. It is the join between the running
 * system and `docs/ea/2_business/5_domain-context-and-rules.md`, so a
 * registrar reporting "BR55 again" is saying something precise, and a
 * developer can find the rule without translating prose.
 */
export function RuleList({ outcomes }: { readonly outcomes: readonly RuleOutcome[] }) {
  if (outcomes.length === 0) return null;

  return (
    <ul className="rules">
      {outcomes.map((outcome) => (
        <li key={outcome.ruleId}>
          <span className="rule-id">{outcome.ruleId}</span>
          <span
            className={`pill ${outcome.status === 'pass' ? 'pill-ok' : 'pill-stop'}`}
            aria-label={outcome.status === 'pass' ? 'Passing' : 'Blocking'}
          >
            {outcome.status === 'pass' ? 'OK' : 'Blocked'}
          </span>
          <span>{outcome.message}</span>
        </li>
      ))}
    </ul>
  );
}

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  DRAFT: 'Draft',
  PENDING_DOCUMENTS: 'Awaiting documents',
  PENDING_PAYMENT: 'Awaiting payment',
  // BR43/BR60: sent is not registered, and the label must not imply it is.
  PENDING_EXTERNAL_REGISTRATION: 'Sent — not yet registered',
  COMPLETE: 'Registered',
};

export function StatusPill({ status }: { readonly status: RegistrationStatus }) {
  const tone =
    status === 'COMPLETE'
      ? 'pill-ok'
      : status === 'PENDING_EXTERNAL_REGISTRATION'
        ? 'pill-warn'
        : 'pill-stop';
  return <span className={`pill ${tone}`}>{STATUS_LABEL[status]}</span>;
}
