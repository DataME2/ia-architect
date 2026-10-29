/**
 * What the front door shows. Scope 118 wrote it; scope 122 sets it as a
 * matchday programme. It covers the identity drawing, the role study, the
 * registration walkthrough, what the platform connects and where it stops,
 * and the work table.
 *
 * **Everyone here is fictional, and the page says so.** The front door is
 * prerendered and reads no data, so this is an illustration of the product,
 * never a club's records. Every rule it cites is a row in the business rules
 * table (`home-story.test.ts` checks), and every screen it names is a page
 * that exists. A status is a tone and a word, never a tone alone, and never
 * an amount of money (BR78).
 */

export type Tone = 'ok' | 'warn' | 'stop' | 'info';

export interface Status {
  readonly tone: Tone;
  readonly word: string;
}

export interface PreviewRow {
  readonly label: string;
  readonly status: Status;
}

/** The fictional club every preview belongs to. */
export const DEMO_CLUB = 'Northside United';

// ------------------------------------------------------ identity drawing

export interface IdentityRole {
  readonly id: string;
  readonly label: string;
  /** The role's reach in a few words, for the drawing's annotation. */
  readonly tag: string;
  /** What this role does with the one record, and what it never sees. */
  readonly text: string;
  readonly rules: readonly string[];
}

/**
 * The five roles round one Person in the identity drawing. Any of them can
 * be the same human: a parent who coaches and referees is one record, not
 * three accounts (P1).
 */
export const IDENTITY_ROLES: readonly IdentityRole[] = [
  {
    id: 'player',
    label: 'Player',
    tag: 'Registered by season',
    text: 'Takes the field once the governing body’s system confirms them. Sending the club’s pack is recorded as sent, never as registered.',
    rules: ['BR43', 'BR60'],
  },
  {
    id: 'guardian',
    label: 'Parent or guardian',
    tag: 'Own household only',
    text: 'Registers each child once, and reads their own household and nothing beyond it.',
    rules: ['BR121'],
  },
  {
    id: 'coach',
    label: 'Coach',
    tag: 'Clear to play, never fees',
    text: 'Sees whether a player is clear to take the field, never what the family owes.',
    rules: ['BR78'],
  },
  {
    id: 'referee',
    label: 'Referee',
    tag: 'Own appointments',
    text: 'Answers their own appointments, and is never appointed to a fixture in which they hold another role.',
    rules: ['BR109'],
  },
  {
    id: 'committee',
    label: 'Committee member',
    tag: 'Positions, AGM, resolutions',
    text: 'Records the club’s positions, AGM and resolutions, and sees a figure only where the role may read every row behind it.',
    rules: ['BR142'],
  },
];

export interface Definition {
  readonly term: string;
  readonly text: string;
}

/** The idea, defined: the identity section's ruled list. */
export const DEFINITIONS: readonly Definition[] = [
  { term: 'Person', text: 'One record for one human, however many roles they hold, at one club or several (P1).' },
  { term: 'Role', text: 'A responsibility at a club: a player, a parent, a coach, a referee, a committee member.' },
  { term: 'View', text: 'What one role sees. Switching between roles is explicit, and shows one role at a time (BR61).' },
  { term: 'Club', text: 'Each club’s records are kept apart by the database, not by the screen.' },
];

// --------------------------------------------------------- role explorer

export type PersonId = 'aroha' | 'tane' | 'kofi' | 'priya' | 'maria';

export interface Person {
  readonly id: PersonId;
  readonly name: string;
  readonly initials: string;
}

export const PEOPLE: Readonly<Record<PersonId, Person>> = {
  aroha: { id: 'aroha', name: 'Aroha Rata', initials: 'AR' },
  tane: { id: 'tane', name: 'Tané Walker', initials: 'TW' },
  kofi: { id: 'kofi', name: 'Kofi Osei', initials: 'KO' },
  priya: { id: 'priya', name: 'Priya Nair', initials: 'PN' },
  maria: { id: 'maria', name: 'Maria Costa', initials: 'MC' },
};

export type RoleId =
  | 'committee'
  | 'treasurer'
  | 'registrar'
  | 'coordinator'
  | 'coach'
  | 'guardian'
  | 'referee'
  | 'technical';

