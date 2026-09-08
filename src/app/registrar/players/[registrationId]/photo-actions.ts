'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../../data/queries.ts';
import { removePhotograph, storePhotograph } from '../../../../data/photos.ts';
import { createRequestClient, currentUser } from '../../../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../../../web/form-result.ts';
import { MAX_UPLOAD_BYTES } from '../../../../web/photo-crop.ts';

/**
 * Store a cropped identification photograph.
 *
 * What arrives is a JPEG the browser drew to a canvas — never the file the
 * user chose. That matters beyond size: a photograph off a phone carries
 * EXIF, very often including the GPS coordinates where it was taken, and a
 * child's photograph tagged with a location is a materially worse thing to
 * hold. Re-encoding drops it, and this action refuses anything that is not
 * the re-encoded result.
 */
export async function uploadPhotographAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const registrationId = String(formData.get('registrationId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  const file = formData.get('photo');

  if (personId === '') return formFailed('No player.');
  if (!(file instanceof File) || file.size === 0) {
    return formFailed('No image was received. Choose a photo and set the crop first.');
  }

  // The cropper produces JPEG at a fixed 512×512, so anything else here is
  // a caller that skipped the crop — which is the step that strips the
  // metadata.
  if (file.type !== 'image/jpeg') {
    return formFailed('That image was not processed by the cropper. Choose the photo again.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return formFailed('That image is too large.');
  }

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Not signed in.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  try {
    await storePhotograph(client, { clubId: tenant.clubId, personId, file });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // The BR56 trigger, almost always — and it is the one refusal worth
    // explaining rather than passing through as a database error.
    if (message.includes('BR56') || message.includes('identification-photograph consent')) {
      return formFailed(
        'This family has not consented to an identification photograph, so one cannot be held. ' +
          'The consent is recorded on the registration.',
      );
    }
    return formFailed(message);
  }

  revalidatePath(`/registrar/players/${registrationId}`);
  return formOk('Photograph saved.');
}

/**
 * Remove a photograph.
 *
 * Always available, deliberately: a consent withdrawn under BR48 or an
 * erasure honoured under BR49 must never be blocked by the record it
 * applies to.
 */
export async function removePhotographAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const registrationId = String(formData.get('registrationId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  const path = String(formData.get('path') ?? '');

  if (personId === '' || path === '') return formFailed('Nothing to remove.');

  const client = await createRequestClient();
  try {
    await removePhotograph(client, { personId, path });
  } catch (error) {
    return formFailed(error instanceof Error ? error.message : String(error));
  }

  revalidatePath(`/registrar/players/${registrationId}`);
  return formOk('Photograph removed.');
}
