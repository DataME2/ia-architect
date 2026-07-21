# Project Scope — Standardize Structure and Vocabulary

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** `example/` on branch `claude/repo-ux-example-app-dhy09b`.

A structure-and-standardization pass. The redesign and walkthrough
initiatives (scope documents [2](./2_redesign-guidance-site.md) and
[3](./3_deepen-guidance-coverage.md)) introduced an ad-hoc
"driver / executor / gate" wording for the change loop, competing with the
canonical **Requester / Agent / Reviewer** roles defined in
[CONTRIBUTING.md](../../../CONTRIBUTING.md); and adding the walkthrough left
the application layer's "Layer view" diagram out of sync with its component
inventory. This initiative removes those inconsistencies: one vocabulary for
the loop everywhere, an explicit map from this project's actors to the
canonical roles, and the drifted diagram brought back in line with the code.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | **No change.** Goals, Principles, and the value stream are untouched — this is wording and consistency, not intent |
| 2_business    | Same actors (Pilot, Copilot, Template adopter) and roles; **added** an explicit mapping of the actors to the canonical Requester/Agent/Reviewer process roles — see [2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md) |
| 3_information | **No change.** Same derived *Guidance page* data object |
| 4_application | **No components added or removed.** Corrected the "Layer view" diagram in [4_application/README.md](../ea/4_application/README.md) (it was missing the Walkthrough page) and the "three → four components" count, so the layer README matches [2_application-components.md](../ea/4_application/2_application-components.md) and the code. Page copy restandardised to Requester/Agent/Reviewer |
| 5_technology  | **No change.** Same hosting and deploy |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | The change loop was named three different ways (Requester/Agent/Reviewer in CONTRIBUTING, driver/executor/gate on the site, Pilot/Copilot for the actors); the application "Layer view" diagram had drifted from the component inventory |
| **Target** (delivered) | One canonical loop vocabulary — Requester/Agent/Reviewer — across the site and docs, with Pilot/Copilot mapped to those roles; the layer view matches the four components |

## Work packages and deliverables

### WP1 — One loop vocabulary

- **Deliverables:** the four `example/site/*.html` pages and
  [`styles.css`](../../site/styles.css) (hero, `loop`, timeline, and the
  `data-who` / `.who.*` hooks renamed to `requester`/`agent`/`reviewer` /
  `you`/`ai`); the loop wording in the example scope documents; the template
  [`README.md`](../../../README.md) loop table
- **Outcome:** the change loop reads as Requester → Agent → Reviewer
  everywhere; the ad-hoc driver/executor/gate trio is gone

### WP2 — Actor-to-role mapping

- **Deliverables:** a "Mapping to the process roles" section in
  [2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md)
- **Outcome:** it is explicit that the Pilot fills Requester and Reviewer and
  the Copilot fills Agent — tying this project's concrete actors to the
  template's canonical roles

### WP3 — Consistency fixes

- **Deliverables:** the corrected "Layer view" diagram and component count in
  [4_application/README.md](../ea/4_application/README.md)
- **Outcome:** the layer README no longer disagrees with the component
  document or the code

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Example-side vocabulary, the actor↔role map, and the drift fix | Template-repo housekeeping done in the same PR (PR-template layout explainer; making `docs/ea/README.md` the single source for the palette) — those touch the template's own files, which have no filled EA of their own |
| Aligning to the existing Requester/Agent/Reviewer roles | Inventing new role names — the canonical set already existed in CONTRIBUTING |

## Gap notes

- **Frozen history keeps the old actor names:** the already-merged scope
  document 1 and decision 1 still say "Maintainer"/"Docs Agent" by design
  (immutable records, see
  [decision 3](../decisions/3_actor-naming.md)); this pass does not retro-edit
  them, only the current-state docs and the site.

## Open questions

- None. This is a naming/consistency pass; it changes no documented behavior
  and introduces no interpretation a stakeholder needs to confirm.