export interface RoleView {
  readonly id: RoleId;
  /** The role as a club calls it. */
  readonly label: string;
  /** Its name on the identity hub, where space is short. */
  readonly short: string;
  /** Who holds it at the fictional club. */
  readonly person: PersonId;
  /** The administrative problem the role recognises. */
  readonly problem: string;
  /** The screen it works from, and where that screen is. */
  readonly screen: { readonly title: string; readonly routes: readonly string[] };
  readonly rows: readonly PreviewRow[];
  /** What this role never sees or does, with the rule that says so. */
  readonly boundary: string;
  /** Every rule `boundary` and `rows` lean on. */
  readonly rules: readonly string[];
}

/**
 * Eight roles, held by five people. **Nobody holds every role**, and the
 * hub draws lines only to the roles its person holds. Tané is treasurer,
 * coach and a parent; Priya coordinates referees and referees herself.
 * Switching between one person's roles is explicit, and each shows only
 * that role's view (BR61).
 */
export const ROLE_VIEWS: readonly RoleView[] = [
  {
    id: 'committee',
    label: 'President or Secretary',
    short: 'Committee',
    person: 'aroha',
    problem: 'Keeping the committee’s year in order: who holds which position, when the AGM is due, and what was resolved.',
    screen: { title: 'Governance and the committee hub', routes: ['/registrar/governance', '/registrar/committee-hub'] },
    rows: [
      { label: 'Committee positions, 2026 term', status: { tone: 'ok', word: 'Confirmed' } },
      { label: 'AGM · the date the club set', status: { tone: 'warn', word: 'Due' } },
      { label: 'Resolution · 2027 fee schedule', status: { tone: 'ok', word: 'Recorded' } },
      { label: 'Voucher program for 2027', status: { tone: 'warn', word: 'Awaiting committee' } },
    ],
    boundary: 'A report shows a figure only to a role allowed to read it, never a partial total (BR142).',
    rules: ['BR142'],
  },
  {
    id: 'treasurer',
    label: 'Treasurer',
    short: 'Treasurer',
    person: 'tane',
    problem: 'Knowing who has something outstanding, which plans are on track, and which referee claims need a decision.',
    screen: { title: 'Arrears and referee payments', routes: ['/registrar/arrears', '/registrar/referee-payments'] },
    rows: [
      { label: 'Payment plans · 4 families', status: { tone: 'ok', word: 'On track' } },
      { label: 'Something outstanding · 3 families', status: { tone: 'warn', word: 'Follow up' } },
      { label: 'Voucher to verify · 1', status: { tone: 'warn', word: 'Waiting' } },
      { label: 'Referee claims to decide · 5', status: { tone: 'warn', word: 'Waiting' } },
    ],
    boundary: 'Only a treasurer or finance admin agrees a payment plan or records a payment (BR78). PitchPeople records money; it never moves it.',
    rules: ['BR78'],
  },
  {
    id: 'registrar',
    label: 'Registrar',
    short: 'Registrar',
    person: 'kofi',
    problem: 'Seeing which registrations are ready, which are waiting on a document or a fee, and why, before the season starts.',
    screen: { title: 'Season queue', routes: ['/registrar'] },
    rows: [
      { label: 'U14 Girls · 18 players', status: { tone: 'ok', word: 'Complete' } },
      { label: 'U12 Mixed · 6 players', status: { tone: 'warn', word: 'Documents due' } },
      { label: 'U16 Boys · 2 players, no guardian', status: { tone: 'stop', word: 'Blocked' } },
      { label: 'Submission pack · version 3', status: { tone: 'info', word: 'Sent, not yet registered' } },
    ],
    boundary: 'Two records that look like one person are flagged for a person to decide, never merged by the system (BR5).',
    rules: ['BR1', 'BR2', 'BR5', 'BR60'],
  },
  {
    id: 'coordinator',
    label: 'Referee coordinator',
    short: 'Coordinator',
    person: 'priya',
    problem: 'Covering every match with an eligible, cleared official, and knowing which matches can be paid.',
    screen: { title: 'Designations and match verification', routes: ['/registrar/designations', '/registrar/verification'] },
    rows: [
      { label: 'Sat 10:00 · U14 Girls v Harbour', status: { tone: 'ok', word: 'Accepted' } },
      { label: 'Sat 13:00 · U16 Boys v Rovers', status: { tone: 'warn', word: 'Offered' } },
      { label: 'J. Brennan · Working with Children Check', status: { tone: 'stop', word: 'Expired' } },
      { label: 'Last week’s matches to verify · 4', status: { tone: 'warn', word: 'Waiting' } },
    ],
    boundary: 'An official who holds another role in the fixture is never offered it (BR109), and nobody verifies a match they officiated (BR119).',
    rules: ['BR19', 'BR109', 'BR119'],
  },
  {
    id: 'coach',
    label: 'Coach or team manager',
    short: 'Coach',
    person: 'tane',
    problem: 'Knowing who can play on Saturday, and who is clear to take the field, without ringing around.',
    screen: { title: 'Team dugout', routes: ['/me'] },
    rows: [
      { label: 'Jordan Lee', status: { tone: 'ok', word: 'Available' } },
      { label: 'Sam Ortiz', status: { tone: 'warn', word: 'No reply' } },
      { label: 'Ella Moore · reason given', status: { tone: 'stop', word: 'Not available' } },
      { label: 'Bench · 2 players', status: { tone: 'stop', word: 'Not clear to play' } },
    ],
    boundary: 'A coach sees whether a player is clear to play, never what a family owes (BR78). A “not available” reason reaches the coach and nobody else in the squad (BR62).',
    rules: ['BR62', 'BR78'],
  },
  {
    id: 'guardian',
    label: 'Parent or guardian',
    short: 'Parent',
    person: 'tane',
    problem: 'Registering children once, and knowing what is still due, without chasing the club.',
    screen: { title: 'Your household', routes: ['/me'] },
    rows: [
      { label: 'Mia · U10', status: { tone: 'ok', word: 'Registered' } },
      { label: 'Noah · U12', status: { tone: 'warn', word: 'Documents due' } },
      { label: 'Noah · ID photograph permission', status: { tone: 'info', word: 'Not given' } },
      { label: 'Saturday · Mia', status: { tone: 'ok', word: 'Available' } },
    ],
    boundary: 'A family reads its own household and nothing else (BR121).',
    rules: ['BR121'],
  },
  {
    id: 'referee',
    label: 'Referee',
    short: 'Referee',
    person: 'priya',
    problem: 'Saying when they can officiate, seeing appointments in their own calendar, and following a claim.',
    screen: { title: 'Appointments and availability', routes: ['/me'] },
    rows: [
      { label: 'Availability · Saturdays', status: { tone: 'ok', word: 'Declared' } },
      { label: 'Sat 10:00 · U14 Girls v Harbour', status: { tone: 'ok', word: 'Accepted' } },
      { label: 'Sun 09:00 · U12 Mixed v Bay', status: { tone: 'warn', word: 'Offered' } },
      { label: 'Claim · match of 12 October', status: { tone: 'info', word: 'Verified' } },
    ],
    boundary: 'Declining records a short reason (BR42), and the calendar feed holds only their own appointments (BR30).',
    rules: ['BR30', 'BR42'],
  },
  {
    id: 'technical',
    label: 'Technical or academy director',
    short: 'Academy',
    person: 'maria',
    problem: 'Seeing academy training and game time across squads, and who asked for a follow-up, without another app.',
    screen: { title: 'Academy', routes: ['/me'] },
    rows: [
      { label: 'Academy teams · U13 to U16', status: { tone: 'info', word: 'Marked' } },
      { label: 'Tuesday training · U14 Girls', status: { tone: 'ok', word: 'Recorded' } },
      { label: 'Game time · last round', status: { tone: 'ok', word: 'Entered' } },
      { label: 'Check-ins · asked to follow up · 2', status: { tone: 'warn', word: 'Talk to them' } },
    ],
    boundary: 'An answer at the far end of a scale is listed as asked to follow up, never as a label on a child (BR187).',
    rules: ['BR184', 'BR187'],
  },
];

