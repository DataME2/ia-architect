# Business Actors and Roles

_[← Business layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Business Actor, Business Role.

Notation: `ea-doc-style`'s human/AI/hybrid actor convention — every actor
states its kind, and AI/hybrid actors carry autonomy level, decision
rights, and escalation path.

## Actors

| Actor | Kind | Role | Autonomy level | Decision rights | Escalation path |
| ----- | ---- | ---- | --------------- | ---------------- | ----------------- |
| Pilot | Human | Guidance author (reviewer) | — (human) | Approves/merges any change to `site/`, `docs/`, or repo settings; sole authority over GitHub Pages configuration | — |
| Copilot | AI | Guidance author (drafter) | **Co-pilot** — drafts complete changes; nothing it writes reaches the published site without a human merging it | May edit `site/*.html`, `docs/ea/**`, `docs/scope/**` within this `example/` folder and open a PR. May **not** merge PRs, change GitHub Pages/repo settings, or edit content outside `example/` | Opens a PR to **Pilot**; if a proposed change would contradict a Principle in [`1_strategy/1_motivation.md`](../1_strategy/1_motivation.md), stops and surfaces the conflict to **Pilot** instead of proceeding (mirrors `ea-first-change` step 1) |
| Template adopter | Human, external | Consumer of the guidance service | — (human) | None — read-only visitor to the published site | — |

See [`../../decisions/1_docs-agent-autonomy.md`](../../decisions/1_docs-agent-autonomy.md)
for why Copilot's autonomy is set at co-pilot rather than fully
autonomous or advisory-only, and
[`../../decisions/3_actor-naming.md`](../../decisions/3_actor-naming.md)
for why these two actors are named **Pilot** and **Copilot** — the human
who drives the design and the AI that collaborates.

## Role

**Guidance author** — drafts, reviews, and publishes updates to the
guidance site. Both Pilot and Copilot are assigned to it; the
autonomy/decision-rights columns above are what actually distinguishes
their authority within the same role, not a separate role each.

## Mapping to the process roles

The template's change process defines three roles —
**Requester**, **Agent**, and **Reviewer** (see
[CONTRIBUTING.md](../../../../CONTRIBUTING.md)). This project's actors fill
them like this:

| Process role | Filled by | In this project |
| ------------ | --------- | ---------------- |
| Requester | **Pilot** | Decides a guidance change is needed and states it |
| Agent | **Copilot** (or the Pilot, working without the AI) | Walks the layers, drafts the change, opens the PR |
| Reviewer | **Pilot** | Reviews and merges — the only step that publishes |

The same person (the Pilot) is both Requester and Reviewer here; the Agent
is the one role an AI fills. That is the whole point of the example — an AI
holding a real role in the loop, at a defined autonomy level.
