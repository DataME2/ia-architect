/**
 * Whether this official can be designated to this fixture, and what a
 * coordinator should be told before they are.
 *
 * Pure, like the registration rules engine, so BR6 to BR11 can be diffed
 * against the rules table rather than trusted. Each result carries the
 * rule's own identifier for the same reason a `validation_result` records
 * `BR55` rather than "legal name mismatch": the prose can be reworded, the
 * identifier is the join between the running system and the documents.
 *
 * **The blockers here duplicate database triggers on purpose.** Migration
 * 0025 enforces BR6, BR9 and BR109, because their failure mode is a person
 * on a pitch who should not be there and there will be more than one
 * surface that appoints. This module exists so the screen *never offers*
 * somebody the database would refuse — which is BR109's own wording, and
 * the defect WP3 of scope 29 exists to stop repeating.
 */

export type OfficialRole = 'referee' | 'assistant_referee' | 'fourth_official';

export interface CandidateAccreditation {
  readonly kind: string;
  readonly expiresOn: string | null;
  readonly verifiedAt: string | null;
}

export interface Candidate {
  readonly personId: string;
  readonly name: string;
  readonly classification: string | null;
  readonly accreditations: readonly CandidateAccreditation[];

  /** Played in this fixture (BR6). */
  readonly playedInFixture: boolean;
  /** In a team contesting this fixture (BR109). */
  readonly inFixtureTeam: boolean;
  /** Guardian of somebody who played in it (BR109). */
  readonly guardianInFixture: boolean;
  /** Suspended on the day of the fixture (BR9). */
  readonly suspended: boolean;
  /** Already designated to another fixture at this kick-off (BR7). */
  readonly clashesAtKickOff: boolean;

  /**
   * The roles this person holds at *this club* other than officiating —
   * committee office, a coaching or team-official role, a club membership
   * that lets them act administratively.
   *
   * **This is BR11's "same-club affiliation", and it is deliberately not
   * "is a person at this club".** Every candidate is, because `person` is
   * tenant-scoped, so that reading would put a warning on every row and
   * teach a coordinator to ignore all of them. What is worth flagging is
   * an official who is also *club personnel* — the committee member who
   * referees a grade when nobody else can.
   */
  readonly clubRoles: readonly string[];

  /** Designations already held on the same day, excluding this fixture. */
  readonly sameDayAppointments: number;

  /** Declared available for this date and kick-off (scope 33, WP2). */
  readonly available: boolean;
}

export interface FixtureContext {
  /** ISO date the fixture is played on — every date question is asked of it. */
  readonly playedOn: string;
  readonly hasKickOff: boolean;
}

export interface Finding {
  readonly rule: string;
  readonly message: string;
}

export interface Assessment {
  readonly blockers: readonly Finding[];
  readonly warnings: readonly Finding[];
  /** No blockers. Warnings do not stop a designation; they inform one. */
  readonly offerable: boolean;
}

/** How many consecutive matches in a day is worth mentioning. */
export const CONSECUTIVE_MATCH_WARNING_AT = 2;

