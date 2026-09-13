# Requirements

_[← Spec](./README.md) · [Design](./design.md) · [Tasks](./tasks.md) · [EA home](../ea/README.md)_

**Purpose.** The structured functional and non-functional requirements for
Let'sDataTalk, **each with a verified status** — checked against the code
and the test suites in September 2026, not against intent.

This document is deliberately not a new source of truth. The requirements
originate in the [strategy](../ea/1_strategy/1_motivation.md) and
[business](../ea/2_business/5_domain-context-and-rules.md) layers; every row
here points back at the goal, capability, or business rule it restates. What
this document adds is **one page on which what was asked for and what
exists can be compared**.

---

## 1. How status was verified

| Status | Means | Evidence required |
| ------ | ----- | ----------------- |
| **Verified** | Works end to end and is exercised by tests | A code path **and** a passing test naming the rule |
| **Partial** | The named part works; the row says what is missing, and the missing part is not a detail | Code path, plus a stated gap |
| **Designed** | A written design exists and no code does it | A scope document or decision record |
| **Not built** | No design, no code | — |

Measurements taken 13 September 2026 on `spec-driven-development`:

| Measure | Value | How |
| ------- | ----- | --- |
| Unit test suites / assertions passing | **73 / 561** | `npm test` |
| Database policy test files | **24** | `supabase/tests/*.sql` |
| Migrations applied | **29** | `supabase/migrations/` |
| Tables under RLS | **45** | `python3 scripts/check_rls.py` (a table without RLS, a policy and a `club_id` fails the build) |
| Business rules documented | **133** (BR1–BR133) | [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md) |
| Business rules whose identifier appears in `src/` or `supabase/` | **85** | `grep -rhoE 'BR[0-9]+' src supabase` |

> **An identifier appearing in the source is evidence of reach, not of
> correctness.** It is the cheapest honest measure available and is used
> that way: the 41 rules with no reference are certainly not built; the 85
> with one are built to the extent their tests prove.

---

## 2. Functional requirements

Numbered `FR-<capability>.<n>`. The capability column is the strategy
layer's C-number, so a requirement traces upward to a goal and downward to
a business rule without an intermediate mapping table.

### FR-C1 — Identity and role management

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C1.1 | One `Person` per human per club, holding many roles simultaneously and across seasons | P1 | **Verified** | `src/domain/types.ts`, `person`, `person_role` |
| FR-C1.2 | A Person's legal name is stored separately from their preferred name, and only the legal name is used externally | BR55 | **Verified** | `src/domain/rules/br55-legal-name-verified.ts` |
| FR-C1.3 | Guardianship records authority (to 18) separately from contact (beyond it) | BR1, BR67 | **Verified** | `guardianship.is_authority` / `is_contact` |
| FR-C1.4 | Two Person records that look like one human are flagged for a human to decide, never merged silently | BR5 | **Verified** | `src/domain/identity/br5-duplicate-candidates.ts` |
| FR-C1.5 | A confirmed duplicate is resolved by a human choosing a survivor; the other is kept as a tombstone | BR82 | **Verified** | `merge_person()`, `src/app/registrar/duplicates/` |
| FR-C1.6 | A sign-in account is linked to at most one Person per club, by an administrator, never inferred from an email | BR106–BR108 | **Verified** | `account_person`, `supabase/tests/25_account_person.sql` |
| FR-C1.7 | Life membership is an indefinite role with no season, surviving the holder's death | BR69–BR71 | **Verified** | A seasonless `person_role`, enforced both ways; `deceased_on` on `person`; never proposed for disposal |

