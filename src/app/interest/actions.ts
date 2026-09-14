'use server';

import { createRequestClient } from '../../data/server.ts';
import { recordInterest } from '../../data/enquiries.ts';
import { formFailed, formOk, type FormResult } from '../../web/form-result.ts';
import { parseEnquiry } from '../../web/enquiry-form.ts';

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
  const parsed = parseEnquiry({
    clubName: formData.get('clubName'),
    email: formData.get('email'),
    contactName: formData.get('contactName'),
    contactRole: formData.get('contactRole'),
    jurisdiction: formData.get('jurisdiction'),
    clubSize: formData.get('clubSize'),
    currentSystem: formData.get('currentSystem'),
    note: formData.get('note'),
    phone: formData.get('phone'),
    marketingConsent: formData.get('marketingConsent'),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  const client = await createRequestClient();

  try {
    await recordInterest(client, parsed.enquiry);
  } catch (error) {
    return formFailed(
      error instanceof Error
        ? `We could not record that: ${error.message}`
        : 'We could not record that. Please email us instead.',
    );
  }

  // Says what happens next, not "thank you". A club that has just typed its
  // name wants to know whether somebody is going to reply and roughly when.
  return formOk(
    `Thank you — we have ${parsed.enquiry.clubName} down. We read these ourselves and will ` +
      'reply to you directly, usually within two business days.',
  );
}
