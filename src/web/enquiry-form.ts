/**
 * A club saying it is interested: what it has to give, and what is invited.
 *
 * `prospect-form.ts` is the same shape one door along, and the difference
 * between them is the whole design. The demonstration door asks for an
 * email address and nothing else, because somebody who only wants to *look*
 * has not decided anything yet and every extra required field is a closed
 * tab (BR91).
 *
 * Typing your club's name into an enquiry form is a higher-intent act. The
 * club has decided to start a conversation, and asking nothing wastes it —
 * a reply to a contactless enquiry is a round of questions the club has to
 * answer before anything useful is said. So this asks six more things and
 * **requires none of them** (BR144): a half-filled form that refuses to
 * send is the same closed tab, arrived at by a different route.
 */

/**
 * The words shown when an enquirer is asked about commercial messages.
 *
 * A separate constant from the demonstration door's, and deliberately not a
 * shared one: the two are said in different contexts and either may be
 * reworded without the other. What they have in common is the mechanism,
 * not the text — server-side, stored with the moment of consent, so that
 * editing this string never silently rewrites what somebody already agreed
 * to (BR93).
 */
export const ENQUIRY_CONSENT_WORDING =
  'Send me occasional emails about Let’sDataTalk — product news, pricing, and ' +
  'availability. Optional: we will reply to this enquiry either way. We handle your ' +
  'details under the Australian Privacy Principles (Privacy Act 1988) and, for New Zealand ' +
  'clubs, the Privacy Act 2020. We will not sell them, and we will not pass them to a ' +
  'football club or a governing body. Ask us to stop at any time by replying to any message.';

export interface ClubEnquiry {
  /** Required. The field that turns an address into a conversation. */
  readonly clubName: string;
  /** Required. Somewhere to reply. */
  readonly email: string;
  /** Every one of these is null when not given — invited, never demanded. */
  readonly contactName: string | null;
  readonly contactRole: string | null;
  readonly jurisdiction: string | null;
  readonly clubSize: string | null;
  readonly currentSystem: string | null;
  readonly note: string | null;
  readonly phone: string | null;
  /**
   * Whether commercial messages were agreed to. **Never a condition of
   * being replied to** (BR93) — this changes what we may send, never
   * whether the enquiry is answered.
   */
  readonly marketingConsent: boolean;
}

export type EnquiryParse =
  | { readonly ok: true; readonly enquiry: ClubEnquiry }
  | { readonly ok: false; readonly error: string };

/** Null rather than empty: nothing was given, as opposed to a blank. */
function given(value: unknown): string | null {
  const clean = String(value ?? '').trim();
  return clean === '' ? null : clean;
}

export interface EnquiryFields {
  readonly clubName?: unknown;
  readonly email?: unknown;
  readonly contactName?: unknown;
  readonly contactRole?: unknown;
  readonly jurisdiction?: unknown;
  readonly clubSize?: unknown;
  readonly currentSystem?: unknown;
  readonly note?: unknown;
  readonly phone?: unknown;
  readonly marketingConsent?: unknown;
}

/**
 * Deliberately permissive about the address, like `parseProspect`.
 *
 * The database applies the same shallow test, and neither pretends to
 * validate an address — sending to it is what proves it. Rejecting `a@b`
 * here turns away a real address for the sake of a rule a typo'd
 * `gmial.com` sails straight through.
 */
export function parseEnquiry(fields: EnquiryFields): EnquiryParse {
  const clubName = given(fields.clubName);
  const email = given(fields.email);

  if (clubName === null) {
    return {
      ok: false,
      error: 'Tell us which club this is about — it is the one thing we cannot look up.',
    };
  }

  if (email === null) {
    return { ok: false, error: 'Add an email address so we can reply.' };
  }

  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1 || email.includes(' ')) {
    return { ok: false, error: `That does not look like an email address: ${email}` };
  }

  return {
    ok: true,
    enquiry: {
      clubName,
      email: email.toLowerCase(),
      contactName: given(fields.contactName),
      contactRole: given(fields.contactRole),
      jurisdiction: given(fields.jurisdiction),
      clubSize: given(fields.clubSize),
      currentSystem: given(fields.currentSystem),
      note: given(fields.note),
      phone: given(fields.phone),
      // An absent checkbox is an unticked one — that is how HTML posts them,
      // and it is also the answer we want when anything is ambiguous.
      // Consent is only ever the affirmative case (BR93).
      marketingConsent: fields.marketingConsent === 'on' || fields.marketingConsent === true,
    },
  };
}
