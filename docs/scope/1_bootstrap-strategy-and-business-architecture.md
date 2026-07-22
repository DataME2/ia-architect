# Project Scope — Bootstrap Strategy and Business Architecture

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

This initiative converts the project's discovery document (*Let'sDataTalk
— Documento maestro de contexto del proyecto*, v0.1) into the strategy and
business architecture layers of `docs/ea/`, following this template's
EA-first process for the first time on a real project. It establishes the
baseline that every later change — starting with the MVP-build initiative —
is aligned against. No application code is written in this initiative.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | New: stakeholders, drivers, goals G1–G6, Principles P1–P5, capabilities C1–C10, resources, and the six-stage value stream — all drafted from the discovery document (see [1_strategy/](../ea/1_strategy/README.md)) |
| 2_business    | New: business actors and roles (including the AI Assistant), business services, business processes, business objects, and the glossary/business-rules document (see [2_business/](../ea/2_business/README.md)) |
| 3_information | No change — not started. No data model exists yet; deferred to the MVP-build initiative |
| 4_application | No change — not started. No application services/components exist yet; deferred to the MVP-build initiative |
| 5_technology  | No change — not started. No stack has been chosen; deferred to the MVP-build initiative (use the `stack-selection` skill when it starts) |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | An unfilled `archreator` template: placeholder `README.md`/`CLAUDE.md`, empty `docs/ea/` and `docs/scope/`, no project-specific content |
| **Target** (delivered) | `README.md`, `CLAUDE.md`, `docs/ea/1_strategy/`, and `docs/ea/2_business/` describe Let'sDataTalk's target strategy and business architecture; `docs/scope/`, `docs/scope/open-questions.md`, and `docs/decisions/` are seeded; no code exists yet |

## Work packages and deliverables

### WP1 — Project identity

- **Deliverables:** `README.md`, `CLAUDE.md`
- **Outcome:** the repository states what Let'sDataTalk is, its current
  state, its documentation language (English), and its core domain
  convention (`Person`-centric identity) instead of template placeholders.

### WP2 — Strategy layer

- **Deliverables:** `docs/ea/1_strategy/1_motivation.md`,
  `docs/ea/1_strategy/2_capabilities-and-resources.md`,
  `docs/ea/1_strategy/3_value-stream.md`
- **Outcome:** stakeholders, drivers, goals, Principles, capabilities,
  resources, and the value stream are recorded and traceable back to the
  discovery document.

### WP3 — Business layer

- **Deliverables:** `docs/ea/2_business/1_business-actors-and-roles.md`,
  `docs/ea/2_business/2_business-services.md`,
  `docs/ea/2_business/3_business-processes.md`,
  `docs/ea/2_business/4_business-objects.md`,
  `docs/ea/2_business/5_domain-context-and-rules.md`
- **Outcome:** every actor (including the AI Assistant, at **advisory**
  autonomy), business service, process, object, and deterministic business
  rule from the discovery document has a home in the EA, in English, with
  a stated realization status (all "Pending" — see WP4's gap note).

### WP4 — Governance scaffolding

- **Deliverables:** `docs/ea/README.md` (Status column + real layered
  overview diagram), this scope document, `docs/scope/README.md` index
  row, `docs/scope/open-questions.md` (populated), `docs/decisions/1_ai-assistant-autonomy-level.md`, `docs/decisions/README.md` index row
- **Outcome:** the process scaffolding this template expects (initiative
  index, open questions, decision log) is seeded with real content instead
  of left as an empty template, ready for the next initiative to extend.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Strategy layer (stakeholders, goals, Principles, capabilities, value stream) | Information layer (data model, classification, retention) |
| Business layer (actors, services, processes, objects, glossary, rules) | Application layer (services, components, interface contracts) |
| AI Assistant actor definition and autonomy decision | Technology layer (stack selection, deployment) |
| Open-questions log seeded from the discovery document's unresolved items | Any code — no `src/`, no tests, no build |
| Translation of canonical terms from the Spanish source into the project's English glossary | Direct integrations (SQUADI, PlayFootball, Football Queensland, WhatsApp, Xero, Square, Strava) — deferred per [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md) |

## Gap notes

- **Information/Application/Technology layers.** Closing this gap is the
  next initiative (MVP build): it needs the data model, application
  services/components, and a chosen stack (`stack-selection` skill). It's
  straightforward now that the business layer names every object and
  service the data/application layers need to realize.
- **Fee schedules and payment rules.** Several business rules
  (`5_domain-context-and-rules.md`) reference configuration (referee fee
  schedules, decline-rate thresholds, confirmation/verification windows)
  whose actual values are not yet known — tracked as open questions rather
  than invented defaults.

## Open questions

The discovery document's own "Preguntas abiertas" section listed 18
unresolved items from the pilot club and other stakeholders. All are
carried into [docs/scope/open-questions.md](./open-questions.md) rather
than resolved here, since none can be answered from architecture alone —
see that file for the full list and status.
