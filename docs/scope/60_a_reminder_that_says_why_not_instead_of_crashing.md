# Project Scope — A Reminder That Says Why Not, Instead of Crashing

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/chase-blocked-families`.

A registrar reported "chase who are blocked" broken. The stack trace named
the cause directly: `NEXT_PUBLIC_SITE_URL` is not set. This is a **pure bug
fix** under [CLAUDE.md](../../CLAUDE.md)'s rule — it changes no documented
behaviour, it makes [scope 54](./54_chasing_forty_families_at_once.md)'s own
claim actually true: *"A send that reached nobody comes back as a failure
even when every reason is an ordinary one, because the registrar's next act
depends on knowing it."* Two defects stood between that sentence and what
the code did.

## Defect 1 — a missing site URL crashed the whole request

`unsubscribeUrlFor` and `subscriberFor`'s first-contact path both call
`readMessagingConfig()`, which reads `NEXT_PUBLIC_SITE_URL` and
`MESSAGING_UNSUBSCRIBE_SECRET` together and throws `ConfigError` if either is
absent — correct, because an unsubscribe link is a legal requirement of
every email this platform sends, not an optional feature. What was missing
was anywhere that caught it. `sendRegistrationReminder` (chasing one family
or forty), `sendWwccReminders` (BR51's six-monthly nudge), and
`notifications.ts`'s shared `notify()` spine (BR42, BR50, BR64, claim
approval) all call these functions inline with no `try`/`catch` around
them, so the `ConfigError` propagated as an unhandled exception out of the
server action. With no `error.tsx` boundary under `src/app/registrar/`,
that reached the registrar as a generic crash — not the actionable message
BR127's own reasoning ("a reminder nobody received is worse than a reminder
the registrar knows failed") already commits this codebase to giving.

**Fix:** `messagingUnavailableReason` in `src/data/messaging.ts` recognises
a `ConfigError` and turns it into a plain sentence a registrar can act on —
and returns `null` for anything else, so an unrelated bug is re-thrown
rather than silently absorbed. All three call sites now wrap the
subscriber/unsubscribe-link steps in a `try`/`catch` that uses it, falling
back to the ordinary `outcome: 'failed'` shape each already had for other
reasons (no address recorded, could not record as contactable) rather than
inventing a fourth kind of result.

## Defect 2 — a total failure read as "nobody needed chasing"

Independent of the crash, and pre-existing before this fix: `summarise` in
`src/web/bulk-reminders.ts` decided what to tell the registrar from
`tally.families` and the count `planReminders` skipped, and never looked at
`tally.withheld` when `families` was zero. So a bulk send where every single
recipient failed — whether because of defect 1, because every guardian in
the queue had unsubscribed, or because none had an email on file — reported
**"Nobody needed chasing,"** the same sentence used for the genuinely happy
case where the queue was empty. A registrar reading that would believe the
club owed nobody a reminder, when in fact every family the queue named was
still unreminded.

**Fix:** `summarise` now checks `tally.withheld` before falling through to
"nobody needed chasing," and `sendBulkRemindersAction` now names every
withheld recipient and why, the same way it already names every family
`planReminders` skipped — so a total failure is legible, not just flagged.

## Why the fix is one function per call site, not a rewritten spine

`notifications.ts`'s `notify()` doc comment already names the argument for
one shared spine: *"a second copy of this sequence is where the suppression
check eventually gets forgotten."* All three call sites do independently
duplicate `subscriberFor` → `unsubscribeUrlFor` → compose → `sendMessage`,
and a fourth, generic wrapper spanning all three would remove that
duplication properly. This initiative did not do that: the reported defect
is the crash, and `messagingUnavailableReason` fixes it identically in all
three places without restructuring code nobody asked to have restructured.
Converging the three spines into one is a real, separate piece of debt this
initiative names rather than takes on.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change** |
| **2_business** | **No new rule and no changed rule.** BR127's own reasoning — never a silent or unreadable failure — is what this fix makes true; nothing about *when* a message is suppressed or sent changes |
| **3_information** | **No change.** No table, column or migration |
| **4_application** | `src/data/messaging.ts` (`messagingUnavailableReason`), `src/data/reminders.ts`, `src/data/wwccReminders.ts`, `src/data/notifications.ts` (each wraps the same two calls), `src/web/bulk-reminders.ts` (`summarise`), `src/app/registrar/actions.ts` (`sendBulkRemindersAction` names the withheld) |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A missing `NEXT_PUBLIC_SITE_URL` crashed any reminder, WWCC nudge, or referee/committee notification with an unhandled exception and no registrar-facing message. Separately, a bulk send where every recipient failed reported "Nobody needed chasing" — indistinguishable from the queue being empty |
| **Target** | The same misconfiguration returns a plain, actionable failure — "Messages cannot be sent right now: … This is a deployment configuration problem, not something a resend will fix" — through the same outcome shape each caller already had. A bulk send that reaches nobody says so, and names who was not reached |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | `messagingUnavailableReason` in `src/data/messaging.ts`, plus unit tests in `src/data/messaging.test.ts` | **Delivered** |
| **WP2** | `sendRegistrationReminder`, `sendWwccReminders`, and `notify()` each catch the config failure at the subscriber/unsubscribe-link step | **Delivered** |
| **WP3** | `summarise` distinguishes a total send failure from an empty queue; `sendBulkRemindersAction` lists the withheld recipients and their reasons | **Delivered** |
| **WP4** | Unit tests for both fixed behaviours; `npm run check` clean | **Delivered** |

## What this initiative does not do

- **Does not set `NEXT_PUBLIC_SITE_URL` anywhere.** If the variable is
  genuinely absent from a real deployment, that is a Vercel/environment
  configuration action this repository's code cannot perform — this
  initiative makes the failure legible instead of catastrophic, which is a
  different thing from making the underlying configuration correct.
- **Does not converge the three duplicated send spines** (`reminders.ts`,
  `wwccReminders.ts`, `notifications.ts`'s `notify()`) into one. Named above
  as real, pre-existing debt; fixing it is a refactor nobody asked for here.
- **Does not add an `error.tsx` boundary.** A boundary would catch a future
  unrelated crash from reaching the registrar as a raw stack trace, which
  this specific defect no longer needs — but it is a general safety net
  this initiative did not build.
- **No new business rule, no schema change**, so no RLS behaviour to
  re-verify — `scripts/test_rls.sh` was not re-run for this change, only
  `npm run check`.
