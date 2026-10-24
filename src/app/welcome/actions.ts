'use server';

import { redirect } from 'next/navigation';

import { createRequestClient } from '../../data/server.ts';
import { NO_CREDENTIAL_DESTINATION } from '../../web/safe-destination.ts';
import { linkType } from '../../web/sign-in-link.ts';
import { arrive } from '../auth/arrive.ts';

/**
 * Sign in with a link an administrator sent (scope 109): verify its token,
 * then the same claims as an emailed link. A dead link goes where a dead
 * emailed one does, and for the same reason it does not say why (BR73).
 */
export async function continueAction(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  const type = linkType(formData.get('type'));
  if (token === '' || type === null) redirect(NO_CREDENTIAL_DESTINATION);

  const client = await createRequestClient();
  const { error } = await client.auth.verifyOtp({ token_hash: token, type });
  if (error !== null) redirect(NO_CREDENTIAL_DESTINATION);

  redirect(await arrive(client, null));
}
