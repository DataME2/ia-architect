# Deployment and Configuration

_[← Technology layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Node, Artifact, deployment topology.

Where the platform runs, and — the part that matters most for a public
repository holding children's data — **where secrets live and where they
must never appear**.

## Environments

| Environment | Runs on | Database | Who reaches it |
| ----------- | ------- | -------- | -------------- |
| **Local** | `next dev` on a developer machine | A developer's own Supabase project, or `supabase start` | One developer |
| **Preview** | Vercel preview deployment, one per pull request | A shared non-production Supabase project — **never production** | Anyone with the PR link |
| **Production** | Vercel, Sydney region | Supabase, `ap-southeast-2` | Club users |

**Preview deployments must never point at production.** A preview URL is
effectively public — it is in the pull request, and pull requests here are
public — and pointing one at real data would put 800 children's records
behind a link anyone can open. Environment variables are set per Vercel
environment for exactly this reason.

## Configuration

| Variable | Secret? | Where it lives | Notes |
| -------- | ------- | -------------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | No | `.env.local`, Vercel env vars | Ships in the browser bundle by design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | `.env.local`, Vercel env vars | Designed to be public. **Safe only because RLS is on every table** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | `.env.local`, Vercel env vars (server scope only) | **Bypasses RLS entirely.** Full read/write across every club |
| `SUPABASE_DB_PASSWORD` | **Yes** | Developer's local shell or password manager | Supabase CLI only, for migrations. Not needed at run time |

[`.env.example`](../../../.env.example) carries the names with no values.
Copy it to `.env.local`, which is gitignored.

### The anon key is safe *because* of the RLS work

This is worth stating plainly, because it is the load-bearing connection
between the technology choice and Principle P5. The anon key is published to
every browser. What stops it reading another club's data is not secrecy —
it is that every table has a Row-Level Security policy keyed on `club_id`.

**If RLS coverage ever lapses, the anon key stops being safe.** That is why
[`scripts/check_rls.py`](../../../scripts/check_rls.py) fails the build
rather than warning, and why a table without a policy is treated as a defect
rather than a to-do.

### The service-role key is the one that ends the project

It bypasses every policy for every tenant. In a **public repository**, one
commit containing it means full read/write access to every club's children's
data for anyone who scrapes GitHub — which is minutes, not days — and
deleting the file afterwards does not help, because git history keeps it.

Three structural defences, none of which relies on remembering:

1. **`.gitignore` covers `.env` and `.env.*`**, with `.env.example` the only
   exception.
2. **`readServiceConfig()` refuses a `NEXT_PUBLIC_` prefixed service key**
   ([`src/data/env.ts`](../../../src/data/env.ts)) — that prefix is what puts
   a value in the client bundle, and the mistake is one character.
3. **`createAdminClient(reason)` throws if a browser could reach it**, and
   takes a reason from a closed set
   ([`src/data/client.ts`](../../../src/data/client.ts)), so every RLS
   bypass in the codebase is greppable and the list of legitimate reasons is
   itself reviewable.

**GitHub secret scanning is enabled on public repositories** and will alert
on a leaked Supabase key. Treat that as the last line, not the first: by the
time it fires, the key is public and must be rotated in the Supabase
dashboard immediately.

## Migrations

**The GitHub repository is connected to Supabase**, so migrations in
`supabase/migrations/` are applied automatically in filename order when a
change reaches the production branch. That removes a manual step and adds a
sharp edge: **a migration merged to `main` runs against production with no
second confirmation.**

Rules that follow, and the first two are not stylistic:

- **Never edit a migration that has already been applied.** The integration
  tracks what it has run; an edited file leaves the recorded state and the
  actual schema disagreeing. Corrections are new migrations.
- **Never merge a schema change whose RLS test has not run.**
  `scripts/test_rls.sh` applies the migrations to a throwaway Postgres and
  asserts tenant isolation behaviourally; CI runs it on every pull request
  touching `supabase/`.
- **A new table ships with its RLS policy in the same change.** CI enforces
  it; review is a courtesy on top.
- **No destructive migration without a backup and an explicit decision.**
  Retention *tracking* is built and disposal is not
  ([#30](../../scope/open-questions.md)); a migration that drops data would
  route around that deliberately unbuilt gap.

## CI/CD

GitHub Actions runs typecheck, tests, the link check and RLS coverage on
every pull request ([`code-check.yml`](../../../.github/workflows/code-check.yml)).
Vercel builds a preview per pull request and deploys `main` to production.

**CI holds no Supabase credentials**, and the behavioural RLS test does not
change that: it runs against a disposable `postgres:16` service container,
never against a Supabase project. Everything CI checks — types, pure domain
tests, SQL text analysis, and tenant isolation against a scratch database —
runs without a credential. The first job that needs one is the first place a
secret has to exist in a second system, and there is no such job yet.

## Provisioning a new club

A new tenant is **data, not a deployment**: one project, one Postgres, one
application serve every club. The runbook is
[docs/annexes/tenant-provisioning.md](../../annexes/tenant-provisioning.md).

Its first two steps run with Row-Level Security bypassed, and that is
deliberate rather than a gap. `club` denies every write unconditionally, and
`club_membership` requires already being an admin of the club being joined —
so neither a club nor its first admin can be created from inside the
application by anyone. The alternative would let a compromised session
manufacture a tenant or attach itself to an existing one, which is exactly
what P5 exists to prevent. The cost is that **C10 is an operator task and
remains unbuilt**: there is no self-service sign-up, and there should not be
one until somebody decides who may create clubs and how that is authorised.
