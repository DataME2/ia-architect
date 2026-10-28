'use server';

import { redirect } from 'next/navigation';

import { createRequestClient } from '../../data/server.ts';
import { alertPlatform, recordInterest } from '../../data/enquiries.ts';
import { formFailed, type FormResult } from '../../web/form-result.ts';
import { parseEnquiryForm } from '../../web/enquiry-form.ts';

/**
 * Records a club's expression of interest.
 *
 * **No session of any kind is created**, and that is the difference from
 * `enterDemoAction` next door, which signs the visitor in anonymously so
 * the demonstration club can be reached through the security model. Nothing
 * here needs a subject: `record_interest` writes one row to a table that is
 * outside the tenant world entirely (BR92), and the caller gets nothing
 * back but an acknowledgement.
 *
 * That is BR145 in the one place it would be easiest to erode. The natural
 * next feature after an interest form is "and let them in while they are
 * here", and [decision 7](../../../docs/decisions/7_tenant-provisioning-by-owner-issued-invitation.md)
 * refuses it on commercial grounds before security ones: the first year is
 * A$12,000 including onboarding and migration, and an empty tenant is worth
 * nothing to a prospect anyway — the value is *their* data migrated.
 */
export async function recordInterestAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  // The honeypot: a field no person can see, so a tick means a bot. It is
  // shown the same thank-you page and nothing is recorded, because telling
  // a bot it was caught teaches it which field to skip.
  if (formData.get('botcheck') !== null) redirect('/interest/thank-you');

  const parsed = parseEnquiryForm(formData);
  if (!parsed.ok) return formFailed(parsed.error);

  const client = await createRequestClient();

  // **Alert first, then record — and the order is the design.**
  //
  // The alert's whole content comes from the form that was just submitted,
  // so it needs nothing from the database. Sending first lets the outcome
  // be written by the same call that creates the lead, which is what avoids
  // a second public function whose only job is to mark a row as notified —
  // and that function would have to be reachable by `anon`, since this path
  // is anonymous by definition, letting any stranger write a misleading
  // delivery record into a sales log.
  //
  // The failure this ordering risks is the alert arriving for a lead whose
  // row did not save. That is the harmless direction: the alert carries the
  // club's details, so nothing is lost. The reverse — recorded and nobody
  // told — is the gap being closed.
  //
  // `alertPlatform` never throws and gives up after five seconds, because
  // the enquirer is watching a spinner and a club that typed its details
  // and got an error because an email provider was down has been failed
  // twice.
  const notification = await alertPlatform(parsed.enquiry);

  try {
    await recordInterest(client, parsed.enquiry, notification);
  } catch (error) {
    return formFailed(
      error instanceof Error
        ? `We could not record that: ${error.message}`
        : 'We could not record that. Please email us instead.',
    );
  }

  // The thank-you page says what happens next: a club that has just typed
  // its name wants to know whether somebody will reply and roughly when.
  // Outside the try above, because `redirect` works by throwing.
  redirect(parsed.enquiry.wantsDemo ? '/interest/thank-you?request=demo' : '/interest/thank-you');
}
