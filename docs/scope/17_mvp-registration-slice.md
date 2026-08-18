# Project Scope — The MVP Registration Slice

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

The first initiative that will produce **code**. It starts the three
unstarted EA layers — [information](../ea/3_information/README.md),
[application](../ea/4_application/README.md), and
[technology](../ea/5_technology/README.md) — and defines the thin vertical
slice the build begins with: **one-shot registration for North Star FC**.

## Why registration, and why only registration

Registration is not merely a sensible first slice — under the current
constraints it is close to the only one:

- **It is stage 1 of the ladder, the only unconditional rung.** Everything
  above it depends on Football Queensland.
- **It attacks the confirmed dominant pain.** Registration takes *weeks*,
  and the cause is guardian confusion and error — nicknames instead of
  legal names (BR55, [#32](./open-questions.md)).
- **It needs nothing from anyone.** No [#39](./open-questions.md), no
  [#42](./open-questions.md), no [#43](./open-questions.md), no
  [#46](./open-questions.md). Nothing here waits on a reply.
- **It is the demonstration the strategy already committed to.** The
  adopted sequence is to approach a national body only with a working
  first-shot registration to show. This slice *is* that artifact.
- **It exercises the spine.** C1, C2, C6, C10, C15 and C16 are the
  foundation every later capability sits on. Building them for registration
  builds them once.

## What is in the slice

| Capability | In this slice |
| ---------- | -------------- |
| **C1** Identity & roles | `Person` with legal and preferred names, roles per season, duplicate candidates surfaced for human confirmation |
| **C2** Registration | Season registration, guardian, required documents, status |
| **C6** Validation | BR1–BR5 and BR55 as individually testable rules, results persisted |
| **C10** Multi-tenancy | Club, season, and Row-Level Security on every table |
| **C15** Consent | The three consents as independent records (BR48, BR56, BR57) |
| **C16** Submission pack | Generate, version, hand over, and track *sent* versus *registered* (BR58–BR60) |

**Out:** finance and vouchers, referee lifecycle and payment, competitions
and fixtures, carnivals, calendar distribution, the mobile experience
(C17), communications (C7), and **C14 reconciliation — blocked by
[#39](./open-questions.md)**, not merely deferred.

## The one thing to get right first

**Tenant isolation, because it is the only mistake that cannot be
apologised for.** Everything else in this slice is a feature that can be
wrong and then fixed. A cross-tenant leak of children's data is a different
category of failure, and it happens through an ordinary omission — one
query missing a filter.

That is why the stack choice was made on this property: Supabase enforces
P5 in the **database** through Row-Level Security, so a forgotten filter
returns nothing rather than everything. The corollary is recorded as a
build gate — **a table shipped without a policy fails CI**, because a
table without a policy is open.

## The tension the information layer had to settle

**P1 says one `Person`; P5 says no club sees another's data.** They collide
when a child plays for two clubs. Resolved in
[1_data-objects.md](../ea/3_information/1_data-objects.md): **`person` is
tenant-scoped**. P1 holds *within* a club — which is what it was written
for, the player who is also a referee whose mother is on the committee.
Cross-club identity is a different problem with an existing owner: BR44's
matching and C14, unsolved for the same reason there. Making `person`
global would move the matching problem into the primary key and break P5
on the way.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | No change. The slice realises existing capabilities; it introduces no Goal, Principle, or Capability |
| 2_business    | No change. Every rule the slice implements — BR1–BR5, BR43, BR48, BR55–BR60 — already exists. **This is the point of the EA-first process working:** the first code writes down nothing new |
| 3_information | **Started.** [1_data-objects.md](../ea/3_information/1_data-objects.md) (the slice's tables, and the P1/P5 resolution) and [3_data-architecture.md](../ea/3_information/3_data-architecture.md) (four classification classes, RLS as the enforcement point, retention **tracking without disposal**). `2_data-flows.md` deferred until there is more than one flow |
| 4_application | **Started.** [1_application-services.md](../ea/4_application/1_application-services.md) and [2_application-components.md](../ea/4_application/2_application-components.md), with every component mapped to a source path and marked *planned* until it exists. Documents 3–5 deferred — the component count does not yet justify them |
| 5_technology  | **Started.** [1_technology-services.md](../ea/5_technology/1_technology-services.md): Next.js + Supabase + Vercel, Sydney region, with the RLS property as the deciding reason and the vendor-concentration cost stated |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | Strategy and business architecture complete to 68 rules and 17 capabilities; information, application and technology layers empty; no code; no stack chosen |
| **Target** (delivered) | A stack recorded with its reasoning, a data model for the registration slice with tenant isolation as a database property, an application component list grounded in source paths, and a defined build list — no code yet, but nothing left to decide before writing it |

## Work packages

### WP1 — Technology layer *(done)*
Stack decision recorded, with what it buys, what it costs, and what is
deliberately deferred.

### WP2 — Information layer *(done)*
Data objects for the slice, the P1/P5 resolution, classification, and the
retention-tracking-without-disposal split.

### WP3 — Application layer *(done)*
Services, components, source-path grounding, and the two structural rules
for the code — no I/O in the rules engine, and business-rule identifiers as
the join between code and architecture.

### WP4 — The build *(in progress)*

**Delivered:**

- **Domain model and rules engine** — `src/domain/`. BR1, BR2, BR3, BR48
  and BR55 as pure functions with no I/O, a registry that is the single
  place code and `5_domain-context-and-rules.md` are compared, and BR5's
  duplicate detection. **28 tests, no build step** — Node 22 strips types,
  so the whole domain runs on one dev dependency.
- **Schema and RLS** — `supabase/migrations/`. Thirteen tables, with RLS
  enabled in the *same* migration that creates them so no table exists for
  a moment without it, and the policies in the next.
- **The policy coverage gate** — `scripts/check_rls.py`, wired into CI.
  Verified against a deliberately broken table: it catches a missing
  `enable`, a missing policy, and a missing `club_id` independently.
- **CLAUDE.md's Commands section and the CI workflow**, both of which had
  been waiting on the stack decision since the repository was created.

- **Submission pack builder** — `src/domain/submission/`. Assembles,
  versions and freezes a pack (BR58), minimises its fields (BR59), and keeps
  *sent* apart from *registered* (BR60). Still pure: the same candidates and
  options always produce the same pack, which is what makes "the pack is
  your evidence of what you sent" mean anything.

**50 tests across the domain.** Four of them are worth naming, because each
guards a failure that would be expensive and quiet:

- The preferred name **never** reaches the CSV (BR55) — the whole rule's
  purpose, asserted at the boundary rather than trusted.
- An unresolved duplicate is **excluded**, not guessed (BR5). Sending one
  risks attaching a registration to a different child.
- A photograph travels **only** with both the pack option *and* a live
  identification-photograph consent, and stops the moment it is revoked
  (BR56, BR59).
- Handover **never** produces `COMPLETE`. Every submission record starts as
  `sent`, because sending is the club's act and registering is the
  federation's (BR60, BR43).

The pack is `Object.freeze`d, so BR58's immutability is a property of the
value rather than a comment, and a test asserts the mutation throws.

**Next:** the Next.js registrar screens and family flow, and typed data
access against Supabase.

**One thing the code changed in the architecture.** Writing BR55 showed the
rule was unenforceable as modelled: holding a legal name and having
*checked* it are different claims, and only the second survives contact
with the federation. `person.legal_name_verified_at` was added to
[1_data-objects.md](../ea/3_information/1_data-objects.md) and to the
schema. This is the EA-first process working in the other direction —
implementation finding a gap in the model, and the model being corrected
rather than the code quietly working around it.

## Gap notes

- **Retention tracking ships; disposal does not.** Every row knows its
  class and its eligible-for-disposal date. Nothing deletes automatically
  until [#30](./open-questions.md) is answered. This is the one place in
  the project where building the obvious thing could cause irreversible
  harm.
- **The slice produces the measurement, but does not perform it.**
  Persisting validation results makes [#32](./open-questions.md)'s
  decomposition a query rather than a new instrumentation project — but the
  historical profiling is still a task nobody has done, and stage 1 still
  has no numeric target until someone does.
- **`2_data-flows.md`, and application documents 3–5, are deliberately
  absent.** The layer READMEs say a small project may populate only the
  first one or two. Writing five documents about three components would be
  ceremony, and the rule is that the EA stays *true*, not that it stays
  complete.
- **Scheduled work has no home yet.** BR50's withdrawal, BR51's
  re-verification, and BR67's transfer at 18 all need a scheduler. None is
  in this slice, and the technology layer notes it as the first thing the
  chosen stack would outgrow.
