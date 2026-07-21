# Project Scope — Publish Guidance Site

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** `example/` on branch
`claude/enterprise-architecture-template-review-8addo4`.

> **Terminology note (added later):** this initiative predates the actor
> rename. Where it says "Maintainer" read **Pilot**, and where it says "Docs
> Agent" read **Copilot** — see
> [decision 3](../decisions/3_actor-naming.md). As a merged initiative
> record, the text below is left exactly as originally written.

The archreator template had no filled-in example anywhere in the repo —
every layer README's "Layer view" diagram was an unfilled placeholder, and
the human/AI/hybrid actor notation had nowhere it had actually been
applied. This initiative builds a small, real project — a guidance site
for the method itself — by following the EA-first process end to end,
closing that gap and giving the actor notation a concrete instance (the
Docs Agent) to point to.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | New stakeholders (Maintainer, Template adopters), new goals (legible guidance, living proof), two new Principles (traceability to source, no unreviewed publishing) — see [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md) |
| 2_business    | New business service "EA-first method guidance"; new actors including the AI actor Docs Agent with an explicit autonomy level, decision rights, and escalation path — see [2_business/1_business-actors-and-roles.md](../ea/2_business/1_business-actors-and-roles.md) |
| 3_information | One new data object, "Guidance page," explicitly marked as a derived (non-canonical) representation — see [3_information/1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 4_application | New application service "Guidance publishing," realized by three static-page components — see [4_application/2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology  | New technology services: GitHub Pages (static hosting) and GitHub Actions (CI/CD) — see [5_technology/2_deployment.md](../ea/5_technology/2_deployment.md) |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | archreator's own repo had no worked example; the actor notation existed only as an abstract convention in `ea-doc-style` |
| **Target** (delivered) | A published guidance site at `https://roanboc.github.io/archreator/`, itself built via the EA-first process, with one AI actor (Docs Agent) modeled at an explicit autonomy level |

## Work packages and deliverables

### WP1 — EA layers for the example project

- **Deliverables:** `example/docs/ea/**` (all five layers, seven content
  documents), `example/docs/scope/`, `example/docs/decisions/`
- **Outcome:** a complete, small, real EA set demonstrating every layer
  and the actor notation, that a template adopter can read end to end

### WP2 — Guidance site

- **Deliverables:** `example/site/index.html`, `guide.html`,
  `architecture.html`, `styles.css`
- **Outcome:** a browsable explanation of the method and this project's
  own architecture, derived from (and linking to) the canonical sources

### WP3 — Publishing pipeline

- **Deliverables:** `.github/workflows/deploy-example-site.yml`
- **Outcome:** pushes to `main` touching `example/site/**` deploy
  automatically to GitHub Pages

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| A working guidance site covering the EA-first process and the actor notation | Full narrative coverage of every skill (`story-sharding`, `stack-selection` get a mention, not a dedicated page) |
| One real AI actor (Docs Agent) with a defined autonomy level | Multiple AI actors at different autonomy levels — a single example was enough to demonstrate the notation |
| Static hosting via GitHub Pages | Analytics, search, versioned docs, comments — none needed for a small guidance site |

## Gap notes

- **Skill-by-skill coverage:** `guide.html` covers the four core skills and
  actor notation in depth; `decision-record`, `story-sharding`, and
  `stack-selection` are linked but not individually walked through. Adding
  dedicated sections would be a small follow-up, not a redesign.
- **Multiple autonomy levels:** demonstrating advisory- and
  fully-autonomous-level actors alongside the co-pilot one would make the
  autonomy-level enum easier to grasp at a glance; deferred since one
  concrete instance already resolves the "notation has never been applied"
  gap this initiative targets.

## Open questions

- GitHub Pages must be enabled once for this repository (Settings → Pages
  → Source: GitHub Actions) before `deploy-example-site.yml` can
  successfully publish — this is a repository-admin action outside what a
  commit or CI run can do. Adopted interpretation: documented here and in
  [5_technology/2_deployment.md](../ea/5_technology/2_deployment.md) as a
  one-time manual step; the workflow itself needs no further code change
  once that's done.
