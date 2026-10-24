/**
 * The club profile's words (scope 106): where the club is, and what its
 * licence is doing today, as a dot and a word.
 */
import type { LicenceStanding } from './platform-view.ts';

const JURISDICTION_NAME: Readonly<Record<string, string>> = {
  'AU-QLD': 'Queensland, Australia',
  'AU-NSW': 'New South Wales, Australia',
  'AU-VIC': 'Victoria, Australia',
  'AU-SA': 'South Australia',
  'AU-WA': 'Western Australia',
  'AU-TAS': 'Tasmania, Australia',
  'AU-ACT': 'Australian Capital Territory',
  'AU-NT': 'Northern Territory, Australia',
  NZ: 'New Zealand',
};

/** The code itself when it is one the platform does not name yet. */
export function jurisdictionName(code: string): string {
  return JURISDICTION_NAME[code] ?? code;
}

/**
 * The licence standing as the club reads it. Lapsed is red even when the
 * column still says active: the date is the fact (`standing()`).
 */
export function standingWord(s: LicenceStanding): { readonly label: string; readonly tone: string } {
  switch (s.kind) {
    case 'none':
      return { label: 'No licence recorded', tone: 'pill' };
    case 'trial':
      return { label: 'Trial', tone: 'pill pill-info' };
    case 'active':
      return { label: 'Licensed', tone: 'pill pill-ok' };
    case 'expiring':
      return { label: 'Renewal due', tone: 'pill pill-warn' };
    case 'lapsed':
      return { label: 'Lapsed', tone: 'pill pill-stop' };
    case 'suspended':
      return { label: 'Suspended', tone: 'pill pill-stop' };
    case 'ended':
      return { label: 'Ended', tone: 'pill' };
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1 Jul 2026". */
export function dayMonthYear(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const month = MONTHS[(m ?? 0) - 1];
  return month === undefined || y === undefined || d === undefined ? iso : `${d} ${month} ${y}`;
}
