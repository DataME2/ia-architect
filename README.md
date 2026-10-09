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

**Status:** pre-MVP, released as pre-release tags for the pilot
(`v1.0.0`, `v1.1.0`, `v1.2.0`; see
[GitHub releases](https://github.com/DataME2/ia-architect/releases)). All
five [architecture layers](./docs/ea/README.md) are written, 88
[initiatives](./docs/scope/README.md) are scoped, and every one of them is
enforced by the database under tenant isolation, not by the screens.

What is true today, stated plainly:

- **Email is sent; SMS is not.** Sign-in and invitation links go through
  Supabase Auth, and club messages through Resend, each with a derived
  unsubscribe link ([decision 12](./docs/decisions/12_an_unsubscribe_link_is_derived_not_stored.md)).
  Reserved test addresses (`*.test`) are skipped, never emailed.
- **No money moves.** Referee payouts, sponsor collections (PayPal, Google
  Pay, bank transfer) and referral-partner payouts are **simulated**: the
  platform records the payment with a `SIM-…` reference, and a provider
  would move it ([decision 16](./docs/decisions/16_the_platform_records_a_payout_a_provider_moves_it.md),
  [payout providers](./docs/annexes/payout-providers.md)). Registration fees
  are recorded by the treasurer as they arrive.
- **There is no production environment yet.** Everything points at a
  development Supabase project that nonetheless holds the only copy of the
  data there is. Production gets its own project, and encrypted bank
  details, when the product is ready.

What exists, what is partial, and what has no code at all is tracked per
capability in
[docs/ea/4_application/1_application-services.md](./docs/ea/4_application/1_application-services.md),
and as a verified requirement list in
[docs/spec/requirements.md](./docs/spec/requirements.md). The
**Architecture Atlas**, a single-page view of all of it, is regenerated
from these documents as the project moves.

A pilot club has committed at least three years of historical data to
validate the platform against. **Target for the first live version: before
the end of Q4 2026.**

## What's built

| Area | What it covers |
| - | - |
| **Registration** | One `Person` identity across roles; public registration links; deterministic validation (BR rules) with an append-only history; guardians and consent; documents, which families can upload themselves; duplicates; submission packs |
| **Finance** | Fees, payment plans, vouchers and arrears; hardship approved by the committee (a debt is never forgiven); the treasurer's workspace |
| **Match officials** | Profiles and classification, availability, appointments with conflict and card checks, match confirmation, fee schedules, claims, payment runs and simulated online payouts |
| **Teams and safeguarding** | Teams, coaches, fixtures and appearances; Working with Children Checks enforced at the appointment; under-18 exemptions as the law sets them |
| **Governance** | Committee terms and positions; officers confirmed by the AGM election and others by the President, Secretary and Treasurer; resolutions recorded by the executive; the Management Committee Hub (SharePoint-ready) |
| **Workspaces** | `/me` for each role: player, guardian, coach, referee and committee. Each shows what is waiting, and what is not yours is absent rather than refused |
| **Sponsors** | Sponsor space in adults' workspaces, charged by CPC, CPM or CPA and **counted, never tracked** ([decision 17](./docs/decisions/17_sponsors_are_counted_never_tracked.md)). Weighted rotation (Standard, Featured, Premium); invoices with the club and platform split; the club advertising through partners with UTM links, paid per completed registration |
| **Platform** | Club provisioning, licences, enquiries, a read-only demo, and an AI assistant that only ever drafts, summarises or flags ([decision 1](./docs/decisions/1_ai-assistant-autonomy-level.md)) |

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
  realise an architecture element rather than describe one: consent
  wording, retention schedule, commercial terms, submission-pack
  instructions, payout providers, SharePoint integration, backup and
  restore, and more.
- [`docs/decisions/`](./docs/decisions/README.md) — smaller, consequential
  calls that don't rise to a full initiative (17 so far), starting with the
  AI assistant's autonomy level.
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

**Migrations are applied by hand.** Merging to `main` does **not** apply a
Supabase migration. A schema change is applied to the development project
once its pull request's CI (including `test_rls.sh`) is green, and before
it merges. An applied migration is never edited: a correction is a new
migration. See the [git workflow](./docs/steering/1_git-workflow.md).

## Origin of this documentation

The strategy and business layers were derived from the project's discovery
document (*Let'sDataTalk — Documento maestro de contexto del proyecto*,
v0.1, originally captured in Spanish) and translated into English, the
project's chosen documentation language (see [CLAUDE.md](./CLAUDE.md)).
Where the source material left a question genuinely open, it was carried
into [docs/scope/open-questions.md](./docs/scope/open-questions.md) rather
than silently resolved.
