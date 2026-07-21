# Decision 2 — How the site renders its diagrams

_[← Decisions index](./README.md)_

**Status:** Accepted
**Date:** 2026-07-20
**Touches:** [4_application/2_application-components.md](../ea/4_application/2_application-components.md)

## Context

The canonical EA documents under `docs/ea/` draw their ArchiMate diagrams
with Mermaid, rendered by GitHub when the Markdown is viewed. The published
guidance site is a **derived** view of those same documents (Principle P1,
[1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md)), and it
needs to show the same architecture to a public reader.

The first version of the site rendered its diagrams by loading the Mermaid
library from a third-party CDN at page load. That worked, but it sat
awkwardly against two things the architecture already claimed:
[4_application/2_application-components.md](../ea/4_application/2_application-components.md)
states the pages "build or fetch nothing at request time," and
[3_information/1_data-objects.md](../ea/3_information/1_data-objects.md)
describes them as static, hand-written, no build step. A runtime script
fetch from an external host contradicted both.

## Options considered

| Option | Why not (or why) |
| ------ | ------------------ |
| Keep loading Mermaid from a CDN | Simplest to author, but every page view depends on a third-party host being up and un-blocked; contradicts the "no fetch at request time" grounding; a heavier, slower render than the content needs; and the default rendering is hard to bring onto the site's visual identity |
| Self-host the Mermaid bundle | Removes the third-party host but keeps a large JS dependency and a client-side render step for what is fundamentally static content; still not the site's own visual language |
| **Render the diagrams as self-contained HTML/CSS** | The site re-encodes ArchiMate's two notation rules — a «stereotype» line and a per-layer colour — as small CSS components, using the same layer palette the Mermaid source uses. Zero runtime dependencies, instant render, works offline, and the diagrams become part of the site's design system instead of a grey box pasted into it |

## Decision

The site renders its architecture diagrams with **self-contained HTML and
CSS** (the `archi-*`, `node`, and `ladder`/`loop` components in
[`site/styles.css`](../../site/styles.css)) rather than a diagramming
library. Nothing is fetched at request time. The canonical diagrams stay in
`docs/ea/` as ArchiMate-on-Mermaid; the site is a derived rendering of them
and links back to each source, so the two never become competing
authorities.

## Consequences

- The published site is now fully self-contained — no third-party CDN, no
  client-side render step — which makes the "fetches nothing at request
  time" claim in
  [4_application/2_application-components.md](../ea/4_application/2_application-components.md)
  actually true.
- The layer palette is shared between the repo's Mermaid diagrams and the
  site's CSS, so the same colour means the same ArchiMate layer in both
  places — the repo and the site read as one artifact.
- Diagram authoring on the site is now hand-written HTML rather than Mermaid
  text, which is more verbose for complex graphs. This is an accepted cost
  for a small site with a handful of diagrams; a project with many, or
  frequently regenerated, diagrams might revisit this.