export function assess(candidate: Candidate, fixture: FixtureContext): Assessment {
  const blockers: Finding[] = [];
  const warnings: Finding[] = [];

  // ---------------------------------------------------------- blocking
  if (candidate.playedInFixture) {
    blockers.push({ rule: 'BR6', message: 'Played in this fixture.' });
  }
  if (candidate.inFixtureTeam) {
    blockers.push({ rule: 'BR109', message: 'In a team contesting this fixture.' });
  }
  if (candidate.guardianInFixture) {
    blockers.push({
      rule: 'BR109',
      message: 'Guardian of a player in this fixture.',
    });
  }
  if (candidate.suspended) {
    blockers.push({ rule: 'BR9', message: 'Suspended on the date of this fixture.' });
  }
  if (candidate.clashesAtKickOff) {
    blockers.push({ rule: 'BR7', message: 'Already designated to another match at this time.' });
  }

  // ---------------------------------------------------------- warnings

  // BR11 — same-club affiliation. The case this exists for is the club
  // officer who referees a grade because nobody else can: not a conflict of
  // the kind BR6 and BR109 refuse, and not nothing either.
  if (candidate.clubRoles.length > 0) {
    warnings.push({
      rule: 'BR11',
      message: `Also ${listRoles(candidate.clubRoles)} at this club.`,
    });
  }

  // BR11 — consecutive matches. A whistle is physical work and the third
  // game of a morning is where a mistake gets made.
  if (candidate.sameDayAppointments >= CONSECUTIVE_MATCH_WARNING_AT) {
    warnings.push({
      rule: 'BR11',
      message: `Already officiating ${candidate.sameDayAppointments} other ${
        candidate.sameDayAppointments === 1 ? 'match' : 'matches'
      } that day.`,
    });
  }

  // BR10 — **a warning rather than a blocker, deliberately.** The rule
  // blocks on an expired *mandatory* accreditation, and nothing records
  // which accreditations are mandatory: that varies by competition, and
  // competitions are C11. Blocking on any expiry would refuse an official
  // over a lapsed certificate no rule required of them; ignoring it would
  // hide the one that mattered. So it is surfaced and the coordinator
  // decides, and the gap is written down rather than guessed at.
  for (const expired of expiredOn(candidate.accreditations, fixture.playedOn)) {
    warnings.push({
      rule: 'BR10',
      message: `${expired.kind} expired ${expired.expiresOn}.`,
    });
  }

  // BR8 — cannot be completed. It compares a classification against the
  // *competition's minimum*, and no competition record exists. What can be
  // said is that there is nothing to compare.
  if (candidate.classification === null) {
    warnings.push({
      rule: 'BR8',
      message: 'No classification recorded, so eligibility cannot be judged.',
    });
  }

  // Not a business rule — a declaration. A coordinator may still ask
  // somebody who has not said they are free; they should know they are.
  if (!candidate.available) {
    warnings.push({
      rule: '—',
      message: fixture.hasKickOff
        ? 'Has not declared themselves available at that time.'
        : 'Has not declared themselves available that day.',
    });
  }

  return { blockers, warnings, offerable: blockers.length === 0 };
}

function expiredOn(
  accreditations: readonly CandidateAccreditation[],
  asOf: string,
): readonly { kind: string; expiresOn: string }[] {
  return accreditations.flatMap((a) =>
    a.verifiedAt !== null && a.expiresOn !== null && a.expiresOn < asOf
      ? [{ kind: a.kind, expiresOn: a.expiresOn }]
      : [],
  );
}

/** `committee and coach`, `admin, committee and coach`. */
function listRoles(roles: readonly string[]): string {
  const unique = [...new Set(roles)].sort();
  if (unique.length === 1) return unique[0]!;
  return `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
}

/**
 * The candidates a coordinator should be shown, and in what order.
 *
 * **Blocked candidates are removed, not greyed out** — BR109 says the
 * designation is "never offered rather than offered and rejected", and a
 * disabled row invites somebody to ask why and then work around it.
 *
 * Among those left: fewest warnings first, then name. The person with
 * nothing against them should be the easy click.
 */
export function offerable(
  candidates: readonly Candidate[],
  fixture: FixtureContext,
): readonly { candidate: Candidate; assessment: Assessment }[] {
  return candidates
    .map((candidate) => ({ candidate, assessment: assess(candidate, fixture) }))
    .filter((row) => row.assessment.offerable)
    .sort((a, b) => {
      const byWarnings = a.assessment.warnings.length - b.assessment.warnings.length;
      if (byWarnings !== 0) return byWarnings;
      return a.candidate.name.localeCompare(b.candidate.name);
    });
}

/**
 * Whether proposing this designation needs an override recorded (BR11).
 *
 * Every override is audited, so the screen has to know when it is making
 * one. A designation with no warnings is not an override and should not
 * write an audit row that says it was.
 */
export function needsOverride(assessment: Assessment): boolean {
  return assessment.warnings.some((w) => w.rule !== '—');
}
