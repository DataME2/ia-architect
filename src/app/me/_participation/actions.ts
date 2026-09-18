'use server';

import { revalidatePath } from 'next/cache';

import { loadMe } from '../../../data/me.ts';
import { recordParticipationResponse } from '../../../data/participation.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseParticipationAnswer } from '../../../web/participation-answer.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { todayIn } from '../../../web/today.ts';

/**
 * A family's answer to a fixture (BR62, BR63).
 *
 * `answerDesignationAction`'s shape: the responder is **the signed-in
 * person**, resolved from their own link at this club and never read off
 * the form. The player being answered *for* is a form field, because unlike
 * a designation there is no pre-existing row to imply it — the database
 * still refuses an answer for anybody the signed-in person does not hold
 * authority over (migration 0054's `with check`).
 */
export async function answerParticipationAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  if (clubId === '') return formFailed('Which club?');

  const parsed = parseParticipationAnswer({
    personId: String(formData.get('personId') ?? ''),
    fixtureId: String(formData.get('fixtureId') ?? ''),
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

  const error = await recordParticipationResponse(
    client, clubId, parsed.fixtureId, parsed.personId, link.personId, parsed.status, parsed.reason,
  );

  revalidatePath('/me');
  if (error !== null) return formFailed(error);

  return formOk(
    parsed.status === 'available'
      ? 'Available — the coach can see it.'
      : 'Not available, with your reason. Only the coach sees why.',
  );
}
