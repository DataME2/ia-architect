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

Applied with the Supabase CLI against each environment in turn — local,
then preview, then production. Two rules travel with them:

- **A new table ships with its RLS policy in the same change.** CI enforces
  it; the review is a courtesy on top.
- **No destructive migration without a backup and an explicit decision.**
  Retention *tracking* is built and disposal is not
  ([#30](../../scope/open-questions.md)); a migration that drops data would
  route around that deliberately unbuilt gap.

## CI/CD

GitHub Actions runs typecheck, tests, the link check and RLS coverage on
every pull request ([`code-check.yml`](../../../.github/workflows/code-check.yml)).
Vercel builds a preview per pull request and deploys `main` to production.

**CI holds no Supabase credentials today**, and should stay that way for as
long as possible: everything it checks — types, pure domain tests, SQL text
analysis — runs without a database. The first job that needs a credential is
the first place a secret has to exist in a second system.
