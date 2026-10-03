'use server';

import { revalidatePath } from 'next/cache';

import { submitDocument } from '../../../data/documents.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { checkDocumentFile } from '../../../web/document-upload.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

/**
 * A family sends a missing document (BR165). Who may is the database's
 * question — the bucket policy and `app_submit_registration_document` both
 * ask it — so this only checks the file and reports the answer.
 */
export async function uploadDocumentAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const registrationId = String(formData.get('registrationId') ?? '');
  const documentId = String(formData.get('documentId') ?? '');
  const documentType = String(formData.get('documentType') ?? '');
  const file = formData.get('file');
  if (clubId === '' || registrationId === '' || documentId === '') return formFailed('Which document?');
  if (!(file instanceof File)) return formFailed('Choose a file first.');

  const checked = checkDocumentFile(file);
  if (!checked.ok) return formFailed(checked.error);

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');

  const error = await submitDocument(client, {
    clubId, registrationId, documentId, documentType, file, extension: checked.extension,
  });
  revalidatePath('/me');
  return error === null
    ? formOk('Sent. The registrar marks it received once they have looked at it.')
    : formFailed(error.includes('BR165') ? 'Only whoever answers for this player may send their documents.' : error);
}
