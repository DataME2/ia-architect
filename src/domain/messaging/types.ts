/**
 * What a message is, before anything sends one.
 *
 * Pure — no provider, no client, no request. Composing a message and
 * deciding whether it may be sent are separable from dispatching it, and
 * keeping them separate is what makes *what a reminder says about a child*
 * testable without an outbox (BR131).
 */
import type { IsoDate } from '../types.ts';

/**
 * BR130. Two purposes, suppressed independently.
 *
 * `operational` is about something the recipient is already party to —
 * their own registration, their child's, an appointment they accepted.
 * `marketing` is everything else, and is the one that requires consent to
 * have been given in the first place (BR93).
 *
 * Conflating them produces one of two failures: a parent who left a
 * newsletter stops being told their child is missing a document, or a
 * person who wants no contact at all is told they may only refuse the
 * newsletter. The second is the one a platform is tempted into.
 */
export type MessagePurpose = 'operational' | 'marketing';

/** What actually happened, recorded either way (BR127). */
export type MessageOutcome = 'sent' | 'suppressed' | 'failed';

export interface SuppressionState {
  readonly operationalSuppressedAt: string | null;
  readonly marketingSuppressedAt: string | null;
}

export interface Recipient {
  readonly subscriberId: string;
  readonly personId: string;
  readonly email: string;
  readonly displayName: string;
  readonly suppression: SuppressionState;
}

/**
 * A composed message, with the unsubscribe link already in it.
 *
 * `unsubscribeUrl` is not optional and there is no variant without it.
 * BR128 requires the link in **every** message, and a type that permits one
 * without it is a type that will eventually produce one.
 */
export interface ComposedMessage {
  readonly templateKey: string;
  readonly templateVersion: number;
  readonly purpose: MessagePurpose;
  readonly subject: string;
  readonly body: string;
  readonly unsubscribeUrl: string;
  /** The Person the message is about, where that is not the recipient. */
  readonly aboutPersonId: string | null;
}

/** Everything a template needs that is not the recipient. */
export interface TemplateContext {
  readonly clubName: string;
  readonly unsubscribeUrl: string;
  readonly asAt: IsoDate;
}

export interface MessageTemplate<TInput> {
  readonly key: string;
  /**
   * Bumped whenever the wording changes.
   *
   * Recorded on every `message_log` row, so a message sent last season
   * stays explainable against the commit that produced it — without a
   * table holding a second copy of wording that lives in code.
   */
  readonly version: number;
  readonly purpose: MessagePurpose;
  readonly compose: (input: TInput, context: TemplateContext) => { subject: string; body: string };
}