### FR-C2 — Player registration

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C2.1 | A season registration is collected once — player, guardian, documents, consents — through **one creation path** shared by the public link and the registrar | — | **Verified** | `app_create_registration`, migration 0009 |
| FR-C2.2 | A family completes a registration through an unguessable, revocable, season-and-club-scoped link **without an account** | BR72 | **Verified** | `src/app/join/[token]/`, `supabase/tests/12_public_registration.sql` (18 scenarios) |
| FR-C2.3 | An invitation token is stored only as a hash and shown once at issue | BR73 | **Verified** | `registration_invitation.token_hash`, `ReissueButton.tsx` |
| FR-C2.4 | A second child reuses the guardian Person already held, matched on normalised email within the club | BR80 | **Verified** | `supabase/tests/15_vouchers_and_siblings.sql` |
| FR-C2.5 | The club's per-season document checklist and fee are stamped onto each registration as it is created | — | **Verified** | migration 0006, `src/app/registrar/season/` |
| FR-C2.6 | Registration status is derived from rule outcomes, not set by hand | BR43 | **Verified** | `src/domain/rules/registration-status.ts` |
| FR-C2.7 | An imported historical registration never enters the queue, a pack, or a reminder | BR90 | **Not built** | Blocked with C9 |
| FR-C2.8 | An overseas-origin registration is held until an International Transfer Certificate is on file | BR35–BR38 | **Not built** | Stage 3 of the registration ladder |

### FR-C6 — Deterministic validation

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C6.1 | Each rule is a pure, individually testable function returning an outcome carrying the rule's identifier | P3 | **Verified** | `src/domain/rules/` |
| FR-C6.2 | A minor's registration cannot complete without a guardian | BR1 | **Verified** | `br1-guardian-required.ts` |
| FR-C6.3 | A registration cannot complete with a required document missing | BR2 | **Verified** | `br2-required-documents.ts` |
| FR-C6.4 | A registration cannot complete with anything outstanding; a credit is never an obstacle | BR3 | **Verified** | `br3-outstanding-payment.ts` |
| FR-C6.5 | A minor's data is processed only under recorded, revocable guardian consent | BR48 | **Verified** | `br48-consent-recorded.ts`, `consent` (one row per purpose) |
| FR-C6.6 | Rule outcomes are **persisted**, so "what was missing in March" is a query | — | **Verified** | `validation_result` |
| FR-C6.7 | Deterministic rules run before any generative step, and the assistant's output never changes a status | P3, BR15 | **Partial** | `AssistantNote.tsx` offers only *use* or *dismiss*; no generative step exists yet, so BR15 is structurally satisfied and untested |

### FR-C3 — Player finance

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C3.1 | A payment plan's instalments sum to **exactly** its total, cent-exact | BR74 | **Verified** | `src/domain/finance/plan.ts`, deferred constraint trigger, `tests/14_payment_plans.sql` |
| FR-C3.2 | At most one live plan per registration; a superseded plan is cancelled, never deleted | BR75 | **Partial** | Partial unique index enforces it; `BR75` appears in no source comment |
| FR-C3.3 | A plan's final instalment falls on or before the season's end | BR76 | **Verified** | `plan.ts` |
| FR-C3.4 | Payments are append-only; a refund is a new reversing entry | BR77 | **Verified** | `payment.reverses_payment_id`, append-only **by the absence of an update policy** |
| FR-C3.5 | Only Finance Admin or Treasurer may agree a plan or record a payment; a coach sees eligibility, never the balance | BR78 | **Verified** | RLS policy + `tests/14_payment_plans.sql` |
| FR-C3.6 | **No pay, no play** — evaluated fresh from status *and* balance, never stored | BR79 | **Verified** | `src/domain/finance/eligibility.ts` |
| FR-C3.7 | An attached voucher reduces no balance until a human verifies it, whereupon it becomes an ordinary payment | BR81 | **Verified** | `src/domain/finance/voucher.ts`, `registration_voucher.relief_payment_id` |
| FR-C3.8 | A voucher cannot be applied to more than one invoice | BR4 | **Not built** | No invoice object exists; the slice works from a registration balance |
| FR-C3.9 | Money is **moved** — card, bank, reconciliation | — | **Not built** | Square is chosen and unintegrated. A treasurer types in what arrived |

