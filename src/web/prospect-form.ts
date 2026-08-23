/**
 * The demonstration club's front door: what a visitor has to give, and what
 * counts as giving it.
 *
 * The instruction was to hook a prospect, not to interrogate one — so this
 * asks for an email address and a phone number, insists on the first, and
 * lets the visitor through the moment they supply it. Every extra required
 * field here is a prospect who closed the tab instead.
 */

export interface ProspectDetails {
  readonly email: string;
  /** Null rather than empty: nothing was given, as opposed to a blank. */
  readonly phone: string | null;
}

export type ProspectParse =
  | { readonly ok: true; readonly details: ProspectDetails }
  | { readonly ok: false; readonly error: string };

/**
 * Deliberately permissive.
 *
 * The database applies the same shallow test (`enter_demo` checks for an
 * `@`), and neither pretends to validate an address — that is what sending
 * to it proves. Rejecting `a@b` here would turn away a real address for the
 * sake of a rule that a typo'd `gmial.com` sails through anyway.
 */
export function parseProspect(email: unknown, phone: unknown): ProspectParse {
  const cleanEmail = String(email ?? '').trim();
  const cleanPhone = String(phone ?? '').trim();

  if (cleanEmail === '') {
    return { ok: false, error: 'Enter an email address and we will open the demonstration club.' };
  }

  const at = cleanEmail.indexOf('@');
  if (at < 1 || at === cleanEmail.length - 1 || cleanEmail.includes(' ')) {
    return { ok: false, error: `That does not look like an email address: ${cleanEmail}` };
  }

  return {
    ok: true,
    details: { email: cleanEmail.toLowerCase(), phone: cleanPhone === '' ? null : cleanPhone },
  };
}
