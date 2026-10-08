# Project Scope — Sponsors in the Workspace

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/sponsors-in-the-workspace`.
**Status: built.**

Most clubs have sponsors, and the product owner wants to **monetise space
in the workspaces** under three standard models:

| Model | Charged | Measured by |
| - | - | - |
| **CPC / PPC**, cost or pay per click | Per click | Clicks through the platform's redirect, once per viewer per day |
| **CPM**, cost per mille | Per 1,000 impressions | Impressions rendered, once per viewer per day |
| **CPA**, cost per acquisition or action | Per acquisition | Conversions **reported by the sponsor** (a promo code redeemed, a sign-up) and recorded by the club |

Decided by the product owner, October 2026:

- **Both sell, with a revenue share.** A club sells its own sponsors.
  Let'sDataTalk places platform campaigns into clubs that opt in, and the
  club receives a share recorded at placement (30% by default).
- **Adults' workspaces only.** That means guardians, coaches, the committee,
  and referees and players of 18 or over. A 13–17 person's own workspace
  shows none.
- **Measure and invoice.** The platform counts and computes what is owed;
  invoicing happens outside. No card is processed.

How it is measured without tracking anybody is
[decision 17](../decisions/17_sponsors_are_counted_never_tracked.md).

## Design

- **Migration 0081:**
  - `club_sponsor_settings`: the club's opt-in. Only the platform sets the
    share, enforced by a trigger.
  - `sponsor_campaign`: always one club's, so P5 holds. Owned by the club or
    the platform, with model, rate, audience workspaces, dates and status.
  - `sponsor_tally`: counts per campaign per day, with no identity.
  - `sponsor_seen`: a two-day, unreadable one-way hash that dedupes counts.
  - `app_record_sponsor_event()`: an adult member or family only.
  - `app_record_sponsor_acquisitions()`: admin or treasurer, or the platform
    for its own campaigns.
  - `app_platform_place_campaign()`: platform, opt-in only.
- **Workspace slot:** `SponsorSlot` sits under every workspace on `/me`,
  shown only when `showsSponsors()` is true. It is labelled
  **"Sponsored · {name}"** and links to `/sponsor/{id}`, which counts the
  click and redirects with `no-referrer`.
- **/registrar/sponsors**, admin and treasurer only:
  - the statement: impressions, clicks with CTR, acquisitions, amount
    earned and the club's share, per campaign;
  - a new campaign; pause and resume;
  - recording CPA acquisitions;
  - opting in to platform campaigns.
- **/platform:** a placement form for opted-in clubs.
- **Arithmetic** in `src/web/sponsor-billing.ts`, with tests: CPC is clicks
  × rate; CPM is impressions × rate ÷ 1,000; CPA is acquisitions × rate; the
  club share applies on top.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **A new revenue stream** for clubs and the vendor, inside P4 (minors' data) and P5 (tenant isolation) |
| 2_business    | **BR169 and BR170 added**; decision 17 |
| 3_information | Four tables (settings, campaigns, tallies, the dedupe hash) |
| 4_application | The slot, the click redirect, the Sponsors page, the platform placement, three functions |
| 5_technology  | No change. Migration 0081, suite 81 |

## Out of scope / gaps

- **Creative images.** A campaign is text only: headline, text and link. A
  logo needs a public bucket and image review.
- **Monthly statements and PDF invoices.** The statement is to date. A
  period filter and export come when a club invoices its first sponsor.
- **Budgets and auto-pause.** Not chosen. The schema can add a cap later.
- **A sponsor portal**, where sponsors see their own counts. Today the club
  shares them.
