# Project Scope — Carnival and Grassroots Event Visibility

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

Regional carnivals and grassroots events — MiniRoos Invitational Carnivals,
Girls United Carnivals, WinterFest, the Pacific Championships, and
talent-ID tournaments — were not represented anywhere in the EA. This
initiative adds carnival/event management as a business capability and,
specifically, an account-free public view of a published event's schedule
(date, time, venue), next fixture, ladder/standings, and results, for
coaches, parents, and the general public. Because carnivals span multiple
clubs by design, this required a scoped, explicit exception to Principle
P5's strict tenant isolation rather than a silent workaround — recorded as
Principle P6 and decision 3. Each carnival also has its own configurable
conditions (points system, format, eligibility) that only its designated
responsible person — the Events Coordinator role, commonly held by a
club's existing Registrar or Secretary rather than a dedicated hire — may
set (BR29). No application code is written; this is architecture only.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | New: stakeholder (general public / event hosts), Goal G7 (carnival & grassroots event visibility), Capability C12, Principle P6 (scoped public exception to P5) — see [1_motivation.md](../ea/1_strategy/1_motivation.md), [2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md) |
| 2_business    | New: **Events Coordinator** (a.k.a. Carnival Admin — commonly delegated to Registrar/Secretary) and **General Public / Spectator** actors, Carnival & event management business service, Carnival event lifecycle process, Carnival/Grassroots Event / Carnival Conditions / Carnival Fixture / Carnival Result / Carnival Ladder / Public Event View business objects, BR26–BR29, and five glossary terms — see [2_business/](../ea/2_business/README.md) |
| 3_information | No change — not started; the Public Event View's actual access-control mechanism is designed when this layer is assessed |
| 4_application | No change — not started |
| 5_technology  | No change — not started |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | Carnivals and grassroots events absent from the EA entirely; every modeled business service assumed strict, exception-free tenant isolation (P5) |
| **Target** (delivered) | Carnival/grassroots events are a modeled capability (C12) with actors, a service, a process, objects, and rules; P5 gains one named, scoped, auditable exception (P6) rather than an unmodeled gap |

## Work packages and deliverables

### WP1 — Strategy layer

- **Deliverables:** `docs/ea/1_strategy/1_motivation.md` (new stakeholder
  row, Goal G7, Principle P6), `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (Capability C12, resource note, deferred-to-post-MVP course of action),
  `docs/ea/1_strategy/3_value-stream.md` (deferred-capability note)
- **Outcome:** the platform's target strategy explicitly accounts for
  carnivals and states, in one place, exactly how far the P5 tenant-
  isolation guarantee extends and where it doesn't.

### WP2 — Business layer

- **Deliverables:** `docs/ea/2_business/1_business-actors-and-roles.md`
  (Events Coordinator promoted from the "not yet modeled" list, noted as
  commonly delegated to Registrar/Secretary; new General Public / Spectator
  actor), `docs/ea/2_business/2_business-services.md` (Carnival & event
  management service), `docs/ea/2_business/3_business-processes.md`
  (Carnival event lifecycle process, including conditions configuration
  and ladder computation), `docs/ea/2_business/4_business-objects.md`
  (Carnivals & grassroots events section: event, conditions, fixture,
  result, ladder, public view), `docs/ea/2_business/5_domain-context-and-rules.md`
  (system context diagram, glossary, BR26–BR29)
- **Outcome:** every actor, service, process, object, and rule a future
  MVP-build initiative needs to implement carnival/event management —
  including the public-access boundary and who may configure an event's
  conditions — has a home in the business layer.

### WP3 — Governance scaffolding

- **Deliverables:** `docs/decisions/3_public-event-data-crosses-tenant-isolation.md`,
  `docs/decisions/README.md` index row, this scope document, `docs/scope/README.md`
  index row, `docs/scope/open-questions.md` (two new rows)
- **Outcome:** the P5 exception has a citable rationale (decision 3), and
  the two adopted interpretations made without stakeholder confirmation
  (public data scope; MVP inclusion) are tracked for follow-up rather than
  silently assumed.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Carnival/grassroots event capability, actors, service, process, objects, rules | Information/application/technology design of the Public Event View's actual access control (deferred to the information layer) |
| The P5 → P6 scoped tenant-isolation exception, with its own decision record | Building carnival/event management for the Q4 2026 MVP (adopted interpretation: deferred past MVP, [open question #24](./open-questions.md)) |
| Default public-data scope (club/team-level only, no minor names) with an opt-in escape hatch for adult/open-age events | A confirmed, sourced catalog of every carnival/grassroots event type and its exact format rules ([open question #22](./open-questions.md)) |
| Public schedule/draw with date, time, and venue; each team's next fixture; ladder/standings for round-robin events | The actual points-system/tie-breaker computation logic implementation (business rule only here — an information/application-layer concern once designed) |
| Carnival Conditions as configuration owned by one responsible person (BR29), commonly the Registrar or Secretary acting as Events Coordinator | — |
| Reuse of existing referee eligibility/conflict rules (BR6–BR11) for carnival fixtures (BR28) | Any code — no `src/`, no tests, no build |

## Gap notes

- **Public Event View access control.** Closing this gap is the
  information-layer initiative's job: it needs to decide the actual
  mechanism (a public read-only view/materialized projection, a signed
  public URL per event, etc.) that enforces "club/team-level only, no
  login required, crosses tenant boundaries only for this one object."
  Principle P6 and BR26/BR27 give it a precise target to implement against.
- **Confirmed event catalog and format rules.** The MiniRoos Invitational
  Carnival (single-day, round-robin) and Girls United Carnival (modified
  format, regional, October–November) details came directly from this
  initiative's requester; WinterFest, the Pacific Championships, and
  talent-ID tournaments are named but not yet detailed to the same level.
  A dedicated reference document (matching the *Australia Competitions per
  State* or state voucher-program resources) would close this gap.
- **Ladder/points-system computation.** BR26/BR29 and the Carnival Ladder /
  Standings and Carnival Conditions objects establish *that* a ladder is
  computed from Carnival Conditions and *who* configures those conditions,
  but not the actual computation logic (default points-per-win/draw/loss,
  goal-difference tie-breakers, etc.) — that belongs to the information/
  application layers once assessed, most likely as configurable defaults
  per Carnival Conditions rather than a single hardcoded formula.

## Open questions

- **Event catalog and format rules.** See
  [open question #22](./open-questions.md).
- **Public data scope default.** Adopted interpretation: club/team-level
  information only in the Public Event View; individual (especially
  minors') names are never published by default, with an explicit
  per-event opt-in for adult/open-age events (BR26). Not confirmed by the
  pilot club or Football Queensland — see
  [open question #23](./open-questions.md).
- **MVP inclusion.** Adopted interpretation: carnival/event management is
  architected now but deferred past the Q4 2026 MVP, alongside the other
  already-deferred integrations. Not confirmed — see
  [open question #24](./open-questions.md).
