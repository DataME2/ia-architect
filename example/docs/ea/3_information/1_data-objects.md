# Data Objects

_[← Information layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Data Object.

## Guidance page

The one data object in this project: a page of guidance content.

| Property | Value |
| -------- | ----- |
| Representation | Static HTML, hand-written, no build step |
| Location | [`site/index.html`](../../../site/index.html), [`site/guide.html`](../../../site/guide.html), [`site/walkthrough.html`](../../../site/walkthrough.html), [`site/architecture.html`](../../../site/architecture.html), [`site/start.html`](../../../site/start.html) |
| Source of truth | **Derived**, not canonical — each page summarizes and links to the skill file(s) or EA document(s) it's about. If a page and its linked source disagree, the source is right (Principle P1,
[1_strategy/1_motivation.md](../1_strategy/README.md)). The one page whose subject is partly outside this repo is [`site/start.html`](../../../site/start.html): its archreator-specific steps derive from `README.md`/`CONTRIBUTING.md`, and its third-party tool steps link out to each vendor's official docs — the canonical source there is the vendor's site, so the page states figures as "at the time of writing" and links the live page rather than pinning them |
| Classification | Public |
| Retention | Indefinite, version-controlled via git; no deletion/retention policy needed |

This distinction — derived guidance page vs. canonical skill/EA source —
is itself an instance of the `ea-doc-style` rule "each fact lives in
exactly one document; everything else links to it," applied one level up:
the fact lives in `../../../.claude/skills/` or in this project's own
`docs/ea/`, and the site links to it rather than restating it as a second
authority.
