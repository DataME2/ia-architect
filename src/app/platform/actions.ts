'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { readPublicConfig } from '../../data/env.ts';
import { createRequestClient } from '../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../web/form-result.ts';
import { parseProvision, type ProvisionDraft } from '../../web/platform-view.ts';

/**
 * Invite one contact by email.
 *
 * **This is an ordinary magic-link sign-up on the anon key.** Supabase
 * creates the account if it does not exist and sends the email itself, so
 * no invitation mechanism, no template and — the part that matters — **no
 * service-role key** enters this application. That key bypasses Row-Level
 * Security for every club at once, and removing a support step is not worth
 * putting it inside a server action.
 *
 * A separate client, deliberately: the request-scoped one writes session
 * cookies, and sending a link on somebody else's behalf must not touch the
 * platform administrator's own session.
 */
async function invite(email: string, origin: string): Promise<string | null> {
  const { supabaseUrl, supabaseAnonKey } = readPublicConfig();
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback` },
  });

  return error === null ? null : error.message;
}

/**
 * Create a club, record who is responsible for it, and invite them.
 *
 * The club is created whether or not the emails go out — a failed send is a
 * reason to resend, not a reason to have no club — so the result says
 * plainly which half happened.
 */
export async function provisionClubAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = parseProvision({
    name: formData.get('name'),
    jurisdiction: formData.get('jurisdiction'),
    seasonName: formData.get('seasonName'),
    seasonStarts: formData.get('seasonStarts'),
    seasonEnds: formData.get('seasonEnds'),
    primaryName: formData.get('primaryName'),
    primaryEmail: formData.get('primaryEmail'),
    primaryPhone: formData.get('primaryPhone'),
    secondaryName: formData.get('secondaryName'),
    secondaryEmail: formData.get('secondaryEmail'),
    secondaryPhone: formData.get('secondaryPhone'),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  const draft: ProvisionDraft = parsed.draft;

  // Taken from the request rather than from a hidden field the browser
  // fills in. The field version was empty whenever the form posted before
  // hydration, Supabase fell back to the project's Site URL, and the
  // invitation landed somewhere that never claimed the access.
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? 'localhost:3000';
  const proto = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;

  const client = await createRequestClient();
  const { data: clubId, error } = await client.rpc('provision_club', {
    p_name: draft.name,
    p_jurisdiction: draft.jurisdiction,
    p_season_name: draft.seasonName,
    p_season_starts: draft.seasonStarts,
    p_season_ends: draft.seasonEnds,
    p_primary_name: draft.primaryName,
    p_primary_email: draft.primaryEmail,
    p_primary_phone: draft.primaryPhone,
    p_secondary_name: draft.secondaryName,
    p_secondary_email: draft.secondaryEmail,
    p_secondary_phone: draft.secondaryPhone,
  });

  if (error !== null) return formFailed(error.message.replace(/^.*?:\s*/, ''));

  const sent: string[] = [];
  const failed: string[] = [];

  for (const [kind, email] of [
    ['primary', draft.primaryEmail],
    ['secondary', draft.secondaryEmail],
  ] as const) {
    if (email === null) continue;
    const problem = await invite(email, origin);
    if (problem === null) {
      sent.push(email);
      await client.rpc('mark_contact_invited', { p_club_id: clubId, p_kind: kind });
    } else {
      failed.push(`${email} (${problem})`);
    }
  }

  revalidatePath('/platform');

  if (failed.length > 0) {
    return formFailed(
      `${draft.name} was created and recorded. The invitation could not be sent to ${failed.join(', ')} — ` +
        'the club is fine; provision it again with the same name to retry, or ask them to sign in at /sign-in.',
    );
  }

  return formOk(
    `${draft.name} created. ${sent.join(' and ')} ${sent.length === 1 ? 'has' : 'have'} been emailed a ` +
      'sign-in link; access becomes real the moment they use it.',
  );
}

/**
 * Record what was agreed with a club.
 *
 * There is no rate card: the price is whatever the owner and that club
 * settled on, so the fee is free text parsed into cents and the note holds
 * the terms that do not fit in columns.
 */
export async function setLicenceAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const clubName = String(formData.get('clubName') ?? 'the club');
  const state = String(formData.get('state') ?? 'active');
  const startsOn = String(formData.get('startsOn') ?? '').trim();
  const endsOn = String(formData.get('endsOn') ?? '').trim();
  const feeRaw = String(formData.get('fee') ?? '').trim();
  const currency = String(formData.get('currency') ?? 'AUD');
  const note = String(formData.get('note') ?? '').trim();

  if (clubId === '') return formFailed('No club.');
  if (startsOn === '' || endsOn === '') return formFailed('A licence needs a start and an end date.');
  if (endsOn <= startsOn) return formFailed('The licence ends before it starts.');

  // Blank is "no fee agreed", which is a different fact from zero and must
  // not be recorded as one.
  let feeCents: number | null = null;
  if (feeRaw !== '') {
    const amount = Number(feeRaw.replace(/[$,\s]/g, ''));
    if (!Number.isFinite(amount) || amount < 0) {
      return formFailed(`That is not an amount: ${feeRaw}`);
    }
    feeCents = Math.round(amount * 100);
  }

  const client = await createRequestClient();
  const { error } = await client.rpc('set_club_licence', {
    p_club_id: clubId,
    p_starts_on: startsOn,
    p_ends_on: endsOn,
    p_state: state,
    p_fee_cents: feeCents,
    p_currency: currency,
    p_note: note === '' ? null : note,
  });

  if (error !== null) return formFailed(error.message.replace(/^.*?:\s*/, ''));

  revalidatePath('/platform');
  return formOk(`Licence recorded for ${clubName}: ${state}, ${startsOn} to ${endsOn}.`);
}
