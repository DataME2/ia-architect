# Decision 3 — Actor naming: Pilot and Copilot

_[← Decisions index](./README.md)_

**Status:** Accepted
**Date:** 2026-07-20
**Touches:** [2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md)

## Context

The two business actors were originally named **Maintainer** (the human) and
**Docs Agent** (the AI). Those names describe *jobs*, not the *relationship*
this example exists to teach: a person driving the design while an AI
collaborates. "Maintainer" reads as upkeep/operations; "Docs Agent" reads as
a mechanical tool. The whole point of the example is the human-in-the-loop
pattern — a person requesting and reviewing while an AI executes — so the
names should carry that story on sight.

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| Keep **Maintainer / Docs Agent** | Serviceable, but tells the wrong story — "agent" reads as a tool and "maintainer" as caretaking, underselling the driver/collaborator relationship |
| **Architect / Copilot** | Strong design-first framing (on-brand for an architecture-first template); the AI name echoes the co-pilot autonomy *level*, which some readers may conflate |
| **Architect / Builder** | Clean design-vs-build split and no overlap with the autonomy term, but "Builder" leans purely executor rather than collaborator |
| **Pilot / Copilot** (chosen) | A cockpit metaphor: the human is in command and drives; the AI is the copilot collaborating. Memorable, and it reinforces — rather than fights — the site's "you drive" framing and the co-pilot autonomy level |

## Decision

The human actor is **Pilot** — drives the design and holds final review and
merge authority. The AI actor is **Copilot** — collaborates by drafting
complete changes at co-pilot autonomy. This naming was chosen by the person
driving the project — the Pilot — as the driver of the call.

**Old → new mapping** (for the historical records that predate this): Maintainer → **Pilot**; Docs Agent → **Copilot**.

The Copilot's autonomy *level* is also called "co-pilot." That echo is
deliberate and mnemonic, not a coincidence to be confused: the **name** is an
identity, the **level** is a separate, changeable attribute. If the AI's
autonomy ever changed (say, to autonomous-with-checkpoint), the name
"Copilot" would stay while the level changed — that would be a new autonomy
decision superseding [decision 1](./1_docs-agent-autonomy.md), not a rename.

## Consequences

- All current-state documents, the guidance site, and the READMEs use
  **Pilot** and **Copilot**.
- The two already-merged historical records —
  [scope document 1](../scope/1_publish-guidance-site.md) and
  [decision 1](./1_docs-agent-autonomy.md) — keep their original wording as
  immutable records, each carrying a one-line terminology note pointing here.
- Decision 1 keeps its original filename (`1_docs-agent-autonomy.md`) so
  existing links don't break, even though the actor it discusses is now named
  Copilot.
