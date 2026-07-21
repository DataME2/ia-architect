---
name: stack-selection
description: Use when bootstrapping a new project from this template and no technology stack has been chosen yet, or when assessing docs/ea/5_technology/ for a small application. Gives a decision framework and concrete default recommendations for small/solo apps, rather than re-deriving the choice from scratch each time.
---

# Choosing a stack for a small application

This is guidance for **deciding**, not a substitute for
[docs/ea/5_technology/](../../../docs/ea/5_technology/README.md) — once a
choice is made, document it (and why) in
`1_technology-services.md`/`2_deployment.md` as usual. It exists because
for a small or solo project, the honest default answer to "what should we
build this on" is almost always one of a handful of well-worn combinations,
not a bespoke evaluation.

## Decision tree

1. **Does the app need to store or mutate shared state at all** (multi-user
   data, anything that outlives a single browser session)?
   - **No** → it's a static site/tool. Skip everything below about
     databases and auth entirely; see "No backend" below. This is the
     cheapest, simplest, and most secure option there is — don't add a
     backend "just in case."
   - **Yes** → continue.
2. **Does it need user accounts / access control?**
   - If the database choice below already bundles auth with row-level
     policies (e.g. Supabase), default to that instead of a separate
     auth provider — one less moving part, one less place for the
     permission model to drift from the data model.
   - Otherwise, pick a standalone auth provider (below).
3. **How much infrastructure control does the project actually need?**
   Small apps essentially never need this — default to managed/serverless
   and revisit only if a specific, concrete requirement (compliance,
   unusual compute, cost at real scale) demands it.

## No backend (static only)

Build to static files, ship on a free static host. Zero servers to secure,
zero ongoing cost, zero uptime to babysit.

| Need | Default | Alternatives |
| ---- | ------- | ------------ |
| Hosting | **GitHub Pages** (already versioned with the code, free, trivial GitHub Actions deploy) | Cloudflare Pages (faster edge, still free), Netlify |

This is the right choice for tools, demos, docs sites, and anything whose
state is fully client-side (`localStorage`, URL params) — no server means
nothing to secure, patch, or pay to keep running.

## Needs a backend (data, users, or both)

| Need | Default | When to reach for the alternative instead |
| ---- | -------- | ------------------------------------------- |
| **Database + auth + row-level access control** | **Supabase** (managed Postgres, built-in Auth, Row-Level Security policies enforced by the database itself rather than application code, generous free tier) | **Firebase** if the data is naturally document-shaped/NoSQL and you want faster prototyping over relational integrity; **PlanetScale/Neon** if you specifically want just a Postgres/MySQL database with no bundled auth (e.g. you already have an auth provider) |
| **Auth only** (already have a database, or the DB choice has no bundled auth) | **Auth.js (NextAuth)** if self-hosting is fine and the framework is Next.js | **Clerk** for the fastest setup and best out-of-box UI components, at the cost of a third-party dependency and its own free-tier limits |
| **App hosting / deploy** | **Vercel** for Next.js (zero-config, preview deployments per PR, generous free tier) | **Netlify** as a framework-agnostic equivalent; **Cloudflare Pages** for the cheapest/fastest option at real scale or if going all-in on the Workers ecosystem |
| **CI** | **GitHub Actions** (already assumed by this template's `pr-description` and `5_technology/2_deployment.md` conventions) | — |

**Reference combination** for "typical small app with users and real
data": **Next.js + Vercel + Supabase**. Vercel handles hosting/CI/CD via
its GitHub integration; Supabase provides Postgres with Row-Level Security
policies as the single point of access-control enforcement — document the
role × operation mapping in
[`docs/ea/2_business/1_business-actors-and-roles.md`](../../../docs/ea/2_business/README.md)
once the project's roles are known, so the RLS policies stay traceable to
that matrix.

## Principles behind these defaults

- **Managed over self-hosted, by default.** A small app's traffic and data
  volume essentially never justifies operating a server, a database, or a
  Kubernetes cluster yourself. Reach for that only when a concrete,
  articulated requirement demands it — not as a default posture.
- **Free tier first.** Vercel, Supabase, Netlify, Cloudflare Pages, and
  GitHub Actions all have free tiers generous enough for a small app's
  entire lifetime pre-scale. Don't commit to paid infrastructure before
  there's a concrete reason to.
- **Fewer moving parts beats more control.** A bundled database+auth
  product (Supabase) that removes an entire class of drift (auth logic
  disagreeing with data-access logic) is usually worth more than the
  flexibility of wiring the two together yourself.
- **Whatever is chosen, record it and the reasoning** in
  `docs/ea/5_technology/1_technology-services.md` — this skill helps you
  decide quickly, but the EA doc is what stays true and verifiable over
  the life of the project.
