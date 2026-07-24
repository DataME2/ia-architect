# Project Scope — Voucher Programs and Committee Approval

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/au-youth-sport-vouchers-jvdr4s`.

This initiative generalizes the existing, single-program voucher concept
(previously only the Queensland PlayOn Sports Voucher) into a
multi-program **Voucher Program** business object covering the six
Australian state government youth-sport voucher schemes (Queensland Play
On!/FairPlay, NSW Active and Creative Kids, SA Sports Vouchers, WA
KidSport, Victoria Get Active Kids, Tasmania Ticket to Play), and adds a
Club governance gate: a Voucher Program only becomes usable for a club's
invoices once that club's Committee approves it (new rule BR21). It also
records that New Zealand has no nationwide government voucher equivalent —
comparable alternative funding (Tū Manawa Active Aotearoa, council grants,
gaming/philanthropic trusts) runs through the existing Grants Committee
Member / Grants Coordinator roles instead, not through this Voucher
Program object. No application code is written in this initiative — the
project is still pre-MVP.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | G3 reworded to name the state voucher programs generically and point at the new Committee-approval rule (BR21); new Resource entry cataloguing the six AU state programs and the NZ situation. No new Goal, Capability, or Principle — the change refines existing G3/C3, and a club-level approval gate does not touch Principle P3 (that principle governs the AI Assistant, not human Committee decisions) (see [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md), [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md)) |
| 2_business    | New business objects Voucher Program and Club Voucher Program Enablement; Voucher's description updated to reference them; new "Voucher program enablement process"; new business rule BR21; new glossary term Voucher Program and an updated Voucher definition; Player finance service description and process links updated. No new actor — the existing **Committee Member** role's "Club governance decisions" concern already covers approving a Voucher Program (see the five files under [2_business/](../ea/2_business/README.md)) |
| 3_information | No change — not started. No data model exists yet; deferred to the MVP-build initiative, which now has Voucher Program and Club Voucher Program Enablement named as objects to model |
| 4_application | No change — not started |
| 5_technology  | No change — not started |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | "Voucher" named a single instrument — implicitly the Queensland PlayOn Sports Voucher — with no concept of multiple state programs and no gate on which ones a club could use; BR4 prevented double-applying a voucher but nothing governed whether a program was available to a club at all |
| **Target** (delivered) | Voucher Program is a named, multi-jurisdiction business object (six AU state schemes catalogued); a Club must have Committee approval (Club Voucher Program Enablement, BR21) before a Voucher Program's instruments can be applied to that club's invoices; the Voucher program enablement process explains the flow; New Zealand's lack of an equivalent scheme, and its alternative (grant-based) funding path, is recorded so it isn't conflated with this object |

## Work packages and deliverables

### WP1 — Strategy layer

- **Deliverables:** `docs/ea/1_strategy/1_motivation.md`,
  `docs/ea/1_strategy/2_capabilities-and-resources.md`
- **Outcome:** G3 names the general class of state voucher programs
  instead of only Queensland's, and links to the new Committee-approval
  rule; the new Resource entry grounds the six state programs' values,
  frequency, and eligibility, and records NZ's situation with a pointer to
  the Grants roles.

### WP2 — Business layer

- **Deliverables:** `docs/ea/2_business/2_business-services.md`,
  `docs/ea/2_business/3_business-processes.md`,
  `docs/ea/2_business/4_business-objects.md`,
  `docs/ea/2_business/5_domain-context-and-rules.md`
- **Outcome:** the Voucher program enablement process, the Voucher Program
  and Club Voucher Program Enablement objects, glossary terms, and BR21 all
  have a home; the Player finance service row and Voucher object
  description no longer imply a single voucher scheme.

### WP3 — Governance scaffolding

- **Deliverables:** this scope document, `docs/scope/README.md` index row,
  `docs/scope/open-questions.md` row 20
- **Outcome:** the initiative is indexed, and the open question about the
  pilot club's actual approved program(s) and evidentiary standard for
  Committee approval is recorded for step 0 of the next `ea-first-change`
  walk.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Strategy-layer goal and resource updates for the six AU state voucher programs | Information layer (Voucher Program / Club Voucher Program Enablement data model, classification, retention) |
| Business-layer service, process, objects, glossary, and business rule (BR21) for Committee-gated voucher programs | Application layer (services, components, interface contracts) |
| Grounding each state program's value, frequency, and eligibility criteria | A `Grant` business object for NZ's Tū Manawa Active Aotearoa / council / trust funding — the existing Grants Committee Member and Grants Coordinator actors are unchanged and remain otherwise ungrounded to a business object; not this initiative's job to close |
| Recording that New Zealand has no nationwide government voucher scheme | Committee approval workflow mechanics (quorum, vote threshold, minute-taking) beyond "the Committee approves it" — a business-process detail for a future initiative once the pilot club's own governance procedure is known |
| New open question (#20) on the pilot club's actually-approved program(s) and evidentiary standard | Confirming which specific Voucher Program(s) the pilot club has approved — open question, not resolved here |

## Gap notes

- **Information/Application/Technology layers.** Same gap noted in prior
  scope documents, now including Voucher Program and Club Voucher Program
  Enablement among the objects the future data model needs to represent.
  Closing it is still the MVP-build initiative's job.
- **NZ grant funding is not modeled as a business object.** The Grants
  Committee Member and Grants Coordinator actors already existed before
  this initiative with no `Grant`/`Grant Application` object naming them;
  this initiative deliberately does not add one, to keep scope to what was
  requested (vouchers). A future initiative should ground those two actors
  the same way this one grounds Voucher Program, if NZ grant-funding
  tracking becomes a priority.
- **Committee approval procedure is not detailed.** BR21 states *that*
  Committee approval gates a Voucher Program, not *how* a Committee records
  or evidences that approval (minutes, a vote count, a signed motion) —
  see [open question #20](./open-questions.md).

## Open questions

- Which state Voucher Program(s), if any, has the pilot club's Committee
  actually approved (or plans to bring to a vote), and what counts as a
  valid record of that approval? Added to
  [docs/scope/open-questions.md](./open-questions.md) as #20.