### FR-C4 — Referee lifecycle

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C4.1 | A referee's classification is a history of dated rows, never an overwritten column | BR110 | **Verified** | `referee_classification`, migration 0023 |
| FR-C4.2 | A referee declares availability and unavailability per season | BR62 | **Verified** | `referee_availability`, `src/web/availability-view.ts` |
| FR-C4.3 | A designation is refused on direct role conflict, double-booking, insufficient classification, suspension, or expired accreditation | BR6–BR10, BR109 | **Verified** | `src/domain/officiating/conflicts.ts` |
| FR-C4.4 | Same-club affiliation, family relationship, travel and consecutive-match load produce an audited **warning**, not a block | BR11 | **Verified** | `conflicts.ts`, `audit_event` |
| FR-C4.5 | Accreditation is checked against the **fixture's** date, not today | BR111 | **Verified** | `conflicts.ts` |
| FR-C4.6 | Every designation records which party made it — club or association | BR114 | **Verified** | `match_official_appointment` |
| FR-C4.7 | A decline or withdrawal is not recorded at all until a reason is given | BR42, BR112 | **Verified** | migration 0025 |
| FR-C4.8 | A designation for an under-18 official is proposed to their guardian | BR113 | **Not built** | No source reference; duty-of-care gap |
| FR-C4.9 | A decline rate over the configured window caps appointments | BR12 | **Not built** | Waiting on a season of history to set the threshold |

### FR-C5 — Referee finance

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C5.1 | A claim requires a verified match, and nobody verifies the match they were paid for | BR13, BR119 | **Verified** | `appointment_verification`, `tests/29_verification_and_fees.sql` |
| FR-C5.2 | A fee schedule is a dated version; changing a rate publishes a new schedule | BR115 | **Partial** | Schema and rate resolution delivered; **the editor is not built** (scope 34 WP2) |
| FR-C5.3 | A claim stores the amount it was computed at, never recomputed at read time | BR116 | **Verified** | `referee_payment_claim`, `src/domain/officiating/fees.ts` |
| FR-C5.4 | No claim for a cancelled match; an abandoned match needs the official's explanation | BR17, BR18 | **Verified** | migration 0027 |
| FR-C5.5 | A referee cannot be paid twice for the same verified match | BR14 | **Verified** | `tests/30_referee_claims_and_batches.sql` |
| FR-C5.6 | A batch is closed before it is paid and admits no further claims | BR117 | **Verified** | `referee_payment_batch` |
| FR-C5.7 | A remittance records a payment the club made elsewhere; the platform never initiates a transfer | BR118 | **Verified** | migration 0027 |
| FR-C5.8 | Banking details for officials | — | **Out of scope by decision** | Holding a twelve-year-old's account number buys nothing and carries everything — scope 34 gap note |

### FR-C16 — External registration submission

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C16.1 | A submission pack is immutable once generated, versioned, with a frozen manifest and its generator recorded | BR58 | **Verified** | `src/domain/submission/`, `tests/11_submission_pack.sql` (9 scenarios) |
| FR-C16.2 | A pack carries only the fields the recipient needs and records its handover channel, once | BR59 | **Verified** | `submission_pack.channel`, `handed_over_at` |
| FR-C16.3 | Submitting a pack does not make a player eligible — *sent* and *registered* stay distinct | BR60 | **Verified** | `src/domain/submission/status.ts`, `submission_record.state` |
| FR-C16.4 | Writing back into SQUADI / PlayFootball | P2, BR53 | **Blocked externally** | Football Queensland restricts API access to approved system partners; P2 forbids the write without a scoped exception |

