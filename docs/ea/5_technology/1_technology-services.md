# Technology Services

_[← Technology layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Technology Service, System Software, Node.

The stack chosen for the MVP build, and why. Decided August 2026 using the
`stack-selection` skill's reference combination for a small application
with users and real data.

## The stack

| Concern | Choice | Why this one |
| ------- | ------ | ------------ |
| **Application framework** | **Next.js** (App Router, TypeScript) | One codebase for server-rendered admin screens and the API the future mobile client (C17) will call. TypeScript because the business rules are a type problem before they are a runtime problem — a legal name and a preferred name are both strings, and only the type system stops them being swapped |
| **Database + auth + access control** | **Supabase** (managed Postgres, Auth, Row-Level Security) | **The decisive property is RLS.** Principle P5's tenant isolation is enforced *by the database*, not by remembering a `where club_id = …` in every query. A missed filter in application code is a cross-tenant data leak; a missed filter under RLS returns nothing. Auth is bundled, so the permission model cannot drift from the data model |
| **Hosting / CI-CD** | **Vercel** | Zero-config for Next.js, a preview deployment per pull request — which matters for a project whose review artifact has been a PR description all along |
| **Styling** | **Hand-written CSS** (`src/app/globals.css`) for every existing screen, plus **Tailwind CSS v4** (dev dependency, via `@tailwindcss/postcss`) for the design-system components in `src/components/ui` ([scope 69](../../scope/69_the_design_system_pilot.md)) | The design system ([`src/DESIGN.md`](../../../src/DESIGN.md)) was authored as Tailwind components. Adopted **scoped, not wholesale**: no preflight, utilities generated only from `src/components/ui`, and every colour mapped onto a `globals.css` variable — so one set of tokens and one dark mode, and no existing screen changes. A screen moves to the design system by adopting its components, not by the stylesheet being swapped underneath it. **Type** ([scope 123](../../scope/123_the_tactics_board_theme.md)): Space Grotesk (interface), Space Mono (data) and Permanent Marker (headings), self-hosted as latin-subset woff2 in `public/fonts/` with their licences (OFL, and Apache 2.0 for Permanent Marker), and never fetched at build or run time. **Colour** ([scope 123](../../scope/123_the_tactics_board_theme.md)): the Tactics Board palette, Felt by default and the Whiteboard for a light preference and for print. The ramps keep [scope 119](../../scope/119_the_front_door_under_floodlights.md)'s names (slate, stadium, trophy, chalk, turf) with the new values, turf never marks a status, and `globals.css` states colours only in its token blocks: Felt, the Whiteboard, and the index card's `.paper` scope ([scope 124](../../scope/124_the_board_s_shapes_and_pieces.md)). **Shapes** (scope 124): 2px controls, pill strips, one 3px focus ring, and index-card corners. The Tailwind layer's theme is `inline`, so a utility reads the `globals.css` variable where it is used, and a scope that restates a token recolours the utilities inside it |
| **CI** | **GitHub Actions** | Already assumed by the repo's link-check workflow and PR conventions |
| **File storage** | **Supabase Storage** | Identification photographs (BR56) and identity documents. Same access-control model as the database, so a photo cannot be more readable than the row that references it |
| **Transactional email** | **Resend**, behind a `MessageTransport` interface | Chosen for a plain HTTP API and no SDK to pin. **The interface matters more than the choice**: BR129 says a withdrawal is the platform's record and never the vendor's, so suppression is checked against our own rows before the provider is reached, and changing provider is a new implementation of three lines that takes no withdrawal with it |
| **Enquiry relay** | **Web3Forms**, called from the visitor's browser on `/interest` only ([scope 116](../../scope/116_contact_and_demo_requests_reach_an_inbox.md)) | Copies a club's enquiry to the operator's inbox without Resend (BR189). Browser-only because its free plan refuses servers, which is also why its delivery is never recorded. Its key, `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY`, is public by design: it can only send mail to its owner. It receives enquirers' contact details offshore, so the form names it (APP 8 accountability, as in the next row). Unset, the form runs as before |
| **Region** | **Sydney (`ap-southeast-2`)** | Australian data residency for children's personal information. Not a legal requirement under the APPs — cross-border disclosure is permitted with accountability (APP 8) — but keeping it onshore removes a question no club committee wants to answer |

## What the choice buys, in this project's terms

- **P5 becomes structural.** Tenant isolation is a database policy rather
  than a coding convention. This is the single biggest reason for the
  choice: P5 is the principle most expensive to violate and most easily
  violated by an ordinary mistake.
- **BR68's export is nearly free.** The club owns its data and may export
  it on demand. Postgres makes that a query, not a project.
- **BR52's per-tenant privacy configuration** is a row, not a deployment.
- **The free tier covers the pilot.** ~800 players and their documents sit
  well inside Supabase's and Vercel's free limits; the first bill arrives
  when the second or third club does.

## What it costs, stated honestly

- **Vendor concentration.** Database, auth, storage, and access policy all
  sit with one provider. The mitigation is that it is **Postgres
  underneath** — the data and the schema are portable even if the platform
  is not, which keeps BR68 honest for PitchPeople itself.
- **RLS is a discipline, not a magic shield.** Policies have to be written
  and tested per table. A table shipped without a policy is open. The
  application layer records this as a build-time check rather than a hope.
- **Serverless and background work fit awkwardly.** BR50's scheduled
  withdrawal, BR51's re-verification, and BR67's transfer at 18 all need
  scheduled execution. **Built for BR51 (scope 48, WP2) as a Vercel Cron
  job calling an ordinary route handler**, not a Supabase scheduled
  function — this stack is Next.js on Vercel throughout, and the
  Supabase-specific mechanism this bullet originally assumed was never
  actually needed. `createAdminClient('scheduled-job')` is the seam; if the
  job count grows, a dedicated queue is the first thing this outgrows, not
  the scheduling primitive itself.

## Deliberately not chosen yet

- **The mobile client (C17).** Read-only offline (BR66) is the decisive
  requirement and it argues for a real app over a web view. That choice is
  deferred until the registration slice is working — it does not block it,
  and the API this stack exposes serves either.
- **Payments.** Square is the adopted provider (C3), not in the first
  slice. **Restated November 2026
  ([scope 134](../../scope/134_pitchpeople_financial_intelligence.md),
  [decision 20](../../decisions/20_payments_through_a_provider_port_never_on_the_platform.md)):**
  Square and Stripe are candidate adapters behind one provider port, and
  the first is still to be chosen.
- **SMS.** Email arrived with C7 ([scope 36](../../scope/36_the_platform_learns_to_send_and_to_stop.md));
  SMS buys little that email does not until a club asks. Push notification
  (BR64) still belongs with the mobile decision.

## Financial Intelligence: what it needs from the stack

Assessed November 2026 for [scope 134](../../scope/134_pitchpeople_financial_intelligence.md).
**No new infrastructure** — every need is met by a service already in the
table above, and the one that might later outgrow it is named.

| Need | Met by | Change |
| ---- | ------ | ------ |
| Ledger, event budgets, policies, grants, benchmarks | **Supabase Postgres**, under RLS, with definer functions where a read must refuse rather than under-count | New migrations only. Two new tenantless tables (policy versions, benchmark aggregates) need `check_rls.py` exemptions argued the way decision 15 argued the catalogue's |
| Webhook ingress | **Next.js Route Handlers on Vercel** (`src/app/api/webhooks/[provider]/route.ts`), reading the raw body for signature verification | One new `createAdminClient` reason, `provider-webhook`, that calls one definer function |
| Retries, reconciliation sweeps, benchmark runs | **Vercel Cron** calling ordinary route handlers, as BR50 and BR51 already do | New `vercel.json` entries. A provider's own retries cover delivery; a sweep covers anything left unmatched. **A queue is the first thing this would outgrow**, and is not needed at pilot volume |
| Secrets | **Vercel server-scoped environment variables**; per-club provider tokens in **Supabase Vault** | Names in [the deployment configuration](./2_deployment.md#configuration); `.env.example` gains them with no values |
| Monitoring | The existing migration-drift alert pattern ([scope 94](../../scope/94_a_migration_proves_it_ran.md)) | A platform alert when webhook signatures start failing or exceptions accumulate — an operator alert, not a message to a data subject (BR146) |
| Backup and recovery | Supabase's backups and the rehearsed restore ([annex](../../annexes/backup-and-restore.md)) | The restore rehearsal gains the new tables and must show their policies came back (the RLS-first check it already performs). Provider transactions can be re-fetched from the provider; the club's own records cannot, which is why they stay the system of record |
| Currency formatting | `Intl.NumberFormat` with the club's currency | No dependency |

**What would justify a change**, recorded so it is not made early: a
provider whose events arrive faster than a Route Handler can record them,
or reconciliation sweeps that exceed a cron run's time limit. Neither is
plausible at one club's volume of about 700 registrations a season.
