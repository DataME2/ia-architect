'use server';

import { redirect } from 'next/navigation';

import { createRequestClient } from '../../data/server.ts';
import { formFailed, type FormResult } from '../../web/form-result.ts';
import { parseProspect } from '../../web/prospect-form.ts';

/**
 * Lets a prospect into the demonstration club in exchange for an email
 * address, and no password.
 *
 * Two steps, and the order matters. First an **anonymous Supabase session**,
 * so `auth.uid()` is a real subject and every Row-Level Security policy in
 * the schema keeps working exactly as it does for a registrar — the demo is
 * reached through the security model rather than around it. Then
 * `enter_demo`, which records the prospect and grants that session
 * read-only membership of the demo club.
 *
 * `enter_demo` looks the club up rather than taking it as an argument, so
 * there is no version of this request that reaches a real tenant.
 */
export async function enterDemoAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = parseProspect(formData.get('email'), formData.get('phone'));
  if (!parsed.ok) return formFailed(parsed.error);

  const client = await createRequestClient();

  const { error: authError } = await client.auth.signInAnonymously();
  if (authError !== null) {
    // Almost always one cause: anonymous sign-ins are switched off for the
    // project. Say so plainly rather than blaming the visitor's details,
    // which are fine.
    return formFailed(
      'The demonstration club could not be opened. Anonymous sign-in may be disabled for this deployment.',
    );
  }

  const { error } = await client.rpc('enter_demo', {
    p_email: parsed.details.email,
    p_phone: parsed.details.phone,
  });

  if (error !== null) {
    // Undo the session rather than leaving the visitor holding one that
    // belongs to no club — that state renders as "signed in, member of
    // nothing", which reads like a fault in the product.
    await client.auth.signOut();
    return formFailed(
      error.message.includes('No demonstration club')
        ? 'No demonstration club is seeded in this deployment yet.'
        : 'The demonstration club could not be opened. Please try again.',
    );
  }

  redirect('/registrar');
}
