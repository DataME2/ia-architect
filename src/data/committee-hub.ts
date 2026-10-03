/**
 * The Management Committee Hub (scope 81, BR168). Who reads, files, removes
 * and configures is the database's question (0080); this reads and writes.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { HubDocumentKind } from '../web/committee-hub.ts';
import { QueryError } from './queries.ts';

const BUCKET = 'committee-hub';

export interface HubSettings {
  readonly storage: 'platform' | 'sharepoint';
  readonly sharepointSiteUrl: string | null;
  readonly sharepointLibraryUrl: string | null;
}

export interface HubDocument {
  readonly id: string;
  readonly kind: HubDocumentKind;
  readonly title: string;
  readonly meetingOn: string | null;
  readonly termId: string | null;
  readonly resolutionId: string | null;
  readonly storagePath: string | null;
  readonly externalUrl: string | null;
  readonly filedAt: string;
}

export interface Hub {
  /** False when the caller is not on the committee: the page says so. */
  readonly readable: boolean;
  readonly mayFile: boolean;
  readonly mayControl: boolean;
  readonly settings: HubSettings;
  readonly documents: readonly HubDocument[];
}

const PLATFORM: HubSettings = { storage: 'platform', sharepointSiteUrl: null, sharepointLibraryUrl: null };

export async function loadHub(client: SupabaseClient, clubId: string): Promise<Hub> {
  const [readable, mayFile, mayControl, settings, documents] = await Promise.all([
    client.rpc('app_reads_committee_hub', { p_club_id: clubId }),
    client.rpc('app_files_committee_hub', { p_club_id: clubId }),
    client.rpc('app_controls_committee_hub', { p_club_id: clubId }),
    client.from('committee_hub_settings').select('storage, sharepoint_site_url, sharepoint_library_url').eq('club_id', clubId).maybeSingle(),
    client.from('committee_document')
      .select('id, kind, title, meeting_on, term_id, resolution_id, storage_path, external_url, filed_at')
      .eq('club_id', clubId)
      .order('meeting_on', { ascending: false, nullsFirst: false }),
  ]);
  if (documents.error !== null) throw new QueryError('committee_document', documents.error.message);
  const s = settings.data as { storage: HubSettings['storage']; sharepoint_site_url: string | null; sharepoint_library_url: string | null } | null;
  return {
    readable: readable.data === true,
    mayFile: mayFile.data === true,
    mayControl: mayControl.data === true,
    settings: s === null ? PLATFORM : { storage: s.storage, sharepointSiteUrl: s.sharepoint_site_url, sharepointLibraryUrl: s.sharepoint_library_url },
    documents: ((documents.data ?? []) as Record<string, string | null>[]).map((d) => ({
      id: d.id as string,
      kind: d.kind as HubDocumentKind,
      title: d.title as string,
      meetingOn: d.meeting_on ?? null,
      termId: d.term_id ?? null,
      resolutionId: d.resolution_id ?? null,
      storagePath: d.storage_path ?? null,
      externalUrl: d.external_url ?? null,
      filedAt: d.filed_at as string,
    })),
  };
}

interface FileInput {
  readonly clubId: string;
  readonly kind: HubDocumentKind;
  readonly title: string;
  readonly meetingOn: string | null;
  readonly termId: string | null;
  readonly resolutionId: string | null;
  readonly filedByUserId: string;
}

/** File a document in the platform's own store: upload, then record. */
export async function fileHubDocument(
  client: SupabaseClient,
  input: FileInput & { readonly file: File; readonly extension: string },
): Promise<string | null> {
  const path = `${input.clubId}/${Date.now()}-${input.kind}.${input.extension}`;
  const { error: uploadError } = await client.storage.from(BUCKET).upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError !== null) return uploadError.message;
  const error = await record(client, input, { storage_path: path });
  if (error !== null) await client.storage.from(BUCKET).remove([path]);
  return error;
}

/** Record a document that lives in the club's SharePoint (BR168). */
export async function linkHubDocument(client: SupabaseClient, input: FileInput & { readonly url: string }): Promise<string | null> {
  return record(client, input, { external_url: input.url });
}

async function record(
  client: SupabaseClient,
  input: FileInput,
  where: { readonly storage_path?: string; readonly external_url?: string },
): Promise<string | null> {
  const { error } = await client.from('committee_document').insert({
    club_id: input.clubId,
    kind: input.kind,
    title: input.title,
    meeting_on: input.meetingOn,
    term_id: input.termId,
    resolution_id: input.resolutionId,
    filed_by_user_id: input.filedByUserId,
    ...where,
  });
  if (error === null) return null;
  return error.code === '42501' ? 'Only the Secretary, an admin or the IT Manager files committee documents (BR168).' : error.message;
}

export async function removeHubDocument(client: SupabaseClient, clubId: string, id: string): Promise<string | null> {
  const { data, error } = await client.from('committee_document').delete().eq('club_id', clubId).eq('id', id).select('storage_path');
  if (error !== null) return error.message;
  const rows = (data ?? []) as { storage_path: string | null }[];
  if (rows.length === 0) return 'Only the IT Manager or an admin removes a committee document (BR168).';
  const path = rows[0]?.storage_path;
  if (path) await client.storage.from(BUCKET).remove([path]);
  return null;
}

export async function saveHubSettings(
  client: SupabaseClient,
  clubId: string,
  settings: HubSettings,
  userId: string,
): Promise<string | null> {
  const { error } = await client.from('committee_hub_settings').upsert({
    club_id: clubId,
    storage: settings.storage,
    sharepoint_site_url: settings.sharepointSiteUrl,
    sharepoint_library_url: settings.sharepointLibraryUrl,
    updated_by_user_id: userId,
    updated_at: new Date().toISOString(),
  });
  if (error === null) return null;
  return error.code === '42501' ? 'Only the IT Manager or an admin configures the hub (BR168).' : error.message;
}

export async function hubFileLink(client: SupabaseClient, path: string): Promise<string | null> {
  const { data } = await client.storage.from(BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
