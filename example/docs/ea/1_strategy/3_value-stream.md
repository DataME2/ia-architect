# Value Stream

_[← Strategy layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Value Stream, Value Stream Stage.

## Discover → Understand → Adopt

```mermaid
flowchart LR
  discover["Discover<br><i>lands on the guidance site</i>"]:::strategy
  understand["Understand<br><i>reads the method + the<br>actor-notation example</i>"]:::strategy
  adopt["Adopt<br><i>uses 'Use this template'<br>on the main repo</i>"]:::strategy

  discover --> understand --> adopt

  classDef strategy fill:#f5deaa,stroke:#c8a24a,color:#333
```

| Stage | Realized by |
| ----- | ----------- |
| Discover | [`site/index.html`](../../../site/index.html) — landing page, states the one rule and links onward |
| Understand | [`site/guide.html`](../../../site/guide.html) — the EA-first process and the human/AI/hybrid actor notation as reference — and [`site/walkthrough.html`](../../../site/walkthrough.html) — one requirement walked through the five layers end to end, plus the situational skills |
| Adopt | [`site/start.html`](../../../site/start.html) — a beginner's zero-to-first-change setup guide (create an account, copy the template, pick an AI agent — free-first, no editor install), and [`site/architecture.html`](../../../site/architecture.html) — this project's own filled EA layers, as the concrete "what it looks like when finished," plus a direct link to the parent template's "Use this template" flow |

This value stream is realized end to end by the
[EA-first method guidance](../2_business/README.md) business service.
