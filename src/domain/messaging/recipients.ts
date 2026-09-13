/**
 * Who a message goes to, and what it may say about whom.
 *
 * BR131 draws the same line BR32 draws for a calendar feed and BR65 draws
 * for the app: a message carries the recipient's own information, and the
 * information of the Persons they hold authority over. Never another
 * family's, another official's, or a whole club's.
 *
 * Pure, because the failure this prevents — a reminder listing every
 * outstanding registration at the club, sent to one parent — looks
 * completely fine in review.
 */
import type { Guardianship, Person } from '../types.ts';

export interface Addressee {
  readonly personId: string;
  readonly email: string;
  readonly displayName: string;
}

/**
 * Who is told about this Person.
 *
 * A minor is never written to directly: their guardians with authority are.
 * An adult is written to themselves. Both flow from `is_authority`, which
 * already expires at eighteen (BR67), so this needs no age check of its own
 * — and gets none, because a second definition of "who is responsible"
 * would eventually disagree with the first.
 */
export function addresseesFor(
  subject: Person,
  guardianships: readonly Guardianship[],
  peopleById: ReadonlyMap<string, Person>,
): readonly Addressee[] {
  const guardians = guardianships
    .filter((g) => g.personId === subject.id && g.isAuthority)
    .map((g) => peopleById.get(g.guardianPersonId))
    .filter((p): p is Person => p !== undefined);

  const chosen = guardians.length > 0 ? guardians : [subject];

  return chosen
    .filter((p) => (p.email ?? '').trim() !== '')
    .map((p) => ({
      personId: p.id,
      email: (p.email as string).trim(),
      displayName: p.preferredName?.trim() || p.legalName.givenNames,
    }));
}

/**
 * Why nobody can be written to, when nobody can.
 *
 * Returned rather than thrown: "this child has no contactable guardian" is
 * a fact the registrar needs on the screen, not an error in a log.
 */
export function unreachableReason(
  subject: Person,
  addressees: readonly Addressee[],
): string | null {
  if (addressees.length > 0) return null;
  const name = subject.preferredName?.trim() || subject.legalName.givenNames;
  return `No email address recorded for ${name} or their guardians.`;
}
