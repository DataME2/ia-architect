/**
 * How long a record stays, by participation rather than by one clock
 * (BR40).
 *
 * The other direction of the same machinery as `erasure.ts`, and it reads
 * the same bases. What differs is the question: erasure asks about one
 * Person because somebody asked, and this asks about all of them because
 * time passed.
 *
 * **This module decides what to propose, never what to delete**
 * ([decision 14](../../../docs/decisions/14_retention_proposes_a_person_disposes.md)).
 * That is not a limitation of a pure function — the pure function could
 * return `dispose` just as easily. It is the rule: a wrong predicate in an
 * unattended job destroys a club's history and leaves nothing to notice it
 * by, so the machine computes and a person acts.
 */
import { ageAt, type IsoDate } from '../types.ts';
import { bindingBases } from './erasure.ts';
import type { RetentionBasis, StatutoryMinimums } from './types.ts';

export type RetentionState =
  | 'active'
  | 'lapsed'
  | 'due_for_disposal'
  | 'life_member'
  | 'contact_stale';

export interface RetentionInput {
  /** The end of the last season this Person participated in, if any. */
  readonly lastParticipationEndedOn: IsoDate | null;
  readonly isLifeMember: boolean;
  readonly deceasedOn: IsoDate | null;
  readonly contactConfirmedAt: IsoDate | null;
  readonly bases: readonly RetentionBasis[];
}

export interface RetentionVerdict {
  readonly state: RetentionState;
  readonly detail: string;
}

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

function yearsBefore(asAt: IsoDate, years: number): IsoDate {
  const [y, m, d] = asAt.split('-').map(Number) as [number, number, number];
  return `${pad(y - years, 4)}-${pad(m)}-${pad(d)}` as IsoDate;
}

function monthsBefore(asAt: IsoDate, months: number): IsoDate {
  const [y, m, d] = asAt.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) - months;
  return `${pad(Math.floor(total / 12), 4)}-${pad((total % 12) + 1)}-${pad(d)}` as IsoDate;
}

/**
 * What should happen to one Person's record, and why.
 *
 * Life membership is checked first and wins outright (BR70). A deceased
 * life member is never proposed for disposal, and their absence from the
 * list is the rule working rather than a gap in it.
 */
export function retentionState(
  input: RetentionInput,
  minimums: StatutoryMinimums,
  asAt: IsoDate,
  contactStaleMonths = 24,
): RetentionVerdict {
  if (input.isLifeMember) {
    if (input.deceasedOn !== null) {
      return {
        state: 'life_member',
        detail: `Life member, deceased ${input.deceasedOn} — retained indefinitely for the club's history (BR70).`,
      };
    }
    // BR71: a register nobody has contacted goes stale, and the club finds
    // out when an invitation bounces at the anniversary dinner.
    const stale =
      input.contactConfirmedAt === null ||
      input.contactConfirmedAt < monthsBefore(asAt, contactStaleMonths);
    return stale
      ? {
          state: 'contact_stale',
          detail: `Life member — contact details not confirmed since ${input.contactConfirmedAt ?? 'ever'} (BR71).`,
        }
      : { state: 'life_member', detail: 'Life member — retained indefinitely (BR69).' };
  }

  if (input.lastParticipationEndedOn === null) {
    return { state: 'lapsed', detail: 'No participation recorded.' };
  }

  if (input.lastParticipationEndedOn >= yearsBefore(asAt, minimums.activeParticipationYears)) {
    return {
      state: 'active',
      detail: `Participated in a season ending ${input.lastParticipationEndedOn} — retained at least ${minimums.activeParticipationYears} years (BR40).`,
    };
  }

  // Past the period — but a basis can still bind, and then it is merely
  // lapsed rather than disposable. Asking the same question erasure asks is
  // the point of there being one table of reasons.
  if (bindingBases(input.bases, asAt).length > 0) {
    return {
      state: 'lapsed',
      detail: `Past its retention period, but a retention basis still binds this record.`,
    };
  }

  return {
    state: 'due_for_disposal',
    detail: `No participation since ${input.lastParticipationEndedOn}, and nothing requires this record to be kept.`,
  };
}

/**
 * Whether BR67's transfer is due.
 *
 * Authority ends at eighteen; contactability does not — which is why 0001
 * made them two flags rather than one, and why this function says nothing
 * about `isContact`.
 *
 * Uses `ageAt` rather than a date comparison of its own. Eighteen is
 * already defined once, for BR1 and BR48, and a second definition here
 * would eventually disagree with the first about a birthday on 29 February.
 */
export function authorityHasEnded(dateOfBirth: IsoDate, asAt: IsoDate): boolean {
  return ageAt(dateOfBirth, asAt) >= 18;
}
