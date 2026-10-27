# Project Scope — A Public Test Site and a Production Project

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/test-site-and-prod-project`.

The product owner asked for three things in October 2026:

1. Put the platform **online as a test environment** under their own domain,
   so it can be shown to clubs and promoted.
2. Create **a production database from scratch**.
3. Walk the season's main paths end to end (registration with its fields,
   a match on the calendar at its venue, referee designation, and payment)
   as interactive scenarios grounded in the business rules.

They asked for AWS Amplify. Amplify's own documentation
([Amplify support for Next.js](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html),
read 27 October 2026) supports Next.js "up through Next.js 15". This
platform runs **Next.js 16.3**, whose `src/proxy.ts` keeps the Supabase
session alive. A host that does not run it signs people out without an
error. Amplify also has no cron jobs, and the platform runs three (in
`vercel.json`). **The product owner chose to stay on Vercel**, adding their
domain to it. Amplify is a gap note below, not a decision against it.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** A test site serves the existing go-to-market goal. Principles P5 (tenant isolation) and P7 (consent before collection) are why the test site holds synthetic data only |
| 2_business    | **No change.** No rule, service or process changes. The scenario guide (WP3) describes the existing rules |
| 3_information | **No change to any data object.** The development project already holds **synthetic data only** ([scope 78](./78_thirteen_decides_money_and_saturdays.md)); that rule is what allows it to be reachable at a public address. The new production project holds no data until a real club is on it |
| 4_application | **Changed:** `PRODUCTION_PROJECT_REF` in `src/data/env.ts` names the new production project, so the guard against a non-production deployment reaching it moves with it. `NEXT_PUBLIC_SITE_URL` is the test domain |
| 5_technology  | **Changed:** a **Test** environment is added in [deployment](../ea/5_technology/2_deployment.md): the Vercel deployment of `main` at `pitchpeople-test.datamanagementengineer.com` (DNS in Route 53), on the development project. **Production** is a new Supabase project tagged prod in `ap-southeast-2`, built from migrations 0001–0097, and still pointed at by nothing. `ltd-production` is superseded |

## Plateaus

| Plateau                | State |
| ---------------------- | ----- |
| **Baseline** (before)  | `main` deploys to Vercel at its `*.vercel.app` address only. `ltd-production` exists, empty and parked; the guard names it |
| **Target** (delivered) | `main` is the test site at `pitchpeople-test.datamanagementengineer.com`, on the development project's synthetic data. A new production project holds the whole schema and no rows, and the guard names it. The scenario guide links into the test site |

## Work packages and deliverables

### WP1 — The test site under the product owner's domain

- **Deliverables** (the product owner's accounts, so these are their
  steps):
  - The domain added to the existing Vercel project.
  - A `CNAME` record for `pitchpeople-test` in the Route 53 hosted zone of
    `datamanagementengineer.com`, with the value Vercel gives.
  - `NEXT_PUBLIC_SITE_URL` set to the test domain in Vercel's Production
    scope.
  - The test domain added to the development project's Supabase Auth
    settings (Site URL and redirect URLs), so sign-in links and password
    emails return to it.
- **Outcome:** a public address that can be given to a club.

### WP2 — A production project from scratch

- **Deliverables:**
  - A new Supabase project created by the product owner (billing makes it
    theirs to create) in **`ap-southeast-2`**, named so nobody can mistake
    it ([scope 49](./49_an_environment_of_its_own.md), step 2), and tagged
    prod.
  - Migrations **0001–0097** applied in order, with the Supabase CLI
    (`supabase db push`). The database password stays in `.env` and the
    password manager, never in chat or the repository.
  - Verified after applying: `schema_migration_log` reads 0097, every table
    has RLS and a policy (the same 93 that `check_rls.py` counts), and the
    Storage buckets exist with their policies.
  - `PRODUCTION_PROJECT_REF` in `src/data/env.ts` set to the new ref; the
    deployment doc's environments table names it.
- **Outcome:** a production database that exists, matches `main`, and that
  nothing can reach by accident.

### WP3 — The season, walked end to end

- **Deliverable:** an interactive guide, *PitchPeople Season Paths*
  (published page, private to the product owner until shared). It has four
  paths: register a player; season, venue and match; designate a referee;
  match day to payment. Switching a condition shows which rule allows,
  warns or stops each step, with the screen it happens on linked into the
  test site.
- **Outcome:** testers and prospective clubs can follow a path without a
  walkthrough call.

### WP4 — Documentation

- **Deliverables:**
  - [Deployment](../ea/5_technology/2_deployment.md): the Test row, the
    new production project, and the order of the remaining steps.
  - The scope index rows for 113 (0096 and 0097 applied 2026-10-27) and
    114.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The test site on Vercel at the product owner's domain | Hosting on AWS Amplify |
| A production project with the whole schema | Pointing any deployment at production: Vercel's Production variables stay on the development project |
| The guard naming the new project | Deleting `ltd-production` (the product owner's decision, in the dashboard) |
| The scenario guide | Automated end-to-end tests that walk the same paths |

## Gap notes

- **AWS Amplify.** It becomes possible once Amplify documents Next.js 16,
  or by deploying through OpenNext on Lambda and CloudFront. Either way it
  needs three changes: an `amplify.yml` that writes the server-side
  variables to `.env.production`; the guard keyed on Amplify's branch
  variable instead of `VERCEL_ENV`; and the three crons moved to EventBridge
  Scheduler calling the `/api/cron/*` routes with `CRON_SECRET`.
- **The test site is Vercel's Production environment.** When a real club
  arrives, production needs that environment back. The test site then
  moves to its own Vercel environment (or project) on the development
  project, and its domain moves with it. Scope 49's step 4 is the switch.
- **Supabase–GitHub integration.** It still targets the development
  project (scope 49, step 5). Production's migrations are applied
  deliberately, by the same hand-applied procedure as development's.
- **End-to-end tests.** The scenario guide describes the paths. Playwright
  tests walking the same paths against the test site would keep them true.

## Open questions

- None new. Scope 49's open steps (the plan and Point-in-Time Recovery, and
  a restore rehearsed against the real project) stand.
