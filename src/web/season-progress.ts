/**
 * Where today falls in a season (scope 130's Season requirements timeline):
 * how far through it is, which week, and how many days are left. Before the
 * season it is 0% and every day is still to come; after it, 100% and none.
 */
export interface SeasonProgress {
  readonly percent: number;
  readonly week: number;
  readonly weeks: number;
  readonly daysLeft: number;
  readonly phase: 'before' | 'during' | 'after';
}

const DAY = 86_400_000;

function days(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

export function seasonProgress(startsOn: string, endsOn: string, today: string): SeasonProgress {
  const length = Math.max(1, days(startsOn, endsOn));
  const weeks = Math.max(1, Math.ceil(length / 7));
  if (today < startsOn) return { percent: 0, week: 0, weeks, daysLeft: length, phase: 'before' };
  if (today > endsOn) return { percent: 100, week: weeks, weeks, daysLeft: 0, phase: 'after' };
  const gone = days(startsOn, today);
  return {
    percent: Math.round((gone / length) * 100),
    week: Math.min(weeks, Math.floor(gone / 7) + 1),
    weeks,
    daysLeft: length - gone,
    phase: 'during',
  };
}
