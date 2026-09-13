# Steering

_[← Repository README](../../README.md) · [CONTRIBUTING](../../CONTRIBUTING.md) · [Enterprise architecture](../ea/README.md)_

**Steering documents are standing rules for how work is done here** — as
opposed to [`docs/ea/`](../ea/README.md), which describes what the system
*is*, and [`docs/scope/`](../scope/README.md), which describes what each
change *did*.

They bind both readers equally. A contributor follows them because they are
the house conventions; **Claude (or any agent) follows them because
[CLAUDE.md](../../CLAUDE.md) points here**, and they say what the agent must
actually *do* — which git commands to run and when, what a comment must
carry, which files get a README — rather than merely what good practice
looks like.

## The documents

| # | Document | Governs |
| - | -------- | ------- |
| 1 | [Git workflow](./1_git-workflow.md) | Branch naming, commit practice, the merge workflow, and the git actions an agent performs during development |
| 2 | [Code commenting and documentation](./2_code-commenting-and-documentation.md) | What a comment is for in this repo, the per-layer commenting contract, and which directories carry a README |

## Precedence

When two sources disagree, the narrower one wins:

1. **A refusal in [CLAUDE.md](../../CLAUDE.md)** — the EA-first rule, the
   RLS gate, the AI autonomy ceiling. Steering never relaxes one of these.
2. **A steering document here.**
3. **A skill in [`.claude/skills/`](../../.claude/skills/README.md)** — which
   describes *how to produce an artifact* (a scope document, a PR body),
   where steering describes *how to work*.
4. **General convention.**

A steering document that would contradict a Principle in
[1_motivation.md](../ea/1_strategy/1_motivation.md) is a bug in the steering
document. Surface it rather than following it.

## Adding one

Steering is small on purpose. A new document earns its place only when a
rule is (a) standing rather than per-initiative, (b) repeatedly got wrong
without it, and (c) not already stated in `CLAUDE.md` or `CONTRIBUTING.md`.
Number it next, add its row above, and link it from
[CLAUDE.md](../../CLAUDE.md) so an agent loads it without being asked.
