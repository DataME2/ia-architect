'use server';

import { createUserClient } from '../../../data/client.ts';
import { unsubscribe } from '../../../data/messaging.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { parseUnsubscribeLink } from '../../../web/unsubscribe.ts';

/**
 * Withdraw contact consent (BR128).
 *
 * Runs as `anon` — no session, and none required. The people this exists
 * for largely hold no account: a prospect who left an email address at the
 * demonstration door, a guardian who registered through a link. Requiring
 * a sign-in would make the withdrawal conditional on joining the thing
 * being withdrawn from.
 *
 * The token is verified by the database (`app_unsubscribe`), the same way
 * an invitation's is, so no elevated client is needed and no bypass reason
 * was added for this.
 */
export async function unsubscribeAction(_previous: FormResult, form: FormData): Promise<FormResult> {
  const parsed = parseUnsubscribeLink(String(form.get('link') ?? ''));
  if (!parsed.ok) return formFailed(parsed.message);

  const scope = String(form.get('scope') ?? 'marketing');
  if (scope !== 'marketing' && scope !== 'all') {
    return formFailed('Choose what you would like to stop.');
  }

  const result = await unsubscribe(createUserClient(), parsed.id, parsed.token, scope);
  return result.ok ? formOk(result.message) : formFailed(result.message);
}
