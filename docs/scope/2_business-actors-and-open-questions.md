# Project Scope — Business Actors and Open Questions Follow-Up

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/business-actors-pr-76khxv`.

The pilot club supplied a follow-up discovery document (*Business Actors
and Open Questions*) expanding the club's org chart beyond the actors
drafted in initiative 1, and answering 11 of the 18 open questions logged
in [open-questions.md](./open-questions.md). This initiative aligns both
through the business layer before recording them: new business actors,
three new referee-finance business rules, a Working with Children Check
(WWCC) compliance rule, and a payment-provider correction (Square
supersedes the original Stripe assumption). No application code exists
yet, so nothing below touches a code artifact.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | Changed: [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md) — Square replaces Stripe as the initial payment provider for capability C3, and its Courses of action note the exception to deferring direct integrations. No new goal, driver, or Principle; the change serves existing Goal G3 |
| 2_business | New: ~25 business actors across governance, compliance/welfare, referee administration, and football-program-coordinator roles ([1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md)); four new business rules BR16–BR19 and two new glossary terms ([5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)); the payment-plan process diagram and the Compliance & data quality service's "Offered to" column updated to match ([3_business-processes.md](../ea/2_business/3_business-processes.md), [2_business-services.md](../ea/2_business/2_business-services.md)) |
| 3_information | No change — not started; deferred to the MVP-build initiative |
| 4_application | No change — not started; deferred to the MVP-build initiative |
| 5_technology | No change — not started; deferred to the MVP-build initiative |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | `1_business-actors-and-roles.md` modeled ~20 actors from the original discovery document; 18 open questions were logged with 1 adopted interpretation (Stripe) and the rest unanswered; WWCC verification was explicitly listed as "not modeled" |
| **Target** (delivered) | ~45 business actors modeled, organized into governance, football-program-coordinator, compliance/welfare, and referee-administration groups, with the remaining purely facility/hospitality roles explicitly recorded as out of scope; 11 of 18 open questions resolved with traceable answers; WWCC verification modeled as an actor and a business rule; Square adopted as the first payment provider in place of Stripe |

## Work packages and deliverables

### WP1 — Expand business actors

- **Deliverables:** [docs/ea/2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md)
- **Outcome:** every actor named in the follow-up discovery document has a
  home — either a new table row (governance additions: Vice President,
  Digital Technology Manager, Head of Performance, Head of Community
  Football, Technical Director; compliance/welfare: Blue Card
  Administration, Volunteer Coordinator, Player Welfare Officer;
  communications: Social Media Communication and Club Photographer;
  referee administration: Referee Coordinator Admin, Referee Admin
  Back-Up; committees: Grants Committee Member, Appeals Panel Member;
  finance: Grants Coordinator; a new "Football program coordinators"
  section for the 12 age-group/team-category coordinators), or an explicit
  note in "Roles this project does not yet model" for the 13 purely
  facility/hospitality/venue roles whose concerns touch no modeled
  capability.

### WP2 — Codify referee-payment and WWCC business rules

- **Deliverables:** [docs/ea/2_business/5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)
- **Outcome:** BR16 (appointing party pays), BR17 (no claim for a
  cancelled match), BR18 (abandoned match requires the referee's
  explanation), and BR19 (WWCC required before starting a child-related
  role) are recorded with rationale; two new glossary terms (Working with
  Children Check, Appointing party).

### WP3 — Correct the payment-provider assumption

- **Deliverables:** [docs/ea/1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md),
  [docs/ea/2_business/3_business-processes.md](../ea/2_business/3_business-processes.md)
- **Outcome:** Square replaces Stripe as the Resources-table entry and the
  payment-plan process diagram's payment provider, with the supersession
  stated explicitly rather than silently overwritten (the original
  Stripe-first record in
  [1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md)
  stays untouched as a historical record — see Gap notes).

### WP4 — Resolve open questions

- **Deliverables:** [docs/scope/open-questions.md](./open-questions.md)
- **Outcome:** questions 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, and 15 move to
  the Resolved table with the answer and the document that now grounds it;
  question 5's New Zealand gap folds into question 14 rather than staying
  a separate loose end; 7 questions (1, 6, 12, 14, 16, 17, 18) remain
  Pending.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| New business actors for governance, compliance/welfare, communications, referee administration, committees, and football-program coordination | Facility/hospitality/venue-operations actors (Uniform Shop Coordinator, Grounds Coordinator, Grounds Maintenance, Club Physio, Strength and Conditioning Coach, Canteen Manager, Sponsorship Coordinator, Fundraising Coordinator, Venue Hire Coordinator, Events Coordinator, Club Facilities Coordinator, Bar Coordinator, Cleaner) — recorded as not-yet-modeled, no concern touches a modeled capability |
| Referee-payment business rules for cancellation, abandonment, and appointing-party liability | A full referee fee schedule (still open question 1) |
| WWCC compliance rule and actor for Australia | New Zealand's WWCC equivalent (folded into open question 14) |
| Payment-provider correction (Square over Stripe) in the strategy and business layers | Any Square integration code — no application/technology layer exists yet |
| Resolution of 11 of the 18 logged open questions | The remaining 7 open questions (system of record, retention, AU/NZ rule variance, support tier, pricing, success metrics) |

## Gap notes

- **Facility/hospitality actors.** If a future initiative adds a
  venue/facility-booking capability, the 13 recorded-but-unmodeled roles
  above are the starting list — no discovery work needed, just a decision
  on whether they need direct platform access.
- **Historical Stripe reference.** Initiative 1's scope document
  ([1_bootstrap-strategy-and-business-architecture.md](./1_bootstrap-strategy-and-business-architecture.md))
  still lists Square among "deferred" integrations — that line is a
  historical record of what was true when initiative 1 was delivered and
  is intentionally left unedited (scope documents aren't rewritten after
  the fact); the EA documents this initiative updated are the current
  source of truth.
- **Banking-detail custody for minors.** The adopted interpretation (open
  question 4) is operational, not a legal/privacy sign-off. Principle P4
  still governs, and a future initiative should get an explicit legal
  answer before this becomes a stored data field.
- **New Zealand WWCC.** Australia's requirements are now modeled in full;
  New Zealand's equivalent is still unknown and blocks extending the
  Blue Card Administration actor's concern to NZ clubs.

## Open questions

None newly raised by this initiative — see
[open-questions.md](./open-questions.md) for the consolidated Pending
list (7 remaining) and Resolved list (11 answered here).
