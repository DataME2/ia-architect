import type { Person } from '../domain/types.ts';
import { FOOT_LABEL, POSITION_LABEL } from './player-view.ts';
import { fullLegalName } from './queue-view.ts';

/**
 * The player record as its own family reads it (BR155): the player
 * themselves, or a guardian holding authority over them.
 *
 * Only the confirmed values, never a pending BR149 claim, and never height
 * or weight — those stay with the roles that pick teams (BR99), and the
 * database's `app_family_player_profiles()` does not return them, so this
 * type does not carry them either.
 */
export interface FamilyPlayerProfile {
  readonly preferredPosition: string | null;
  readonly secondaryPosition: string | null;
  readonly preferredFoot: string | null;
  readonly squadNumber: number | null;
}

export interface RecordLine {
  readonly label: string;
  readonly value: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A birth date with its year — `shortDate` drops it, which suits a fixture and not a birthday. */
export function birthDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const month = m === undefined ? undefined : MONTHS[m - 1];
  if (y === undefined || d === undefined || month === undefined || Number.isNaN(y + d)) return iso;
  return `${d} ${month} ${y}`;
}

/**
 * Every line of the record, in the order a family checks it.
 *
 * Absence reads as "Not recorded" rather than vanishing: a family checking
 * whether the club fixed a mistake has to be able to tell "nothing there"
 * from "the screen does not show it", which is the confusion that made
 * this rule necessary.
 */
export function playerRecordLines(person: Person, profile: FamilyPlayerProfile | null): readonly RecordLine[] {
  const missing = 'Not recorded';
  const position = (v: string | null): string => (v === null ? missing : POSITION_LABEL[v] ?? v);
  return [
    {
      label: 'Legal name',
      value: `${fullLegalName(person)}${person.legalNameVerifiedAt === null ? ' (not yet checked against a document)' : ''}`,
    },
    { label: 'Known as', value: person.preferredName?.trim() || missing },
    { label: 'Date of birth', value: birthDateLabel(person.dateOfBirth) },
    { label: 'Email', value: person.email ?? missing },
    { label: 'Preferred position', value: position(profile?.preferredPosition ?? null) },
    { label: 'Also plays', value: position(profile?.secondaryPosition ?? null) },
    {
      label: 'Preferred foot',
      value: profile?.preferredFoot == null ? missing : FOOT_LABEL[profile.preferredFoot] ?? profile.preferredFoot,
    },
    { label: 'Squad number', value: profile?.squadNumber == null ? missing : String(profile.squadNumber) },
  ];
}
