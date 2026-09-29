/**
 * Save a correction to a Person's details (scope 68). `person_manage`
 * (admin, registrar, IT Manager) is the control; this only decides what
 * the update carries — including BR55's withdrawal of a legal-name check.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { changedFields, legalNameChanged, type PersonEdit } from '../web/person-edit.ts';
import { QueryError, recordAudit } from './queries.ts';

export async function savePersonEdit(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  edit: PersonEdit,
  actorUserId: string,
): Promise<{ readonly changed: readonly string[]; readonly verificationWithdrawn: boolean }> {
  const { data: row, error: readError } = await client
    .from('person')
    .select('legal_given_names, legal_family_name, preferred_name, email, date_of_birth, legal_name_verified_at')
    .eq('club_id', clubId)
    .eq('id', personId)
    .maybeSingle();
  if (readError !== null) throw new QueryError('person', readError.message);
  if (row === null) throw new QueryError('person', 'no such person at this club');

  const before: PersonEdit = {
    legalGivenNames: row.legal_given_names,
    legalFamilyName: row.legal_family_name,
    preferredName: row.preferred_name,
    email: row.email,
    dateOfBirth: row.date_of_birth,
  };
  const changed = changedFields(before, edit);
  if (changed.length === 0) return { changed, verificationWithdrawn: false };

  const withdraw = row.legal_name_verified_at !== null && legalNameChanged(before, edit);

  const { error } = await client
    .from('person')
    .update({
      legal_given_names: edit.legalGivenNames,
      legal_family_name: edit.legalFamilyName,
      preferred_name: edit.preferredName,
      email: edit.email,
      date_of_birth: edit.dateOfBirth,
      ...(withdraw ? { legal_name_verified_at: null } : {}),
    })
    .eq('club_id', clubId)
    .eq('id', personId);
  if (error !== null) throw new QueryError('person', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'person.details_corrected',
    entity: 'person',
    entityId: personId,
    detail: { fields: changed, legalNameVerificationWithdrawn: withdraw },
  });

  return { changed, verificationWithdrawn: withdraw };
}
