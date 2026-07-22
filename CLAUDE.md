# CLAUDE.md

Let'sDataTalk is a multiclub, multitenant, AI-assisted platform centralizing
player registration, finance, documents, and match-official management for
football clubs in Australia and New Zealand, built around a single `Person`
identity. It is pre-MVP: strategy and business architecture are drafted
(see [`docs/ea/`](./docs/ea/README.md)); no application code exists yet.

## The rule that governs everything else

**Strategy and business architecture are validated before any other
layer.** A change in requirements is never coded directly: align it through
the numbered EA layers (`docs/ea/1_strategy` → … → `5_technology`), record
it in a scope document (`docs/scope/`), then implement. Use the
`ea-first-change` skill for the process, `scope-doc` for the scope
document, `ea-doc-style` when touching anything under `docs/`, and
`pr-description` when opening or updating a PR (the body must cover the
whole branch, not just the latest commit). Pure bug fixes that change no
documented behavior can skip the alignment, but still keep the docs true.

## Layout

- `docs/ea/` — the documentation home (numbered ArchiMate layers, only
  `1_strategy` and `2_business` populated so far); `docs/scope/` — one
  document per initiative, plus `open-questions.md` (kept: the pilot club
  and other stakeholders can't always be consulted synchronously);
  `docs/decisions/` — kept: starts with the AI assistant's autonomy level.

## Commands

No source code exists yet. This section, and `CONTRIBUTING.md`'s
Development workflow, get filled in once a technology stack is chosen for
the MVP-build initiative — see the `stack-selection` skill.

## Conventions

- Documentation language: **English**. The originating discovery document
  was written in Spanish; EA docs, scope docs, commit messages, and future
  code identifiers use the English terms established in
  [`docs/ea/2_business/5_domain-context-and-rules.md`](./docs/ea/2_business/5_domain-context-and-rules.md)'s
  glossary.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, …).
- The domain is centered on `Person`: a player, referee, coach, guardian,
  and committee member are roles a `Person` can hold — never separate,
  duplicated identities. See Principle P1 in
  [`docs/ea/1_strategy/1_motivation.md`](./docs/ea/1_strategy/1_motivation.md).
- The AI assistant only ever drafts, summarizes, or flags for a human — it
  never approves documents, rejects players, changes debts, approves
  payments, or promotes referees. See
  [`docs/decisions/1_ai-assistant-autonomy-level.md`](./docs/decisions/1_ai-assistant-autonomy-level.md).