/** The view for `id`; the first role's if `id` is unknown. */
export function roleView(id: string): RoleView {
  return ROLE_VIEWS.find((r) => r.id === id) ?? (ROLE_VIEWS[0] as RoleView);
}

/** Every role `person` holds, in the explorer's order. */
export function rolesHeldBy(person: PersonId): readonly RoleView[] {
  return ROLE_VIEWS.filter((r) => r.person === person);
}

/** The other roles held by whoever holds `id`: what a switch would reach (BR61). */
export function alsoHolds(id: RoleId): readonly RoleView[] {
  const view = roleView(id);
  return rolesHeldBy(view.person).filter((r) => r.id !== view.id);
}

/**
 * The tab a key press moves to in a tab list (the hero's, the explorer's):
 * arrows step and wrap, Home and End jump. Anything else stays where it is.
 */
export function indexAfterKey(index: number, key: string, count: number): number {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (index + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return index;
  }
}

// ---------------------------------------------- registration walkthrough

export interface RuleCheck {
  readonly br: string;
  readonly text: string;
}

export interface WalkStep {
  readonly id: string;
  readonly title: string;
  readonly who: string;
  readonly involves: readonly string[];
  readonly checks: readonly RuleCheck[];
  /** Where a person, not the platform, makes the call. */
  readonly human: string | null;
  readonly status: Status;
  readonly next: string;
}

