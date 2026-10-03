/**
 * What a family may upload for a registration document (scope 83, BR165).
 * The limit is Vercel's request ceiling with room to spare; the types are
 * what a phone camera or a scanner produces.
 */

export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

const EXTENSION: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export function checkDocumentFile(file: { readonly type: string; readonly size: number }):
  { readonly ok: true; readonly extension: string } | { readonly ok: false; readonly error: string } {
  if (file.size === 0) return { ok: false, error: 'Choose a file first.' };
  const extension = EXTENSION[file.type];
  if (extension === undefined) return { ok: false, error: 'Send a PDF, JPEG or PNG.' };
  if (file.size > MAX_DOCUMENT_BYTES) return { ok: false, error: 'That file is over 4 MB. A photo of the page is enough.' };
  return { ok: true, extension };
}

/** `<club>/<registration>/<type>-<stamp>.<ext>`: the two segments the bucket policies check. */
export function documentPath(clubId: string, registrationId: string, documentType: string, stamp: number, extension: string): string {
  const safeType = documentType.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'document';
  return `${clubId}/${registrationId}/${safeType}-${stamp}.${extension}`;
}
