/**
 * *Season Paths*: four walks through a club's season, and where each one
 * stops (scope 117).
 *
 * The guide [scope 114](../../docs/scope/114_a_public_test_site_and_a_production_project.md)
 * published outside the platform, brought inside it. Each step names the
 * screen it happens on and the business rules that allow, warn or stop it;
 * switching a condition shows which one decides.
 *
 * **It describes the rules, it does not enforce them** — every rule that
 * blocks is enforced by the database and the screen, and this text has to
 * follow when one changes. Pure, so `season-paths.test.ts` pins each path's
 * outcomes and a change here is a deliberate one.
 */

export type Conditions = Readonly<Record<string, boolean | string>>;
type When = (c: Conditions) => boolean;

/** True only for a switch that is on: an absent or unknown one is off. */
const on = (c: Conditions, id: string): boolean => c[id] === true;

export type RuleKind = 'blocks' | 'warns' | 'checks' | 'records';
export type Tone = 'ok' | 'warn' | 'stop';

export const RULE_KIND_WORD: Readonly<Record<RuleKind, string>> = {
  blocks: 'Blocks',
  warns: 'Warns',
  checks: 'Checks',
  records: 'Records',
};

export interface Condition {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly initial: boolean | string;
  /** A choice rather than a switch, as `[value, label]`. */
  readonly options?: readonly (readonly [string, string])[];
  readonly showIf?: When;
}

export interface PathRule {
  readonly br: string;
  readonly kind: RuleKind;
  readonly text: string;
  readonly when?: When;
}

export interface PathStep {
  readonly title: string;
  readonly who: string;
  readonly route: string;
  /** False where the screen is only reached from a link someone was sent. */
  readonly linkable: boolean;
  readonly linkLabel?: string;
  readonly body: string;
  readonly fields?: readonly (readonly [string, string])[];
  readonly rules?: readonly PathRule[];
  /** A note set apart from the rules, with somewhere to go next. */
  readonly aside?: { readonly text: string; readonly href: string; readonly label: string };
  readonly showIf?: When;
  readonly stop?: (c: Conditions) => string | null;
  readonly warn?: (c: Conditions) => string | null;
  readonly status?: (c: Conditions) => string | null;
}

export interface Outcome {
  readonly tone: Tone;
  readonly state: string;
  readonly text: string;
}

export interface SeasonPath {
  readonly id: string;
  readonly label: string;
  readonly intro: string;
  readonly conditions: readonly Condition[];
  readonly steps: readonly PathStep[];
  /**
   * Whether `outcome` already says why the path stopped. Where it does not,
   * a stop reads as the generic "Stopped".
   */
  readonly explainsItsOwnStop: boolean;
  readonly outcome: (c: Conditions, held: readonly string[]) => Outcome;
}

/** BR6, BR7, BR8, BR9, BR10, BR19 and BR109: the referee is never offered. */
function refereeBlocked(c: Conditions): boolean {
  return (
    on(c, 'plays') || on(c, 'otherRole') || on(c, 'clash') || on(c, 'grade') ||
    on(c, 'suspended') || on(c, 'expired') || (on(c, 'nowwcc') && !on(c, 'minor'))
  );
}