/**
 * One registration, from the club's link to clear to play. The order and
 * the gates are the product's (the Season Paths' first path, scope 117);
 * the walkthrough explains them and performs none of them.
 */
export const WALK_STEPS: readonly WalkStep[] = [
  {
    id: 'link',
    title: 'The family uses the club’s link',
    who: 'Parent or guardian · no account needed',
    involves: ['Legal and preferred names', 'Date of birth', 'Parent or guardian details', 'Collection notice'],
    checks: [
      { br: 'BR72', text: 'The link creates one registration for one club and season, and the club can revoke it.' },
      { br: 'BR1', text: 'A player under 18 needs a parent or guardian on the registration.' },
      { br: 'BR48', text: 'A minor’s details are kept only under consent that is recorded and can be withdrawn.' },
    ],
    human: null,
    status: { tone: 'info', word: 'Entered' },
    next: 'It appears in the registrar’s queue with anything still missing listed.',
  },
  {
    id: 'documents',
    title: 'Documents and permissions',
    who: 'Parent or guardian',
    involves: ['Required documents for the season', 'ID photograph permission', 'Publicity permission'],
    checks: [
      { br: 'BR2', text: 'A registration cannot complete while a required document is missing.' },
    ],
    human: 'Each permission is a separate choice, and both start off.',
    status: { tone: 'warn', word: 'Documents due' },
    next: 'The queue shows what is holding it, with the rule’s own words.',
  },
  {
    id: 'review',
    title: 'The registrar reviews it',
    who: 'Registrar',
    involves: ['The season queue', 'Possible duplicates', 'What is holding each registration'],
    checks: [
      { br: 'BR5', text: 'A record that looks like someone already on the books is flagged, never merged by the system.' },
    ],
    human: 'The registrar decides whether two records are one person.',
    status: { tone: 'info', word: 'In review' },
    next: 'Once documents are in, only fees stand between it and complete.',
  },
  {
    id: 'fees',
    title: 'Fees are settled',
    who: 'Treasurer or finance admin',
    involves: ['Season fee', 'Payment plan, where agreed', 'Voucher, where the club takes one'],
    checks: [
      { br: 'BR3', text: 'Nothing outstanding, payment plan or not, before it completes. A credit never blocks.' },
      { br: 'BR78', text: 'Only a treasurer or finance admin agrees a plan or records a payment.' },
    ],
    human: 'A person records each payment. Nothing here moves money.',
    status: { tone: 'info', word: 'Ready for the pack' },
    next: 'It goes into the club’s next submission pack for Squadi.',
  },
  {
    id: 'squadi',
    title: 'Sent to Squadi, then confirmed',
    who: 'Registrar',
    involves: ['A versioned submission pack', 'The handover, recorded once', 'Confirmation from Squadi'],
    checks: [
      { br: 'BR60', text: 'Handing over a pack makes it pending external registration, never complete.' },
      { br: 'BR43', text: 'A player takes the field only once registered in Squadi.' },
    ],
    human: 'The registrar hands the pack over. Squadi stays the competition system, and PitchPeople does not write to it.',
    status: { tone: 'ok', word: 'Complete' },
    next: 'Complete once Squadi confirms the player. The coach then sees “clear to play”, never what the family paid (BR78).',
  },
];

