# Project Scope — An Environment of Its Own

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

Task 0.4 has been open since Phase 0, and **no backup has ever been
restored** against a project holding the only copy of the data there is.

> **One reason for this task has just expired, and saying so matters more
> than the work below.** It was written while nothing in the product ran on
> a schedule, so the retention review and the enquiry-alert retry were
> buttons for want of a scheduler. [Scope 48](./48_arrears_visibility_wwcc_reminders_and_the_administrator_constraint.md)
> landed a Vercel Cron job, so that constraint is gone: both are now
> **choices**, and the places that gave the old reason have been corrected
> rather than left to read as current. What task 0.4 still gates is the
> environment itself — and the restore nobody has rehearsed.

It is also the one task on the list that **cannot be finished from inside
the repository**. Creating a Supabase project, setting Vercel environment
variables and restoring from a real backup are acts in somebody's dashboard,
with somebody's billing attached. So this initiative does the half that is
code and documentation, and **names the half that is not** rather than
leaving a task that looks startable and is not.

## The rule that was written down and never enforced

> *Preview deployments must never point at production.*

That has been in
[the deployment model](../ea/5_technology/2_deployment.md) since it was
drafted, with the reasoning spelled out — a preview URL is in the pull
request, pull requests here are public, and a preview pointed at real data
puts eight hundred children's records behind a link anyone can open.

Its enforcement was **somebody setting variables correctly in a dashboard**.

`assertNotPreviewAgainstProduction` makes it mechanical. It reads
`VERCEL_ENV`, which the platform sets rather than the project, so a
deployment cannot claim to be production by editing its own variables; it
fails at configuration-read time rather than on the first query, because a
preview that boots and then serves one request has already served it; and it
is called from `readPublicConfig`, which every Supabase client in the
application is built from, so a new caller cannot route around it.

**It is written now and inert until it matters.** `PRODUCTION_PROJECT_REF`
is an empty string, and the guard returns immediately while it is. The
alternative — write the guard when the project is created — puts the
dangerous window exactly where nobody is looking: the first deploy after
somebody makes that project, when the rule is a sentence in a document
nobody has re-read.

The ref lives in the source rather than in an environment variable on
purpose. It is not a secret — it is in the public URL every browser already
sees — and **a guard whose enforcement can be disabled by forgetting a
variable is not a guard.**

## A rehearsal that runs, rather than a claim that one happened

NFR-17 has read *no stated RPO/RTO, no restore rehearsal* since it was
written. The targets are now stated in
[the annex](../annexes/backup-and-restore.md), and the rehearsal is a script
that runs on every change: build a database from the real migrations, seed
it, dump it, restore into an **empty** one, and count what came back on both
sides.

**Policies are counted first, and that ordering is the point.** P5 lives in
the Row-Level Security policies. A restore that brings back every table and
loses the policies restores a database with no tenant isolation at all — and
it reads as a clean restore, right up until one club opens another club's
records. Counting tables would have missed it; counting policies is what
catches it.

It is verified to fail: dropping a single policy after the restore turns the
run red and names the count that changed.

The target database is deliberately **not** pre-seeded with the local
Supabase shim. Applying it first made `pg_restore` fail on *schema "auth"
already exists*, and the fix is the more honest rehearsal anyway: a real
disaster does not begin with somebody having pre-created half the schema.

## What the rehearsal deliberately does not claim

The annex says this at length; the short version is that it proves **this
schema round-trips**, and nothing about Supabase. Not that their backups are
taken or retained, not the real restore time, not whether the `auth` schema
and its accounts come back — locally that is a shim and on Supabase it is
theirs — and not the Storage bucket, where the identification photographs
are and which `pg_dump` does not touch.

Every one of those needs a project to test against, which is the half of
this task that is not ours.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** No new goal, capability, principle or actor |
| **2_business** | **No new rules.** Nothing about what a club may do changes; this is about where its data lives and whether it can be got back |
| **3_information** | **No change** to any data object. The *retention* of records is [its own annex](../annexes/retention-schedule.md) and a different question from how far back a mistake can be undone |
| **4_application** | `assertNotPreviewAgainstProduction` in `src/data/env.ts`, called from `readPublicConfig`; `scripts/rehearse_restore.sh` in `npm run check:full` and in CI |
| **5_technology** | The environment table in [2_deployment.md](../ea/5_technology/2_deployment.md) stops being aspirational on one row and gains a stated RPO, RTO and retention. **No production project is created by this initiative** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | One Supabase project, called development and used for everything. The rule against pointing a preview at production enforced by memory. No RPO, no RTO, and no backup ever restored |
| **Target** (this initiative) | The rule enforced in code and inert until the project exists; an RPO, RTO and retention stated; a restore rehearsed on every change, with the policies checked first |
| **Target** (needs the owner) | A production Supabase project, per-environment variables set in Vercel, and one restore rehearsed against a real backup |

