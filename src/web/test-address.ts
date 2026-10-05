/**
 * Addresses on the domains reserved for testing (RFC 2606, RFC 6761) can
 * never receive mail, and Supabase Auth refuses them as invalid. The QA
 * cast lives on `.test`, so a sign-in link to one of them is skipped rather
 * than failed: the account signs in with its password, and the sign-in
 * claims whatever access was recorded for it (sign-in/actions.ts).
 *
 * Only reserved names: a real address with a typo still fails loudly.
 */
const RESERVED_TLDS = ['test', 'example', 'invalid', 'localhost'];
const RESERVED_DOMAINS = ['example.com', 'example.net', 'example.org'];

export function isReservedTestAddress(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  if (domain === '') return false;
  const tld = domain.split('.').pop() ?? '';
  return RESERVED_TLDS.includes(tld) || RESERVED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/** What to tell the officer when the address is a reserved test one: nothing was emailed. */
export function testAddressNote(email: string): string | null {
  return isReservedTestAddress(email)
    ? `Recorded. ${email} is a test address, so no email was sent: create the account with a password in the Supabase dashboard (development project) and sign in — the access is picked up on sign-in.`
    : null;
}
