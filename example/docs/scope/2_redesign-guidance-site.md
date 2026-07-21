# Project Scope — Redesign Guidance Site

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** `example/` on branch `claude/repo-ux-example-app-dhy09b`.

The first initiative
([1_publish-guidance-site.md](./1_publish-guidance-site.md)) proved the
method by building a working guidance site. This one improves how that site
lands with its core audience — vibe coders and AI-first builders who want a
structured, human-in-the-loop way to build with AI — without changing what
it teaches. It gives the site a real design system built on the ArchiMate
layer palette (so the repo and the site read as one artifact), makes the
Requester → Agent → Reviewer loop the central visual, and replaces the
runtime Mermaid CDN dependency with self-contained CSS diagrams. The
template `README.md` gains an approachable, audience-first entry point.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | No new goals or Principles. The redesign more strongly serves existing **Goal G1 (legible guidance)** by naming the site's core audience — AI-first builders / vibe coders — and making the Requester → Agent → Reviewer loop the landing page's centrepiece. Stakeholder concern refined to name that audience — see [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md) |
| 2_business    | **No change.** Same business service (EA-first method guidance), same actors (Pilot, Copilot at co-pilot, Template adopter), same publish-update process |
| 3_information | **No change.** The "Guidance page" data object is still static, hand-written HTML and still a *derived* (non-canonical) view of the EA docs and skills — see [3_information/1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 4_application | Same three page components + shared stylesheet; **internal realization changed** — diagrams are now rendered by a self-contained CSS component system instead of a runtime-loaded diagramming library, so the pages fetch nothing at request time (bringing the doc's existing claim into line with the code). See [4_application/2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology  | **No change to hosting** (GitHub Pages + GitHub Actions). The only third-party runtime dependency (the Mermaid CDN) is removed, so the deployed site is fully self-contained — see [5_technology/1_technology-services.md](../ea/5_technology/1_technology-services.md) |

The diagram-rendering change is recorded on its own in
[decision 2 — how the site renders its diagrams](../decisions/2_site-diagram-rendering.md).

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | A working guidance site with plain default styling and three Mermaid diagrams loaded from a third-party CDN; the template README opened with the mechanics rather than the audience |
| **Target** (delivered) | The same content on a cohesive design system built from the ArchiMate layer palette, with the Requester → Agent → Reviewer loop and the five-layer ladder as first-class visuals, fully self-contained (no runtime fetches), and an audience-first README entry point |

## Work packages and deliverables

### WP1 — Site design system

- **Deliverables:** [`example/site/styles.css`](../../site/styles.css) —
  design tokens (light/dark), typography scale, header/footer, buttons,
  hero, the human-in-the-loop "loop" component, the five-layer "ladder", the
  `archi-*`/`node` diagram components, the autonomy scale, cards and tables
- **Outcome:** one visual language, shared with the repo's ArchiMate
  palette, that every page composes from

### WP2 — Redesigned pages

- **Deliverables:** [`example/site/index.html`](../../site/index.html)
  (vibe-coder framing, the loop, the ladder, a self-contained mini
  architecture, a two-click quickstart),
  [`example/site/guide.html`](../../site/guide.html) (autonomy scale, CSS
  actor diagram), [`example/site/architecture.html`](../../site/architecture.html)
  (layered overview, value stream, and deployment as CSS diagrams)
- **Outcome:** the same guidance, rendered as a polished product that links
  every diagram and table back to its canonical source in the repo

### WP3 — Self-contained diagrams

- **Deliverables:** removal of the Mermaid `<script>` CDN imports from
  `guide.html` and `architecture.html`; the replacement CSS diagram
  components in `styles.css`;
  [decision 2](../decisions/2_site-diagram-rendering.md)
- **Outcome:** the deployed site fetches nothing at request time, matching
  the grounding claim already in the application layer

### WP4 — Approachable template README

- **Deliverables:** [`README.md`](../../../README.md) — an audience-first
  opening ("who this is for", the Requester/Agent/Reviewer loop table, a
  prominent link to the live site) ahead of the existing detailed content
- **Outcome:** a newcomer sees who the template is for and how the loop
  works before hitting the ArchiMate mechanics

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| A cohesive design system and redesigned pages | A build step or static-site generator — still hand-written, dependency-free HTML/CSS |
| Self-contained CSS diagrams replacing the Mermaid CDN on the site | Changing the canonical `docs/ea/` diagrams, which stay ArchiMate-on-Mermaid |
| Naming the AI-first-builder / vibe-coder audience in the site and README | New dedicated pages per skill (`story-sharding`, `stack-selection` remain linked, not walked) — inherited gap from initiative 1 |
| Light/dark theming and responsive layout | Analytics, search, versioned docs, comments — still unnecessary for a small guidance site |

## Gap notes

- **Hand-authored diagrams:** the CSS diagram components are more verbose to
  author than Mermaid text. Acceptable for a handful of diagrams; a site
  with many or frequently regenerated diagrams might want a generator step,
  which would reintroduce a build. See
  [decision 2](../decisions/2_site-diagram-rendering.md).
- **Skill-by-skill coverage:** still not closed from initiative 1 — the core
  skills are covered in depth; `story-sharding` and `stack-selection` are
  linked, not individually walked. Adding dedicated sections remains a small
  follow-up, not a redesign.

## Open questions

- None. This initiative changes presentation and one runtime dependency; it
  introduces no new interpretation of a requirement that a stakeholder needs
  to confirm.