### FR-C15 — Consent and privacy rights

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C15.1 | Consent is one row per purpose — collection notice, identification photograph, publicity — each independently revocable | BR48, BR56, BR57 | **Verified** | `consent`, `docs/annexes/consent-wording.md` |
| FR-C15.2 | A photograph without an unrevoked consent for that purpose is refused **by the database** | BR56 | **Verified** | trigger on `person`, migration 0021 |
| FR-C15.3 | A photograph is cropped and re-encoded in the browser; the chosen file is never stored | BR105 | **Verified** | `src/web/photo-crop.ts`, `PhotoCropper.tsx` (strips EXIF/location) |
| FR-C15.4 | Right to erasure, honoured unless a named lawful basis requires retention | BR49, BR132 | **Verified** | `app_decide_erasure()`, `src/domain/privacy/erasure.ts`, `supabase/tests/34_privacy_rights.sql` (12 scenarios) |
| FR-C15.5 | Retention by participation status, with a ten-year floor for the still-active | BR40, BR133 | **Partial** | Computed and **proposed**; disposal is a person's act by design ([decision 14](../decisions/14_retention_proposes_a_person_disposes.md)). No scheduler until there is a production environment |
| FR-C15.6 | The club may export its complete data on demand | BR68 | **Verified** | `export_club_data()`, audited — an export is every child's record leaving the building |
| FR-C15.8 | A recipient may withdraw consent to be contacted without an account, and the withdrawal is the platform's record rather than a vendor's | BR128, BR129 | **Verified** | `app_unsubscribe()`, `supabase/tests/33_communications.sql` (10 scenarios) |
| FR-C15.7 | The privacy framework binding a tenant is recorded per tenant, never assumed | BR52 | **Verified** | `club.privacy_framework`, derived from jurisdiction at provisioning and then recorded | Referenced in source; no per-tenant configuration column is in use |

### FR-C10 / C19 — Platform operations and governance

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C10.1 | A tenant is created only on the platform owner's authorisation, atomically with its first season and administrator | BR89 | **Verified** | `/platform`, migration 0016 |
| FR-C10.2 | A club names a primary and secondary responsible person, and **each claims their own access** — never created for them | BR94, BR95 | **Verified** | `club_contact.claimed_at`, migration 0017 |
| FR-C10.3 | An invited person chooses their own password on first arrival; no password is ever emailed | BR98 | **Verified** | migration 0019, `src/app/set-password/` |
| FR-C10.4 | A club holds at least two administrators | BR124 | **Not built** | No constraint enforces the floor |
| FR-C10.5 | A licence is a dated term with a state and a negotiated fee; renewal is a new term | BR96 | **Verified** | `club_licence`, migration 0018 |
| FR-C10.6 | A lapsed licence puts the club into read-only | BR97 | **Partial** | **Shown and not enforced** — the state is displayed; nothing restricts writes |
| FR-C10.7 | A committee position is held for exactly one term, running AGM to AGM, and lapses with it | BR85, BR86 | **Verified** | `src/domain/governance/term.ts` |
| FR-C10.8 | A committee position may only be held by an adult, measured at the term's start | BR87 | **Verified** | trigger, `tests/19_committee_adults.sql` |
| FR-C10.9 | The committee records its own dated resolutions | BR123 | **Not built** | Approvals resting on committee authority point at nothing |
| FR-C10.10 | A prospect enters the demonstration club on an email address alone, read-only, with marketing consent asked separately and never as a condition | BR91, BR93 | **Verified** | `/demo`, migration 0013, `tests/20`, `tests/21` |

### FR-C20 — Player performance record

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C20.1 | Every statistic records who entered it and when; there is no verified match data | BR101 | **Verified** | `appearance`, migration 0020 |
| FR-C20.2 | Height and weight are optional, season-scoped, and readable only by the roles that pick teams | BR99, BR125 | **Verified** | `player_profile` + role-scoped policy |
| FR-C20.3 | An appearance by an ineligible player is recorded and flagged, never refused | BR103 | **Verified** | `src/domain/performance/season-record.ts` |
| FR-C20.4 | Totals state the base they were computed over, and are never averaged across fixtures lacking the metric | BR102 | **Verified** | `season-record.ts` |

### FR-C17 — Role context and the person-facing surface

