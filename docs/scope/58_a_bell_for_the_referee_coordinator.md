# Project Scope — A Bell for the Referee Coordinator

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/officiating-interest-notifications`.

BR136 (scope 39) already made a declared officiating interest a claim,
"reviewed by a Referee Coordinator before it becomes anything." What it
never built is any way for a Coordinator to find out a claim exists —
`InterestQueue` has been reachable from `/registrar/referees` since scope
39 landed, and nothing has ever pointed anybody at it. A family declares;
the platform waits to be asked.

## Why this is not C7

`message_subscriber`/`message_log` (scope 36) govern messages to a **data
subject** — a family, outside the platform — with the consent, suppression
and unsubscribe machinery BR127–BR131 require of every one of them. A
Coordinator being told their own club's queue has grown by one is not that
kind of message any more than the operator alert BR146 already
distinguishes from one (scope 45): it is a fact about a signed-in
account's own inbox, not a communication BR127–BR131 apply to. So this is
a new, narrower object — `notification` — read only by the account it
names, never suppressible because it was never optional, and never
emailed.

`src/data/notifications.ts` already exists and is the wrong file for this:
it composes and sends the platform's **emails** (BR42's coordinator
notification, BR50's vacancy pair, a claim approval), each through
`sendMessage` so suppression and the log apply. This initiative's reads and
writes live in the new `src/data/inbox.ts` instead, precisely so a reader
of either file's name is not misled about which kind of notification it
sends.

## One trigger, not every documented one

BR42 and BR64 already name a coordinator notification and a fixture-change
notification the business layer has wanted since before C7 existed to
build them on. Both remain email-shaped and unwired to this new inbox —
wiring every documented notification point into one migration would repeat
the mistake `notifications.ts`'s own header describes handling honestly
instead: two of its six functions "have no caller yet, and that is stated
rather than hidden." This initiative wires exactly one event — an
officiating interest declared — and leaves BR42/BR64 as the inbox's next
candidates, named in BR148 rather than guessed at.

## Who is told, and why not everyone who could look

`officiating_interest_select` already grants read access to admin,
registrar and coordinator — any of the three could open `InterestQueue`
and see the claim. BR148 notifies only **admin and coordinator**: the
Referee Coordinator is who scope 39 named as the reviewer, and admin is
included because a small club may never have appointed a separate
coordinator and would otherwise have nobody told at all. Registrar is left
out deliberately — registration is a different concern from officiating,
and a registrar who wants to see the queue still can.

## A read failure degrades the bell, not the layout

`loadNotifications` is called from `src/app/registrar/layout.tsx`, which
wraps every registrar page — so unlike an ordinary data-layer read, an
unhandled error here would not fail one screen, it would fail all of them,
for every signed-in club officer, at once. Caught while checking this
initiative against the same crash class a sibling initiative found in the
messaging paths (a missing `NEXT_PUBLIC_SITE_URL` crashing a reminder send
instead of failing gracefully): `loadNotifications` threw a `QueryError` on
any Supabase failure, with nothing above it to catch one.

It now fails to an empty inbox instead, the same choice `loadFeed` already
makes for the calendar feed. That is the right trade for what the bell is:
"what was true when this layout rendered," by its own design in
`NotificationBell.tsx`'s doc comment — the honest answer to *the query
could not be served* is to show nothing, not to take the section down. The
policy itself is proved correct by `supabase/tests/51_a_bell_for_the_referee_coordinator.sql`,
which is a separate question from what a caller sees when something else
goes wrong.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** No new goal or principle — this closes a gap BR136 and BR42 already implied, and serves G5 (less manual administrative work) the same way the rest of C7 does without being C7 |
| **2_business** | **One new rule: BR148.** One new business object: **Notification**, added to Compliance & communications and distinguished from **Communication** in the glossary. The Communications business service's status column names the new mechanism and the two rules it does not yet cover |
| **3_information** | **One new table: `notification`** — recipient, kind, headline, detail, and a link, created only by a security-definer function and read only by the account it names |
| **4_application** | New: `src/data/inbox.ts`, `src/web/inbox-view.ts`, `src/app/registrar/_components/NotificationBell.tsx` and `inbox-actions.ts`. Changed: `app_declare_interest` (0033) reproduced with the notification fan-out added, `src/app/registrar/layout.tsx` fetches the caller's inbox and renders the bell next to `SessionStrip` |
| **5_technology** | **No change.** No new runtime, no new provider — nothing here sends anything over a wire; it is a table and a read |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A family could declare officiating interest; nothing told the Referee Coordinator it had happened. They found out by opening `/registrar/referees` on the chance there was something to see |
| **Target** | Declaring interest notifies every admin and coordinator account at that club, in their own bell, naming the Player and linking to the queue. The bell shows an unread count, opens a list, and marks an item read on demand — fetched with the page, not pushed live |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | Migration 0050 — `notification` table, RLS (`recipient_user_id = auth.uid()` for both read and mark-read, no insert/delete policy for any client role), and `app_declare_interest` reproduced with the fan-out to admin and coordinator | **Delivered** |
| **WP2** | `src/data/inbox.ts` — `loadNotifications` (fails to an empty inbox rather than throwing, since it runs on every registrar page), `markNotificationRead` | **Delivered** |
| **WP3** | `src/web/inbox-view.ts` — `unreadCount`, `sortedByRecency`, `stamp`, and their unit tests | **Delivered** |
| **WP4** | `NotificationBell.tsx` and `inbox-actions.ts` — the bell, its dropdown, and marking one read | **Delivered** |
| **WP5** | `src/app/registrar/layout.tsx` wired to fetch and render it for every signed-in club officer | **Delivered** |
| **WP6** | `supabase/tests/51_a_bell_for_the_referee_coordinator.sql` — admin and coordinator are told, registrar and coach are not, an inbox is read only by the account it names, marking read is that account's own act, no client inserts or deletes a row directly | **Delivered** |
| **WP7** | Unit tests for the pure layer; `npm run check:full` clean | **Delivered** |

## What this initiative does not do

- **No email.** `notifyOfficialWithdrew` and its siblings in
  `notifications.ts` remain the pattern for a message to a data subject;
  this event stays in-app because a club officer, not a family, is the
  audience, and BR127–BR131's consent machinery has no subject here to
  attach to.
- **BR42's and BR64's own notifications are not wired to this inbox.** Both
  remain the email-shaped functions `notifications.ts` already has ready
  and uncalled. Whether they should also gain a bell entry, or stay
  email-only, is the next initiative's question, not answered here by
  default.
- **No live push.** The bell is fetched with the layout, the same
  "refresh is the client's" acceptance the calendar feed makes — a second
  admin declaring, reviewing or dismissing something in another tab is not
  reflected until the page is next loaded.
- **No notification preferences.** Every admin and coordinator account
  gets every one of these; muting a kind, or a club with several
  coordinators wanting only one told, is unbuilt.