## Work packages and deliverables

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | `assertNotPreviewAgainstProduction`, called from `readPublicConfig` | **Delivered** |
| **WP2** | Five tests driving that function directly — not a copy of its logic | **Delivered** |
| **WP3** | [`backup-and-restore.md`](../annexes/backup-and-restore.md) — RPO, RTO, retention, the procedure, and five named gaps | **Delivered** |
| **WP4** | `scripts/rehearse_restore.sh`, verified to fail on a lost policy | **Delivered** |
| **WP5** | The rehearsal in `npm run check:full` and `code-check` | **Delivered** |
| **WP6** | **Create the production Supabase project** | **Done by the owner** — `ltd-production`, Sydney, 15 September 2026. Created as `ltd-dev` and renamed before anything was attached, which is why the runbook below now says which mistakes are cheap |
| **WP7a** | `PRODUCTION_PROJECT_REF` set to `jqyfbgojgxpymjgecxgx` | **Delivered** — armed before the database it guards is reachable, and a test drives the shipped constant so blanking it fails the build |
| **WP7b** | **Per-environment variables in Vercel** | **Needs the owner** — Production scope only; Preview and Development stay on the development project |
| **WP8** | **One restore rehearsed against a real backup**, and the answer to whether accounts survive it | **Needs the owner** |

## Why the tests drive the real function

The first version of WP2 re-implemented the guard's logic inside the test
file, because the shipped function reads a module constant a test cannot
set. That is the divergence trap this repository has already been caught by
once — a copy is only ever wrong in the copy, and the copy is the one nobody
is watching.

The fix is the same one the enquiry alert got: the production ref is a
parameter defaulting to the constant, nothing in the application passes it,
and the tests drive the shipped function.

## Creating the production project — the runbook

WP6–WP8 need a dashboard and billing, so they are written out here rather
than left as three words in a table. **Nothing in this repository can do
them**: there is no Supabase CLI in the build environment, no management
access token, and `api.supabase.com` is refused by the egress policy — three
independent blocks, so this is not a matter of nobody having tried.

Two of the steps are also decisions rather than typing, and they are marked.

1. **Choose the plan** *(a decision)*. Free is enough to *exist*; **Pro is
   what Point-in-Time Recovery needs**, and PITR is what takes the RPO from
   24 hours to one. A club's registration day is the busiest data day of its
   year, and 24 hours of it is a hundred families registering twice — so the
   honest trigger is the first real club, not the first deploy.
2. **Create the project in `ap-southeast-2` (Sydney).** Same region as
   development, and the region the whole technology layer assumes. A
   database of Australian children's records in another region is a
   different privacy conversation, not a latency one.

   **The region is the only choice here that cannot be undone.** A project
   name is editable in Settings → General and the ref never changes with
   it, so a badly named project is a ten-second fix; a project in the wrong
   region has to be recreated. That asymmetry is worth knowing *before*
   anybody reaches for Delete: deleting is irreversible and it happens in a
   dashboard where the development project — which holds the only copy of
   the data there is — sits in the same list. **Rename unless the region is
   wrong.**

   And name it so nobody can mistake it. This repository has already lost a
   month to a project whose name said one thing and whose contents were
   another: *"applied to production" in the history before September 2026
   means applied to the development project.* A production project called
   anything with `dev` in it rebuilds that trap permanently, because the
   name is what everyone reads in the dashboard.
3. **Keep the database password out of this repository and out of any chat.**
   It goes in the password manager and in Vercel, nowhere else. The same
   goes for the new project's service-role key, which bypasses Row-Level
   Security for every club at once.
