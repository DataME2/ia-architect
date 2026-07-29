# Decision 4 — Calendar distribution by subscription feed, not account access

_[← Decisions index](./README.md)_

**Status:** Accepted
**Date:** 2026-07-29
**Touches:** [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md) (C13),
[2_business/3_business-processes.md](../ea/2_business/3_business-processes.md#calendar-subscription-process),
[2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) (BR30–BR34)

## Context

Referees asked for their appointments to appear in the calendar they
already use — Gmail or Outlook. The obvious reading ("integrate with
Google Calendar and Microsoft 365") means Let'sDataTalk holds an OAuth
grant per referee and *writes events into their personal account*. That
reading collides with **Principle P2** (read-only at the source; no
writing into external systems without an explicit, scoped exception) and
would need a P2 exception, per-vendor integrations, and stored refresh
tokens for accounts the platform does not own.

It is also a duty-of-care question, not only a technical one: a
meaningful share of match officials are minors (MiniRef 5.0, Club Based
Match Official 4.5), and a calendar feed is a record of **where a child
will be, and when**.

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| **Two-way sync via Google Calendar API + Microsoft Graph** — OAuth per referee, platform writes/updates/deletes events in their account | Needs a P2 exception, a separate integration and consent screen per vendor (and per-vendor review processes), and long-lived refresh tokens for personal accounts — a standing credential-custody liability for a pre-MVP team, to deliver an outcome the feed option already delivers. Contradicts the standing course of action to defer direct external integrations |
| **Email an `.ics` attachment with each appointment** — referee clicks "add to calendar" | Works everywhere and needs nothing new, but each attachment is a dead copy: a reschedule or cancellation does not update what the referee already added, which is exactly when a stale calendar entry does real damage (a referee arriving at a cancelled match) |
| **Publish a private, tokenised iCalendar (ICS) feed the referee subscribes to** — Google, Outlook, and Apple Calendar all subscribe to the same URL and pull it on their own refresh cycle | One standards-based artifact serves every provider with no per-vendor integration, no OAuth, and no credential custody. Crucially the direction of travel reverses: **the calendar client pulls from us; we never write into their account** — so P2 needs no exception. Changes and cancellations propagate on the next refresh, unlike the attachment option |

## Decision

C13 delivers calendar sync as a **private, revocable, per-Person
iCalendar subscription feed** (RFC 5545, subscribed via `webcal:`/HTTPS),
not as account-level integration with any calendar vendor. Let'sDataTalk
holds no credential for, and performs no write against, any personal
Gmail, Outlook, or Apple account. Two-way sync via the Google Calendar
API or Microsoft Graph is deferred, and would be a new decision — it
requires a P2 exception this one deliberately avoids
([open question #26](../scope/open-questions.md)).

Four constraints ship with it, as business rules rather than
implementation notes: the feed carries only the subscriber's own
appointments (BR30); its URL is unguessable and revocable, because anyone
holding it can read it (BR31); its events carry no other participant's
personal data (BR32); and for a minor referee it is issued to the
Guardian, not the child (BR33). The platform's own appointment record
stays authoritative (BR34).

## Consequences

- **P2 survives unamended.** The platform's "never write into someone
  else's system" posture holds for calendars exactly as it holds for
  SQUADI and PlayFootball — worth protecting, since P2 is the reason the
  pilot club can trust the platform near its production data.
- **One artifact, every provider.** Gmail, Outlook, and Apple Calendar are
  served by the same feed; a new provider needs no work. The cost is
  latency — subscribed feeds refresh on the client's schedule (often
  hours, not seconds), so the feed is explicitly a convenience copy and
  never the channel a time-critical change relies on. Urgent changes still
  go through the Communications service (C7), which is not affected by
  this decision.
- **A new credential class exists.** A feed URL is a bearer token living
  outside the platform's session control, which is why BR31 makes
  revocation a first-class operation rather than a support request. The
  information layer will need to say how those tokens are generated,
  stored, and rotated.
- **If two-way sync is later wanted** (e.g. a referee declining a
  designation from their calendar), that is a new decision superseding
  this one for that specific capability — not an incremental widening of
  this feed.
