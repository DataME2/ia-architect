/**
 * The alert that tells the platform's own operators a club has enquired.
 *
 * **Deliberately not a `MessageTemplate`**, and the type is where BR146
 * shows up first: a `MessageTemplate` composes against a `TemplateContext`
 * carrying a `clubName` and an `unsubscribeUrl`, and this message has
 * neither. There is no club — a prospect belongs to no tenant (BR92) — and
 * there is no unsubscribe, because BR128 exists so somebody can stop mail
 * *about themselves*, and an unsubscribe link here would let an operator
 * switch off the only signal that a customer is trying to reach them.
 *
 * Making it fit the existing type would have meant inventing a club name
 * and a dead link. It does not fit because it is a different kind of
 * message, and the compiler saying so is the useful outcome.
 *
 * Pure, like every template beside it: what an alert says is testable
 * without a provider.
 */

/** Exactly what `record_interest` was given — nothing from inside a club. */
export interface EnquiryAlertInput {
  readonly clubName: string;
  readonly email: string;
  readonly contactName: string | null;
  readonly contactRole: string | null;
  readonly jurisdiction: string | null;
  readonly clubSize: string | null;
  readonly currentSystem: string | null;
  readonly note: string | null;
  readonly phone: string | null;
  readonly marketingConsent: boolean;
}

export interface PlatformAlert {
  readonly subject: string;
  readonly body: string;
}

export const ENQUIRY_ALERT_VERSION = 1;

/** A labelled line, or nothing at all where the club said nothing. */
function line(label: string, value: string | null): string {
  return value === null ? '' : `  ${label.padEnd(12)}${value}\n`;
}

/**
 * Composes the alert.
 *
 * The **subject carries the club and the system it runs**, because that is
 * what decides whether this is read now or after lunch: decision 5 makes
 * this product a replacement rather than an integration, so *who they are
 * on* is most of what the first reply has to account for. A subject reading
 * "New enquiry" tells the operator to open something; this one tells them
 * what they would find.
 *
 * Fields the club left blank are **omitted rather than rendered as
 * unknown**. Eight lines of "—" reads as a form that failed; four lines of
 * what they actually said reads as a club.
 */
export function composeEnquiryAlert(input: EnquiryAlertInput): PlatformAlert {
  const subject =
    input.currentSystem === null
      ? `New enquiry: ${input.clubName}`
      : `New enquiry: ${input.clubName} — on ${input.currentSystem}`;

  const who =
    input.contactName === null
      ? input.email
      : `${input.contactName}${input.contactRole === null ? '' : `, ${input.contactRole}`}`;

  const details =
    line('Club', input.clubName) +
    line('Where', input.jurisdiction) +
    line('Size', input.clubSize) +
    line('Runs today', input.currentSystem) +
    line('Contact', who) +
    line('Email', input.email) +
    line('Phone', input.phone);

  const said = input.note === null ? '' : `\nThey said:\n\n  ${input.note}\n`;

  // Stated on the alert rather than left to the console, because this is
  // the moment somebody might reply — and replying to an enquiry is not
  // marketing, so the distinction has to be legible at the point of use.
  const consent = input.marketingConsent
    ? '\nThey opted in to occasional product email. Replying to the enquiry itself needs no opt-in.'
    : '\nThey did not opt in to marketing email. Reply to the enquiry itself; send nothing else.';

  return {
    subject,
    body:
      `${input.clubName} has asked to be contacted.\n\n` +
      details +
      said +
      consent +
      '\n\nNobody has been given access — an enquiry creates no club, account or membership ' +
      '(BR145). The full lead list is at /platform.\n',
  };
}
