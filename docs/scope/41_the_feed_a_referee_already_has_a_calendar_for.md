# Project Scope — The Feed a Referee Already Has a Calendar For

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

Referees asked for their appointments to appear in the calendar they already
use. **[Decision 4](../decisions/4_calendar-distribution-by-feed-not-account-access.md)
settled how, in July 2026**, and nothing about it has changed: a private,
revocable, per-Person iCalendar feed that the referee's calendar *pulls*,
rather than an OAuth integration that writes into their Gmail.

So this initiative implements a decision rather than making one. That is
worth saying, because the tempting move when picking up a fifteen-month-old
decision is to re-litigate it — and the reasons still hold. A pull feed
needs no P2 exception, no per-vendor integration, and no custody of
credentials for accounts the platform does not own.

## What the implementation had to get right

**The token is decision 12's, reused rather than reinvented.** The
unsubscribe link solved the same shape — an unguessable URL, held by someone
with no account, that must be revocable — and settled on `HMAC(secret,
per-row salt)` with the hash stored for database-side verification. The one
difference is which property matters: an unsubscribe link must be *durable*
so a year-old email still works; a feed URL must be *rotatable* so a lost
phone stops reading it. The same construction gives both — the same salt
derives the same token, and a new salt kills the old URL immediately (BR31).

**The feed is a projection, not a query** (BR141, new). The holder of a feed
URL is by definition unauthenticated. A feed assembled by filtering
something the caller can influence is one query-string away from being a
different feed, so the database function takes a token and returns a fixed
set of columns, and there is nothing to vary.

**A minor's feed belongs to their guardian** (BR33). A calendar feed is a
record of where a child will be and when — which decision 4 named as the
duty-of-care half of the question, not the technical half. A subscription
for an under-18 is issued to a guardian with authority, enforced by a
trigger rather than by the screen that creates it.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No new goal or principle**, and notably **no P2 exception** — which is the whole point of decision 4's shape. The calendar client pulls; the platform writes into nobody's account |
| **2_business** | **One new rule: BR141** (the feed is a projection, not a table read). BR30–BR34 gain code. The **Calendar distribution** business service moves from Pending to realised |
| **3_information** | **One new data object:** `calendar_subscription` — the Person it is for, who holds it (BR33), the salt behind its URL, and when it was last rotated. No event is stored: the feed is generated on read, so a cancelled fixture cannot linger in a table |
| **4_application** | C13 moves from *Not started* to *Partial*. New: `src/domain/calendar/` (RFC 5545 serialisation, pure), `src/data/calendar.ts`, the feed route at `/calendar/[token]`, and subscribe/rotate/revoke in the person's own workspace |
| **5_technology** | **No change.** One more anonymous route in the same app, serving `text/calendar`. No vendor SDK, no OAuth client, no stored refresh token |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | A referee checks a screen to find out where they are on Saturday, or does not, and misses a match. Decision 4 has been accepted and unimplemented for fifteen months |
| **Target** (delivered) | A referee subscribes once in Gmail, Yahoo, Outlook or Apple Calendar. Appointments appear and update on the client's own refresh. The URL is rotatable and revocable, a minor's belongs to their guardian **and the guardian's own workspace can actually reach it**, and the events name nobody else |

## Work packages and deliverables

### WP1 — The subscription

- **Deliverables:** `supabase/migrations/0035_calendar_subscription.sql` —
  `calendar_subscription`, BR33's guardian trigger, and
  `app_calendar_feed()` returning the projection; `supabase/tests/38_calendar.sql`
- **Outcome:** BR30, BR31, BR33 and BR141 hold.

### WP2 — The document

- **Deliverables:** `src/domain/calendar/ical.ts` — RFC 5545 escaping, line
  folding, and **stable UIDs**
- **Outcome:** BR32 and BR34 hold. A reschedule updates the event a
  subscriber already has rather than adding a second one beside it.

### WP3 — The feed, and control of it

- **Deliverables:** `/calendar/[token]/route.ts`; subscribe, rotate and
  revoke in `/me`
- **Outcome:** The referee has the URL, and can kill it.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Match official appointments | **A player's fixtures.** Decision 4 says "initially referee appointments" and that is honoured rather than widened; the feed function takes a subject and would extend |
| A rotatable, revocable URL | **Expiry.** A feed lives until somebody kills it — an automatic expiry that silently stops a referee's calendar working is worse than one they control |
| Events with no other participant's data | **Attendees, organisers or invitations.** Every one of those carries somebody else's address |
| Pull, on the client's refresh cycle | **Push.** Two-way sync needs a P2 exception ([#26](./open-questions.md)) that decision 4 deliberately avoids |

## Gap notes

- **Resolved — no `VTIMEZONE` component is needed after all.** The original
  concern stands: `DTSTART;TZID=Australia/Brisbane` with no `VTIMEZONE`
  block is not a complete document per §3.2.19, and which clients tolerate
  the omission varies. A family reported exactly this as "the calendar
  isn't working" — not a rejected subscription, but silence, because a
  guardian's workspace had never offered the subscribe control at all
  (below). Fixing that surfaced the format question too, and the actual fix
  sidesteps it rather than shipping a transition-rule library: `DTSTART` is
  now a `Z`-suffixed **UTC** instant, computed from `Intl`'s own offset for
  the zone at that exact date rather than a hardcoded one — correct even
  for a zone that observes daylight saving, though the pilot club's does
  not. No `VTIMEZONE`, no per-zone transition table, and no
  client-dependent reading: Gmail, Yahoo, Outlook and Apple Calendar all
  convert a UTC instant to the viewer's own zone the same way.
- **Resolved — the guardian's workspace never rendered the subscribe
  control.** WP3 built it once, generically (`CalendarPanel`), and
  `RefereeWorkspace` used it; `GuardianWorkspace` never imported it, so a
  guardian holding a minor official's feed under BR33 had no screen to
  create, rotate or revoke it from — only the referee's own workspace
  offered the button the backend had supported since WP1. Now shown for
  whichever child is currently selected, unconditionally, the same way the
  designations panel already is (BR65): an honest empty feed rather than
  the control disappearing because there is nothing in it yet.
- **The refresh cycle is the client's**, and Google's is famously slow —
  hours, sometimes longer. A cancellation is therefore *eventually* visible,
  which is exactly why BR34 makes the platform's own record authoritative
  and why the fixture-change notification ([scope 36](./36_the_platform_learns_to_send_and_to_stop.md))
  exists alongside this rather than instead of it.
- **A revoked URL that somebody already subscribed to fails quietly** in
  most calendar clients — the events simply stop updating, and some clients
  keep showing the last copy. Nothing here can reach into a phone.
- **The feed is per Person, not per role.** Somebody who officiates at two
  clubs holds two subscriptions, because `person` is tenant-scoped (P1
  within a club) and a single cross-club feed would need the cross-club
  identity BR44 says does not exist.

## Open questions

- **[#83] Should a guardian's feed carry appointments for more than one
  child?** Adopted: **one subscription per child**, so a guardian with two
  officiating children holds two URLs. Merging them would mean a single
  document naming two children's whereabouts, and the separation costs a
  guardian one extra subscribe.
