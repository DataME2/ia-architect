'use server';

import { revalidatePath } from 'next/cache';

import { answerDesignation } from '../../../data/designations.ts';
import { loadMe } from '../../../data/me.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseAnswer } from '../../../web/designation-answer.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { todayIn } from '../../../web/today.ts';

/**
 * A family's answer to a designation (BR113).
 *
 * The answerer is **the signed-in person**, resolved from their own link at
 * this club and never read off the form. A form field naming who answered
 * would be a field somebody could change; the database would still refuse
 * an answer recorded in a name that is not the caller's (0045's `with
 * check`), but a screen that offers the choice at all invites the attempt.
 */
export async function answerDesignationAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  if (clubId === '') return formFailed('Which club?');

  const parsed = parseAnswer({
    id: String(formData.get('appointmentId') ?? ''),
    answer: String(formData.get('answer') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.message);

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');

  const me = await loadMe(client, user.id, todayIn());
  const link = me.links.find((l) => l.clubId === clubId);
  if (link === undefined) return formFailed('That is not your club.');

  const error = await answerDesignation(
    client, clubId, parsed.id, link.personId, parsed.accept, parsed.reason,
  );

  revalidatePath('/me');
  if (error !== null) return formFailed(error);

  return formOk(
    parsed.accept
      ? 'Accepted. The club can see the answer, and it is recorded as yours.'
      : 'Declined, with your reason. The coordinator will find somebody else.',
  );
}
