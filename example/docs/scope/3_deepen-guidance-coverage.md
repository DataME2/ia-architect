# Project Scope — Deepen Guidance Coverage

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** `example/` on branch `claude/repo-ux-example-app-dhy09b`.

Both prior initiatives left the same gap open in their "out of scope"
tables: the situational skills `story-sharding` and `stack-selection` were
linked but never walked through, and there was no single narrative showing a
requirement travelling the whole process end to end. This initiative closes
that gap. It adds a **walkthrough page** that follows one requirement up the
five-layer ladder — making explicit, at each step, what the human (Requester
and Reviewer) does and what the AI Agent produces — and gives the two
situational skills dedicated, in-context coverage on the same page.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | No new goals or Principles. Serves existing **Goal G1 (legible guidance)** and **Goal G2 (living proof)** more fully — the walkthrough narrates its own creation and points at this scope document as the real paper trail. The **Understand** value-stream stage now has a second realizer (the walkthrough) alongside the guide — see [1_strategy/3_value-stream.md](../ea/1_strategy/3_value-stream.md) |
| 2_business    | **No change.** Same business service, same actors (Pilot, Copilot at co-pilot, Template adopter), same publish process |
| 3_information | **No new data-object type.** The walkthrough is one more instance of the existing *Guidance page* (derived, non-canonical) — location list extended in [3_information/1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 4_application | **New component:** the Walkthrough page ([`site/walkthrough.html`](../../site/walkthrough.html)), plus a self-contained timeline / actor-line component added to [`site/styles.css`](../../site/styles.css). Registered in [4_application/2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology  | **No change.** Same GitHub Pages hosting and Actions deploy; the new page is static and fetches nothing at request time |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | Three pages; `story-sharding` and `stack-selection` linked but not explained; no single end-to-end narrative of a change moving through the process |
| **Target** (delivered) | A fourth page that walks one requirement through all five layers with the Requester/Agent/Reviewer roles made explicit, and gives the two situational skills dedicated coverage; discoverable from every page's nav and from the guide |

## Work packages and deliverables

### WP1 — Walkthrough page

- **Deliverables:** [`site/walkthrough.html`](../../site/walkthrough.html);
  the `timeline`, `tl-*`, and `actor-line` components in
  [`site/styles.css`](../../site/styles.css)
- **Outcome:** a start-to-finish narrative — requirement → five layers →
  scope doc → implement → PR → review/merge → deploy — that makes the
  Requester/Agent/Reviewer split concrete at each step

### WP2 — Situational-skill coverage

- **Deliverables:** dedicated `#stack-selection` and `#story-sharding`
  sections on the walkthrough page (when each triggers, what it does, what
  it produces), linked from the guide's skills table
- **Outcome:** the gap named in scope documents
  [1](./1_publish-guidance-site.md) and
  [2](./2_redesign-guidance-site.md) is closed

### WP3 — Cross-linking and navigation

- **Deliverables:** "Walkthrough" added to the nav on `index.html`,
  `guide.html`, and `architecture.html`; a landing-page link from the ladder
  section; the guide's skills table pointed at the new deep sections; the
  walkthrough added to the application-components table and the value stream
- **Outcome:** the new page is reachable from everywhere it's relevant, and
  the EA docs stay true to the four-page site

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| One walkthrough page covering the full process | Separate standalone pages per skill — dedicated *sections* were chosen over thin per-skill files (see gap note) |
| Dedicated coverage of `stack-selection` and `story-sharding` | Re-walking `scope-doc` and `pr-description` — core skills already covered in depth on the guide |
| An illustrative worked example (adding an FAQ) | A second *real* AI actor or a real sharded initiative — none exists to point at yet |

## Gap notes

- **Sections vs. separate pages:** the two situational skills got anchored
  sections on the walkthrough rather than standalone files, to keep one
  coherent narrative and avoid two thin pages. Splitting them into their own
  components later is a trivial follow-up if the content grows.
- **Illustrative example:** the walkthrough follows a hypothetical "add an
  FAQ" requirement as a teaching device; it does not claim a `faq.html`
  exists. Credibility is anchored to a *real* artifact instead — this scope
  document, which the walkthrough links to as its own paper trail (Principle
  P1: the page is derived, and points at its source).

## Open questions

- None. This initiative adds a page and coverage; it introduces no new
  interpretation of a requirement that a stakeholder needs to confirm.
