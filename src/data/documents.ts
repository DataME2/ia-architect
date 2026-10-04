/**
 * A family's document upload (scope 83, BR165). The file goes to the private
 * `registration-documents` bucket first, then `app_submit_registration_document`
 * records it — so a failed upload never leaves a row pointing at nothing. The
 * registrar still marks it received (BR2); an upload is a submission.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { documentPath } from '../web/document-upload.ts';
import { QueryError } from './queries.ts';

const BUCKET = 'registration-documents';

export interface FamilyDocument {
  readonly id: string;
  readonly documentType: string;
  readonly required: boolean;
  readonly providedAt: string | null;
  readonly submittedAt: string | null;
}

export async function loadFamilyDocuments(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
): Promise<readonly FamilyDocument[]> {
  const { data, error } = await client
    .from('registration_document')
    .select('id, document_type, required, provided_at, submitted_at')
    .eq('club_id', clubId)
    .eq('registration_id', registrationId);
  if (error !== null) throw new QueryError('registration_document', error.message);
  return ((data ?? []) as { id: string; document_type: string; required: boolean; provided_at: string | null; submitted_at: string | null }[])
    .map((d) => ({ id: d.id, documentType: d.document_type, required: d.required, providedAt: d.provided_at, submittedAt: d.submitted_at }));
}

export async function submitDocument(
  client: SupabaseClient,
  input: {
    readonly clubId: string;
    readonly registrationId: string;
    readonly documentId: string;
    readonly documentType: string;
    readonly file: File;
    readonly extension: string;
  },
): Promise<string | null> {
  const path = documentPath(input.clubId, input.registrationId, input.documentType, Date.now(), input.extension);
  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError !== null) return uploadError.message;

  const { error } = await client.rpc('app_submit_registration_document', {
    p_document_id: input.documentId,
    p_storage_path: path,
  });
  if (error !== null) {
    // Take the file back out rather than leave one no row describes.
    await client.storage.from(BUCKET).remove([path]);
    return error.message;
  }
  return null;
}

/** A short-lived link to a submitted file, for the registrar (or the family) to open. */
export async function documentLink(client: SupabaseClient, path: string): Promise<string | null> {
  const { data } = await client.storage.from(BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
