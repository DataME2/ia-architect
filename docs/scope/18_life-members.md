# Project Scope — Life Members

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** EA alignment only — implementation is deferred to a
future initiative (see Plateaus).

Every club maintains life members — people it has honoured with lifetime
membership for service — informally, and their contact details go stale
between the occasions a club actually needs them: an anniversary, a
reunion, an honour board. Raised by stakeholder request, August 2026, with
one detail that changes the model: the register must still include life
members who have since died, without ever attempting to contact them. That
collides with BR40's participation-based retention rule, which would
eventually discard exactly this record, and with the existing `Person Role`
pattern, which assumes every role is season-scoped. This document resolves
both before either is coded.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | New stakeholder row (Life Members) and new Goal **G8** in [1_motivation.md](../ea/1_strategy/1_motivation.md) — not served by G1–G7, which assume a Person is either currently participating or fading toward disposal, never permanently honoured regardless of participation. New capability **C18** in [2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md), deferred past the Q4 2026 MVP the same way C12 (carnivals) was. No Principle change: Life Member fits Principle P1 cleanly as a role, not a new identity type |
| 2_business | Life Member added as a `Person Role` value with an explicit exception to the season-scoped pattern every other role uses (BR69). `Person` gains an optional date-of-passing field, used only for the honour roll (BR70). New data-quality rule BR71 keeps a living member's contact details demonstrably current. Glossary terms **Life Member** and **Honour roll** added. All in [4_business-objects.md](../ea/2_business/4_business-objects.md) and [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) |
| 3_information | No change yet. The registration slice's data model ([3_information/1_data-objects.md](../ea/3_information/1_data-objects.md), scope doc [17](./17_mvp-registration-slice.md)) is scoped to registration only. Life Member's schema is **Pending — this initiative**, once WP3 starts |
| 4_application | No change yet. No application service or component exists for this capability. **Pending — this initiative** |
| 5_technology | No change. Uses the stack already chosen ([5_technology/1_technology-services.md](../ea/5_technology/1_technology-services.md)) |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | No concept of life membership anywhere in the model. A club's honorary members have no place distinct from an ordinary lapsed registration, and nothing distinguishes "stopped playing" from "died" — BR40's retention job would eventually discard both the same way |
| **Target** (this document) | Life Member recognised as an indefinite `Person Role` (BR69), a deceased life member's record permanently exempted from BR40's retention window (BR70), and a data-quality rule keeping a living member's contact details demonstrably current (BR71). The business-layer model is complete and reviewable; nothing is left to decide before someone writes the schema |

## Work packages and deliverables

### WP1 — Strategy alignment *(done)*

- **Deliverables:** stakeholder row and Goal G8 in
  [1_motivation.md](../ea/1_strategy/1_motivation.md); capability C18 and a
  Courses-of-action deferral note in
  [2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md).
- **Outcome:** the concern has a named place in the strategy layer instead
  of arriving as an undocumented feature request.

### WP2 — Business alignment *(done)*

- **Deliverables:** Life Member role and deceased-date note in
  [4_business-objects.md](../ea/2_business/4_business-objects.md); BR69–BR71
  and two glossary entries in
  [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md).
- **Outcome:** the rules a future schema and rules engine must satisfy are
  written down and reviewable before any code exists — including the
  retention exception, which is the rule most likely to be gotten wrong by
  silent omission rather than by a bad decision.

### WP3 — Information, application, and build *(pending — future initiative)*

- **Deliverables:** a `life_member` (or equivalent) data object and RLS
  policy in `supabase/migrations/`; a contact-currency check (BR71) in
  `src/domain/rules/`; an honour-roll query; entries in
  [4_application/2_application-components.md](../ea/4_application/2_application-components.md)
  with real source paths.
- **Outcome:** clubs can actually record, contact, and honour their life
  members. Not started; sequenced after the registration slice, the way
  carnivals (C12) follow C1–C11.

## In scope / out of scope

| In scope | Out of scope (this document) |
| -------- | ------------------------------ |
| Life Member as an indefinite `Person Role` (BR69) | Schema, migrations, RLS policy — WP3, future initiative |
| Deceased status exempting a record from BR40's retention window (BR70) | UI/screens for recording or browsing life members |
| Contact-currency data-quality rule (BR71) | The process by which a club *awards* life membership — assumed a Committee-style decision, on the pattern of BR21/BR29, but not modelled here |
| Strategy and business EA documentation | Whether a deceased life member can be named publicly (e.g. an honour board on the club website) — that borders Principle P6 and BR57 and is deliberately not opened here |

## Gap notes

- **The award process itself isn't modeled.** BR29 and BR21 show the
  pattern — one named accountable role approves, and the decision is
  recorded — but who approves life membership at a club (Committee vote, a
  life-member sub-committee, a President's nomination) wasn't asked and
  shouldn't be assumed. Closing this is a business-layer question for
  whoever picks up WP3, not a technical gap.
- **Public display of deceased members is untouched.** It sits next to
  Principle P6 (published event data) and BR57 (publicity consent), but
  wasn't opened here — this document only guarantees the record isn't lost
  or discarded, not how or whether it is ever published.
- **No schema exists.** Everything above is business-layer intent; WP3 is a
  full information + application + technology pass whenever it is picked
  up, following the same `ea-first-change` process this document did.

## Open questions

- Who at a club actually approves life membership, and what evidence
  records it — the same shape as [#29](./open-questions.md)'s unresolved
  question for Voucher Program approval. Not urgent: it doesn't block WP1
  or WP2, only WP3.