export const SEASON_PATHS: readonly SeasonPath[] = [
  {
    id: 'register',
    label: 'Register a player',
    intro:
      'A family registers a player through the club’s invitation link, and the registrar takes it to complete.',
    conditions: [
      { id: 'minor', label: 'The player is under 18', initial: true },
      { id: 'guardian', label: 'A parent or guardian is entered', initial: true, showIf: (c) => on(c, 'minor') },
      { id: 'notice', label: 'Collection notice acknowledged', initial: true },
      { id: 'docs', label: 'Required documents uploaded', initial: true },
      { id: 'overseas', label: 'Last registration was overseas', initial: false },
      { id: 'itc', label: 'Transfer certificate (ITC) on file', initial: false, showIf: (c) => on(c, 'overseas') },
      { id: 'paid', label: 'Nothing owed', hint: 'Fees paid, or a credit', initial: true },
      { id: 'squadi', label: 'Registered in SQUADI', initial: true },
      { id: 'officiate', label: 'Wants to officiate', initial: false },
    ],
    steps: [
      {
        title: 'The club issues a registration link',
        who: 'Registrar',
        route: '/registrar/invitations',
        linkable: true,
        body: 'One link per club and season. The family needs no account to use it.',
        rules: [
          { br: 'BR72', kind: 'checks', text: 'The link creates one registration and nothing else, and it can be revoked.' },
        ],
        // Scope 117, WP2 (BR190): the step that first needs a club sign-in
        // is where a visitor learns how to get one.
        aside: {
          text:
            'To walk these paths yourself, ask for a QA Test Pass. On request, the platform owner ' +
            'gives you sign-ins on the test site covering every role and function: registrar, ' +
            'treasurer, coordinator, referee, coach, family and player. Everything you see there is ' +
            'synthetic, and a pass never reaches real club data.',
          href: '/interest',
          label: 'Ask for a QA Test Pass (say so in the note)',
        },
      },
      {
        title: 'The family fills in the form',
        who: 'Parent or guardian, or the player',
        route: '/join/[token]',
        linkable: false,
        body: 'Five steps in one form. “Next” checks only what is on screen; the same rules run again when it is submitted.',
        fields: [
          ['The player', 'legal given and family names, preferred name, date of birth, email'],
          ['Parent or guardian', 'names and email'],
          ['Permissions', 'collection notice, ID photograph, publicity'],
          ['Officiating and season', 'interest, experience, accreditation, season'],
          ['Review', 'documents'],
        ],
        rules: [
          { br: 'BR1', kind: 'blocks', text: 'Under 18, the form needs a parent or guardian and a way to reach them.', when: (c) => on(c, 'minor') },
          { br: 'BR48', kind: 'blocks', text: 'Nothing is recorded until the collection notice is acknowledged.' },
          { br: 'BR56 · BR57', kind: 'records', text: 'The ID photograph and publicity are separate permissions, and both start off.' },
          { br: '', kind: 'checks', text: 'The date of birth must be a real date, not in the future, with a plausible year.' },
        ],
        stop: (c) =>
          on(c, 'minor') && !on(c, 'guardian')
            ? 'The form won’t submit: a player under 18 needs a parent or guardian (BR1).'
            : !on(c, 'notice')
              ? 'The form won’t submit without the collection notice acknowledged (BR48).'
              : null,
      },
      {
        title: 'A possible duplicate goes to a person',
        who: 'Registrar',
        route: '/registrar/duplicates',
        linkable: true,
        body: 'A record that looks like someone already on the books is flagged, never merged by the system.',
        rules: [
          { br: 'BR5', kind: 'checks', text: 'A shared email and date of birth is the same person; the same name with different emails is two.' },
        ],
      },
      {
        title: 'The registrar reviews it',
        who: 'Registrar',
        route: '/registrar',
        linkable: true,
        linkLabel: 'Open the registrations',
        body: 'Each registration shows what is holding it up, with the rule’s own message.',
        rules: [{ br: 'BR2', kind: 'blocks', text: 'No completion while a required document is missing.' }],
        status: (c) => (on(c, 'docs') ? null : 'Pending documents'),
      },
      {
        title: 'International clearance',
        who: 'Registrar',
        route: '/registrar',
        linkable: true,
        linkLabel: 'Open the registrations',
        showIf: (c) => on(c, 'overseas'),
        body: 'The last registration was with another national association, so a transfer certificate has to be on file.',
        rules: [{ br: 'BR35', kind: 'blocks', text: 'No completion until a valid ITC is on file.' }],
        status: (c) => (on(c, 'itc') ? null : 'Pending external registration'),
      },
      {
        title: 'Fees are settled',
        who: 'Treasurer or registrar',
        route: '/registrar/fees',
        linkable: true,
        body: 'A payment plan can spread the fee, but completion waits until nothing is outstanding.',
        rules: [
          { br: 'BR3', kind: 'blocks', text: 'No completion with anything owed, payment plan or not. A credit is never an obstacle.' },
        ],
        status: (c) => (on(c, 'paid') ? null : 'Pending payment'),
      },
      {
        title: 'Registered with the governing body',
        who: 'Registrar',
        route: '/registrar/pack',
        linkable: true,
        body: 'The club hands SQUADI a submission that is right the first time.',
        rules: [
          { br: 'BR43', kind: 'blocks', text: 'Not registered in SQUADI means not taking the field.' },
          { br: 'BR47', kind: 'checks', text: 'A player missing from SQUADI is raised as an eligibility exception.' },
        ],
        status: (c) => (on(c, 'squadi') ? null : 'Pending external registration'),
      },
      {
        title: 'The officiating interest is reviewed',
        who: 'Referee coordinator',
        route: '/registrar/referees',
        linkable: true,
        showIf: (c) => on(c, 'officiate'),
        body: 'The interest declared on the form becomes a referee only once a coordinator reviews it.',
        rules: [
          { br: 'BR136', kind: 'records', text: 'A declared interest is a claim, not a classification: no referee role until reviewed.' },
        ],
      },
    ],
    explainsItsOwnStop: false,
    outcome: (_c, held) =>
      held.length > 0
        ? { tone: 'warn', state: held[0] ?? '', text: `Still waiting on: ${held.join(', ')}.` }
        : { tone: 'ok', state: 'Complete', text: 'Registered, paid, and cleared to take the field.' },
  },

  {
    id: 'season',
    label: 'Season, venue and match',
    intro:
      'The governing body publishes the season, the club enters its team, and a fixture is recorded with its venue.',
    conditions: [
      { id: 'published', label: 'The region’s calendar is published', initial: true },
      { id: 'entered', label: 'The team is entered in a competition', initial: true },
      { id: 'moved', label: 'The kick-off or venue changes later', initial: false },
      { id: 'under13', label: 'A player is under 13', initial: false },
    ],
    steps: [
      {
        title: 'The governing body’s season calendar',
        who: 'Public · Football Queensland',
        route: '/seasons',
        linkable: true,
        body: 'Rounds, catch-ups and finals by region, month by month, exactly as published. Anyone can read it.',
        rules: [
          { br: 'BR178', kind: 'records', text: 'Shown as published, with its source. Neither the club nor PitchPeople edits it.' },
        ],
        stop: (c) =>
          on(c, 'published')
            ? null
            : 'The region is listed as coming, but has no rounds yet, so there is nothing to enter a team in.',
      },
      {
        title: 'The club opens its season',
        who: 'Registrar',
        route: '/registrar/season',
        linkable: true,
        body: 'The club’s season: its dates, and the registrations it takes.',
      },
      {
        title: 'The team enters its competitions',
        who: 'Admin, registrar or coordinator',
        route: '/registrar/teams',
        linkable: true,
        body: 'Each competition links to the published calendar, so the team follows its rounds.',
        rules: [{ br: 'BR179', kind: 'checks', text: 'Four roles may enter or withdraw a team, and every change is kept.' }],
        stop: (c) =>
          on(c, 'entered') ? null : 'The team follows no competition yet, so it has no rounds on its calendar.',
      },
      {
        title: 'The fixture is recorded, with its venue',
        who: 'Registrar or coordinator',
        route: '/registrar/fixtures',
        linkable: true,
        body: 'The match the referee will later be designated to. The venue is the field it is played on.',
        fields: [
          ['When', 'date and kick-off'],
          ['Against', 'opponent, home or away'],
          ['Where', 'venue (the field)'],
          ['Which', 'season and competition'],
          ['State', 'scheduled, played, cancelled, abandoned'],
        ],
        rules: [{ br: 'BR20', kind: 'checks', text: 'A referee can only be designated to a fixture the club records.' }],
      },
      {
        title: 'The kick-off or venue moves',
        who: 'Registrar or coordinator',
        route: '/registrar/fixtures',
        linkable: true,
        showIf: (c) => on(c, 'moved'),
        body: 'The change is written as one sentence (“moved to Field 2, 9:30”) and sent to everyone affected. A change that moves nothing sends nothing.',
        rules: [
          { br: 'BR64', kind: 'checks', text: 'Every affected participant is told, and the platform’s record stays the one that counts.' },
        ],
      },
      {
        title: 'Players say whether they can play',
        who: 'Player from 13, or their guardian',
        route: '/me',
        linkable: true,
        body: 'Available or not. A “not” needs a short reason, which only the coach, technical director or coordinator sees.',
        rules: [
          { br: 'BR62', kind: 'checks', text: 'A reason is required on “not available”, and it is never shown to other players.' },
          { br: 'BR62', kind: 'records', text: 'Under 13, the parent or guardian with authority answers.', when: (c) => on(c, 'under13') },
        ],
      },
      {
        title: 'After the match: game time',
        who: 'Coach',
        route: '/me',
        linkable: true,
        body: 'Minutes and the positions played go on each player’s record.',
      },
    ],
    explainsItsOwnStop: false,
    outcome: () => ({
      tone: 'ok',
      state: 'Ready for a referee',
      text: 'The fixture is on the calendar at its venue, and can now be designated.',
    }),
  },

  {
    id: 'designate',
    label: 'Designate a referee',
    intro:
      'A coordinator designates a referee to a recorded fixture. Every check runs before the referee is even offered.',
    conditions: [
      { id: 'plays', label: 'Plays in one of the teams', initial: false },
      { id: 'otherRole', label: 'Coaches a side, or is a parent of a player', initial: false },
      { id: 'clash', label: 'Already designated at that hour', initial: false },
      { id: 'grade', label: 'Classification below the minimum', initial: false },
      { id: 'suspended', label: 'Under an active suspension', initial: false },
      { id: 'expired', label: 'Accreditation has expired', initial: false },
      { id: 'nowwcc', label: 'Adult with no current WWCC', hint: 'Working with Children Check', initial: false },
      { id: 'sameClub', label: 'Same club as one side', initial: false },
      { id: 'minor', label: 'The referee is under 18', initial: false },
      { id: 'declines', label: 'The referee declines', initial: false },
    ],
    steps: [
      {
        title: 'The referee is on the club’s roster',
        who: 'Referee coordinator',
        route: '/registrar/referees',
        linkable: true,
        body: 'Classification, accreditation and the Working with Children Check are what the checks read.',
        rules: [
          { br: 'BR19', kind: 'blocks', text: 'An adult in a child-related role needs a current WWCC: no card, no start.' },
          { br: 'BR8 · BR10', kind: 'checks', text: 'Classification and accreditation are held here, with their expiry.' },
        ],
      },
      {
        title: 'The fixture is in the club’s calendar',
        who: 'Registrar or coordinator',
        route: '/registrar/fixtures',
        linkable: true,
        body: 'A designation always points at a recorded fixture.',
        rules: [{ br: 'BR20', kind: 'checks', text: 'No designation without a fixture the club records.' }],
      },
      {
        title: 'The eligibility check',
        who: 'Referee coordinator',
        route: '/registrar/designations',
        linkable: true,
        body: 'The list shows only who the platform will accept. Anyone blocked is left out, and the page says how many and why.',
        rules: [
          { br: 'BR6', kind: 'blocks', text: 'Plays in the match.', when: (c) => on(c, 'plays') },
          { br: 'BR109', kind: 'blocks', text: 'Holds another role in the fixture: coach, team official, or parent of a player.', when: (c) => on(c, 'otherRole') },
          { br: 'BR7', kind: 'blocks', text: 'Two designations at once.', when: (c) => on(c, 'clash') },
          { br: 'BR8', kind: 'blocks', text: 'Classification below the competition’s minimum.', when: (c) => on(c, 'grade') },
          { br: 'BR9', kind: 'blocks', text: 'Active suspension.', when: (c) => on(c, 'suspended') },
          { br: 'BR10', kind: 'blocks', text: 'Expired mandatory accreditation.', when: (c) => on(c, 'expired') },
          { br: 'BR19', kind: 'blocks', text: 'No current WWCC.', when: (c) => on(c, 'nowwcc') && !on(c, 'minor') },
          { br: 'BR11', kind: 'warns', text: 'Same club as one side. The coordinator may override, and the override is audited.', when: (c) => on(c, 'sameClub') },
          { br: 'BR109', kind: 'checks', text: 'None of the blocking conflicts apply, so the referee is offered.', when: (c) => !refereeBlocked(c) },
        ],
        stop: (c) =>
          refereeBlocked(c)
            ? 'Not offered. The referee is left off the list, and the page counts them under the reason.'
            : null,
        warn: (c) =>
          !refereeBlocked(c) && on(c, 'sameClub')
            ? 'Offered with a warning: the coordinator sees it, and any override is kept in the audit.'
            : null,
      },
      {
        title: 'The designation is proposed',
        who: 'Referee coordinator',
        route: '/registrar/designations',
        linkable: true,
        body: 'It goes to the referee, or to their parent or guardian when the referee is under 18.',
        rules: [
          { br: 'BR113', kind: 'checks', text: 'Under 18, the parent or guardian answers, and from 13 the referee may answer too.', when: (c) => on(c, 'minor') },
        ],
      },
      {
        title: 'The referee answers',
        who: 'Referee, or their guardian',
        route: '/me',
        linkable: true,
        body: 'Accept, or decline with a short reason. Withdrawing after accepting also tells the coordinator, because the match is uncovered again.',
        rules: [
          { br: 'BR42', kind: 'checks', text: 'A decline or withdrawal records a brief reason.' },
          { br: 'BR12', kind: 'records', text: 'Declines count toward the referee’s decline rate, read with their reasons.', when: (c) => on(c, 'declines') },
        ],
        stop: (c) =>
          on(c, 'declines')
            ? 'Declined with a reason. The match is uncovered, and the coordinator designates someone else.'
            : null,
      },
      {
        title: 'It appears in their own calendar',
        who: 'Referee',
        route: '/me',
        linkable: true,
        body: 'On accepting, the referee can subscribe to a private feed in Gmail, Outlook or Apple Calendar. The platform never writes into their calendar.',
        rules: [
          { br: 'BR30', kind: 'checks', text: 'The feed holds only their own appointments, never anyone else’s.' },
          { br: 'BR31', kind: 'checks', text: 'The feed link can be revoked and replaced at any time.' },
          { br: 'BR33', kind: 'records', text: 'For a referee under 18, the feed is issued to the guardian.', when: (c) => on(c, 'minor') },
        ],
      },
    ],
    explainsItsOwnStop: true,
    outcome: (c) =>
      refereeBlocked(c)
        ? { tone: 'stop', state: 'Not offered', text: 'A blocking rule applies, so this referee never appears on the list.' }
        : on(c, 'declines')
          ? { tone: 'warn', state: 'Uncovered', text: 'The designation was declined with a reason. Designate another referee.' }
          : on(c, 'sameClub')
            ? { tone: 'warn', state: 'Covered, with a warning', text: 'Accepted. The same-club warning and any override are audited.' }
            : { tone: 'ok', state: 'Covered', text: 'Accepted, and in the referee’s own calendar if they subscribed.' },
  },

  {
    id: 'payment',
    label: 'Match day to payment',
    intro:
      'After the match, someone other than the referee confirms it happened, and only then can a payment claim follow.',
    conditions: [
      {
        id: 'status',
        label: 'How the match ended',
        initial: 'played',
        options: [['played', 'Played'], ['abandoned', 'Abandoned'], ['cancelled', 'Cancelled']],
      },
      { id: 'explained', label: 'The referee explained why', initial: false, showIf: (c) => c['status'] === 'abandoned' },
      { id: 'selfVerify', label: 'The referee tries to verify it', initial: false },
    ],
    steps: [
      {
        title: 'The fixture’s result is recorded',
        who: 'Registrar or coordinator',
        route: '/registrar/fixtures',
        linkable: true,
        body: 'Played, abandoned or cancelled, with the score when it was played.',
        stop: (c) =>
          c['status'] === 'cancelled'
            ? 'Cancelled: no service was delivered, so no claim is ever raised (BR17).'
            : null,
      },
      {
        title: 'Someone confirms the match happened',
        who: 'Coordinator, never the referee',
        route: '/registrar/verification',
        linkable: true,
        body: 'A separate act from raising a claim. The treasurer can see what is waiting, read only.',
        rules: [
          { br: 'BR119', kind: 'blocks', text: 'Nobody verifies the match they were paid for.', when: (c) => on(c, 'selfVerify') },
          { br: 'BR13', kind: 'checks', text: 'A claim needs a verified match first.' },
          { br: 'BR163', kind: 'records', text: 'The treasurer reads the queue but cannot verify from it.' },
        ],
        stop: (c) =>
          on(c, 'selfVerify')
            ? 'Refused. The referee cannot confirm their own match (BR119); someone else must.'
            : null,
      },
      {
        title: 'A claim is raised',
        who: 'Referee coordinator',
        route: '/registrar/referee-payments',
        linkable: true,
        body: 'Raised from the verified appointment, never typed in from scratch.',
        rules: [
          { br: 'BR18', kind: 'blocks', text: 'An abandoned match needs the referee’s explanation before the claim can be approved.', when: (c) => c['status'] === 'abandoned' },
        ],
        stop: (c) =>
          c['status'] === 'abandoned' && !on(c, 'explained')
            ? 'The claim waits: the referee has not yet explained why the match was abandoned (BR18).'
            : null,
      },
      {
        title: 'The treasurer decides',
        who: 'Treasurer',
        route: '/registrar/referee-payments',
        linkable: true,
        body: 'Raising and approving are kept as separate acts by separate people.',
      },
      {
        title: 'The batch is paid',
        who: 'Treasurer',
        route: '/registrar/referee-payments',
        linkable: true,
        body: 'On the test site the payout is simulated. In production a simulated payout is refused, and only a connected provider can mark a run paid.',
        rules: [
          { br: 'BR162', kind: 'checks', text: 'One payout per claim, written only by the database, and the whole batch pays or none of it does.' },
        ],
      },
    ],
    explainsItsOwnStop: true,
    outcome: (c) =>
      c['status'] === 'cancelled'
        ? { tone: 'stop', state: 'No claim', text: 'A cancelled match is never paid.' }
        : on(c, 'selfVerify')
          ? { tone: 'stop', state: 'Waiting for verification', text: 'Someone other than the referee has to confirm the match.' }
          : c['status'] === 'abandoned' && !on(c, 'explained')
            ? { tone: 'warn', state: 'Waiting for an explanation', text: 'The claim can be approved once the referee explains the abandonment.' }
            : { tone: 'ok', state: 'Paid', text: 'Verified, approved and paid in one all-or-nothing batch.' },
  },
];

