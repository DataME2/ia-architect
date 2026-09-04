'use server';

import { revalidatePath } from 'next/cache';

import { createRequestClient } from '../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../web/form-result.ts';
import { parseProvision } from '../../web/platform-view.ts';

/**
 * Create a club.
 *
 * The four hand-typed statements of the provisioning annex, as one call
 * that either completes or does nothing. `provision_club` checks
 * `platform_admin` itself, so this action is a form parser rather than a
 * guard — the control is in the database, where a mistake in this file
 * cannot reach past it.
 */
export async function provisionClubAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = parseProvision({
    name: formData.get('name'),
    jurisdiction: formData.get('jurisdiction'),
    adminEmail: formData.get('adminEmail'),
    seasonName: formData.get('seasonName'),
    seasonStarts: formData.get('seasonStarts'),
    seasonEnds: formData.get('seasonEnds'),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  const { draft } = parsed;
  const client = await createRequestClient();
  const { error } = await client.rpc('provision_club', {
    p_name: draft.name,
    p_jurisdiction: draft.jurisdiction,
    p_admin_email: draft.adminEmail,
    p_season_name: draft.seasonName,
    p_season_starts: draft.seasonStarts,
    p_season_ends: draft.seasonEnds,
  });

  if (error !== null) {
    // The common case is an administrator who has not signed up yet, and it
    // is not a failure of the club — the club is created, and provisioning
    // again once they exist attaches them.
    return formFailed(error.message.replace(/^.*?:\s*/, ''));
  }

  revalidatePath('/platform');
  return formOk(
    draft.adminEmail === null
      ? `${draft.name} created. It has no administrator yet, so nobody can sign in to it.`
      : `${draft.name} created, with ${draft.adminEmail} as its administrator.`,
  );
}
