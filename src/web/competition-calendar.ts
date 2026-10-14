/**
 * The competition by calendar year and team (scope 99): grouping, the month
 * grid, and the exports. Pure, so the files a club downloads are tested
 * byte for byte rather than eyeballed.
 *
 * **Calendar year, not season.** A club's season can straddle two years, but
 * the request was "per calendar year", and a fixture list is read by date:
 * January's games belong to January whichever season they count towards.
 *
 * **Exports carry what the screen shows, nothing more.** Fixtures hold no
 * personal data, so an export leaks nothing a member could not already read.
 */

export interface CalendarFixture {
  readonly id: string;
  readonly teamId: string | null;
  readonly teamName: string;
  readonly playedOn: string;
  readonly kickOff: string | null;
  readonly opponent: string;
  readonly homeAway: string;
  readonly competition: string | null;
  readonly venue: string | null;
  readonly status: string;
  readonly goalsFor: number | null;
  readonly goalsAgainst: number | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export function monthName(month0: number): string {
  return MONTHS[month0] ?? '';
}

/** The calendar years that have fixtures, newest first. */
export function yearsOf(fixtures: readonly CalendarFixture[]): readonly number[] {
  return [...new Set(fixtures.map((f) => Number(f.playedOn.slice(0, 4))))].sort((a, b) => b - a);
}

/** One year, one team or all, in date and kick-off order. */
export function filterFixtures(
  fixtures: readonly CalendarFixture[],
  year: number,
  teamId: string | null,
): readonly CalendarFixture[] {
  return fixtures
    .filter((f) => f.playedOn.startsWith(`${year}-`) && (teamId === null || f.teamId === teamId))
    .sort((a, b) => a.playedOn.localeCompare(b.playedOn) || (a.kickOff ?? '').localeCompare(b.kickOff ?? '') || a.teamName.localeCompare(b.teamName));
}

/** Grouped by month, only the months that have a fixture. */
export function byMonth(fixtures: readonly CalendarFixture[]): readonly { readonly month0: number; readonly label: string; readonly fixtures: readonly CalendarFixture[] }[] {
  const months = new Map<number, CalendarFixture[]>();
  for (const f of fixtures) {
    const m = Number(f.playedOn.slice(5, 7)) - 1;
    months.set(m, [...(months.get(m) ?? []), f]);
  }
  return [...months.entries()].sort(([a], [b]) => a - b).map(([month0, list]) => ({ month0, label: monthName(month0), fixtures: list }));
}

function iso(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * A Monday-first month as weeks of ISO dates, with null for the days
 * outside it — the shape a grid draws without any date arithmetic of its own.
 */
export function monthGrid(year: number, month0: number): readonly (readonly (string | null)[])[] {
  const first = new Date(Date.UTC(year, month0, 1));
  const days = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = [...Array<null>(lead).fill(null)];
  for (let d = 1; d <= days; d += 1) cells.push(iso(year, month0, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "2–1 W", "0–0 D", or the status when there is no score. */
export function resultLabel(f: Pick<CalendarFixture, 'status' | 'goalsFor' | 'goalsAgainst'>): string {
  if (f.goalsFor === null || f.goalsAgainst === null) {
    return f.status === 'scheduled' ? '' : f.status.charAt(0).toUpperCase() + f.status.slice(1);
  }
  const outcome = f.goalsFor > f.goalsAgainst ? 'W' : f.goalsFor < f.goalsAgainst ? 'L' : 'D';
  return `${f.goalsFor}–${f.goalsAgainst} ${outcome}`;
}

export const EXPORT_COLUMNS = ['Date', 'Kick-off', 'Team', 'Home/Away', 'Opponent', 'Competition', 'Venue', 'Status', 'Result'] as const;

export function exportRows(fixtures: readonly CalendarFixture[]): readonly (readonly string[])[] {
  return [
    [...EXPORT_COLUMNS],
    ...fixtures.map((f) => [
      f.playedOn,
      f.kickOff?.slice(0, 5) ?? '',
      f.teamName,
      f.homeAway === 'home' ? 'Home' : f.homeAway === 'away' ? 'Away' : 'Neutral',
      f.opponent,
      f.competition ?? '',
      f.venue ?? '',
      f.status,
      resultLabel(f),
    ]),
  ];
}

/**
 * RFC 4180 CSV. A cell that opens with = + - or @ is prefixed with an
 * apostrophe so a spreadsheet reads it as text, never as a formula — an
 * opponent named "=HYPERLINK(…)" is a team name, not an instruction.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  const cell = (v: string) => {
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

function xml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/**
 * Excel's SpreadsheetML 2003: an XML workbook Excel, Numbers and LibreOffice
 * open natively, with a bold header row — and no dependency, where a true
 * .xlsx would need a zip writer (scope 99's gap notes). Every cell is a
 * String, so no value is ever evaluated as a formula.
 */
export function toSpreadsheetXml(rows: readonly (readonly string[])[], sheetName: string): string {
  const name = xml(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Fixtures');
  const body = rows
    .map((r, i) => `   <Row>${r.map((v) => `<Cell${i === 0 ? ' ss:StyleID="h"' : ''}><Data ss:Type="String">${xml(v)}</Data></Cell>`).join('')}</Row>`)
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    ' <Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>',
    ` <Worksheet ss:Name="${name}">`,
    '  <Table>',
    body,
    '  </Table>',
    ' </Worksheet>',
    '</Workbook>',
    '',
  ].join('\n');
}

/** "north-star-fc-2026-u12-academy-fixtures" — safe on every filesystem. */
export function exportFileName(club: string, year: number, team: string | null): string {
  // Decompose "ú" into "u" plus its accent, drop the accent, then slug.
  const slug = (s: string) =>
    s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return [slug(club), String(year), team === null ? null : slug(team), 'fixtures'].filter(Boolean).join('-');
}
