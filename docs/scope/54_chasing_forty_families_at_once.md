# Project Scope — Chasing Forty Families at Once

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

The flow the messaging slice was built to pay for, in
[scope 36](./36_the_platform_learns_to_send_and_to_stop.md)'s own words:
*forty families, one screen, one send each, recorded.* What landed was the
send, on the registration detail page — so a registrar chasing forty
families opened forty pages.

This is the same act from the season queue, where the registrar already is.

## The two ways a bulk send goes wrong

Both are impossible when a human is looking at one child at a time, which is
exactly why they have to be decided rather than left to the loop.

**A reminder listing nothing.** The template already refuses to compose an
empty list — a family told there is nothing outstanding learns that the
club's messages are noise — but a bulk send would still put them through the
send path, log a message, and count as a success. So families with nothing
failing are not written to at all, and are named as skipped.

**The same family chased twice in a week.** A button pressed once more than
intended is, from the family's side, indistinguishable from a fault. Nobody
reminded in the last **seven days** is reminded again.

Seven rather than a configurable number, and the reason is the escape hatch:
a club that needs to chase the same family twice in a week has a
conversation to have, not a message to resend — and the single-registration
panel is still there for the case where a registrar genuinely means it. A
fixed floor with a documented way round it is safe; a fixed floor without
one is obstruction.

**Last reminded is read from `message_log`**, not from a column on the
registration. The log already is the record of what was sent, and a second
one would eventually disagree with it. Only `sent` counts: a suppressed or
failed attempt reached nobody, and treating it as a reminder would leave a
family uncontacted for a week on the strength of a message that never
arrived.

## What the screen does not say

**The button does not carry a count.** The number would be computed when the
page rendered and acted on when it was pressed, and the action deliberately
**re-reads the queue in between** — the same reason the single-registration
action re-reads it, and more pressing here, because a registrar leaves the
queue open, records three documents, and comes back. A count on the button
would be a promise the action is right to break. What the panel states
instead is what it will *not* do, which is stable.

**And the result never averages.** Everybody skipped is listed by name with
the reason. A screen that sent to eighteen of twenty-one and reported "18
sent" would be hiding the three the registrar most needs to know about — the
same reason the single-registration action returns one outcome per guardian
rather than one verdict per household.

A send that reached nobody comes back as a failure even when every reason is
an ordinary one, because the registrar's next act depends on knowing it.

**Addendum ([scope 60](./60_a_reminder_that_says_why_not_instead_of_crashing.md)):**
this sentence was aspirational rather than true until a registrar hit both
of the ways it could fail: a missing `NEXT_PUBLIC_SITE_URL` crashed the
action outright instead of returning a failure, and — independently — a
send where every recipient failed reported *"Nobody needed chasing,"* the
same sentence used for an empty queue. Both are fixed there.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change** |
| **2_business** | **No new rules.** BR127, BR129 and BR131 are honoured by going through the same send path as the single reminder — there is no second send path here, deliberately |
| **3_information** | **No change.** `message_log` already carries what "last reminded" needs |
| **4_application** | `src/web/bulk-reminders.ts`, `loadLastReminded`, `sendBulkRemindersAction`, and a panel above the *Needs action* section |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | One send per page. Forty families is forty pages, and nothing stops the same family being chased twice |
| **Target** | One act from the queue, which skips the families with nothing outstanding and those chased this week, and names every one it skipped |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | `planReminders` and `summarise` — who is chased, who is not, and what the registrar is told | **Delivered** |
| **WP2** | `loadLastReminded`, from `message_log` and only the sent | **Delivered** |
| **WP3** | `sendBulkRemindersAction`, re-reading the queue at send time | **Delivered** |
| **WP4** | The panel, above *Needs action* and only when something is | **Delivered** |
| **WP5** | 17 unit tests, including both edges of the quiet period | **Delivered** |

## What this initiative does not do

- **No scheduling.** A registrar presses the button. A weekly automatic
  chase is a different decision — it is the club emailing families without
  anybody choosing to, and it wants the club's consent rather than ours.
- **No selection.** It chases everybody the rules say is blocked, not a
  ticked subset. Picking families by hand is the single-registration panel,
  which already exists and is the honest place for a judgement call.
- **No second send path.** Every message goes through `sendMessage` exactly
  as the single reminder does, so suppression, logging and the unsubscribe
  link are the same code and cannot drift.
- **Nothing for arrears specifically.** BR79's treasurer actions are their
  own screen and their own record; this is the registration reminder, sent
  in bulk.
