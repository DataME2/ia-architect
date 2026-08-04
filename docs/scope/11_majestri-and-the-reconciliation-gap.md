# Project Scope — Majestri and the Reconciliation Gap

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

A screenshot of the pilot club's own **Majestri** registration screen,
plus the documented SQUADI extract formats, supplied three things this
architecture did not have: an **incumbent system** it had never modeled,
a **counted** version of the registration problem, and the specific
reason cross-system matching is hard.

Two findings change the picture materially. First, **most clubs already
run Majestri** — an established club management system that already does
registration intake and already runs periodic comparisons against
PlayFootball and SQUADI. Let'sDataTalk is not entering an empty space,
and whether it replaces, complements, or integrates with Majestri is an
unanswered positioning question ([#33](./open-questions.md)). Second,
SQUADI's User Report **lost its FA ID column in March 2025**, so the two
systems no longer share a stable identifier — cross-system matching must
fall back to name, date of birth, and email, which is precisely the
false-merge risk BR5 exists to prevent.

This initiative adds **Capability C14 — External registration
reconciliation**, four business rules, four business objects, a process,
and a service. No application code is written.

## The counted baseline

From the club's own 2026 Season screen (All Competitions, 1 Jan – 1 Aug
2026), both comparisons last run **15 May 2026**:

| Measure | Count |
| ------- | ----- |
| Players | 799 |
| Registrations | 707 |
| Incomplete | 49 |
| Matched in Majestri **and** PlayFootball v2.0 | 721 |
| **Missing from PlayFootball v2.0** | **78** |
| Matched in Majestri **and** SQUADI | 759 |
| **Missing from SQUADI** | **40** |

Under BR43 those 40 are not rows to tidy — they are players who cannot
take the field. The comparison was roughly ten weeks stale when recorded,
which is itself the point: this is a periodic manual run, not a standing
state.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | New **Capability C14** (External registration reconciliation), realizing existing G2 and G6 — no new Goal or Principle; three new Resource entries: Majestri as incumbent, the counted reconciliation gap, and the SQUADI extract formats with their documented blind spots (see [2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md)) |
| 2_business    | New **External registration reconciliation** service and process; new business objects External System Extract, Reconciliation Run, Reconciliation Exception, Identity Match Candidate; new business rules **BR44–BR47**; five new glossary terms; Majestri added to the system-context diagram. No new actor — Registrar, Club Admin, and Digital Technology Manager already cover who runs and resolves comparisons |
| 3_information | No change — not started. The matching problem (no shared key, confidence, evidence, human confirmation) is squarely this layer's future concern and is now specified by BR44 |
| 4_application | No change — not started |
| 5_technology  | No change — not started |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | BR39 said SQUADI is the system of record and that differences become "reconciliation exceptions", but nothing defined what an exception was, how records would be matched without a shared key, or what the extracts actually contain. Majestri was entirely unmodeled despite most clubs running it |
| **Target** (delivered) | Reconciliation is a named capability with a process, four objects, and four rules covering the three things that make it hard: no shared identifier, extracts that lie by omission, and gaps that carry an eligibility consequence. The incumbent is on the map, and the problem has a count |

## Work packages and deliverables

### WP1 — Record the incumbent and the counted gap

- **Deliverables:** `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (Majestri, the measured gap, and the SQUADI extract formats as
  Resources), `docs/ea/2_business/5_domain-context-and-rules.md`
  (Majestri in the system-context diagram)
- **Outcome:** the architecture stops implying a greenfield, and the
  registration problem has numbers behind it instead of adjectives.

### WP2 — Model reconciliation

- **Deliverables:** `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (C14), `docs/ea/2_business/2_business-services.md` (service),
  `docs/ea/2_business/3_business-processes.md` (process),
  `docs/ea/2_business/4_business-objects.md` (four objects),
  `docs/ea/2_business/5_domain-context-and-rules.md` (BR44–BR47, glossary)
- **Outcome:** every constraint that makes this hard is a checkable rule:
  no assumed shared key (BR44), extracts carry their own limitations
  (BR45), results are dated and go stale (BR46), and a gap is an
  eligibility exception (BR47).

### WP3 — Governance scaffolding

- **Deliverables:** this scope document, `docs/scope/README.md` index row,
  `docs/scope/open-questions.md` (#33–#35, and #32 enriched with the
  counted figures)
- **Outcome:** the positioning question is on the record rather than
  assumed away, and the two factual unknowns (FA ID's return, PlayFootball's
  formats) are owned.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| C14, the reconciliation service, process, four objects, and BR44–BR47 | **Deciding** the Majestri positioning ([#33](./open-questions.md)) — a product and commercial call |
| Recording Majestri as the incumbent and the counted 2026 gap | Any Majestri integration, import, or data exchange |
| Documenting the two SQUADI extract formats and their blind spots | PlayFootball/Football Australia's extract formats ([#35](./open-questions.md)) |
| Specifying matching without a shared identifier, with human confirmation | The matching algorithm, confidence scoring, or thresholds — information/application layers |
| — | Any code — no `src/`, no tests, no build |

## Gap notes

- **The positioning question is bigger than it looks.** "Most clubs
  already use Majestri" reframes the product: replacing an incumbent that
  already does intake, dashboards, email/SMS, volunteers and officials is
  a very different proposition from fixing the one thing it does
  awkwardly. The reconciliation gap (C14) is a genuine weakness either
  way — 40 ineligible players the club learns about every few weeks — but
  which product is being sold changes the MVP's shape. Worth answering
  before the MVP-build initiative is scoped, alongside [#28](./open-questions.md).
- **Losing the FA ID is a standing risk, not a one-off inconvenience.**
  A third party removed a join key with no notice and, per Majestri's own
  note, may restore it just as quietly. Any matching design should treat
  the presence of an external identifier as *optional and volatile* —
  degrade to attribute matching when it is absent, and use it when it
  returns, without a redesign either way.
- **The two SQUADI reports disagree about what "registered" means.** One
  omits `De-Registered` rows and has no role; the other covers three roles
  and may span seasons. A club running both against the same question can
  legitimately get two different answers, and BR45 only requires the
  limitation to be *recorded* — it does not resolve which report should be
  authoritative for which question. That choice is unmade.
- **The 49 incomplete registrations are unexplained.** They sit alongside
  the 78/40 external gaps in the same screen but are a different problem —
  internal completeness, not external presence. Whether they overlap with
  the missing-from-SQUADI population is unknown, and would be worth
  knowing while decomposing [#32](./open-questions.md).

## Open questions

> **#33 resolved (August 2026): replace.** Let'sDataTalk competes for
> Majestri's market rather than complementing or integrating with it —
> see [decision 5](../decisions/5_replace-the-incumbent-rather-than-integrate.md)
> for the alternatives weighed and the consequences that follow, the
> sharpest being that **the wedge chosen to displace Majestri (C14's
> reconciliation) is the very thing BR53 currently blocks** pending
> [#39](./open-questions.md).


- **#33 (new).** Does Let'sDataTalk replace, complement, or integrate with
  Majestri? Materially affects the value proposition.
- **#34 (new).** Has SQUADI's FA ID column reappeared since March 2025?
- **#35 (new).** What are PlayFootball/Football Australia's extract
  formats and their equivalent blind spots?

Question [#32](./open-questions.md) is enriched rather than resolved: the
*size* of the gap is now counted, its *composition* still is not.