/** The step after `i`, stopping at the last. */
export function nextStep(i: number, count: number = WALK_STEPS.length): number {
  return Math.min(i + 1, count - 1);
}

/** The step before `i`, stopping at the first. */
export function previousStep(i: number): number {
  return Math.max(i - 1, 0);
}

// ------------------------------------------------------- material & practice

export interface PracticeRow {
  /** The area, set as a small label. */
  readonly label: string;
  /** The question a club asks about its administration. */
  readonly question: string;
  /** What PitchPeople does about it. */
  readonly answer: string;
  /** Who it serves, and the rules it rests on. */
  readonly classification: string;
}

/** What the platform connects, one practical question per row. */
export const PRACTICE: readonly PracticeRow[] = [
  {
    label: 'Registration',
    question: 'Which registrations are ready, and which are waiting on a document or a fee?',
    answer: 'The season queue groups every registration by what it still waits for. A minor’s is never complete without a guardian, or with anything outstanding.',
    classification: 'Registrar · BR1 · BR3',
  },
  {
    label: 'Families',
    question: 'Can a family register two children without typing everything twice?',
    answer: 'A family enters each child once through the club’s link, and reads its own household and nothing beyond it.',
    classification: 'Parent or guardian · BR121',
  },
  {
    label: 'Fees and plans',
    question: 'Who still owes something, and which payment plans are on track?',
    answer: 'Only a treasurer or finance admin agrees a plan or records a payment. PitchPeople records money; it does not move it.',
    classification: 'Treasurer · BR78',
  },
  {
    label: 'Match officials',
    question: 'Is every match covered by a cleared official, and which claims can be paid?',
    answer: 'An official is never appointed to a fixture in which they hold another role, and a claim waits for a match someone verified.',
    classification: 'Referee coordinator · BR109 · BR13',
  },
  {
    label: 'Teams',
    question: 'Who can play on Saturday, and who is clear to take the field?',
    answer: 'The coach’s dugout lists who replied and who is clear to play, never what a family owes.',
    classification: 'Coach · BR78',
  },
  {
    label: 'Governance',
    question: 'Who holds which position, and what did the committee resolve?',
    answer: 'The committee hub records positions, the AGM and resolutions. A report shows no figure its reader may not see in full.',
    classification: 'Committee · BR142',
  },
];

/** Where PitchPeople stops: the same rows, for the boundaries it keeps. */
export const BOUNDARIES: readonly PracticeRow[] = [
  {
    label: 'Separation',
    question: 'Can one club, or one role, read another’s records?',
    answer: 'Row-level security keeps each club apart, so a query that forgets its filter returns nothing. Inside a club each role reads only its part.',
    classification: 'Database · BR121',
  },
  {
    label: 'Identity',
    question: 'Does a parent who coaches need two accounts?',
    answer: 'One Person record holds every role. Switching between roles is explicit, and shows one role at a time.',
    classification: 'Person · BR61',
  },
  {
    label: 'Assistance',
    question: 'Does the software decide anything on its own?',
    answer: 'The Assistant explains and drafts beside a screen. It never approves, sends or pays, and no AI model is called yet.',
    classification: 'Advisory · BR15',
  },
  {
    label: 'Decisions',
    question: 'Who approves what?',
    answer: 'People approve documents, decide claims and record payments. Two records that look like one person are flagged for someone to decide, never merged.',
    classification: 'People · BR5 · BR15',
  },
  {
    label: 'Demonstration',
    question: 'Is the demonstration club real?',
    answer: 'It is a separate tenant of invented families, marked on every screen and read-only for visitors. Everyone on this page is invented too.',
    classification: 'Fictional',
  },
  {
    label: 'Payments',
    question: 'Does PitchPeople pay referees?',
    answer: 'Paying an official online is simulated until a provider is connected: no money moves, and production refuses a simulated payout.',
    classification: 'Simulated · BR162',
  },
];

// -------------------------------------------------------------- work table

export type WorkStatus = 'Delivered' | 'Simulated' | 'Advisory';