| # | Requirement | Rules | Status | Realised by |
| - | ----------- | ----- | ------ | ----------- |
| FR-C17.1 | A Person holding several roles operates in **one active role context at a time**, switched explicitly, never merged | BR61 | **Verified** | `src/web/role-context.ts`, `IdentityRail.tsx` |
| FR-C17.2 | A Person of thirteen or over may hold their own account and see their own record | BR63 | **Verified** | `/me`, five workspaces |
| FR-C17.3 | A Person sees their own eligibility and what is outstanding — never another's | BR65 | **Verified** | `src/data/me.ts` derives roles from `account_person` |
| FR-C17.4 | A family reads their own household and nothing else, through a function rather than a membership | BR121, decision 11 | **Verified** | migrations 0028–0029, `tests/31`, `tests/32` |
| FR-C17.5 | A guardian is invited only once a child under their authority has a COMPLETE registration | BR126 | **Verified** | trigger on `guardian_invitation` |
| FR-C17.6 | A native mobile client, read-only offline, showing last-sync time | BR66 | **Not built** | Deferred deliberately; the API serves either choice |
| FR-C17.7 | A fixture change notifies every affected participant | BR64 | **Partial** | C7 exists now and the notification is written; **nothing in the application edits a fixture**, so it has no caller (`src/data/notifications.ts`) |

### Capabilities with no code at all

| Capability | Rules stranded | Status |
| ---------- | -------------- | ------ |
| **C7 — Communications** | BR64 and claim approval remain unwired — see FR-C17.7 | **Partial** — built September 2026 ([scope 36](../scope/36_the_platform_learns_to_send_and_to_stop.md)): a guardian reminder, BR42's coordinator notification, and an account-free unsubscribe with suppression held here rather than at the provider (BR127–BR131). No campaigns, no bounce handling |
| **C8 — Reporting & dashboards** | — | **Not built** |
| **C9 — Historical data consolidation** | BR90 | **Designed**, blocked on open question #57 (lawful basis) |
| **C11 — Competition & calendar** | BR20's competition catalogue | **Not built** — `fixture.competition` is free text |
| **C12 — Carnival & event management** | BR26–BR29 | **Not built** — the one deliberate P5 exception |
| **C13 — Calendar distribution** | BR30–BR34 | **Not built** |
| **C14 — External reconciliation** | BR39, BR44–BR47, BR53 | **Blocked externally** |
| **C18 — Life member register** | BR69–BR71 | **Designed** |

---

## 3. Non-functional requirements

| # | Requirement | Target | Status | How it is enforced |
| - | ----------- | ------ | ------ | ------------------ |
| NFR-1 | **Tenant isolation.** One club's data is never visible to another | Absolute (P5) | **Verified** | RLS on all 45 tables, keyed on `club_id`; `check_rls.py` gates coverage at build time; `scripts/test_rls.sh` proves it behaviourally against a real Postgres across 11 scenarios |
| NFR-2 | **A policy is proved, not asserted.** A narrowing ships with a test that fails when it is widened | Every read policy naming roles | **Partial** (BR122) | 24 SQL test files; the rule itself carries no source reference and is convention rather than a gate |
| NFR-3 | **Public write surface is minimal.** The only anonymous write path is one `security definer` function with a pinned `search_path` | One function | **Verified** | `submit_public_registration`, 18 anon scenarios |
| NFR-4 | **Append-only where audit depends on it** — payments, audit events, pack handover | No update path | **Verified** | Enforced **by the absence of an update policy**, which is stronger than convention |
| NFR-5 | **Purity of the domain and view layers.** No React, no I/O, no DOM in `src/domain/` or `src/web/` | Zero violations | **Verified** | `tsconfig.domain.json` typechecks both with **no DOM library**; a `document.` fails the build |
| NFR-6 | **Tests run without a build step or a database** | `node --test` alone | **Verified** | Node 22 strips types; 73 suites in ~2.3s |
| NFR-7 | **Data residency.** Children's personal data stays onshore | Sydney `ap-southeast-2` | **Verified** | Supabase + Vercel region choice |
| NFR-8 | **Secrets never enter the repository** | Zero | **Verified** | `.env.example` carries names only; service-role key is server-scoped in Vercel |
| NFR-9 | **A preview deployment never points at production data** | Absolute | **Verified by absence** | There is no production environment yet; the rule starts to bind when one exists |
| NFR-10 | **Migrations are immutable once applied.** Corrections are new migrations | Absolute | **Convention** | Not mechanically enforced; merging to `main` applies to the linked project with no second confirmation |
| NFR-11 | **Documentation traceability.** Every architecture element names the module realising it, or says "pending" | 100% | **Partial** | Enforced socially and by `check_links.py` for links only — see §5 |
| NFR-12 | **Documentation language is English**, using the glossary's terms | Absolute | **Verified** | — |
| NFR-13 | **AI autonomy ceiling.** The assistant drafts, summarises or flags; it never approves, rejects, or moves money | Absolute (P3) | **Verified structurally** | `AssistantNote.tsx` exposes exactly two controls and no escape hatch |
| NFR-14 | **Cost at pilot scale** | Free tier | **Verified** | ~800 players sits inside Supabase and Vercel free limits |
| NFR-15 | **Accessibility and responsive behaviour** of the club-facing screens | WCAG 2.2 AA | **Not verified** | A design system exists (`globals.css`, dark theme); no audit, no automated check |
| NFR-16 | **Performance budgets** — queue render, pack generation at ~700 registrations | Undefined | **Not defined** | No budget stated and none measured |
| NFR-17 | **Availability and backup/restore** | Undefined | **Not defined** | Supabase defaults; no stated RPO/RTO, no restore rehearsal |
| NFR-18 | **Portability.** The club owns its data and may take it elsewhere | BR68 | **Structural, unbuilt** | Postgres underneath makes it a query; the export does not exist |

