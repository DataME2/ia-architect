# Project Scope — Voucher Programs and Committee Approval

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/au-youth-sport-vouchers-jvdr4s`.

This initiative generalizes the existing, single-program voucher concept
(previously only the Queensland PlayOn Sports Voucher) into a
multi-program **Voucher Program** business object covering the six
Australian state government youth-sport voucher schemes (Queensland Play
On!/FairPlay, NSW Active and Creative Kids, SA Sports Vouchers, WA
KidSport, Victoria Get Active Kids, Tasmania Ticket to Play); adds a Club
governance gate (a Voucher Program only becomes usable for a club's
invoices once that club's Committee approves it, BR21); and separates
that governance decision from financial execution — only Finance Admin or
Treasurer may apply an approved Voucher to a specific Player's invoice
(BR22). It also investigates how the club actually gets reimbursed:
research found no state program exposes a general claims API at the pilot
club's scale, so it adds a Voucher Claim object and process (BR23, BR24)
built on each program's existing CSV/portal claim mechanism, plus a
Voucher Verification step (BR25) where the Assistant (AI actor, advisory
only — [decision 2](../decisions/2_ai-voucher-code-verification.md)) may
check a code against the issuing government's own public interface before
Finance Admin/Treasurer relies on it. Formally requesting dedicated API
access from state governments is recorded as a separate, not-yet-started
outreach task (open question #21) rather than something this initiative
builds. It also records that New Zealand has no nationwide government
voucher equivalent — comparable alternative funding (Tū Manawa Active
Aotearoa, council grants, gaming/philanthropic trusts) runs through the
existing Grants Committee Member / Grants Coordinator roles instead, not
through this Voucher Program object. No application code is written in
this initiative — the project is still pre-MVP.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | G3 reworded to name the state voucher programs generically and point at the new Committee-approval rule (BR21); new Resource entries cataloguing the six AU state programs, the NZ situation, and the researched claim mechanisms (no general API at the pilot club's scale); new "two-track" Course of Action (pending API-access outreach vs. interim Assistant-verification + CSV/portal claims). No new Goal, Capability, or Principle — the change refines existing G3/C3. A club-level approval gate does not touch Principle P3 (that principle governs the AI Assistant, not human Committee decisions); the Assistant's new voucher-verification check stays inside Principle P2 (read-only) and P4 (controlled service only) rather than requiring an exception to either (see [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md), [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md)) |
| 2_business    | New business objects Voucher Program, Club Voucher Program Enablement, Voucher Verification, and Voucher Claim; Voucher's description updated to reference them; new "Voucher program enablement process" and "Voucher application and claim process"; new business rules BR21–BR25; new glossary terms; Player finance service description and process links updated; the AI Assistant's decision-rights row gains an explicit, bounded voucher-verification right. No new human actor — the existing **Committee Member** role's "Club governance decisions" concern already covers approving a Voucher Program, and **Finance Admin**/**Treasurer** already existed as Player-finance actors (see the five files under [2_business/](../ea/2_business/README.md)) |
| 3_information | No change — not started. No data model exists yet; deferred to the MVP-build initiative, which now has Voucher Program, Club Voucher Program Enablement, Voucher Verification, and Voucher Claim named as objects to model |
| 4_application | No change — not started |
| 5_technology  | No change — not started |

A new [decision record](../decisions/2_ai-voucher-code-verification.md)
accompanies this scope document: it was the Assistant's decision rights
that changed (a new, bounded "may" — verify a Voucher code externally),
which `ea-first-change` step 1 flags as warranting its own record
alongside the scope document, not folded silently into the business-layer
row above.

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | "Voucher" named a single instrument — implicitly the Queensland PlayOn Sports Voucher — with no concept of multiple state programs, no gate on which ones a club could use, no named role for who applies one, and no concept of claiming its value back from government; BR4 prevented double-applying a voucher but nothing else governed it |
| **Target** (delivered) | Voucher Program is a named, multi-jurisdiction business object (six AU state schemes catalogued); a Club must have Committee approval (Club Voucher Program Enablement, BR21) before a Voucher Program's instruments can be applied to that club's invoices; only Finance Admin or Treasurer may apply one (BR22); a Voucher's code is verified — by the Assistant (advisory) or manually — before it is applied (BR25); applying a Voucher creates a Voucher Claim the club submits to government through that program's existing CSV/portal mechanism (BR23, BR24); New Zealand's lack of an equivalent scheme, and its alternative (grant-based) funding path, is recorded so it isn't conflated with this object |

## Work packages and deliverables

### WP1 — Strategy layer

- **Deliverables:** `docs/ea/1_strategy/1_motivation.md`,
  `docs/ea/1_strategy/2_capabilities-and-resources.md`
- **Outcome:** G3 names the general class of state voucher programs
  instead of only Queensland's, and links to the new Committee-approval
  rule; Resource entries ground the six state programs' values, frequency,
  and eligibility, and the researched claim mechanisms (no general API at
  the pilot club's scale, NSW's 1,000+-member exception); a new Course of
  Action records the two-track approach (pending API-access outreach vs.
  interim Assistant-verification + CSV/portal claims); NZ's situation is
  recorded with a pointer to the Grants roles.

### WP2 — Business layer

- **Deliverables:** `docs/ea/2_business/1_business-actors-and-roles.md`,
  `docs/ea/2_business/2_business-services.md`,
  `docs/ea/2_business/3_business-processes.md`,
  `docs/ea/2_business/4_business-objects.md`,
  `docs/ea/2_business/5_domain-context-and-rules.md`
- **Outcome:** the Voucher program enablement process and the new Voucher
  application and claim process; the Voucher Program, Club Voucher Program
  Enablement, Voucher Verification, and Voucher Claim objects; glossary
  terms; BR21–BR25; the Assistant's decision-rights row explicitly bounds
  its voucher-verification check — all have a home. The Player finance
  service row and Voucher object description no longer imply a single
  voucher scheme, a single actor, or a discount with no reimbursement
  path.

### WP3 — Decision record

- **Deliverables:** `docs/decisions/2_ai-voucher-code-verification.md`,
  `docs/decisions/README.md`
- **Outcome:** why the Assistant may verify a Voucher code (read-only,
  advisory) but never apply one or submit a claim is recorded as a
  standalone decision, alongside — not instead of — the business-layer
  change, per `ea-first-change` step 1's guidance on AI decision-rights
  changes.

### WP4 — Governance scaffolding

- **Deliverables:** this scope document, `docs/scope/README.md` index row,
  `docs/scope/open-questions.md` rows 20–21
- **Outcome:** the initiative is indexed, and two open questions —
  the pilot club's actual approved program(s)/evidentiary standard for
  Committee approval (#20), and the not-yet-started task of formally
  requesting dedicated API access from state governments (#21) — are
  recorded for step 0 of the next `ea-first-change` walk.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Strategy-layer goal and resource updates for the six AU state voucher programs and their researched claim mechanisms | Information layer (Voucher Program / Club Voucher Program Enablement / Voucher Verification / Voucher Claim data model, classification, retention) |
| Business-layer service, process, objects, glossary, and business rules (BR21–BR25) for Committee-gated, role-restricted, verified, and claimable voucher programs | Application layer (services, components, interface contracts) — including the actual code that calls any government verification interface |
| Grounding each state program's value, frequency, eligibility criteria, and claim mechanism | Technology layer (stack selection, deployment) |
| A decision record scoping the Assistant's voucher-verification right to read-only/advisory | Actually formally requesting API access from any state government — recorded as a pending task (open question #21), not performed by this initiative |
| Recording that New Zealand has no nationwide government voucher scheme | A `Grant` business object for NZ's Tū Manawa Active Aotearoa / council / trust funding — the existing Grants Committee Member and Grants Coordinator actors are unchanged and remain otherwise ungrounded to a business object; not this initiative's job to close |
| New open questions (#20, #21) | Committee approval workflow mechanics (quorum, vote threshold, minute-taking) beyond "the Committee approves it"; confirming which specific Voucher Program(s) the pilot club has approved; which government(s) to approach first for API access and on what timeline |

## Gap notes

- **Information/Application/Technology layers.** Same gap noted in prior
  scope documents, now including Voucher Program, Club Voucher Program
  Enablement, Voucher Verification, and Voucher Claim among the objects
  the future data model needs to represent — including, at the
  application layer, what a "controlled service" (Principle P4) for
  voucher-code verification actually looks like technically. Closing it
  is still the MVP-build initiative's job.
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
- **Formal API-access request is only a placeholder task.** BR25 and the
  Voucher application and claim process assume the interim (verify +
  CSV/portal claim) path indefinitely; nobody has yet drafted or sent the
  written request to any state government for dedicated API/endpoint
  access, and no target jurisdiction, contact, or timeline is chosen — see
  [open question #21](./open-questions.md). Drafting that request is a
  reasonable next deliverable once a target state is picked.

## Open questions

- Which state Voucher Program(s), if any, has the pilot club's Committee
  actually approved (or plans to bring to a vote), and what counts as a
  valid record of that approval? Added to
  [docs/scope/open-questions.md](./open-questions.md) as #20.
- Which state government(s) will Let'sDataTalk formally request dedicated
  Voucher Program API/endpoint access from, in what order, and on what
  timeline? Added to [docs/scope/open-questions.md](./open-questions.md)
  as #21.
