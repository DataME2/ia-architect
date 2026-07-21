---
name: decision-record
description: Use when a choice needs a durable rationale but doesn't rise to a full scope document — architecture-significant calls like an AI actor's autonomy level, a library/pattern choice, or a tradeoff a future reader will ask "why did we do it this way?" about.
---

# Recording a decision

A scope document (`scope-doc` skill) captures an entire initiative's EA
alignment; a decision record captures **one call**, in isolation, in the
place future readers will actually look for it. Reach for this when the
call is smaller than an initiative but too consequential to leave as an
unrecorded judgment buried in a PR thread — the clearest recurring case in
this template is an **AI actor's autonomy level or decision rights**
(`ea-doc-style`'s actor notation): "why is this role co-pilot and not fully
autonomous?" deserves a citable answer, not just a table cell.

## When to use this instead of (or alongside) a scope document

- The call doesn't change any EA layer's content by itself — it's a
  rationale for a value that's already going into a table (an actor's
  autonomy level, a technology choice already in
  `5_technology/1_technology-services.md`), not a new element.
- A future reader (human or AI) picking up the code will reasonably ask
  "why this and not the alternative?" and the answer isn't obvious from
  the EA docs alone.
- It's too small to justify a full scope document's plateaus/work-package
  structure, but too consequential to leave unrecorded.

If the change also adds or changes EA elements, write the scope document
first (`ea-first-change`) — the decision record supplements it, linked
from the EA-alignment table row it explains; it never replaces it.

## Where decisions live

`docs/decisions/<n>_<kebab-case-slug>.md`, numbered chronologically across
all decisions (one flat sequence, not per-layer), indexed in
`docs/decisions/README.md`. Optional — like `docs/scope/open-questions.md`,
projects with only a handful of significant calls can skip the folder
entirely and fold the rationale into the relevant scope document's prose
instead; add the folder the first time a decision doesn't fit that mold.

## Template

```markdown
# Decision <n> — <Short title>

_[← Decisions index](./README.md)_

**Status:** Proposed | Accepted | Superseded by [decision <m>](./<m>_*.md)
**Date:** <YYYY-MM-DD>
**Touches:** <link the EA document/row this decision explains, e.g.
[2_business/1_business-actors-and-roles.md#support-triage-agent](../ea/2_business/1_business-actors-and-roles.md#support-triage-agent)>

## Context

<What prompted the call — the constraint, the risk, the requirement that
made this not-obvious.>

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| …      | …                 |

## Decision

<What was chosen, in one or two sentences.>

## Consequences

<What this makes easier, harder, or newly possible — including, for an
actor's autonomy level, what oversight or audit trail it commits the
project to.>
```

## Rules

- **Link both ways.** The EA row this decision explains links to the
  decision record; the decision record links back to that row (`Touches`).
  One fact — the value — one home (the EA table); the decision record
  holds the *why*, not a restatement of the *what*.
- **A decision record is a historical record once accepted** — like a
  merged scope document, don't rewrite it; a changed call gets a new
  numbered record that supersedes it (update the old one's `Status` line
  to point at the new one).
- **Keep it short.** If Context and Consequences together need more than
  half a page, the call is probably initiative-sized — write a scope
  document instead.
