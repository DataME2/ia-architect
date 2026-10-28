/**
 * The copy of an enquiry the visitor's browser sends to the operator's
 * inbox through Web3Forms (BR189).
 *
 * **The browser, because Web3Forms refuses servers** on its free plan (it
 * answers "Use our API in client side"), and **a copy, not the record**: the
 * `prospect` row is written by `record_interest` either way, and nothing
 * here can say whether this arrived — so nothing records that it did.
 *
 * Built from `composeEnquiryAlert`, the composer the Resend alert uses, so
 * the two copies cannot say different things.
 */
import { composeEnquiryAlert } from '../domain/messaging/platform-alert.ts';
import type { ClubEnquiry } from './enquiry-form.ts';

export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

export function relayPayload(enquiry: ClubEnquiry, accessKey: string): Record<string, string> {
  const alert = composeEnquiryAlert(enquiry);
  return {
    access_key: accessKey,
    subject: alert.subject,
    from_name: 'PitchPeople',
    // Replying from the inbox goes to the club, not back to Web3Forms.
    replyto: enquiry.email,
    message: alert.body,
  };
}
