# Project Scope — Beginner Setup Guide

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** `example/` on branch `claude/beginner-setup-guide-dnef32`.

The site explained the *method* well but assumed the reader already knew
how to use GitHub and already had an AI agent set up. Its most explicitly
named stakeholder — "AI-first builders / vibe coders" — includes people who
have never created a GitHub repository, never opened a terminal, and don't
know whether they need to install an editor. This initiative adds one
beginner-facing page that takes such a reader from nothing to their first
reviewed change, answering the two questions they actually ask first:
*what's the simplest way, and how do I do it for free?* The short answers —
no VS Code (or any install) is required, and there is a genuinely free path
— are the spine of the page.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | No new stakeholder (sharpens the existing "vibe coders" concern to include total newcomers); one new goal **G3 — Frictionless, free start** — see [1_strategy/1_motivation.md](../ea/1_strategy/1_motivation.md). The new page is a second realization of the existing **Adopt** value-stream stage — see [1_strategy/3_value-stream.md](../ea/1_strategy/3_value-stream.md) |
| 2_business    | No new service, process, actor, or rule. The existing **EA-first method guidance** service description is broadened to name "getting set up from zero" alongside explaining the method — see [2_business/2_business-services.md](../ea/2_business/2_business-services.md) |
| 3_information | No new data object. A new instance of the existing **Guidance page** object; its "source of truth" note is extended: setup steps derive from `README.md`/`CONTRIBUTING.md`, and third-party tool steps link out to official vendor docs (a source that lives outside this repo) — see [3_information/1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 4_application | One new component, **Setup page**, added to the **Guidance publishing** application service (four → five components) — see [4_application/2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology  | **No change.** Same static, build-free HTML deployed by the existing workflow to GitHub Pages; the new page is one more file copied verbatim — see [5_technology/2_deployment.md](../ea/5_technology/2_deployment.md) |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | The site taught the method but assumed a reader who already had a GitHub account and a working AI agent; a total newcomer had no page telling them what to sign up for, whether an editor was required, or how to start for free |
| **Target** (delivered) | A `Start here` page walks a newcomer from "no GitHub account" to "first reviewed change": create the account, copy the template, pick an AI agent (free-first, VS Code not required), then run the Requester → Agent → Reviewer loop |

## Work packages and deliverables

### WP1 — Beginner setup page

- **Deliverables:** `example/site/start.html` — a new guidance page with:
  a plain-language mental model (GitHub + a template copy + an AI agent, no
  editor install), three numbered setup steps, a free-first agent
  comparison (GitHub Copilot free tier vs. Claude Code on the web, plus the
  student/open-source free upgrades), and a hand-off to the
  [walkthrough](../../site/walkthrough.html) for the first change.
- **Outcome:** a newcomer with zero prior GitHub or CLI experience can get
  set up — for free — without reading the parent template's `README.md` or
  any skill file.

### WP2 — Wire the page into the site and the EA docs

- **Deliverables:** `Start here` added to the primary nav on all five
  `site/*.html` pages; a discoverability link from `index.html`'s
  quickstart; the new component row on `site/architecture.html`; and the
  EA-doc edits listed in the alignment table above (`1_strategy`,
  `2_business`, `3_information`, `4_application`).
- **Outcome:** the page is reachable from every page, and the EA set stays
  verifiable — the new page is named by the value stream, the data-object
  inventory, and the application-component table.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| One beginner page covering the free-first path, tool-agnostic where it can be | A dedicated deep-dive page per agent tool (Claude Code, GitHub Copilot, Cursor, …) — the page flags these as future work and keeps a comparison instead |
| Concrete free/cheap options with links to official pricing and docs | Live/verified pricing — numbers drift, so the page links each vendor's current pricing page rather than pinning exact figures as canonical |
| VS Code explicitly called out as *not required* | A local-install / IDE track (terminal Claude Code, desktop Copilot) — deferred; the free-first, no-install path is the priority |

## Gap notes

- **Per-tool pages.** The user anticipated "a separate page for each tool."
  This initiative deliberately ships one tool-agnostic page first so a
  newcomer isn't forced to choose a vendor before understanding the shape.
  Splitting the agent-comparison section into dedicated pages is a clean
  follow-up: each becomes a new **Guidance page** instance and a new row in
  the application-component table, with `start.html` linking out to them.
- **Pricing freshness.** Third-party free tiers and prices change often.
  The page mitigates this by linking official pricing/plan pages and
  framing figures as "at the time of writing," but it will still need
  periodic review — the same derived-vs-canonical tension as any other
  page, one step further out because the canonical source is a vendor's
  site, not this repo.

## Open questions

- None. The page recommends an interpretation of "simplest free way" (free
  no-card path = GitHub Copilot free tier; simplest end-to-end = Claude
  Code on the web) that the Pilot confirms by reviewing and merging the
  branch — the standard co-pilot checkpoint, not a question needing
  out-of-band sign-off. This project keeps no `open-questions.md` log.
