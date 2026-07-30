# Project Scope — Staged Registration Ladder and the Governing-Body Tier

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

Two strategy-layer decisions, one resolving a blocking question and one
opening a commercial direction.

**First:** [open question #28](./open-questions.md) — the pilot club's
success metric (SQUADI/Football Australia registration synchronisation)
depended on an integration deferred past the MVP with no API — is resolved
by **sequencing rather than trade-off**. Registration proves itself in
three stages: stage 1 demonstrates registration speed from the club's own
perspective with no external integration at all and is demonstrable
pre-MVP; stage 2 adds SQUADI; stage 3 adds Football Australia including
the ITC path. Only stage 1 is unconditional. This keeps the club's stated
success outcome intact as the destination while making the project's
provable value independent of an API negotiation it does not control.

**Second:** serving a **governing body** (Football Queensland the named
example) as a customer rather than only as a read-only data source is
recorded as a Course of Action *under consideration* — with its Principle
P5 collision stated up front. It is deliberately **not** modeled as
architecture, because it is conditional on access the project does not
have, and because an association tenant that sees across its member clubs
is exactly what tenant isolation forbids today. No application code is
written.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | **Goal G6's success outcome** restated as staged, with only stage 1 unconditional; the "defer direct external integrations" Course of Action's unresolved-tension callout **replaced** by the staged registration ladder that resolves it; new Course of Action recording the governing-body tier as under consideration, with its P5 collision named; new prospective-customer **Stakeholder** row for governing bodies; **C11 extended** to cover Competition Regulations and Playing Formats (see [1_motivation.md](../ea/1_strategy/1_motivation.md), [2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md)) |
| 2_business    | New **Playing Format** and **Competition Regulation** business objects and glossary terms; the Governing Body / Association actor gains an explicit note that an association-as-tenant mode exists as a prospect but is *not modeled*; the Season competition setup process now names regulations and playing formats among what an association publishes. **No new rule, service, or process** — staging is a delivery sequence, not new business behaviour, and the governing-body tier is deliberately unmodeled |
| 3_information | No change — not started. Playing Format and Competition Regulation join the modelling queue |
| 4_application | No change — not started |
| 5_technology  | No change — not started. Note: an association tier would be the first requirement to materially constrain the tenancy model, and therefore the stack choice — a reason to answer [#31](./open-questions.md) before that layer is assessed |

No decision record accompanies this initiative: the staged ladder *is*
this scope document's subject rather than a separate call orthogonal to
it, and the governing-body tier is not yet a decision — it is an option
with a named precondition.

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | The MVP's central scope conflict was explicit but unresolved: the architecture could be delivered exactly as written and still fail the pilot club's acceptance test. Governing bodies were modeled only as external read-only sources, with no record that they might become customers |
| **Target** (delivered) | Registration has a three-stage proving sequence whose first stage depends on nothing external. The governing-body tier is recorded as a commercial option with its architectural precondition (an association tenancy tier, and a P5 exception) named rather than discovered later |

## Work packages and deliverables

### WP1 — Resolve the MVP scope conflict

- **Deliverables:** `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (staged registration ladder table replacing the unresolved-tension
  callout), `docs/ea/1_strategy/1_motivation.md` (G6's success outcome
  restated as staged), `docs/scope/open-questions.md` (#28 → Resolved)
- **Outcome:** the project can demonstrate its core value to the pilot
  club without waiting on, or being blocked by, SQUADI API access — while
  the club's own definition of success remains the stated destination.

### WP2 — Record the governing-body tier as an option

- **Deliverables:** `docs/ea/1_strategy/1_motivation.md` (prospective
  stakeholder row), `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (Course of Action under consideration),
  `docs/ea/2_business/1_business-actors-and-roles.md` (explicit
  not-modeled note on the Governing Body actor),
  `docs/scope/open-questions.md` (#31)
- **Outcome:** the commercial ambition is captured where strategy lives,
  and the one thing that would make it expensive to retrofit — hierarchical
  tenancy — is flagged before the technology layer is chosen.

### WP3 — Competition Regulations and Playing Formats

- **Deliverables:** `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (C11 extended), `docs/ea/2_business/4_business-objects.md` (Playing
  Format, Competition Regulation), `docs/ea/2_business/5_domain-context-and-rules.md`
  (glossary), `docs/ea/2_business/3_business-processes.md` (season
  competition setup names them)
- **Outcome:** the reference data an association would own centrally is
  named as business objects now, so the governing-body conversation has
  something concrete behind it and clubs stop implicitly re-keying it.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The three-stage registration ladder as strategy, resolving [#28](./open-questions.md) | Building any stage — no code; stage 1's actual demo is a future initiative |
| Recording the governing-body tier as a Course of Action under consideration | **Modeling** an association tenant, hierarchical tenancy, or a P5 exception for it ([#31](./open-questions.md)) |
| Playing Format and Competition Regulation as business objects and glossary terms | Populating either with Football Queensland's actual regulations and formats |
| Naming the P5 collision before it becomes expensive | Any commercial approach, contact, or timeline for reaching a governing body |
| — | Any code — no `src/`, no tests, no build |

## Gap notes

- **Stage 1 needs a defined "quick" to be provable.** The ladder commits
  to demonstrating registration speed from the club's perspective, but no
  baseline (how long the club's current process takes) and no target are
  recorded. Without both, "how quick" is unfalsifiable — and the baseline
  is measurable *now*, from the pilot club's three years of historical
  data, before any build starts. This is the most useful thing the next
  initiative could establish.
- **Hierarchical tenancy is cheap to design and expensive to retrofit.**
  [#31](./open-questions.md) is not urgent commercially — no association
  is engaged — but it is urgent architecturally: whether tenants can nest
  is a data-model and access-control decision that the information and
  technology layers will otherwise settle by accident. Answering it does
  not require an association to say yes; it only requires deciding whether
  to leave room.
- **Playing Format and Competition Regulation are named but empty.** They
  exist as objects with no instances and no confirmed source document —
  the *Australia Competitions per State* reference covers competitions and
  formats, not regulations. Football Queensland's published regulations
  would be the natural grounding, and gathering them is also exactly the
  material a governing-body conversation would need.
- **Stages 2 and 3 remain unscheduled by design.** They are conditional on
  access, so no date attaches to them. If the pilot club later reads the
  success outcome as "by Q4 2026", that expectation should be corrected
  against this document rather than absorbed silently.

## Open questions

- **#31 (new).** If a governing body becomes a customer, how is an
  association tier that sees across member clubs reconciled with Principle
  P5? Recorded with the nested-tenancy and scoped-exception options named.

Resolved by this initiative: **#28** — see the Resolved table in
[open-questions.md](./open-questions.md).
