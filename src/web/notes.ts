/**
 * The Assistant's notes (scope 93): what it flags and summarises on the
 * registrar queue and the person's home.
 *
 * A note never decides anything. It restates what `queue-view.ts` and
 * `home-view.ts` already decide, in a sentence, and points at the page
 * where a person acts. Rendered only through `AssistantNote`, which has no
 * control that commits (decision 1). Nothing here calls a model: these are
 * fixed rules over the screen's own figures, so a note can never say
 * something the screen beside it does not also show.
 */
import { formatMoney } from '../domain/finance/money.ts';

export interface Note {
  readonly id: string;
  /** AssistantNote's honest verb. */
  readonly kind: 'flagged' | 'summary';
  readonly text: string;
  /** Where the person acts; the note's single "use" link. */
  readonly href: string;
  readonly linkLabel: string;
}

export interface QueueFigures {
  readonly total: number;
  readonly readyToSubmit: number;
  /** BR79: registered with the federation, still owing. */
  readonly unpaidCount: number;
  /** Null when the reader may not see amounts (BR78). */
  readonly unpaidCents: number | null;
  readonly topBlocker: { readonly ruleId: string; readonly count: number } | null;
  readonly seasonId: string;
}

/** At most three notes for the queue, most urgent first. */
export function queueNotes(f: QueueFigures): readonly Note[] {
  const notes: Note[] = [];
  const season = `?season=${encodeURIComponent(f.seasonId)}`;
  if (f.unpaidCount > 0) {
    const who = f.unpaidCount === 1 ? '1 registered player cannot play' : `${f.unpaidCount} registered players cannot play`;
    const owed = f.unpaidCents === null ? 'money is still owed' : `${formatMoney(f.unpaidCents)} is still owed`;
    notes.push({
      id: 'unpaid',
      kind: 'flagged',
      text: `${who}: ${owed} (BR79). Every other screen shows them as finished, so a coach could field them.`,
      href: '#cannot-play',
      linkLabel: 'See who',
    });
  }
  // blockerSummary counts a rule's failures across every registration, the
  // complete ones included, so the count is set against the total.
  if (f.topBlocker && f.topBlocker.count > 0) {
    notes.push({
      id: 'blocker',
      kind: 'summary',
      text: `The rule failing most often is ${f.topBlocker.ruleId}, on ${f.topBlocker.count} of the ${f.total} registrations this season.`,
      href: '#holding',
      linkLabel: 'See the breakdown',
    });
  }
  if (f.readyToSubmit > 0) {
    notes.push({
      id: 'ready',
      kind: 'summary',
      text: `${f.readyToSubmit === 1 ? '1 registration is' : `${f.readyToSubmit} registrations are`} ready to send to the federation.`,
      href: `/registrar/pack${season}`,
      linkLabel: 'Open the submission pack',
    });
  }
  return notes.slice(0, 3);
}

export interface HomeFigures {
  readonly items: readonly { readonly headline: string; readonly href: string; readonly roleLabel: string; readonly clubName: string | null; readonly tone: 'pending' | 'blocked' }[];
}

/** At most two notes for the person's home. */
export function homeNotes(f: HomeFigures): readonly Note[] {
  const notes: Note[] = [];
  const blocked = f.items.filter((i) => i.tone === 'blocked');
  if (blocked.length > 0) {
    const first = blocked[0]!;
    notes.push({
      id: 'blocked',
      kind: 'flagged',
      text: `${blocked.length === 1 ? 'One thing is' : `${blocked.length} things are`} blocked. The first is “${first.headline}” (${first.roleLabel}${first.clubName ? `, ${first.clubName}` : ''}).`,
      href: first.href,
      linkLabel: 'Open it',
    });
  }
  if (f.items.length > 1) {
    const roles = new Set(f.items.map((i) => `${i.roleLabel}|${i.clubName ?? ''}`));
    notes.push({
      id: 'waiting',
      kind: 'summary',
      text: `${f.items.length} things are waiting on you across ${roles.size} ${roles.size === 1 ? 'role' : 'roles'}. Each one opens in the role it belongs to.`,
      href: '#waiting',
      linkLabel: 'See the list',
    });
  }
  return notes;
}
