# Project Scope Documents

_[← Repository README](../../README.md) · [Enterprise architecture](../ea/README.md)_

One document per delivered (or in-flight) initiative, numbered
chronologically. While the [EA docs](../ea/README.md) describe the
**current** state of the system, each scope document describes one
**change**: what plateau it started from, what it delivered, and what it
deliberately left out.

**ArchiMate viewpoint:** Implementation & Migration (Work Package,
Deliverable, Plateau, Gap).

## The EA-first change process

Every change in requirements follows the same order — the same order the EA
folders are numbered in:

1. **Align the EA first.** Walk the layers top-down and record what the
   change means for each: [1_strategy](../ea/1_strategy/README.md) (does it
   serve an existing goal, or introduce a new driver?) →
   [2_business](../ea/2_business/README.md) (new/changed services,
   processes, rules?) → [3_information](../ea/3_information/README.md)
   (new/changed data objects, flows, storage?) →
   [4_application](../ea/4_application/README.md) (which services,
   components, ports change?) → [5_technology](../ea/5_technology/README.md)
   (any runtime, build, or hosting impact?). Update the affected EA
   documents in the same change.
2. **Document the scope.** Add the next-numbered file to this folder
   describing plateaus, work packages, in/out of scope, and gaps — before
   implementation starts, refined as it proceeds.
3. **Implement.** Only then write the code, keeping the scope document and
   EA docs in sync with what is actually delivered.

Agent guidance for this process lives in `.claude/skills/ea-first-change/`
and `.claude/skills/scope-doc/`; PR descriptions follow
`.github/pull_request_template.md` (see `.claude/skills/pr-description/`)
and must cover the whole branch.

If the project needs a single running index of adopted interpretations that
still need sign-off from a stakeholder who can't be consulted synchronously,
keep it in [open-questions.md](./open-questions.md) — optional, see the
`scope-doc` skill.

If a work package is too large or long-running to implement in one sitting,
shard it into self-contained story files instead of leaving it as one
inline task list — see the `story-sharding` skill.

For a single consequential call smaller than a full initiative — most
often why an AI actor's autonomy level or decision rights were set the way
they were — see [docs/decisions/](../decisions/README.md) (optional) and
the `decision-record` skill.

## Initiatives

<!-- TEMPLATE — add one row per initiative as it's delivered. -->

| #   | Scope document | Delivered as | Summary |
| --- | --------------- | ------------ | ------- |
|     |                 |              |         |
