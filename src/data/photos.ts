import type { SupabaseClient } from '@supabase/supabase-js';

import { QueryError } from './queries.ts';

const BUCKET = 'photos';

/**
 * Where a person's photograph lives.
 *
 * The club id is the first path segment because that is what the storage
 * policy checks — the same convention the vouchers and clearances buckets
 * use, and the reason a caller cannot read another club's files however the
 * application asks.
 */
function photoPath(clubId: string, personId: string, stamp: number): string {
  return `${clubId}/${personId}/${stamp}.jpg`;
}

/**
 * Store a cropped identification photograph.
 *
 * The image arriving here has already been drawn to a canvas and
 * re-encoded by the browser, so **the original file is never uploaded**.
 * That is not only a size saving: a photograph straight off a phone carries
 * EXIF metadata including, very often, the GPS coordinates where it was
 * taken. A child's photograph tagged with a location is a considerably
 * worse thing to hold than a photograph, and re-encoding drops it.
 *
 * The consent BR56 requires is enforced by a database trigger on `person`,
 * not here — so a second uploader written later cannot skip it.
 */
export async function storePhotograph(
  client: SupabaseClient,
  input: { readonly clubId: string; readonly personId: string; readonly file: File },
): Promise<string> {
  const path = photoPath(input.clubId, input.personId, Date.now());

  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(path, input.file, { contentType: 'image/jpeg', upsert: false });

  if (uploadError !== null) throw new QueryError('storage.photos', uploadError.message);

  // The row is written after the file, so a failed upload never leaves a
  // person pointing at an object that does not exist. The reverse — an
  // orphaned object with no row — is recoverable and harmless.
  const { error } = await client
    .from('person')
    .update({ photo_path: path, photo_updated_at: new Date().toISOString() })
    .eq('id', input.personId);

  if (error !== null) {
    // Most likely the BR56 trigger. Take the file back out rather than
    // leaving a photograph in the bucket that no consent covers.
    await client.storage.from(BUCKET).remove([path]);
    throw new QueryError('person', error.message);
  }

  return path;
}

/** Remove a person's photograph, file and reference together. */
export async function removePhotograph(
  client: SupabaseClient,
  input: { readonly personId: string; readonly path: string },
): Promise<void> {
  const { error } = await client
    .from('person')
    .update({ photo_path: null, photo_updated_at: null })
    .eq('id', input.personId);

  if (error !== null) throw new QueryError('person', error.message);

  // Clearing the reference first: if the delete fails, the club is left
  // with an unreferenced file rather than a record still pointing at a
  // picture it was asked to stop holding.
  await client.storage.from(BUCKET).remove([input.path]);
}

/**
 * A short-lived link to a photograph, or null.
 *
 * Five minutes, like every other signed URL here. Null covers both "no
 * photograph" and "this role may not see it" — which are different facts
 * and correctly render the same way, since telling a treasurer that a
 * photograph exists but is withheld is the disclosure the policy prevents.
 */
export async function photographUrl(
  client: SupabaseClient,
  path: string | null,
): Promise<string | null> {
  if (path === null) return null;
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 300);
  if (error !== null || data === null) return null;
  return data.signedUrl;
}
