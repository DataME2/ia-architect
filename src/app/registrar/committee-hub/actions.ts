'use server';

import { revalidatePath } from 'next/cache';

import { fileHubDocument, linkHubDocument, removeHubDocument, saveHubSettings } from '../../../data/committee-hub.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { checkHubFile, isHubKind, isSharePointUrl } from '../../../web/committee-hub.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Sign in first.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('No club.');
  return { client, user, tenant };
}

const blank = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};

/** File minutes, an agenda or a report (BR168): an upload, or a SharePoint link. */
export async function fileHubDocumentAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const kind = String(formData.get('kind') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  if (!isHubKind(kind)) return formFailed('What kind of document is it?');
  if (title === '') return formFailed('Give it a title, such as "Minutes, October committee meeting".');

  const { client, user, tenant } = await requireTenant();
  const base = {
    clubId: tenant.clubId,
    kind,
    title,
    meetingOn: blank(formData.get('meetingOn')),
    termId: blank(formData.get('termId')),
    resolutionId: blank(formData.get('resolutionId')),
    filedByUserId: user.id,
  };

  const url = blank(formData.get('url'));
  let error: string | null;
  if (url !== null) {
    if (!isSharePointUrl(url)) return formFailed('A SharePoint link starts https://<your-club>.sharepoint.com/.');
    error = await linkHubDocument(client, { ...base, url });
  } else {
    const file = formData.get('file');
    if (!(file instanceof File)) return formFailed('Choose a file, or paste the SharePoint link.');
    const checked = checkHubFile(file);
    if (!checked.ok) return formFailed(checked.error);
    error = await fileHubDocument(client, { ...base, file, extension: checked.extension });
  }
  revalidatePath('/registrar/committee-hub');
  return error === null ? formOk('Filed in the Committee Hub.') : formFailed(error);
}

export async function removeHubDocumentAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const id = String(formData.get('id') ?? '');
  if (id === '') return formFailed('Which document?');
  const { client, tenant } = await requireTenant();
  const error = await removeHubDocument(client, tenant.clubId, id);
  revalidatePath('/registrar/committee-hub');
  return error === null ? formOk('Removed.') : formFailed(error);
}

/** Where the hub lives (BR168): the IT Manager's setting. */
export async function saveHubSettingsAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const storage = formData.get('storage') === 'sharepoint' ? 'sharepoint' : 'platform';
  const site = blank(formData.get('siteUrl'));
  const library = blank(formData.get('libraryUrl'));
  if (storage === 'sharepoint') {
    if (library === null || !isSharePointUrl(library)) {
      return formFailed('Paste the SharePoint library address: https://<your-club>.sharepoint.com/…');
    }
    if (site !== null && !isSharePointUrl(site)) return formFailed('The site address must be on sharepoint.com too.');
  }
  const { client, user, tenant } = await requireTenant();
  const error = await saveHubSettings(
    client, tenant.clubId,
    { storage, sharepointSiteUrl: storage === 'sharepoint' ? site : null, sharepointLibraryUrl: storage === 'sharepoint' ? library : null },
    user.id,
  );
  revalidatePath('/registrar/committee-hub');
  return error === null ? formOk('Saved.') : formFailed(error);
}
