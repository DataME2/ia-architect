/**
 * Reading an unsubscribe link.
 *
 * Pure, and separate from the action, because the link arrives from an
 * inbox — copied, wrapped by a mail client, sometimes with a trailing
 * bracket — and what counts as a readable link is the part worth testing.
 *
 * The shape is `<uuid>.<token>` (decision 12): the id says which row, the
 * token proves the holder was sent a message for it.
 */
export type ParsedLink =
  | { readonly ok: true; readonly id: string; readonly token: string }
  | { readonly ok: false; readonly message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUnsubscribeLink(raw: string): ParsedLink {
  // Mail clients wrap long URLs and some append punctuation. Strip what is
  // definitely not part of the value rather than refusing a link that a
  // person can plainly see is theirs.
  const cleaned = raw.trim().replace(/[)\]>.,]+$/, '');
  const separator = cleaned.indexOf('.');

  if (separator <= 0 || separator === cleaned.length - 1) {
    return { ok: false, message: 'That does not look like an unsubscribe link.' };
  }

  const id = cleaned.slice(0, separator);
  const token = cleaned.slice(separator + 1);

  if (!UUID.test(id)) {
    return { ok: false, message: 'That does not look like an unsubscribe link.' };
  }
  if (token.length < 16) {
    return { ok: false, message: 'That unsubscribe link looks incomplete — copy the whole link from the email.' };
  }

  return { ok: true, id, token };
}