4. **Set the Vercel variables per environment.** No new Vercel account and
   no new Vercel project — the existing one already builds previews and
   deploys `main`. Vercel scopes variables to **Production, Preview and
   Development separately**, and only the *Production* scope changes:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` get the new project's values, and **preview
   and development keep pointing at the development project.** That
   separation is the thing step 7 enforces.

   Production also needs its own **`CRON_SECRET`**, a different value from
   development's: scope 48's WWCC reminder runs as a Vercel Cron job, and
   Vercel runs crons against the production deployment, so this is the one
   that will actually fire. A shared secret between environments would mean
   a preview's leaked value triggers the real job.
5. **Decide what the Supabase–GitHub integration points at** *(a
   decision, and the sharpest edge here)*. That integration currently
   applies `supabase/migrations/` to the **development** project when a
   change reaches the production branch. Two options and no third:
   repoint it at production, and a merge to `main` then runs migrations
   against real club data with no second confirmation; or leave it on
   development and apply production's migrations deliberately, in which
   case **somebody has to remember**, and production's schema drifts the
   first time nobody does. The existing rules — never edit an applied
   migration, never merge a schema change whose RLS test has not run —
   were written for the first option and get sharper under it.
6. **Apply the migrations to the new project**, in order, and then run
   `python3 scripts/check_rls.py` against it.

   **Pre-flight, run 15 September 2026 and clean.** A first apply to a real
   Supabase project is where a specific class of bug surfaces, and it was
   worth checking rather than discovering:

   - **Extension schemas.** pgcrypto lives in `extensions` on Supabase and
     in `public` on the local harness, so a `security definer` function
     pinned to `search_path = public` that calls `digest()` passes every
     local test and fails on the real project. That is not hypothetical —
     `app_unsubscribe` shipped with exactly that bug. All six call sites
     across 0005, 0006, 0008, 0009, 0030 and 0035 are inside functions
     pinned to `public, extensions, pg_temp`; **nothing is left on the
     wrong path.**
   - **Data written at apply time.** Four migrations carry top-level DML —
     0006's two `person_role` backfills, 0019's `user_password_set`, and
     0031's `club.privacy_framework`. Every one is `select`-driven over
     existing rows, so on a virgin database they insert and update nothing.
     No migration seeds a club, a person or a season.
   - **The whole set against an empty database** is proved on every CI run
     rather than argued: both `test_rls.sh` and `rehearse_restore.sh` build
     a database from these migrations on a virgin Postgres, and the second
     then dumps and restores it.

   What remains genuinely unproved is what only a real project can answer:
   Supabase's `auth` and `storage` schemas are theirs, not the local shim's. A production database whose
   policies did not all apply is the failure P5 rests on. **The Storage
   buckets come with them** — vouchers (0008), clearance scans (0012) and
   identification photographs (0021) each create their bucket and its
   policies inside the migration, guarded on the `storage` schema existing,
   so there is nothing to click. Worth knowing, because a bucket created by
   hand would have no policies.
7. **Fill in `PRODUCTION_PROJECT_REF`** in `src/data/env.ts` — the ref
   alone, `abcdefghijklmnopqrst` out of
   `https://abcdefghijklmnopqrst.supabase.co`, not the URL. A malformed
   value now **fails the build loudly** rather than leaving the guard
   matching nothing; that is what `validProjectRef` is for.
8. **Rehearse a restore against the real project** and record the actual
   times in [the annex](../annexes/backup-and-restore.md), replacing the
   throwaway-cluster figures. While there, answer the one question worth
   twenty minutes now and an hour during an incident: **do the accounts come
   back?** Supabase manages the `auth` schema separately, and whether users
   must be re-invited after a restore is currently unknown.

Steps 1, 3 and 5 are the ones that cannot be delegated to anybody,
including a future version of this process: two are decisions with money or
duty-of-care attached, and the third is a credential that must not travel
through a conversation.

**What is *not* needed, so nobody goes looking for it:** no new Vercel
account and no second Vercel project — the existing one already builds a
preview per pull request and deploys `main`, and this changes variables
inside it. No new Supabase account or organisation either: **one additional
project** in the same organisation as the development one. And no manual
Storage setup, per step 6.

## What this initiative does not do

- **It does not create a production environment.** WP6–WP8 are the owner's,
  and until they are done the three items task 0.4 gates — the retention
  schedule, the alert retry, and a real restore — stay gated.
- **No scheduler.** Still nothing runs on a time trigger; the guard and the
  rehearsal are both synchronous checks.
- **No off-Supabase backup, and no Storage backup.** Both are named in the
  annex with what they would need.
- **No migration-immutability gate** (the other open Phase 0 item). It is a
  separate check about editing an applied migration, and conflating it with
  environment separation would make one initiative out of two.
