# Project Scope — Sponsor Share of Voice

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/sponsor-share-of-voice`.
**Status: built.**

Two asks from the product owner, October 2026:

1. **The removed invoice should leave a record below the invoices**, so
   the treasurer remembers why they removed it. [Scope 87](./87_an_invoice_issued_in_error.md)
   kept the reason in `audit_event`, but only an admin reads that table
   (0002), so the treasurer could not see their own reason.
2. **With several sponsors, the slot should rotate, and a sponsor that
   wants to appear more often should be able to.** Choose the best option.

## Choosing the rotation

| Option | Why not, or why |
| - | - |
| Equal random rotation (what 0081 did) | Fair, but a sponsor cannot pay for more visibility |
| Strict round-robin per viewer | Needs a record of which sponsor each viewer last saw: per-viewer tracking, which decision 17 rules out |
| Priority or exclusivity (one sponsor wins the slot) | Starves the others. A club with three sponsors would show one |
| Per-sponsor frequency caps | Needs per-viewer counts. Same objection as round-robin |
| **Weighted rotation by tier (share of voice)** | **Chosen.** Every sponsor stays in rotation, a paying sponsor gets a predictable larger share, and each view is a fresh pick, so nothing is stored about the viewer |

**Tiers:** Standard 1×, Featured 2×, Premium 3×. The share is weight ÷
total weight among the campaigns live in that workspace:

| Live campaigns | Shares |
| - | - |
| Standard, Standard, Premium | 20%, 20%, 60% |
| Standard, Featured | 33%, 67% |
| Featured, Premium | 40%, 60% |

The cap of 3× keeps a Standard sponsor visible next to any Premium one.

**Pricing:** a higher tier brings more views, so CPM and CPC bill more on
their own. The club may also set a higher rate for a Featured or Premium
campaign; the rate is the club's to set. CPA is unaffected except that more
views may bring more acquisitions.

## Design

- **Migration 0086:**
  - `sponsor_campaign.rotation_weight`: 1 to 3, default 1, enforced by a
    check.
  - `app_deleted_sponsor_invoices(club)`: returns the removed invoices
    (number, campaign, period, amount, reason, when, and who by name) to
    the admin, the treasurer or the platform. Nothing else is read from the
    audit.
- **Rotation:** `pickSponsor()` uses `pickWeighted()`. `shareOfVoice()`
  gives the expected percentage. Both are pure and tested in
  `src/web/sponsor-billing.ts`.
- **Screens:**
  - **New campaign form:** "How often" (Standard, Featured, Premium).
  - **Statement:** a "How often (share of views)" column, with a tier
    selector for club campaigns and "≈ N% of views today".
  - **Removed invoices:** listed under the invoices, with number,
    campaign, period, amount, the reason in quotes, who removed it and
    when.
  - **Treasurer workspace:** the Sponsor money panel names each
    campaign's tier.
- **Suite 86:**
  - A new campaign is Standard, and the treasurer can make it Premium.
  - Nothing above Premium.
  - The treasurer reads back the removed invoice with its reason and
    their own name.
  - A committee member and another club's treasurer read none of it.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR173 added**; BR171 amended (the removed-invoice record is shown); decision 17, point 7 |
| 3_information | One column; one read function over `audit_event` |
| 4_application | Tier on the form, the statement and the workspace; the removed-invoices list |
| 5_technology  | Migration 0086, suite 86 |

## Out of scope / gaps

- **Platform campaigns are always Standard.** The placement form does not
  offer a tier yet.
- **Shares are approximate when audiences differ.** A campaign shown only
  to coaches competes only in coaches' workspaces. The statement shows the
  share among all campaigns live today.
