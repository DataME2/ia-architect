# Project Scope — SQUADI Access Refusal and the Terms-of-Use Constraint

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

On 31 July 2026 Football Queensland's Registrations team replied to a
written developer-access request made by the pilot club (North Star FC).
The request itself was **never recorded in this repository** — no scope
document, open question, or EA note mentions it, and
[scope document 10](./10_registration-baseline-and-the-squadi-gate.md)
had explicitly placed "any approach to Football Queensland" *out of
scope*. The architecture therefore recorded only that no API **existed**,
never that one had been **asked for and declined**.

This initiative records the reply, and corrects the architecture's
understanding of why SQUADI is unreachable. It adds one business rule
(**BR53**), two glossary terms, one Resource, one object attribute, and
three open questions (**#39–#41**). No application code is written.

## What the reply actually says

Four statements, in ascending order of consequence:

| # | Statement | Consequence |
| - | --------- | ----------- |
| 1 | Squadi supports API integrations, but access is "generally restricted to Football Australia, Football Queensland and approved system partners"; credentials are "not ordinarily provided directly to affiliated clubs" | Stage 2 of the registration ladder depends on **partner status**, not on a request the pilot club can make. The ladder's staging survives — this is the outcome staging was designed for — but the route changed from technical to commercial |
| 2 | Affiliated clubs "are required to use Squadi for competition administration and related functionality" | BR43's eligibility gate is **contractual**, not merely practical. The club cannot route around SQUADI even in principle |
| 3 | **The terms of use "do not permit club accounts or Squadi data to be connected or integrated with unauthorised third-party systems"** | **The largest item in the reply.** It restricts *connection and ingestion*, which is what the CSV fallback does — not write-back, which is what Principle P2 governs |
| 4 | FQ asked what information, use, internal system, and unmet need are involved, and offered to advise | The door is open. The answer given determines which side of statement 3 the platform lands on |

## The API refusal is not the important part

Statement 1 changes a dependency the architecture had already declared
conditional. Stages 2 and 3 were never promised on the Q4 2026 timeline,
and [scope document 9](./9_staged-registration-and-governing-body-tier.md)
staged the ladder precisely so that a failed API negotiation could not
sink the project. That part held.

**Statement 3 is different, because it reaches the fallback.** The
architecture's answer to "there is no API" has consistently been
CSV-based reconciliation: the CSV import/export Resource, capabilities
C2/C4/C9, and — most directly — **C14 and BR44–BR47**, the entire
External registration reconciliation capability added in
[initiative 11](./11_majestri-and-the-reconciliation-gap.md). That
capability consumes Squadi Registration Report and User Report extracts
and compares them against the club's own registrations. On a plain
reading, that is Squadi data connected to a third-party system.

Two things must be said honestly about this:

- **It is ambiguous, not settled.** A club exporting a report it is
  entitled to export, and using a tool to check its own data against it,
  is arguably not "connecting or integrating" anything — no account
  linkage, no credential sharing, no automated access. The clause may be
  aimed at credential-sharing and scraping rather than at a club reading
  its own export.
- **It cannot be assumed either way.** The counterparty has now stated a
  restriction in writing, to this club, in response to this project. The
  risk of guessing wrong is not a failed feature: affiliated clubs are
  *required* to use Squadi (statement 2), so a terms breach puts the pilot
  club's competition administration at risk — a far worse outcome than a
  deferred integration.

BR53 is the resulting rule: record an authorisation basis per source, and
treat unconfirmed as not permitted.

## Majestri is the natural experiment

[Initiative 11](./11_majestri-and-the-reconciliation-gap.md) recorded that
Majestri — which most clubs including the pilot club already run —
performs periodic comparisons of its own registrations against Squadi and
PlayFootball. That is the same operation C14 models.

So either Majestri is an **approved system partner** (in which case the
tier is reachable by a club-management vendor, and Majestri's route is the
template — reinforcing [#33](./open-questions.md)'s "integrate rather than
replace" option), **or** extract-based comparison is not what statement 3
is aimed at (in which case C14's approach is safe as designed). Both
answers are useful, and one question gets either — [#40](./open-questions.md).

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | Governing-body Stakeholder updated from "not yet engaged" to first-contact-made, carrying FQ's stated position; Goal **G6** gains a note hardening stage 2's dependency from *absent* to *refused at club level*; **Principle P2** gains a note recording that it does *not* answer this restriction — it governs write-back, not connection; new Resource capturing the reply; the CSV import/export Resource qualified; the ladder's stage 2 dependency restated as partner status; new Course of action on the partner route and on what to answer FQ. No new Principle, Goal, or Capability |
| 2_business    | Problem statement corrected — the missing API is a policy, not a gap; new rule **BR53** (authorisation basis per source, unconfirmed means not permitted); two glossary terms (*Approved system partner*, *Authorisation basis*); **External System Extract** object gains the authorisation-basis attribute. No new service, process, or actor — this constrains an existing capability rather than adding one |
| 3_information | No change — not started. Added to its queue: the authorisation basis is per-source metadata that sits alongside BR45's limitations metadata on the same object |
| 4_application | No change — not started. Flagged: C14's ingestion is now gated on a legal answer, so it should not be the first capability built regardless of its architectural readiness |
| 5_technology  | No change — not started |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | The architecture recorded that no SQUADI API existed, treated CSV extracts as the unproblematic fallback, and had no record that access had ever been requested. Permission to ingest external data was never modeled — it was assumed |
| **Target** (delivered) | The refusal and its stated reasons are recorded; stage 2's dependency is restated as approved-partner status; the terms-of-use restriction on the CSV fallback is named as an unresolved risk with a rule (BR53) governing behaviour until it resolves; and the three questions that resolve it are owned and numbered |

## Work packages and deliverables

### WP1 — Record the counterparty's position

- **Deliverables:** `docs/ea/1_strategy/2_capabilities-and-resources.md`
  (FQ response Resource; CSV Resource qualified),
  `docs/ea/1_strategy/1_motivation.md` (Stakeholder row, G6 note)
- **Outcome:** the reply is in the architecture rather than in an inbox,
  and the next person to ask "why don't we just use the API?" finds the
  answer with its date and its source.

### WP2 — The terms-of-use constraint

- **Deliverables:** `docs/ea/2_business/5_domain-context-and-rules.md`
  (problem statement, BR53, two glossary terms),
  `docs/ea/2_business/4_business-objects.md` (External System Extract),
  `docs/ea/1_strategy/1_motivation.md` (P2 note)
- **Outcome:** ingestion permission is a modeled, recorded property of
  each source rather than an assumption, and P2's limit is stated where
  someone would otherwise rely on it.

### WP3 — Governance scaffolding

- **Deliverables:** this scope document, `docs/scope/README.md` index row,
  `docs/scope/open-questions.md` (#39–#41)
- **Outcome:** the unresolved legal reading, the Majestri test, and the
  partner-status motion are owned questions rather than open risk.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Recording FQ's reply and its four statements | **Replying to FQ** — the four scoping questions need an answer, and the answer is a positioning decision (see gap notes) |
| BR53, the authorisation-basis attribute, two glossary terms | A **legal reading** of Squadi's terms of use — this records the risk, it does not resolve it ([#39](./open-questions.md)) |
| Restating stage 2's dependency as approved-partner status | Pursuing partner status, or deciding who owns that motion ([#41](./open-questions.md)) |
| Naming the Majestri natural experiment | Contacting Majestri, or confirming its partner status ([#40](./open-questions.md)) |
| — | Any change to C14's design — its architecture stands; only its *build* is gated |
| — | Any code — no `src/`, no tests, no build |

## Gap notes

- **C14 is architecturally ready and legally blocked.** Nothing in
  BR44–BR47 is wrong, and this initiative changes none of it. But building
  extract ingestion before [#39](./open-questions.md) is answered would
  wire the platform's most concrete value proposition — the counted 40
  players missing from SQUADI — to a data flow the counterparty may
  consider prohibited. The reconciliation *problem* remains real
  regardless; only the platform's route to it is in question.
- **Answering FQ is itself a risk, and it is not merely a drafting
  exercise.** FQ asked which internal system is involved. A description
  centred on holding and reconciling Squadi data invites statement 3;
  a description centred on stage 1 — helping families submit *into* Squadi
  correctly the first time — describes something with no data connection
  at all, and is also what the project is actually building first. These
  are different products and the answer commits to one, which is why this
  document does not draft the reply.
- **The partner-status motion and the governing-body tier are the same
  door.** [#31](./open-questions.md) contemplates Football Queensland as a
  *customer*; [#41](./open-questions.md) contemplates it as an
  *authoriser*. Both mean approaching the same organisation, and an
  approach made for one will be read as an approach for the other.
  Sequencing them separately risks a "no" on the smaller ask closing the
  larger one.
- **Statement 2 strengthens BR43 and weakens every workaround.** Clubs are
  *required* to use Squadi. Any future proposal that quietly routes around
  it — a club-native register of record, a parallel eligibility list — now
  contradicts a written contractual position, not merely a habit.
- **Football Australia is unassessed.** All four statements are Football
  Queensland's, about Squadi. Stage 3 depends on Football Australia and
  PlayFootball, whose position on third-party integration has never been
  asked and should not be inferred from this reply.

## Open questions

- **#39 (new).** Does Squadi's terms of use prohibit Let'sDataTalk
  ingesting CSV extracts a club exports from its own account? Adopted
  interpretation: **treat as prohibited until confirmed** (BR53).
- **#40 (new).** Is Majestri an approved system partner, or is
  extract-based comparison simply outside what the restriction targets?
- **#41 (new).** Does Let'sDataTalk pursue approved system partner status,
  and who owns that motion — the vendor, not the pilot club?
