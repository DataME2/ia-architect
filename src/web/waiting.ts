/**
 * What is waiting on an account, as its bell shows it (BR159, scope 72).
 *
 * Pure: the loaders decide *whether* something is waiting, exactly as the
 * workspaces already do; this only words each item and says where it is
 * answered. `subjectKey` is what makes an item arrive once (0067), so it
 * names the thing waiting, never the moment it was noticed.
 */
import { formatMoney } from '../domain/finance/money.ts';
import { roleLabel } from './designation-answer.ts';

export type WaitingKind =
  | 'correction_proposed'
  | 'availability_unanswered'
  | 'designation_unanswered'
  | 'match_unconfirmed'
  | 'claim_unsettled';

export const WAITING_KINDS: readonly WaitingKind[] = [
  'correction_proposed',
  'availability_unanswered',
  'designation_unanswered',
  'match_unconfirmed',
  'claim_unsettled',
];

/** The kind the club screens synchronise: cheap enough to run on every one. */
export const STAFF_WAITING_KINDS: readonly WaitingKind[] = ['correction_proposed'];

export interface WaitingItem {
  readonly clubId: string;
  readonly kind: WaitingKind;
  readonly subjectKey: string;
  readonly headline: string;
  readonly detail: string | null;
  readonly linkPath: string;
}

/** Who an item is about: the account's own Person, or a child it answers for. */
export type Answering = { readonly self: true } | { readonly self: false; readonly childId: string };

/** Where an item is answered on `/me`: the child's tab, or the account's own role. */
export function workspacePath(clubId: string, role: 'guardian' | 'player' | 'referee', who: Answering): string {
  return who.self
    ? `/me?role=${role}&club=${clubId}`
    : `/me?role=guardian&club=${clubId}&child=${who.childId}`;
}

/** BR149: a player proposed a correction; the roles BR125 trusts confirm it. */
export function correctionItem(
  clubId: string,
  c: { readonly correctionId: string; readonly registrationId: string; readonly playerName: string },
): WaitingItem {
  return {
    clubId,
    kind: 'correction_proposed',
    subjectKey: c.correctionId,
    headline: `${c.playerName} proposed a correction to their record`,
    detail: 'Confirm or decline it on their player record (BR149).',
    linkPath: `/registrar/players/${c.registrationId}`,
  };
}

/** BR62: the next fixture has no answer yet. */
export function availabilityItem(
  clubId: string,
  f: {
    readonly fixtureId: string;
    readonly personId: string;
    readonly name: string;
    readonly opponent: string;
    readonly playedOn: string;
  },
  who: Answering,
): WaitingItem {
  return {
    clubId,
    kind: 'availability_unanswered',
    subjectKey: `${f.fixtureId}:${f.personId}`,
    headline: who.self
      ? `Are you available against ${f.opponent} on ${f.playedOn}?`
      : `Is ${f.name} available against ${f.opponent} on ${f.playedOn}?`,
    detail: 'The coach is waiting on an answer (BR62).',
    linkPath: workspacePath(clubId, 'player', who),
  };
}

/** BR113: a designation is proposed and nobody has answered it. */
export function designationItem(
  clubId: string,
  d: {
    readonly appointmentId: string;
    readonly officialName: string;
    readonly role: string;
    readonly opponent: string;
    readonly playedOn: string;
  },
  who: Answering,
): WaitingItem {
  const what = `${roleLabel(d.role).toLowerCase()} against ${d.opponent} on ${d.playedOn}`;
  return {
    clubId,
    kind: 'designation_unanswered',
    subjectKey: d.appointmentId,
    headline: who.self ? `You are offered as ${what}` : `${d.officialName} is offered as ${what}`,
    detail: 'Accept or decline it (BR113).',
    linkPath: workspacePath(clubId, 'referee', who),
  };
}

/** BR151: a past match nobody has confirmed: the guardian's under 13, the official's own from 13. */
export function matchItem(
  clubId: string,
  m: {
    readonly fixtureId: string;
    readonly personId: string;
    readonly officialName: string;
    readonly opponent: string;
    readonly playedOn: string;
  },
  who: Answering = { self: false, childId: m.personId },
): WaitingItem {
  return {
    clubId,
    kind: 'match_unconfirmed',
    subjectKey: `${m.fixtureId}:${m.personId}`,
    headline: who.self
      ? `Did your match against ${m.opponent} on ${m.playedOn} go ahead?`
      : `Did ${m.officialName}'s match against ${m.opponent} on ${m.playedOn} go ahead?`,
    detail: 'Confirming it marks the fixture played (BR151).',
    linkPath: workspacePath(clubId, 'referee', who),
  };
}

/** BR152: an approved claim with no choice yet between being paid and credit. */
export function claimItem(
  clubId: string,
  c: {
    readonly claimId: string;
    readonly personId: string;
    readonly officialName: string;
    readonly opponent: string;
    readonly playedOn: string;
    readonly amountCents: number;
  },
): WaitingItem {
  return {
    clubId,
    kind: 'claim_unsettled',
    subjectKey: c.claimId,
    headline: `${c.officialName} is owed ${formatMoney(c.amountCents)} for ${c.opponent} on ${c.playedOn}`,
    detail: 'Choose to be paid, or to take it as credit next season (BR152).',
    linkPath: workspacePath(clubId, 'guardian', { self: false, childId: c.personId }),
  };
}
