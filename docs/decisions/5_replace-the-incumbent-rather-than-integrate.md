# Decision 5 — Replace the incumbent (Majestri) rather than complement or integrate

_[← Decisions index](./README.md)_

**Status:** Accepted
**Date:** 2026-08-04
**Touches:** [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md) (Majestri Resource, Courses of action),
[1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md) (Let'sDataTalk vendor Stakeholder),
[docs/scope/11_majestri-and-the-reconciliation-gap.md](../scope/11_majestri-and-the-reconciliation-gap.md) ([open question #33](../scope/open-questions.md))

## Context

[Initiative 11](../scope/11_majestri-and-the-reconciliation-gap.md)
discovered that Let'sDataTalk is not entering an empty space. **Majestri**
— an established club management system — is already run by most football
clubs including the pilot club, and already covers registration intake,
dashboards, email/SMS, volunteers, match officials, and **periodic manual
comparisons of its own registrations against SQUADI and PlayFootball**.

That last item is the same operation Capability C14 models. The question
recorded as [#33](../scope/open-questions.md) was therefore not cosmetic:
"replace the system every club already uses" and "make the system they use
work properly" are different products, with different scope, different
sales motions, and different risk.

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| **Complement** — sit alongside Majestri, covering only what it does not (referee lifecycle, finance depth, carnival visibility, reconciliation) | Lowest build cost and no displacement selling, but it concedes the `Person` record to Majestri. Principle P1's single identity cannot hold if registration intake lives in another vendor's database — the platform becomes a satellite of a system it does not control, and Goal G1 is unreachable by construction |
| **Integrate** — treat Majestri as another source system alongside SQUADI and PlayFootball | Keeps clubs' existing investment and shortens the sales conversation, but inherits Majestri's data model as an upstream constraint, adds a third external dependency to reconcile, and — decisively — makes the platform's ceiling *Majestri's* roadmap. It also repeats the SQUADI problem: an integration with a vendor who has not agreed to be integrated with (BR53) |
| **Replace** — displace Majestri as the club's system of record for club-held data, and take the market it occupies | Highest build cost and the hardest sale (displacement, not greenfield), but the only option where the `Person` record, the registration flow, and the reconciliation output are all in one place under one identity model — which is the entire premise of P1, G1, and G2. It is also the only option with a market thesis behind it rather than a niche |

## Decision

**Let'sDataTalk positions as a replacement for Majestri**, competing for
the club management market rather than complementing or integrating with
the incumbent. Majestri remains modeled as a *Resource* describing the
competitive and operational baseline — the thing clubs are migrating
*from* — not as a source system to integrate with.

This is a **commercial and strategic** decision recorded here because it
constrains architecture: it means club-held registration intake, identity,
and reconciliation are all in scope as first-party capabilities, and none
of them may be designed as adapters onto someone else's data model.

## Consequences

- **Feature parity is now a floor, not a roadmap.** A club switching from
  Majestri arrives expecting registration intake, dashboards, email/SMS,
  volunteer management, and match officials to already work. Capabilities
  C1–C9 stop being a build order and become a **minimum viable
  displacement set** — worth restating when the MVP is scoped, because the
  Q4 2026 target was set against a narrower reading.
- **The reconciliation gap is the wedge, and it is currently blocked.**
  The most defensible reason to displace Majestri is that its
  SQUADI/PlayFootball comparison is manual, periodic, and stale (the pilot
  club's was ten weeks old when read). C14 is the answer to that — and
  **BR53 currently prohibits building it** pending
  [#39](../scope/open-questions.md). Until that resolves, the replacement
  product is *worse* than the incumbent on the exact axis chosen to beat
  it. This is the sharpest live risk in the strategy and it is not
  resolvable by building harder; it needs Football Queensland's answer.
- **If Majestri is an approved system partner, this is asymmetric
  competition** ([#40](../scope/open-questions.md)). Displacing a vendor
  who holds Squadi access the platform is denied means competing without
  the feature the competitor keeps. That does not invalidate the decision,
  but it makes [#41](../scope/open-questions.md) — partner status —
  strategically load-bearing rather than merely useful.
- **Migration becomes a first-class capability, not a one-off.** Every
  displacement sale is a data migration out of Majestri, at a moment in
  the season when the club can least afford disruption. Whether Majestri
  permits or supports bulk export of a club's own data is unknown and is
  the mirror image of the question already open against SQUADI — recorded
  as [#45](../scope/open-questions.md).
- **The sales cycle is displacement-length.** "Most clubs already run
  Majestri" means the pipeline is switching decisions, not adoption
  decisions: longer, committee-approved, and seasonally gated. This bears
  on the commercial questions already parked as
  [#16](../scope/open-questions.md) and
  [#17](../scope/open-questions.md), and it makes the pilot club's
  reference story disproportionately valuable.
- **Reversibility.** Complementing or integrating remain available later
  at moderate cost — the platform would still hold its own `Person` model
  and could add Majestri as a source. The reverse is not true: conceding
  intake first and trying to reclaim it later means re-migrating clubs a
  second time. Choosing replacement now keeps the cheaper reversal
  available.
