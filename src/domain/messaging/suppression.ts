/**
 * Whether a message may be sent — asked before a provider is ever reached.
 *
 * BR129 puts this decision here rather than at the email vendor. A
 * withdrawal recorded only in a vendor's dashboard is lost the day the
 * vendor changes, and sits under their access rules instead of the ones
 * protecting everything else a club holds (BR68).
 *
 * The shape mirrors the rules engine deliberately: a verdict carrying a
 * reason a human can read, because the reason is written to the log and a
 * registrar has to act on it (ring them, per BR130).
 */
import type { MessagePurpose, Recipient, SuppressionState } from './types.ts';

export type SendVerdict =
  | { readonly send: true }
  | { readonly send: false; readonly reason: string };

export function suppressedFor(
  suppression: SuppressionState,
  purpose: MessagePurpose,
): boolean {
  return purpose === 'marketing'
    ? suppression.marketingSuppressedAt !== null
    : suppression.operationalSuppressedAt !== null;
}

/**
 * The gate every send passes through.
 *
 * Note what is *not* here: no override, no `force`, no "important enough"
 * flag. A withdrawal that the sender can overrule is not a withdrawal, and
 * the argument for an exception is always that this particular message
 * really matters.
 */
export function sendVerdict(recipient: Recipient, purpose: MessagePurpose): SendVerdict {
  if (recipient.email.trim() === '') {
    return { send: false, reason: 'No email address recorded for this person.' };
  }

  if (suppressedFor(recipient.suppression, purpose)) {
    return purpose === 'marketing'
      ? { send: false, reason: 'They have unsubscribed from club news.' }
      // Said plainly, because the registrar's next move is a phone call.
      : { send: false, reason: 'They have asked not to be emailed — contact them another way.' };
  }

  return { send: true };
}

/** For the screen: the officer needs to see this before they compose. */
export function contactability(recipient: Recipient): string {
  const { operationalSuppressedAt, marketingSuppressedAt } = recipient.suppression;
  if (operationalSuppressedAt !== null) return 'Cannot be emailed';
  if (marketingSuppressedAt !== null) return 'No club news';
  return 'Contactable';
}