/** Each condition at its starting value. */
export function initialConditions(path: SeasonPath): Conditions {
  return Object.fromEntries(path.conditions.map((k) => [k.id, k.initial]));
}

export interface WalkedStep {
  readonly step: PathStep;
  /** 1-based, counting only the steps that show. */
  readonly number: number;
  /** Comes after the step the path stopped at. */
  readonly after: boolean;
  readonly stop: string | null;
  readonly warn: string | null;
  readonly status: string | null;
  /** The rules that apply under these conditions. */
  readonly rules: readonly PathRule[];
}

export interface Walk {
  readonly steps: readonly WalkedStep[];
  readonly outcome: Outcome;
}

/**
 * Walks a path under the given conditions: which steps show, where it
 * stops, and what it comes to. Nothing after the first stop is evaluated,
 * because nothing after it happens.
 */
export function walkPath(path: SeasonPath, c: Conditions): Walk {
  let halted = false;
  const held: string[] = [];
  const steps = path.steps
    .filter((step) => step.showIf === undefined || step.showIf(c))
    .map((step, i): WalkedStep => {
      const after = halted;
      const stop = !after && step.stop ? step.stop(c) : null;
      const warn = !after && step.warn ? step.warn(c) : null;
      const status = !after && step.status ? step.status(c) : null;
      if (status !== null && !held.includes(status)) held.push(status);
      if (stop !== null) halted = true;
      return {
        step,
        number: i + 1,
        after,
        stop,
        warn,
        status,
        rules: (step.rules ?? []).filter((r) => r.when === undefined || r.when(c)),
      };
    });

  const outcome: Outcome =
    halted && !path.explainsItsOwnStop
      ? { tone: 'stop', state: 'Stopped', text: 'The path stops at the step marked in red. Steps after it are greyed out.' }
      : path.outcome(c, held);

  return { steps, outcome };
}
