/**
 * What the landing page's story says (scope 100): the person card's lens,
 * and the five workspaces the roles section previews.
 *
 * **Everyone here is fictional, and the page says so.** The front door reads
 * no data — it is prerendered — so these are an illustration, never a club's
 * records. A status is a tone and a word, never a tone alone, and never an
 * amount of money: the bench says "not clear to play" (BR78).
 */

export type Tone = 'ok' | 'warn' | 'stop' | 'info';

export interface Status {
  readonly tone: Tone;
  readonly word: string;
}

/** One turn of the lens: the same person, seen as one role. */
export interface Lens {
  readonly role: string;
  readonly line: string;
  readonly tone: Tone;
}

export const LENS_PERSON = { name: 'Tané Walker', initials: 'TW', since: 'One record since 2024' } as const;

const PLAYER: Lens = { role: 'Player', line: 'Registered · U14 Girls', tone: 'ok' };

export const LENSES: readonly Lens[] = [
  PLAYER,
  { role: 'Coach', line: 'U14 Girls · Head coach', tone: 'info' },
  { role: 'Referee', line: 'Appointed · Sat 10:00', tone: 'ok' },
  { role: 'Guardian', line: 'Looks after 2 players', tone: 'info' },
  { role: 'Committee', line: 'Treasurer · 2026 term', tone: 'warn' },
];

/** The lens after `i`, wrapping from the last role back to the first. */
export function nextLens(i: number, count: number = LENSES.length): number {
  return (i + 1) % count;
}

/** The lens at `i`; the first role if `i` is out of range. */
export function lensAt(i: number): Lens {
  return LENSES[i] ?? PLAYER;
}

export interface PreviewRow {
  readonly label: string;
  readonly status?: Status;
  /** A plain value beside the label, where the row is not a status. */
  readonly aside?: string;
}

/** What one role's workspace shows, in the roles section's phone. */
export interface RolePreview {
  readonly role: string;
  readonly summary: string;
  readonly heading: string;
  readonly rows: readonly PreviewRow[];
  readonly tagsHeading?: string;
  readonly tags?: readonly string[];
  readonly action?: string;
}

export const ROLE_PREVIEWS: readonly RolePreview[] = [
  {
    role: 'Registrar',
    summary: 'The season queue: who is ready, who is waiting, who is blocked.',
    heading: 'Season queue',
    rows: [
      { label: 'U14 Girls · 18', status: { tone: 'ok', word: 'Ready' } },
      { label: 'U12 Mixed · 6', status: { tone: 'warn', word: 'Waiting' } },
      { label: 'U16 Boys · 2', status: { tone: 'stop', word: 'Blocked' } },
      { label: 'Seniors · 11', status: { tone: 'ok', word: 'Ready' } },
    ],
  },
  {
    role: 'Coach',
    summary: 'The squad and Saturday’s availability answers.',
    heading: 'Saturday availability',
    rows: [
      { label: 'Tané Walker', status: { tone: 'ok', word: 'Available' } },
      { label: 'Jordan Lee', status: { tone: 'ok', word: 'Available' } },
      { label: 'Sam Ortiz', status: { tone: 'warn', word: 'No reply' } },
      { label: 'Priya Nair', status: { tone: 'stop', word: 'Unavailable' } },
    ],
  },
  {
    role: 'Referee',
    summary: 'Appointments and declaring availability.',
    heading: 'Your appointments',
    rows: [
      { label: 'Sat 10:00 · U14 Girls', status: { tone: 'ok', word: 'Appointed' } },
      { label: 'Sat 13:00 · U16 Boys', status: { tone: 'warn', word: 'Offered' } },
    ],
    action: 'Declare availability',
  },
  {
    role: 'Guardian',
    summary: 'Their children’s registrations, in one place.',
    heading: 'Your children',
    rows: [
      { label: 'Mia · U10', status: { tone: 'ok', word: 'Registered' } },
      { label: 'Noah · U12', status: { tone: 'warn', word: 'Documents due' } },
    ],
  },
  {
    role: 'Committee',
    summary: 'The Management Committee and its sub-committees.',
    heading: 'Management Committee',
    rows: [
      { label: 'President', aside: 'A. Rata' },
      { label: 'Secretary', aside: 'K. Osei' },
      { label: 'Treasurer', aside: 'T. Walker' },
    ],
    tagsHeading: 'Sub-committees',
    tags: ['Juniors', 'Facilities', 'Events'],
  },
];
