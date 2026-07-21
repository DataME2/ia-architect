---
name: story-sharding
description: Use when a scope document's work package is too large or long-running to implement in one sitting — shard it into small, self-contained story files so each can be picked up (by an agent or a person) without re-deriving the whole plan from the EA docs and scope document each time.
---

# Sharding a work package into stories

This practice is adapted from [BMAD-METHOD](https://github.com/bmadcode/BMAD-METHOD)'s
"context-engineered development": the failure mode it targets is an agent
(or a person returning after a break) having to re-read the entire EA tree
and scope document just to figure out what one slice of work actually
requires. A story fixes that by being **self-contained** — actionable from
its own text plus the specific links it cites, nothing else.

## When to shard

Not every work package needs this — a work package small enough to finish
in one sitting doesn't need splitting. Shard when a work package (from
`scope-doc`'s template) has any of:

- Multiple genuinely independent deliverables that could be built, reviewed,
  or merged separately.
- An expected span of more than one session or PR.
- Different people/agents picking up different pieces.

## Where stories live

Alongside the initiative's scope document: `docs/scope/<n>_<name>-stories/`,
one file per story, numbered in build order:
`docs/scope/<n>_<name>-stories/1_<slug>.md`. The scope document's work
package keeps its **Deliverables**/**Outcome** summary and links to the
story files instead of expanding into full task lists inline.

## Story template

```markdown
# Story <n>.<m> — <Name>

_[← Scope document](../<n>_<name>.md)_

**Goal:** <one sentence — what this story delivers.>

## Context

<Only links, not restated content — the specific EA doc sections and
glossary terms this story needs, e.g.:>

- [Business rule RN-xx](../../ea/2_business/5_domain-context-and-rules.md#...)
- [Component X](../../ea/4_application/2_application-components.md#...)

## Acceptance criteria

- [ ] <Concrete, checkable outcome>
- [ ] <Concrete, checkable outcome>

## Definition of done

- <Verification commands specific to this story>
- <EA/scope doc updates this story is expected to make, if any>

## Out of scope

- <Explicitly deferred to a later story — link it if it already exists>
```

## Rules

- **A story must be actionable from its own text plus its links alone.** If
  implementing it requires opening documents the story doesn't cite,
  the story is missing context — add the link, don't assume prior chat
  history will carry it.
- **Links, not restated rationale.** A story points at the EA document that
  owns a rule or a component; it does not re-explain the rule. Rationale
  still lives in exactly one place (`ea-doc-style`'s rule).
- **Treat each story as a clean handoff.** When you pick up a story — in a
  new session, a fresh agent context, or after a long gap — read only the
  story and what it links to before starting; you shouldn't need the whole
  conversation history that produced the scope document.
- **The scope document stays the source of truth for scope.** Stories
  inherit its EA-alignment table and in/out-of-scope decisions; they don't
  renegotiate them. If a story reveals the scope document was wrong, fix
  the scope document in the same change, not just the story.
- Small initiatives don't need this file at all — an inline work-package
  list in the scope document is the default; only reach for sharding when
  the "When to shard" conditions above actually apply.
