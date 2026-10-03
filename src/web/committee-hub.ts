/**
 * The Management Committee Hub's decisions (scope 81, BR168): what may be
 * filed, and what a SharePoint link must look like. Pure, so tested
 * without a database; 0080 checks the same shapes.
 */

export type HubDocumentKind = 'minutes' | 'agenda' | 'report' | 'constitution' | 'other';

export const HUB_KIND_LABEL: Readonly<Record<HubDocumentKind, string>> = {
  minutes: 'Minutes (acts)',
  agenda: 'Agenda',
  report: 'Report',
  constitution: 'Constitution',
  other: 'Other',
};

export const MAX_HUB_FILE_BYTES = 4 * 1024 * 1024;

const EXTENSION: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export function checkHubFile(file: { readonly type: string; readonly size: number }):
  { readonly ok: true; readonly extension: string } | { readonly ok: false; readonly error: string } {
  if (file.size === 0) return { ok: false, error: 'Choose a file first.' };
  const extension = EXTENSION[file.type];
  if (extension === undefined) return { ok: false, error: 'File a PDF, a Word document, or a photo of the page.' };
  if (file.size > MAX_HUB_FILE_BYTES) return { ok: false, error: 'That file is over 4 MB.' };
  return { ok: true, extension };
}

/** A SharePoint address the club owns: https://<tenant>.sharepoint.com/… */
export function isSharePointUrl(value: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.sharepoint\.com\//i.test(value.trim());
}

export function isHubKind(value: string): value is HubDocumentKind {
  return value in HUB_KIND_LABEL;
}
