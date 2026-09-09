'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

/**
 * Proposing a designation, and recording the override when one is made.
 *
 * The blocking rules are enforced by a trigger (migration 0025), so this
 * does not re-check them — it renders their refusal in words a coordinator
 * can act on. The screen's job is that the designation is **never offered**
 * in the first place (BR109); the trigger's job is that it cannot happen
 * through any other surface.
 */
export async function proposeDesignationAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const fixtureId = String(formData.get('fixtureId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  const role = String(formData.get('role') ?? 'referee');
  const appointedBy = String(formData.get('appointedBy') ?? 'club');
  const name = String(formData.get('name') ?? 'That official');
  // The warnings the screen showed, carried back so the audit records what
  // the coordinator was actually told — not what the rules would say now.
  const overrode = String(formData.get('overrode') ?? '').trim();

  if (fixtureId === '' || personId === '') return formFailed('Nothing to designate.');
  if (!['referee', 'assistant_referee', 'fourth_official'].includes(role)) {
    return formFailed('Choose a role.');
  }
  if (!['club', 'association'].includes(appointedBy)) {
    return formFailed('Say who is appointing — it decides who pays (BR16).');
  }

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  const { data: created, error } = await client
    .from('match_official_appointment')
    .insert({
      club_id: tenant.clubId,
      fixture_id: fixtureId,
      person_id: personId,
      role,
      appointed_by: appointedBy,
      proposed_by: user.id,
    })
    .select('id')
    .single();

  if (error !== null) {
    // The trigger's messages already name their rule and are written for a
    // person. Passing them through beats replacing them with "something
    // went wrong" — a coordinator refused for BR109 needs to know it was
    // BR109 rather than a fault.
    return formFailed(error.message.replace(/^.*?:\s*/, ''));
  }

  // BR11: every override is audited. **Only when there was one** — an audit
  // row claiming an override that did not happen makes the log worth less
  // than not having it.
  if (overrode !== '') {
    await client.from('audit_event').insert({
      club_id: tenant.clubId,
      action: 'designation.override',
      entity: 'match_official_appointment',
      entity_id: created?.id ?? null,
      actor_user_id: user.id,
      detail: { person_id: personId, fixture_id: fixtureId, warnings: overrode.split('|') },
    });
  }

  revalidatePath('/registrar/designations');
  return formOk(
    overrode === ''
      ? `${name} proposed.`
      : `${name} proposed, and the warning recorded against your name.`,
  );
}

/** BR42: a withdrawal carries its reason, and the database refuses one without. */
export async function withdrawDesignationAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const fixtureId = String(formData.get('fixtureId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (fixtureId === '' || personId === '') return formFailed('Nothing to withdraw.');
  if (reason === '') {
    return formFailed('A withdrawal needs a reason (BR42) — the database will refuse it without.');
  }

  const client = await createRequestClient();
  const tenant = await (async () => {
    const user = await currentUser(client);
    return user === null ? null : loadTenantContext(client, user.id);
  })();
  if (tenant === null) return formFailed('Sign in first.');

  const { error } = await client
    .from('match_official_appointment')
    .update({ state: 'withdrawn', reason, responded_at: new Date().toISOString() })
    .eq('club_id', tenant.clubId)
    .eq('fixture_id', fixtureId)
    .eq('person_id', personId);

  if (error !== null) return formFailed(error.message.replace(/^.*?:\s*/, ''));

  revalidatePath('/registrar/designations');
  return formOk('Withdrawn, with the reason recorded.');
}
