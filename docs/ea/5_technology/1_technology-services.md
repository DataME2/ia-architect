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
| **CI** | **GitHub Actions** | Already assumed by the repo's link-check workflow and PR conventions |
| **File storage** | **Supabase Storage** | Identification photographs (BR56) and identity documents. Same access-control model as the database, so a photo cannot be more readable than the row that references it |
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
  is not, which keeps BR68 honest for Let'sDataTalk itself.
- **RLS is a discipline, not a magic shield.** Policies have to be written
  and tested per table. A table shipped without a policy is open. The
  application layer records this as a build-time check rather than a hope.
- **Serverless and background work fit awkwardly.** BR50's scheduled
  withdrawal, BR51's re-verification, and BR67's transfer at 18 all need
  scheduled execution. Supabase's scheduled functions cover it at this
  scale; if the job count grows this is the first thing to outgrow.

## Deliberately not chosen yet

- **The mobile client (C17).** Read-only offline (BR66) is the decisive
  requirement and it argues for a real app over a web view. That choice is
  deferred until the registration slice is working — it does not block it,
  and the API this stack exposes serves either.
- **Payments.** Square is the adopted provider (C3), not in the first
  slice.
- **Email/SMS.** Needed for C7, not for registration capture. Push
  notification (BR64) belongs with the mobile decision.
