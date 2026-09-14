/**
 * The ladder, and each team's next unplayed fixture (BR26).
 *
 * Pure, and the reason is unusually literal here: this is the one thing in
 * the product that **four hundred strangers read on their phones at a
 * ground**. A ladder that is wrong is wrong in front of all of them, and
 * there is no registrar to notice it first.
 *
 * Nothing in this module knows a person's name, because nothing it reads
 * has one — `carnival_fixture` carries no `person_id` column at all
 * (BR139).
 */

export interface CarnivalFixture {
  readonly id: string;
  readonly homeEntryId: string;
  readonly awayEntryId: string;
  readonly playedOn: string;
  readonly kickOff: string | null;
  readonly venue: string | null;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly status: 'scheduled' | 'played' | 'cancelled' | 'abandoned';
}

export interface CarnivalEntry {
  readonly id: string;
  readonly entrantName: string;
  readonly teamName: string;
}

/** BR29's points system, which a carnival sets rather than inherits. */
export interface PointsSystem {
  readonly win: number;
  readonly draw: number;
}

export interface LadderRow {
  readonly entryId: string;
  readonly entrantName: string;
  readonly teamName: string;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDifference: number;
  readonly points: number;
}

function counted(fixture: CarnivalFixture): boolean {
  // A cancelled game was not played, and an abandoned one has no result
  // anybody agreed on. Counting either invents a fact.
  return fixture.status === 'played'
    && fixture.homeGoals !== null
    && fixture.awayGoals !== null;
}

export function ladder(
  entries: readonly CarnivalEntry[],
  fixtures: readonly CarnivalFixture[],
  points: PointsSystem,
): readonly LadderRow[] {
  const rows = new Map<string, {
    played: number; won: number; drawn: number; lost: number;
    goalsFor: number; goalsAgainst: number;
  }>();
  for (const entry of entries) {
    rows.set(entry.id, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 });
  }

  for (const fixture of fixtures) {
    if (!counted(fixture)) continue;
    const home = rows.get(fixture.homeEntryId);
    const away = rows.get(fixture.awayEntryId);
    // A fixture naming an entry that is gone is dropped rather than
    // rendered as a blank row in a public table.
    if (home === undefined || away === undefined) continue;

    const hg = fixture.homeGoals as number;
    const ag = fixture.awayGoals as number;

    home.played += 1; away.played += 1;
    home.goalsFor += hg; home.goalsAgainst += ag;
    away.goalsFor += ag; away.goalsAgainst += hg;

    if (hg > ag) { home.won += 1; away.lost += 1; }
    else if (ag > hg) { away.won += 1; home.lost += 1; }
    else { home.drawn += 1; away.drawn += 1; }
  }

  return entries
    .map((entry) => {
      const r = rows.get(entry.id)!;
      return {
        entryId: entry.id,
        entrantName: entry.entrantName,
        teamName: entry.teamName,
        ...r,
        goalDifference: r.goalsFor - r.goalsAgainst,
        points: r.won * points.win + r.drawn * points.draw,
      };
    })
    .sort((a, b) =>
      b.points - a.points
      || b.goalDifference - a.goalDifference
      || b.goalsFor - a.goalsFor
      // Alphabetical last, so a tie is stable rather than depending on
      // insertion order — a table that reorders itself between refreshes
      // reads as broken.
      || `${a.entrantName} ${a.teamName}`.localeCompare(`${b.entrantName} ${b.teamName}`));
}

/**
 * The next fixture a team has not played (BR26).
 *
 * Ordered by date then kick-off, with a missing kick-off sorting last
 * within its day: a time nobody set is less certain than one somebody did,
 * and showing it first would send a family to the ground too early.
 */
export function nextFixtureFor(
  entryId: string,
  fixtures: readonly CarnivalFixture[],
): CarnivalFixture | null {
  return fixtures
    .filter((f) => (f.homeEntryId === entryId || f.awayEntryId === entryId)
      && f.status === 'scheduled')
    .sort((a, b) =>
      a.playedOn.localeCompare(b.playedOn)
      || (a.kickOff ?? '99:99').localeCompare(b.kickOff ?? '99:99'))[0] ?? null;
}
