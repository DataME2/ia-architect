/**
 * What each message says.
 *
 * The wording is code, reviewed like code. A club cannot edit it, which is
 * a real limitation and a deliberate one for now: these messages carry
 * compliance meaning — what is outstanding, what a withdrawal costs — and
 * the first thing this platform ever sends should not be free text.
 *
 * Every template is a pure function, so what a reminder says about a child
 * is asserted in a test rather than discovered in an inbox. **Bump the
 * version whenever the wording changes**; it is written to `message_log`
 * and is what makes an old message explainable later.
 */
import type { RuleOutcome } from '../rules/types.ts';
import type { MessageTemplate, TemplateContext } from './types.ts';

/** BR131 — the body names the recipient's own child and nobody else's. */
export interface GuardianReminderInput {
  readonly guardianName: string;
  readonly childName: string;
  readonly outcomes: readonly RuleOutcome[];
}

const SIGN_OFF = (clubName: string, unsubscribeUrl: string) =>
  `\n\n— ${clubName}\n\nIf you would rather not receive email from us, you can stop it here:\n${unsubscribeUrl}`;

export const guardianReminder: MessageTemplate<GuardianReminderInput> = {
  key: 'guardian.registration_reminder',
  version: 1,
  purpose: 'operational',
  compose: ({ guardianName, childName, outcomes }, ctx: TemplateContext) => {
    const outstanding = outcomes.filter((o) => o.status === 'fail');

    // A reminder listing nothing is worse than no reminder: it teaches the
    // family that our messages are noise.
    const body = outstanding.length === 0
      ? `Hello ${guardianName},\n\n${childName}'s registration is complete — there is nothing outstanding. `
        + `We will be in touch when the season starts.`
      : `Hello ${guardianName},\n\n${childName}'s registration with ${ctx.clubName} is not finished yet. `
        + `These are the things still outstanding:\n\n`
        + outstanding.map((o) => `  • ${o.message}`).join('\n')
        + `\n\nYou can complete them from your family page, or reply to this email and we will help.`;

    return {
      subject: outstanding.length === 0
        ? `${childName} is registered for the season`
        : `${childName}'s registration — ${outstanding.length} thing${outstanding.length === 1 ? '' : 's'} outstanding`,
      body: body + SIGN_OFF(ctx.clubName, ctx.unsubscribeUrl),
    };
  },
};

/** BR64 — the platform's record stays authoritative over any cached copy. */
export interface FixtureChangeInput {
  readonly recipientName: string;
  readonly opponent: string;
  readonly kickOff: string;
  readonly venue: string;
  readonly whatChanged: string;
}

export const fixtureChange: MessageTemplate<FixtureChangeInput> = {
  key: 'participant.fixture_changed',
  version: 1,
  purpose: 'operational',
  compose: ({ recipientName, opponent, kickOff, venue, whatChanged }, ctx) => ({
    subject: `Changed: ${opponent}, ${kickOff}`,
    body: `Hello ${recipientName},\n\nA fixture you are involved in has changed — ${whatChanged}.\n\n`
      + `  Opponent: ${opponent}\n  Kick-off:  ${kickOff}\n  Venue:     ${venue}\n\n`
      // Said explicitly because BR64 makes it the rule, not a courtesy.
      + `This message may be out of date by the time you read it. The club's own record is the one that counts.`
      + SIGN_OFF(ctx.clubName, ctx.unsubscribeUrl),
  }),
};

/** BR42 — a withdrawal after acceptance reaches the coordinator. */
export interface OfficialWithdrewInput {
  readonly coordinatorName: string;
  readonly officialName: string;
  readonly fixture: string;
  readonly reason: string;
}

export const officialWithdrew: MessageTemplate<OfficialWithdrewInput> = {
  key: 'coordinator.official_withdrew',
  version: 1,
  purpose: 'operational',
  compose: ({ coordinatorName, officialName, fixture, reason }, ctx) => ({
    subject: `Withdrawal: ${officialName} — ${fixture}`,
    body: `Hello ${coordinatorName},\n\n${officialName} has withdrawn from ${fixture} after accepting it.\n\n`
      + `  Reason given: ${reason}\n\n`
      + `The fixture needs another official.`
      + SIGN_OFF(ctx.clubName, ctx.unsubscribeUrl),
  }),
};

/** The official currently finds out they were approved by being paid. */
export interface ClaimApprovedInput {
  readonly officialName: string;
  readonly fixture: string;
  readonly amount: string;
}

export const claimApproved: MessageTemplate<ClaimApprovedInput> = {
  key: 'official.claim_approved',
  version: 1,
  purpose: 'operational',
  compose: ({ officialName, fixture, amount }, ctx) => ({
    subject: `Approved: ${amount} for ${fixture}`,
    body: `Hello ${officialName},\n\nYour claim for ${fixture} has been approved at ${amount}.\n\n`
      // BR118: the club pays through its own bank. Saying so avoids the
      // reading that approval means the money has moved.
      + `${ctx.clubName} will pay it through its usual banking, so the date it reaches you is theirs rather than ours.`
      + SIGN_OFF(ctx.clubName, ctx.unsubscribeUrl),
  }),
};

/** BR51's six-monthly nudge. One email per club, covering every clearance due. */
export interface WwccDue {
  readonly personName: string;
  readonly kind: string;
  readonly expiresOn: string;
}

export interface WwccReminderInput {
  readonly secretaryName: string;
  readonly due: readonly WwccDue[];
}

export const wwccReminder: MessageTemplate<WwccReminderInput> = {
  key: 'secretary.wwcc_reminder',
  version: 1,
  purpose: 'operational',
  compose: ({ secretaryName, due }, ctx) => ({
    subject: `${due.length} Working with Children Check${due.length === 1 ? '' : 's'} due for re-verification`,
    body: `Hello ${secretaryName},\n\n`
      + `BR51 asks for a re-verification check every six months. These have not been checked in that time `
      + `(or ever, if newly recorded):\n\n`
      + due.map((d) => `  • ${d.personName} — ${d.kind}, card expires ${d.expiresOn}`).join('\n')
      // BR51's own limit, said plainly rather than implied: this is the
      // nudge, not the check. Nobody reading it should think the register
      // was consulted on their behalf.
      + `\n\nThis reminder does not check the state register itself — someone still needs to look each one up.`
      + SIGN_OFF(ctx.clubName, ctx.unsubscribeUrl),
  }),
};

export const TEMPLATES = {
  [guardianReminder.key]: guardianReminder,
  [fixtureChange.key]: fixtureChange,
  [officialWithdrew.key]: officialWithdrew,
  [claimApproved.key]: claimApproved,
  [wwccReminder.key]: wwccReminder,
} as const;
