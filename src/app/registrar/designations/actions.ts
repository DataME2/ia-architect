'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { loadCoordinator, notifyOfficialWithdrew } from '../../../data/notifications.ts';
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

  // BR42 — the coordinator is told, because a withdrawal after acceptance
  // leaves a fixture without an official and that is somebody's problem
  // this afternoon. The notification never fails the withdrawal: the
  // record is the thing that had to happen, and a coordinator who was not
  // emailed is a worse outcome than a withdrawal that did not save.
  const notice = await notifyCoordinatorOfWithdrawal(client, tenant, fixtureId, personId, reason);

  revalidatePath('/registrar/designations');
  return notice === null
    ? formOk('Withdrawn, with the reason recorded.')
    : formOk(`Withdrawn, with the reason recorded. ${notice}`);
}

/**
 * Tell whoever coordinates the officials, if the club has one recorded.
 *
 * Returns a sentence about the attempt, or `null` when there was nobody to
 * tell — never throws. A club with no coordinator membership is an ordinary
 * state, not an error, and BR42 is satisfied by the club being told rather
 * than by a particular person existing.
 */
async function notifyCoordinatorOfWithdrawal(
  client: Awaited<ReturnType<typeof createRequestClient>>,
  tenant: { readonly clubId: string; readonly clubName: string },
  fixtureId: string,
  personId: string,
  reason: string,
): Promise<string | null> {
  const coordinator = await loadCoordinator(client, tenant.clubId);
  if (coordinator === null) return null;

  const [official, fixture] = await Promise.all([
    client.from('person').select('preferred_name, legal_given_names, legal_family_name')
      .eq('club_id', tenant.clubId).eq('id', personId).maybeSingle(),
    client.from('fixture').select('opponent, played_on')
      .eq('club_id', tenant.clubId).eq('id', fixtureId).maybeSingle(),
  ]);

  const officialName = official.data === null
    ? 'An official'
    : `${official.data.preferred_name ?? official.data.legal_given_names} ${official.data.legal_family_name}`;
  const fixtureLabel = fixture.data === null
    ? 'a fixture'
    : `${fixture.data.opponent}, ${fixture.data.played_on}`;

  const result = await notifyOfficialWithdrew(
    client, tenant.clubId, tenant.clubName, coordinator, officialName, personId, fixtureLabel, reason,
  );

  if (result.outcome === 'sent') return `${coordinator.name} has been told.`;
  return `${coordinator.name} was not emailed — ${result.detail ?? 'the message did not send'}.`;
}
