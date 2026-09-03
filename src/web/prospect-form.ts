/**
 * The demonstration club's front door: what a visitor has to give, and what
 * counts as giving it.
 *
 * The instruction was to hook a prospect, not to interrogate one — so this
 * asks for an email address and a phone number, insists on the first, and
 * lets the visitor through the moment they supply it. Every extra required
 * field here is a prospect who closed the tab instead.
 */

/**
 * The exact words a prospect is shown when asked for marketing consent.
 *
 * **One constant, rendered by the form and recorded by the action**, so the
 * text somebody agreed to and the text stored against their name cannot
 * drift apart. It is server-side deliberately: recording wording supplied
 * by the client would record what a caller *claims* was shown.
 *
 * The full annex version, with the reasoning, is in
 * `docs/annexes/consent-wording.md` section 4. Changing this string changes
 * what future prospects consent to and leaves existing records holding the
 * words they were actually given — which is the point of storing it.
 */
export const MARKETING_CONSENT_WORDING =
  'Send me occasional emails about Let’sDataTalk — product news, pricing, and ' +
  'availability. Optional: you will see the demonstration club either way. We handle your ' +
  'details under the Australian Privacy Principles (Privacy Act 1988) and, for New Zealand ' +
  'clubs, the Privacy Act 2020. We will not sell them, and we will not pass them to a ' +
  'football club or a governing body. Ask us to stop at any time by replying to any message.';

export interface ProspectDetails {
  readonly email: string;
  /** Null rather than empty: nothing was given, as opposed to a blank. */
  readonly phone: string | null;
  /**
   * Whether commercial messages were agreed to. **Never a condition of
   * entry** (BR93) — this changes what we may send, never what they see.
   */
  readonly marketingConsent: boolean;
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
export function parseProspect(
  email: unknown,
  phone: unknown,
  marketingConsent?: unknown,
): ProspectParse {
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
    details: {
      email: cleanEmail.toLowerCase(),
      phone: cleanPhone === '' ? null : cleanPhone,
      // An absent checkbox is an unticked one — that is how HTML posts them,
      // and it is also the answer we want when anything is ambiguous.
      // Consent is only ever the affirmative case.
      marketingConsent: marketingConsent === 'on' || marketingConsent === true,
    },
  };
}
