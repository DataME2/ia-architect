# Application Components

_[← Application layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Application Service, Application Component.

## Guidance publishing (Application Service)

Realizes the [EA-first method guidance](../2_business/README.md) business
service. Provided by five components:

| Component | Realizes | Source file |
| --------- | -------- | ------------ |
| Landing page | Entry point: states the one rule, the Requester → Agent → Reviewer loop, links onward | [`site/index.html`](../../../site/index.html) |
| Setup page | A beginner's zero-to-first-change setup guide: create a GitHub account, copy the template, pick an AI agent (free-first, no editor install) | [`site/start.html`](../../../site/start.html) |
| Guide page | Reference for the EA-first process and the human/AI/hybrid actor notation | [`site/guide.html`](../../../site/guide.html) |
| Walkthrough page | One requirement climbing the five layers end to end (Requester vs. Agent at each step), plus dedicated coverage of the situational `stack-selection` and `story-sharding` skills | [`site/walkthrough.html`](../../../site/walkthrough.html) |
| Architecture page | Renders this project's own filled EA layers as the concrete "what finished looks like" example | [`site/architecture.html`](../../../site/architecture.html) |

All five share [`site/styles.css`](../../../site/styles.css), which also
carries the self-contained CSS diagram components (`archi-*`, `node`, the
`loop` and `ladder`) that render this project's ArchiMate diagrams without a
diagramming library. None of the pages build or fetch anything at request
time — no external scripts, fonts, or stylesheets — so deployment is a
direct copy of `site/` (see
[5_technology/2_deployment.md](../5_technology/README.md)). The site's
diagrams are a *derived* rendering of the canonical Mermaid diagrams in
`docs/ea/`; the choice to render them in CSS rather than load a library is
recorded in
[decision 2 — how the site renders its diagrams](../../decisions/2_site-diagram-rendering.md).
