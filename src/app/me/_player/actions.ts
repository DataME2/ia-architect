'use server';

import { revalidatePath } from 'next/cache';

import { loadMe } from '../../../data/me.ts';
import { proposeCorrection, type ProposedFields } from '../../../data/player-record-correction.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { todayIn } from '../../../web/today.ts';

const POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward', 'utility'];
const FEET = ['left', 'right', 'both'];

/**
 * A player's own claim about their record (BR148).
 *
 * The proposer is **the signed-in person**, resolved from their own link at
 * this club — never a form field naming who, the same discipline
 * `answerDesignationAction` uses for BR113. The age gate (eighteen or over)
 * is not re-checked here: the database's own trigger is the real gate, and
 * duplicating it here would be a second definition that could drift.
 */
export async function proposeCorrectionAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const registrationId = String(formData.get('registrationId') ?? '');
  if (clubId === '' || registrationId === '') return formFailed('Missing identifiers.');

  const fields: { -readonly [K in keyof ProposedFields]?: ProposedFields[K] } = {};

  const name = String(formData.get('preferredName') ?? '').trim();
  if (name !== '') fields.preferredName = name;

  const email = String(formData.get('email') ?? '').trim();
  if (email !== '') {
    if (!email.includes('@')) return formFailed('That does not look like an email address.');
    fields.email = email;
  }

  const position = String(formData.get('preferredPosition') ?? '');
  if (position !== '') {
    if (!POSITIONS.includes(position)) return formFailed('Not a recognised position.');
    fields.preferredPosition = position;
  }

  const secondary = String(formData.get('secondaryPosition') ?? '');
  if (secondary !== '') {
    if (!POSITIONS.includes(secondary)) return formFailed('Not a recognised position.');
    fields.secondaryPosition = secondary;
  }

  const foot = String(formData.get('preferredFoot') ?? '');
  if (foot !== '') {
    if (!FEET.includes(foot)) return formFailed('Not a recognised foot.');
    fields.preferredFoot = foot;
  }

  const squadRaw = String(formData.get('squadNumber') ?? '').trim();
  if (squadRaw !== '') {
    const n = Number(squadRaw);
    if (!Number.isInteger(n) || n < 1 || n > 99) return formFailed('A squad number is between 1 and 99.');
    fields.squadNumber = n;
  }

  if (Object.keys(fields).length === 0) return formFailed('Nothing was changed.');

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');

  const me = await loadMe(client, user.id, todayIn());
  const link = me.links.find((l) => l.clubId === clubId);
  if (link === undefined) return formFailed('That is not your club.');

  const error = await proposeCorrection(client, clubId, registrationId, link.personId, user.id, fields);

  revalidatePath('/me');
  if (error !== null) return formFailed(error);
  return formOk('Sent. A coach or admin confirms it before it shows anywhere else (BR148).');
}
