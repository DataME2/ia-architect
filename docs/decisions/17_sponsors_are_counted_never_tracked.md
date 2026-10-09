# Decision 17 — Sponsors are counted, never tracked

_[← Decisions](./README.md) · [scope 84](../scope/84_sponsors_in_the_workspace.md)_

**Status:** Accepted (October 2026). Built (migration 0081).

## Context

Clubs live on sponsors, and the product owner wants to monetise space in
the workspaces under three standard models:

- **CPC/PPC**: cost per click;
- **CPM**: cost per thousand impressions;
- **CPA**: cost per acquisition or action.

The usual way to measure these is ad-tech: tracking pixels, cookies, viewer
identifiers shared with the sponsor, and audience profiles. Two things rule
that out here:

- **Principle P4**, minors' data protected.
- **The audience includes families of children.** Australia's children's
  advertising code (AANA) and the Children's Online Privacy Code being made
  under the Privacy Act both point the same way.

## Decision

1. **Contextual only.** A campaign is chosen by club and by workspace (guardian,
   coach, referee, player, committee), never by anything known about the
   viewer.
2. **Adults only.** A sponsor never appears in the workspace of a person
   under 18, and the database refuses to count one (BR169).
3. **Counted, never tracked.**
   - Impressions and clicks are tallied per campaign per day.
   - A one-way hash, kept for two days, stops a refresh being counted twice.
     Nobody can read it.
   - A click passes through the platform's own redirect, with no referrer.
     Since [scope 85](../scope/85_sponsor_invoices_and_club_referrals.md)
     it carries one query string: the campaign's UTM tags
     (`utm_source=letsdatatalk&utm_medium=sponsor&utm_campaign=sponsor-…`).
     They are the same for every viewer, so they name the campaign and
     never the person. The sponsor's own analytics can then count CPA
     conversions itself.
4. **A banner is hosted by the platform, never hot-linked from the sponsor**
   (0082). An image on the sponsor's server would give it every viewer's IP
   address and browser on every view.
5. **Acquisitions are reported, not observed.** CPA conversions are what the
   sponsor reports (a promo code redeemed, a sign-up), recorded by the club.
   There is no pixel on the sponsor's site.
6. **Measure and invoice.** The platform computes what is owed. The club,
   or Let'sDataTalk for its own campaigns, invoices. No card is processed
   (BR170).

7. **Rotation is weighted and stateless** ([scope 88](../scope/88_sponsor_share_of_voice.md), BR173).
   Each view is a fresh weighted pick, so no record of which sponsor a
   viewer saw is kept. A strict round-robin per viewer would need exactly
   that record.

## Rejected

- **Third-party ad networks.** They bring their own tracking, which cannot be
  turned off for a child's family.
- **Per-viewer click logs.** They would answer "who clicked", a question
  nobody needs answered to bill CPC.
- **Showing sponsors to 13–17s as family-safe.** That was considered, and the
  product owner chose adults only.

## Consequences

- CPA depends on the sponsor's honesty about its own conversions. A promo
  code per club is the practical check.
- Frequency capping is per day per campaign only. Finer targeting is not
  possible by design.
