# Project Scope — Trying the Alert Again

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

[Scope 45](./45_telling_somebody_a_club_asked.md) shipped the alert and named
the gap in its own *what this does not do*: a failed alert stayed failed.
The console counted them, which is how somebody **finds out** — and finding
out is not the same as fixing it. A provider down for an hour left clubs
nobody had been told about, and nothing to do about it but copy an address
out of a table.

## BR147, and why both halves earn their place

> A failed alert is retried by a person, and an alert that was delivered is
> never sent again.

**Retried by a person**, because nothing in this product runs on a schedule
— the same missing piece that leaves BR133's retention review a button
rather than a nightly job ([scope 37](./37_forgetting_and_the_reasons_not_to.md)).

The tempting alternative was an *opportunistic* retry: when the next enquiry
arrives, also retry the pending ones. It costs nothing and needs no
infrastructure, and it fails in exactly the wrong place. **A quiet week is
when a missed lead matters most, and a quiet week is when it would never
fire.** The retry would work hardest precisely when it was least needed.

**Never re-sent once delivered**, because the obvious implementation of a
retry is *send everything that is not confirmed* — and an operator emailed
three times about the same club stops reading the alerts, which returns the
product to the state the alert was built to fix. Delivery is therefore
terminal, and enforced **twice**: `alertsPending` does not select a
delivered row, and the database refuses to record an outcome against one
anyway. The first is the behaviour; the second is what makes a
double-clicked button, a second operator, and a future scheduler harmless.

It is written so that the day a scheduler exists it calls the same function
unchanged. "Nightly" then becomes a deployment change rather than a rewrite.

## The function scope 45 refused to create

Scope 45 explicitly declined a *mark as notified* function, because the
enquiry path is anonymous by definition and such a function would have to be
granted to `anon` — letting a stranger write delivery records into a sales
log. That reasoning is why the alert is sent **before** the row is written.

`app_record_alert_outcome` is that same function shape, and it is safe here
for one reason: **a retry is initiated from the console by somebody already
on the platform allowlist.** It checks `app_is_platform()` and raises. The
difference is not the function; it is who can reach it.

## One composer, two callers

The first alert is built from the form a visitor submitted. A retry is built
from the row it became. Two composers would drift — and the divergence would
only ever show in the **retried** copy, which is the one nobody is watching,
sent when something has already gone wrong once.

So `alertPlatform` takes the message-shaped `EnquiryAlertInput`; the parsed
form satisfies it structurally and a stored row is mapped into it by three
lines. A test composes both and asserts the results are identical, and it
was verified to fail by mapping one field wrongly.

## Two columns, and what they answer

A row that failed once is a provider hiccup. A row that failed four times
with the same message means **stop pressing the button and go and fix the
provider**. Without a count they read identically, so `notify_attempts` and
`notify_attempted_at` are on the row and in the table.

The count **accumulates across enquiries** rather than resetting when a club
writes in again — deliberately, and against the pattern of every other field
on that row, where a second enquiry either replaces or preserves. A club
enquiring twice because nobody answered the first time is exactly when the
history matters.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** No new goal, capability, principle or actor |
| **2_business** | **One new rule: BR147.** No new business service — this is the **Communications** service's operator-alert half, which BR146 established |
| **3_information** | **No new data object.** `prospect` gains an attempt count and the time of the last try |
| **4_application** | New: `alertsPending` and `retryFailedAlerts` in `src/data/enquiries.ts`, `app_record_alert_outcome()`, the console's retry button, and `record_interest`/`app_enquiries` at v3 |
| **5_technology** | **No change.** No scheduler, no queue, no dependency — which is the constraint the design is shaped around rather than a gap in it |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | A failed alert stayed failed. The console counted them and offered nothing to do about it |
| **Target** (delivered) | One button, labelled with how many it is about to attempt, that retries every failed alert and never re-sends a delivered one — and a count that says when to stop pressing it and fix the provider |

## Work packages and deliverables

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | BR147 in the business rules | **Delivered** |
| **WP2** | Migration 0039: the counters, `app_record_alert_outcome()`, both functions at v3 | **Delivered** |
| **WP3** | `alertsPending` and `retryFailedAlerts`, recording each outcome as it happens | **Delivered** |
| **WP4** | The console's retry button, with the count in the label | **Delivered** |
| **WP5** | Suite 40 at fourteen scenarios, **verified to fail** on both BR147 guarantees | **Delivered** |
| **WP6** | Six unit tests: the pending selection, and that a retry is byte-identical to the alert that failed | **Delivered** |

## A test that passed for the wrong reason

Worth recording, because it is the kind of thing a green suite hides.

The scenario asserting *only the platform owner may record an outcome* was
first written against the enquiry delivered two scenarios earlier. Every
caller is refused on that row — by **BR147's** guard, not the authorisation
check — so deleting the authorisation check entirely left the suite green.

Two changes fixed it: the scenario now runs against a **still-failing**
enquiry, and it asserts on the refusal's **message** rather than merely on
the fact of a refusal. A refusal proves nothing unless it is the refusal you
meant.

## What this initiative does not do

- **No scheduler.** The retry is a button. BR147 says that is the intended
  state until [task 0.4](../spec/tasks.md)'s production environment exists,
  not a placeholder to be quietly replaced.
- **No automatic retry on the failing send itself.** The first attempt is
  made once and gives up after five seconds, because the enquirer is
  watching a spinner. Retrying is what the button is for.
- **No backoff, no cap.** An operator pressing the button ten times against
  a dead provider sends ten attempts. The count is there so they can see
  that is what they are doing; nothing stops them, because nothing should
  stop somebody who has just fixed the provider and wants to try now.
- **No alert for a demonstration-club visit**, so a prospect who only looked
  is never a retry candidate — unchanged from scope 45.
