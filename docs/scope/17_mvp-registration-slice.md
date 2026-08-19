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

- **Configuration and Supabase clients** — `src/data/`. Three clients that
  differ in one way that matters: whether Row-Level Security applies.
  `createAdminClient(reason)` bypasses it, so it throws if a browser could
  reach it and takes a reason from a **closed set**, making every bypass in
  the codebase greppable and the list of legitimate reasons reviewable.
  `readServiceConfig()` refuses a `NEXT_PUBLIC_`-prefixed service key,
  because that prefix is what ships a value to every browser and the mistake
  is one character.
- **[2_deployment.md](../ea/5_technology/2_deployment.md)** — environments,
  and where secrets live. It states the load-bearing connection plainly:
  **the anon key is safe only because RLS is on every table**, so if
  coverage lapses the published key stops being safe. That is why the
  coverage check fails the build rather than warning.

**57 tests.** A latent bug in `check_links.py` surfaced with the first
dependency — it walked `node_modules` and reported third-party READMEs —
and is fixed by skipping vendor directories.

- **The screens** — `src/app/` (Next.js App Router), `src/web/`,
  `src/data/queries.ts`. The registrar's season queue grouped by what each
  registration is waiting on, a detail page showing every rule's outcome by
  number, BR55 legal-name verification as an act only a club officer can
  perform, BR5 duplicates surfaced rather than merged, and the family
  collect-once form. Session handling via Supabase auth, with `src/proxy.ts`
  refreshing it so `auth.uid()` — which every RLS policy keys off — keeps
  resolving.

**109 tests.** The screens' logic is pure and lives in `src/web/`, so it is
tested by the same `node --test` run as the domain, with no browser and no
database. Three of those tests are worth naming:

- **Sent is not registered, on screen.** `PENDING_EXTERNAL_REGISTRATION`
  gets its own pile with its own label, and a test asserts it never
  collapses into "Registered" (BR60, BR43). The failure that guards is a
  child put on the field because the club's own screen looked finished.
- **`//evil.example` is not a local path.** The sign-in redirect takes its
  destination from an allowlist, because the obvious `startsWith('/')` check
  passes a protocol-relative URL — an open redirect on the one page that
  handles credentials. Found by Next's typed routes rejecting the string.
- **Today is Brisbane's today.** Minority (BR1) and the transfer of
  authority at 18 (BR67) are date comparisons, and a UTC server is already
  tomorrow while Queensland is still yesterday evening. Getting it wrong
  makes a child an adult a day early.

**One structural rule gained an enforcer.** The rules engine's freedom from
I/O was a documented convention; `tsconfig.domain.json` now typechecks
`src/domain/` and `src/web/` with no DOM library, so browser globals in
either fail the build. Verified by deliberately leaking `document.title`
into a pure module and confirming the main config accepted it while the
domain config rejected it — the same "prove it fails" discipline as the RLS
behavioural test.

- **The submission pack screens** — `src/app/registrar/pack/`,
  `src/data/packs.ts`. A preview built by the *same* pure function that
  generates, so what is shown is the pack rather than an approximation of
  it; versioned generation (BR58); handover recorded once against a named
  channel (BR59); CSV served from the stored manifest; and per-person
  outcomes, which are the only route to `COMPLETE` and therefore to
  eligibility (BR60, BR43).

**123 tests**, plus a second behavioural SQL suite. Two things are worth
naming:

- **Generating is not sending, and the screens keep them apart.** Generating
  freezes an artifact and moves no status. Only recording a handover writes
  submission records — every one as *sent* — and moves registrations to the
  eligibility gate. The pack detail page counts *sent* and *confirmed*
  separately and never adds them, because only the second means a player may
  take the field.
- **BR58's immutability is now proved in the database.**
  `supabase/tests/11_submission_pack.sql` asserts a handover can be recorded
  once and never rewritten, that a pack cannot be deleted, and that another
  club sees none of it — nine scenarios, verified to fail when the handover
  policy is loosened. Application code checks the same thing; the policy is
  what actually holds.

**A second gap the code found in the model.** BR58 requires a pack to answer
"did we submit this player, **and with what values**?" months later. It could
not: `submission_record` records who was in a pack, and `person` holds
today's values — so a name corrected after submission would make the pack
appear to have carried the correction. Migration `0004` adds a `manifest`
column holding the frozen rows, and the CSV is serialised from it, so
downloading version 1 in December reproduces what was sent in August. Same
pattern as `legal_name_verified_at`: implementation finding a gap in the
model, and the model being corrected rather than the code working around it.

**Next:** a public tokenised family link — see the gap note below.

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
- **The family form needs a club login, which is not the shape it should
  ship in.** ~~A family is not a tenant user, so under RLS an anonymous
  submission has no policy that would let it insert.~~ **Closed by
  [scope document 19](./19_tokenised-family-link.md)**, which took the route
  named here — an unguessable per-club invitation token and a
  `security definer` function inserting against exactly one `club_id`, not
  a service-role write — through its own pass of the EA layers, as BR72,
  BR73 and [decision 6](../decisions/6_public-registration-through-a-scoped-function.md).
