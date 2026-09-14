/**
 * What changed about a fixture, in the words a participant will read.
 *
 * Pure, and computed from before and after rather than from the form —
 * because a submit that changed nothing must announce nothing. BR64 is a
 * duty to tell people when something moves; telling them it did not move
 * teaches them to stop reading.
 */
export interface FixtureState {
  readonly kickOff: string | null;
  readonly venue: string | null;
  readonly status: string;
}

const STATUS_WORDS: Readonly<Record<string, string>> = {
  played: 'played',
  scheduled: 'scheduled',
  cancelled: 'cancelled',
  abandoned: 'abandoned',
};

/**
 * A sentence, or `null` when nothing moved.
 *
 * Null rather than an empty string so the caller has to decide what to do
 * about "nothing changed" instead of sending a message that says it.
 */
export function describeFixtureChange(before: FixtureState, after: FixtureState): string | null {
  const parts: string[] = [];

  if (before.status !== after.status) {
    // Said first and plainly: a cancellation is the change people most need
    // to act on, and burying it after a venue tweak reads as a footnote.
    parts.push(
      after.status === 'cancelled'
        ? 'it has been cancelled'
        : `it is now ${STATUS_WORDS[after.status] ?? after.status}`,
    );
  }

  if (before.kickOff !== after.kickOff) {
    parts.push(
      after.kickOff === null
        ? 'the kick-off time has been removed'
        : `the kick-off is now ${after.kickOff}`,
    );
  }

  if (before.venue !== after.venue) {
    parts.push(
      after.venue === null ? 'the venue has been removed' : `the venue is now ${after.venue}`,
    );
  }

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0] as string;
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}