---

## 4. Explicitly out of scope

Recorded so the scope of what exists is not mistaken for the scope of what
was promised:

- **Writing into any club production system** (P2), including a supported
  bulk upload — it needs a scoped exception that does not exist.
- **Moving money.** Square is chosen and unintegrated, by decision.
- **Storing officials' banking details** (scope 34) — narrower than the
  adopted interpretation permits, deliberately.
- **A global cross-club `Person`.** `person` is tenant-scoped; cross-club
  identity is BR44's matching problem and stays there.
- **Anything giving an AI actor final authority** over identity, payment, or
  promotion decisions.

---

## 5. Verification findings

The double-check this document was written to perform produced four
findings, **all four now corrected** (13 September 2026, tasks
[T0.1–T0.4](./tasks.md)). They are kept here rather than deleted: what the
documentation got wrong, and in which direction, is the evidence for the
rule that now guards against it.

**F1 — The root [README.md](../../README.md) described a repository that no
longer exists.** *(Corrected.)* It states "no application code exists yet", that layers 3–5
are undrafted, and that development commands "will be added… once a
technology stack is chosen". There are 29 migrations, 45 tables, 561 passing
assertions and a chosen stack. This is the most visible document in the
repository and it is wrong in its second paragraph.

**F2 — [`docs/ea/README.md`](../ea/README.md)'s status table marked layers
3, 4 and 5 "Not started" and states they "have nothing to say yet."** All
three are written, and `CLAUDE.md` says so.

**F3 — [`4_application/1_application-services.md`](../ea/4_application/1_application-services.md)
listed C4 (referee lifecycle) and C5 (referee finance) under "Not started —
no design and no code".** *(Corrected — and it ran deeper than the status
column: [2_application-components.md](../ea/4_application/2_application-components.md)
carried **no rows at all** for the referee slice, so six were added.)* Migrations 0023–0027, `src/domain/officiating/`,
`src/data/officiating.ts`, two screens and five SQL test files say
otherwise. The document's own closing section — "the referee half of the
product does not exist" — is the reverse of the truth as of scope 33 and 34.

**F4 — [`3_information/1_data-objects.md`](../ea/3_information/1_data-objects.md)'s
"Not yet modeled" section listed finance, referee appointments and payment,
and fixtures.** All are modeled and built. *(Corrected; `guardian_invitation`,
the one table named in no document, was added at the same time.)*

> **The pattern is one-directional and worth naming.** Every drift found is
> documentation *understating* what exists — never overstating it. That is
> the benign direction, but it is the direction that makes a reader
> conclude the project is earlier than it is, and it had happened four
> times — five, counting the missing component rows F3's correction
> uncovered. It is the reason
> [steering document 2, §3.3](../steering/2_code-commenting-and-documentation.md)
> makes a stale README a defect rather than a tidy-up.
