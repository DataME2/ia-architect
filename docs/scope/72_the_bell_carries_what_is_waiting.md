# Project Scope — The Bell Carries What Is Waiting

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/the-bell-carries-what-is-waiting`.
**Status: built.**

The QA test pass (September 2026) found that five features had each built
the same thing: a "something is waiting on you" flag, recomputed every time
a page loads. None of them was stored, none could be dismissed, and none
reached anybody who had not already opened the right page. Each one's own
scope document named [scope 58](./58_a_bell_for_the_referee_coordinator.md)'s
inbox as its next home instead of silently dropping it:

| Waiting item | Rule | Shown today to | Named in |
| ------------ | ---- | -------------- | -------- |
| A player's proposed correction | BR149 | The roles that confirm it (BR125), on the player page | [scope 63](./63_a_player_may_propose_their_own_correction.md) |
| An unanswered availability for the next fixture | BR62 | The guardian (badge) or the adult player | [scope 65](./65_a_player_answers_for_saturday.md) |
| An unanswered designation | BR113 | The guardian, or the adult official | the guardian and referee workspaces |
| An unconfirmed MiniRef match | BR151 | The guardian | [scope 66](./66_a_minirefs_guardian_confirms_the_match.md) |
| An approved claim with no payment choice | BR152 | The guardian | [scope 67](./67_a_guardian_chooses_how_their_referee_is_paid.md) |

**BR159** points all five at the inbox, adding no new obligation. Each item
is exactly what its own rule already shows, to exactly the people it already
shows it to.

## Event-written, or synchronised

Scope 58 writes a notification **when something happens** (a declaration).
Two of these five have no moment to hook: a MiniRef match becomes
"unconfirmed" when its date passes, and an availability becomes "unanswered"
when a fixture becomes the next one. The others have events, but each sits
behind a different write path.

So BR159's items are **synchronised** rather than event-written. The
existing loaders compute what is waiting for the signed-in account, exactly
as the workspaces already do. One `security definer` function then brings
that account's own inbox into line:

- An item is **added once**, keyed by what it is about.
- An item no longer waiting is **retired** (`settled_at`). It stays in the
  table, because a notification is never deleted.
- A retired item that is waiting again is **reopened**. A read that failed
  for a moment therefore cannot lose an item for good.
- An item the account **dismissed** (`read_at`) stays dismissed.
- The function only ever writes to the **caller's own** inbox, only the five
  BR159 kinds, and only links inside the app. It never touches scope 58's
  event-written notifications.

The flag logic is deliberately **not** copied into SQL. It encodes subtle
rules (under thirteen on the day of the match, authority versus a
contact-only guardian, who answers a designation), and a second copy would
drift, the risk 0045's own comments warn about.

**Where it runs:**
- `/me` synchronises all five kinds, from data it loads anyway.
- The registrar layout runs on every club screen, so it synchronises only
  the staff kind (a proposed correction, one query per club).

Both now show the bell; `/me` had none.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change. Serves G5 (less manual administrative work) the way scope 58 did |
| 2_business    | **New BR159** in [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md). The **Notification** business object gains the synchronised kind. No new actor or glossary term |
| 3_information | `notification` gains two nullable columns: `subject_key` (what the item is about, for de-duplication) and `settled_at` (retired because no longer waiting). Five new `kind` values. A small, honest departure from "no new table shape": without a key the same item would arrive on every page load |
| 4_application | `app_sync_waiting()`; `src/web/waiting.ts` (pure, tested); `src/data/waiting.ts`; `loadNotifications` hides settled items; the bell is added to `/me`; the mark-read action revalidates both layouts |
| 5_technology  | No change. One migration (0067) and one behavioural RLS suite (67) |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | Five read-time flags, each visible only on its own page, none stored or dismissible. The bell exists only on club screens, carrying one event kind |
| **Target** (delivered) | The same five items sit in the account's own bell on `/me` and on club screens. Each appears once, can be dismissed, and retires itself when answered. Nothing is emailed |

## Work packages and deliverables

### WP1 — The sync, in the database

- **Deliverables:**
  - `supabase/migrations/0067_the_bell_carries_what_is_waiting.sql`: the two columns, a unique index on `(recipient_user_id, kind, subject_key)`, and `app_sync_waiting(p_kinds text[], p_items jsonb)`.
  - `supabase/tests/67_the_bell_carries_what_is_waiting.sql`.
- **Outcome:** an account can only ever fill its own inbox, only with BR159's kinds, and only with in-app links. It cannot reach another account's inbox or scope 58's.

### WP2 — Collecting what is waiting

- **Deliverables:**
  - `src/web/waiting.ts` (with tests) turns the loaders' results into inbox items: headline, detail, link and subject key.
  - `src/data/waiting.ts` collects them per club link, reusing the workspaces' own loaders, and syncs them.
- **Outcome:** the bell says what the workspaces say, because it reads through the same code.

### WP3 — The bell on `/me`

- **Deliverables:**
  - `/me` syncs, then renders the same `NotificationBell` the club screens use.
  - The registrar layout syncs the staff kind.
  - Settled items are hidden.
  - Marking an item read refreshes both places.
- **Outcome:** a guardian sees "Sebastian's match against Robina: did it go ahead?" without first finding the right child's tab.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The five read-time flags, synchronised into the inbox | Email or push to somebody who never opens the app (that is a Communication, C7) |
| Dismissing, and retiring once answered | Reminders that chase an unanswered item over time |
| The bell on `/me` and on club screens | BR42 and BR64's coordinator and fixture-change notifications (still email-shaped, named in BR148) |

## Gap notes

- **A family item refreshes when that account opens `/me`.** The club
  screens synchronise only the staff kind, to keep every club page cheap. A
  guardian who is also an officer sees family items from their last `/me`
  visit until they open it again.
- **The synchronise step costs the same reads the workspace already makes.**
  It is one pass over the account's household per `/me` load. The day a
  household is large enough for that to matter, the loaders batch first.
