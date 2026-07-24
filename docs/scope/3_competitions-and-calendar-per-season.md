# Project Scope — Competitions and Calendar per Season

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/multitenant-competitions-calendar-cr62t4`.

This initiative extends the strategy and business architecture with the
competition structure and season calendar every club's matches actually run
in, grounded in a discovery reference document (*Australia Competitions per
State*) cataloguing competitions per Australian state association (Football
Queensland, Football NSW, Northern NSW Football, Capital Football, Football
South Australia, Football West) and New Zealand Football. It closes a real
gap in the existing documents: the Referee appointment process and the
Match Official Appointment object already presuppose a "match," but no EA
document defined what a Match, a Competition, or a season calendar actually
was, or where they come from. No application code is written in this
initiative — the project is still pre-MVP.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | New Capability C11 (Competition & calendar management), realizing G2 and G4; new Resource entry for the competitions-per-state discovery reference; the Value Stream's Unify/Operate rows now name competitions/C11 (see [1_strategy/2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md), [1_strategy/3_value-stream.md](../ea/1_strategy/3_value-stream.md)). No new Goal or Principle — the change serves existing G2 (registration structure) and G4 (referee lifecycle already implied a "competition minimum" and a "match" without defining either) |
| 2_business    | New external "Governing Body / Association" actor; new "Competition & calendar management" business service; new "Season competition setup process"; new business objects (Governing Body/Association, Competition, Season Competition Entry, Match, Competition Calendar); new glossary terms and business rule BR20; the system-context diagram gains the association as an external read-only source (see the five files under [2_business/](../ea/2_business/README.md)) |
| 3_information | No change — not started. No data model exists yet; deferred to the MVP-build initiative, which now has Competition/Match/Calendar named as objects to model |
| 4_application | No change — not started |
| 5_technology  | No change — not started |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | The business layer covers identity, registration, finance, and referee lifecycle, but has no notion of competitions or a match calendar — "match" and "competition" appear only as implicit, undefined references inside BR8 and the Match Official Appointment object |
| **Target** (delivered) | Governing Body / Association, Competition, Season Competition Entry, Match, and Competition Calendar are named business objects/actors, grounded in the AU-state/NZ competition reference document; the Season competition setup process explains how the calendar is populated; BR20 ties referee appointment to an actual scheduled Match |

## Work packages and deliverables

### WP1 — Strategy layer

- **Deliverables:** `docs/ea/1_strategy/2_capabilities-and-resources.md`,
  `docs/ea/1_strategy/3_value-stream.md`, `docs/ea/1_strategy/README.md`
- **Outcome:** Capability C11 and its supporting resource (the
  competitions-per-state discovery reference) are recorded and traceable
  back to the source document; the value stream names competitions in the
  Unify/Operate stages.

### WP2 — Business layer

- **Deliverables:** `docs/ea/2_business/1_business-actors-and-roles.md`,
  `docs/ea/2_business/2_business-services.md`,
  `docs/ea/2_business/3_business-processes.md`,
  `docs/ea/2_business/4_business-objects.md`,
  `docs/ea/2_business/5_domain-context-and-rules.md`,
  `docs/ea/2_business/README.md`
- **Outcome:** the Governing Body / Association actor, the Competition &
  calendar management service, the Season competition setup process, the
  five new business objects, and glossary/rule BR20 all have a home,
  grounded in the *Australia Competitions per State* reference document.

### WP3 — Governance scaffolding

- **Deliverables:** this scope document, `docs/scope/README.md` index row,
  `docs/scope/open-questions.md` row 19
- **Outcome:** the initiative is indexed, and the open question about the
  pilot club's actual association and fixture-feed availability is
  recorded for step 0 of the next `ea-first-change` walk.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Strategy-layer capability, resource, and value-stream updates for competitions & calendar | Information layer (Competition/Match/Calendar data model, classification, retention) |
| Business-layer actor, service, process, objects, glossary, and business rule (BR20) for competitions & calendar | Application layer (services, components, interface contracts) |
| Grounding the competition taxonomy (type, format: Knock Out / Round Robin / Double Round Robin / Enhanced Round Robin) in the *Australia Competitions per State* reference | Technology layer (stack selection, deployment) |
| Recording which state associations and New Zealand Football the reference document actually covers | Live integration with any specific association's fixture system — deferred, same read-only/CSV-first pattern as SQUADI/PlayFootball (Principle P2) |
| New open question (#19) on the pilot club's actual governing association and fixture-feed availability | Confirming which exact association(s) govern the pilot club's competitions — open question, not resolved here |

## Gap notes

- **Information/Application/Technology layers.** Same gap noted in
  initiative #1's scope document, now slightly larger: the future data
  model needs to represent Competition, Season Competition Entry, Match,
  and Competition Calendar alongside the objects already named. Closing it
  is still the MVP-build initiative's job.
- **Association fixture-feed integration.** No association is confirmed to
  publish a public API (the reference document lists platforms like Squadi
  for grassroots leagues, but nothing suggesting programmatic access at
  state-association level). The MVP will need manual or CSV-based calendar
  entry until [open question #19](./open-questions.md) is answered.

## Open questions

- Which Governing Body / Association does the pilot club's competitions
  actually run under, and is any machine-readable fixture feed available,
  or is manual/CSV entry the only option for the season calendar? Mirrors
  [open question #7](./open-questions.md)'s SQUADI/PlayFootball situation.
  Added to [docs/scope/open-questions.md](./open-questions.md) as #19.