export interface WorkRow {
  readonly capability: string;
  readonly area: string;
  /** The problem or responsibility it addresses. */
  readonly addresses: string;
  readonly who: string;
  readonly status: WorkStatus;
  /** Where it lives, for the test that each screen exists. */
  readonly routes: readonly string[];
}

/**
 * The capabilities, as built. "Delivered" means the application components
 * table records it as delivered. Paying online is simulated (scope 76), and
 * the Assistant is advisory, with no model behind it.
 */
export const WORK: readonly WorkRow[] = [
  { capability: 'Season queue', area: 'Registration and families', addresses: 'What each registration still waits for', who: 'Registrar', status: 'Delivered', routes: ['/registrar'] },
  { capability: 'Registration by link', area: 'Registration and families', addresses: 'Each child entered once, from the club’s link', who: 'Parent or guardian', status: 'Delivered', routes: ['/register'] },
  { capability: 'Submission pack', area: 'Registration and families', addresses: 'A versioned handover to the governing body', who: 'Registrar', status: 'Delivered', routes: ['/registrar/pack'] },
  { capability: 'Household', area: 'Registration and families', addresses: 'Children, documents and availability together', who: 'Parent or guardian', status: 'Delivered', routes: ['/me'] },
  { capability: 'Payment plans and arrears', area: 'Money', addresses: 'Who owes what, and which plans are on track', who: 'Treasurer', status: 'Delivered', routes: ['/registrar/arrears'] },
  { capability: 'Designations', area: 'Match officials', addresses: 'Matches covered by cleared, eligible officials', who: 'Referee coordinator', status: 'Delivered', routes: ['/registrar/designations'] },
  { capability: 'Verification and claims', area: 'Match officials', addresses: 'Paying only for a match someone verified', who: 'Coordinator and treasurer', status: 'Delivered', routes: ['/registrar/verification', '/registrar/referee-payments'] },
  { capability: 'Paying an official online', area: 'Money', addresses: 'A payout to the account an official nominates', who: 'Treasurer', status: 'Simulated', routes: ['/registrar/referee-payments'] },
  { capability: 'Team dugout', area: 'Teams and academy', addresses: 'Availability, and who is clear to play', who: 'Coach or team manager', status: 'Delivered', routes: ['/me'] },
  { capability: 'Governance and committee hub', area: 'Club and season', addresses: 'Positions, the AGM and resolutions', who: 'President or secretary', status: 'Delivered', routes: ['/registrar/governance', '/registrar/committee-hub'] },
  { capability: 'Academy', area: 'Teams and academy', addresses: 'Training nights, game time and the daily check-in', who: 'Technical or academy director', status: 'Delivered', routes: ['/me'] },
  { capability: 'Season calendars and paths', area: 'Club and season', addresses: 'The governing body’s published season, explained', who: 'Anyone', status: 'Delivered', routes: ['/seasons', '/season-paths'] },
  { capability: 'Assistant notes', area: 'Assistance', addresses: 'Explaining and drafting beside a screen', who: 'Every role', status: 'Advisory', routes: [] },
];

/** The work table's rows, gathered by area, in the order each area first appears. */
export function workByArea(rows: readonly WorkRow[] = WORK): readonly { readonly area: string; readonly rows: readonly WorkRow[] }[] {
  const groups = new Map<string, WorkRow[]>();
  for (const r of rows) groups.set(r.area, [...(groups.get(r.area) ?? []), r]);
  return [...groups].map(([area, grouped]) => ({ area, rows: grouped }));
}

/** Every rule the front door cites, for the test that checks each exists. */
export function citedRules(): readonly string[] {
  const fromText = (t: string) => t.match(/BR\d+/g) ?? [];
  return [
    ...new Set([
      ...ROLE_VIEWS.flatMap((r) => [...r.rules, ...fromText(r.boundary)]),
      ...WALK_STEPS.flatMap((s) => [...s.checks.map((c) => c.br), ...fromText(s.next)]),
      ...IDENTITY_ROLES.flatMap((r) => r.rules),
      ...DEFINITIONS.flatMap((d) => fromText(d.text)),
      ...[...PRACTICE, ...BOUNDARIES].flatMap((r) => fromText(`${r.answer} ${r.classification}`)),
    ]),
  ];
}
