# Let'sDataTalk

_[← CONTRIBUTING](./CONTRIBUTING.md) · [Enterprise architecture](./docs/ea/README.md) · [Scope documents](./docs/scope/README.md)_

**Let'sDataTalk** is a multiclub, multitenant, AI-assisted platform that
centralizes the operational, registration, financial, and documentary
administration of football clubs and academies in Australia and New
Zealand — player registrations, guardians, documents, fees and payment
plans, and the full match-official lifecycle (classification, availability,
appointments, conflict checks, and payment), all built around a single
`Person` identity that can hold several roles at once (player, referee,
coach, guardian, committee member) instead of separate, duplicated
identities per concern.

**Status:** pre-MVP, and further along than that phrase suggests. All five
[architecture layers](./docs/ea/README.md) are written, and the
**registration slice works end to end** — identity, capture, deterministic
validation, submission packs, teams, safeguarding, governance, and the money
that gates eligibility — under tenant isolation the database enforces. The
**referee slice** (profile, classification, availability, appointments and
conflict checks, fee schedules, claims and payment batches) landed in
September 2026.

Three things are worth saying plainly about the rest. **Nothing sends
anything** — no email, no SMS, no reminder, no unsubscribe. **Nothing takes
money** — Square is chosen and unintegrated; a treasurer records what
arrived. And there is **no production environment yet**: everything points
at a development Supabase project that nonetheless holds the only copy of
the data there is.

What exists, what is partial, and what has no code at all is tracked per
capability in
[docs/ea/4_application/1_application-services.md](./docs/ea/4_application/1_application-services.md),
and as a verified requirement list in
[docs/spec/requirements.md](./docs/spec/requirements.md).

A pilot club has committed at least three years of historical data to
validate the platform against. **Target for the first live version: before
the end of Q4 2026.**

## Working method: EA first

This project practices **architecture-first development**: strategy and
business architecture are validated before information, application, and
technology — and all of it before code. See [CLAUDE.md](./CLAUDE.md) for
the one-paragraph rule and [CONTRIBUTING.md](./CONTRIBUTING.md) for the
full process, actors, and definition of done.

## Layout

- [`docs/ea/`](./docs/ea/README.md) — the project's current-state
  architecture, as five numbered ArchiMate layers (`1_strategy` →
  `5_technology`).
- [`docs/scope/`](./docs/scope/README.md) — one document per initiative,
  plus the running [open-questions log](./docs/scope/open-questions.md) for
  interpretations still awaiting confirmation from the pilot club or other
  stakeholders.
- [`docs/annexes/`](./docs/annexes/README.md) — operational artifacts that
  realise an architecture element rather than describe one (currently the
  [consent wording](./docs/annexes/consent-wording.md) for BR48/BR55–BR57).
- [`docs/decisions/`](./docs/decisions/README.md) — smaller, consequential
  calls that don't rise to a full initiative — starting with the AI
  assistant's autonomy level.
- [`docs/steering/`](./docs/steering/README.md) — standing rules for how
  work is done here: the [git workflow](./docs/steering/1_git-workflow.md)
  and
  [code commenting and documentation](./docs/steering/2_code-commenting-and-documentation.md).
- [`docs/spec/`](./docs/spec/README.md) — a derived planning view of the
  other two: verified [requirements](./docs/spec/requirements.md), the
  [design](./docs/spec/design.md) decisions the code follows from, and the
  prioritised [task](./docs/spec/tasks.md) queue.
- `src/` — [`domain/`](./docs/ea/4_application/2_application-components.md)
  (types and the business rules engine, pure and I/O-free), `web/` (what the
  screens *decide*, equally pure), `app/` (the Next.js App Router pages,
  which render those decisions and little else), `data/` (typed queries and
  the RLS-respecting Supabase clients).
- `supabase/` — `migrations/` (schema, Row-Level Security policies and the
  triggers that enforce the rules a message cannot), and `tests/` (the SQL
  scenarios proving those policies actually hold).

## Commands

The stack is **Next.js + Supabase + Vercel**, Sydney region — chosen for one
property above all: Supabase enforces tenant isolation *in the database* via
Row-Level Security, so a query missing its filter returns nothing rather
than everything (see
[5_technology/1_technology-services.md](./docs/ea/5_technology/1_technology-services.md)).
Node 22 or newer; no build step for the tests, because Node strips the types
at run time.

```bash
npm install
npm run dev            # next dev — needs .env.local, see .env.example
npm run build          # next build; also the only check of typed routes
npm run typecheck      # tsc --noEmit, twice — the second pass has no DOM
npm test               # node --test over src/**/*.test.ts
npm run check          # everything CI runs on a pull request, in its order
bash scripts/test_rls.sh   # tenant isolation, proved against a real Postgres
npm run check:full     # npm run check, plus that behavioural RLS test
```

Four of those are gates rather than lints, and
[CONTRIBUTING.md](./CONTRIBUTING.md) says what each one guards. The one that
matters most is the last: `check_rls.py` proves a policy *exists*;
`test_rls.sh` applies the real migrations to a throwaway Postgres and proves
the policies *work*. A policy can be present and wrong, and that failure is
silent.

## Origin of this documentation

The strategy and business layers were derived from the project's discovery
document (*Let'sDataTalk — Documento maestro de contexto del proyecto*,
v0.1, originally captured in Spanish) and translated into English, the
project's chosen documentation language (see [CLAUDE.md](./CLAUDE.md)).
Where the source material left a question genuinely open, it was carried
into [docs/scope/open-questions.md](./docs/scope/open-questions.md) rather
than silently resolved.
