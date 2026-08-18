# CLAUDE.md

Let'sDataTalk is a multiclub, multitenant, AI-assisted platform centralizing
player registration, finance, documents, and match-official management for
football clubs in Australia and New Zealand, built around a single `Person`
identity. It is pre-MVP: all five architecture layers are started
(see [`docs/ea/`](./docs/ea/README.md)), and the first code — the
registration slice's domain model, rules engine, and schema — is landing
under `src/` and `supabase/`.

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

- `docs/ea/` — the documentation home (numbered ArchiMate layers; all five
  now started); `docs/scope/` — one document per initiative, plus
  `open-questions.md` (kept: the pilot club and other stakeholders can't
  always be consulted synchronously); `docs/decisions/` — kept: starts with
  the AI assistant's autonomy level; `docs/annexes/` — operational artifacts
  that realise a rule rather than describe one (consent wording, retention
  schedule, commercial terms, submission-pack instructions).
- `src/domain/` — types and the business rules engine, pure and
  I/O-free so every rule is unit-testable without a database;
  `supabase/migrations/` — schema and the RLS policies that enforce P5.

## Commands

```bash
npm install            # one dev dependency set: typescript + @types/node
npm run typecheck      # tsc --noEmit
npm test               # node --test, no build step (Node 22 strips types)
python3 scripts/check_links.py   # every relative Markdown link resolves
python3 scripts/check_rls.py     # every table has RLS + a policy + club_id
npm run check          # all four, in the order CI runs them
bash scripts/test_rls.sh # applies the migrations to a throwaway Postgres and
                       # proves tenant isolation actually holds (needs psql)
npm run check:full     # everything, including the behavioural RLS test
```

The stack is **Next.js + Supabase + Vercel**, Sydney region — chosen for one
property above all: Supabase enforces Principle P5's tenant isolation in the
database via Row-Level Security, so a query missing its filter returns
nothing rather than everything. See
[`docs/ea/5_technology/1_technology-services.md`](./docs/ea/5_technology/1_technology-services.md).

**`check_rls.py` is a build gate, not a lint.** A table without a policy is
a cross-tenant leak of children's data, and it happens through an ordinary
omission in a migration. Never add a table without adding its policy in the
same change.

**And `test_rls.sh` is the one that matters more.** `check_rls.py` proves a
policy *exists*; this applies the real migrations to a real Postgres and
proves the policies *work* — that a registrar at one club cannot read,
write, update or delete another club's rows, that append-only tables really
are, and that a non-member and an anonymous caller see nothing. Both run in
CI. A policy can be present and wrong, and that failure is silent.

**The repository is connected to Supabase**, so a migration merged to `main`
runs against production with no second confirmation. Two rules follow: never
edit a migration that has already been applied — corrections are new
migrations — and never merge a schema change whose RLS test has not run.

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
