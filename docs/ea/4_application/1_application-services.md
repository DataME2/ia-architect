# Application Services

_[← Application layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Application Service.

What the software offers the business layer, and **how much of it actually
exists**. The status column is the point of this document: it is checked
against the code rather than against intent, and a service is only
*Delivered* when something in `src/` or `supabase/` does it end to end.

Read with [2_application-components.md](./2_application-components.md),
which names the code that realises each one.

## Status vocabulary

| Status | Means |
| ------ | ----- |
| **Delivered** | Built, exercised by tests, and reachable by a person through a screen or a public link |
| **Partial** | The named part works end to end; the row says what is missing, and the missing part is not a detail |
| **Documented, not built** | A decision or design exists in `docs/` and no code does it. Deliberate — recorded so the next person does not invent a different answer |
| **Not started** | No design, no code |

## Delivered

| Application Service | Realises | What it does | Status |
| ------------------- | -------- | ------------ | ------ |
| **Identity & role management** | C1 | One `Person` per human, legal and preferred names kept apart (BR55), roles attached per season and overlapping by design (P1), guardianship with authority and contact separated (BR67). Possible duplicates are surfaced for a human to confirm and merged by an audited, reversible-in-principle tombstone rather than a delete (BR5, BR82) | **Delivered** |
| **Registration capture** | C2 | A season registration collected once — player, guardian, documents, consents — through **one creation path** used by both the public family link and the registrar's own form, so neither can drift from the rules | **Delivered** |
| **Deterministic validation** | C6 | BR1, BR2, BR3, BR48 and BR55 evaluated against a registration and **persisted**, so "what is missing" is a stored answer with a history rather than a recomputation | **Delivered** |
| **Submission pack generation** | C16 | Validated registrations assembled into an immutable, versioned pack with a frozen manifest, the handover recorded, and each person tracked as *sent* rather than *registered* (BR58–BR60) | **Delivered** |
| **Team & official management** | C1, C2 | Teams per season, rosters, and team officials — with a **verified Working with Children Check enforced as a precondition** of an official's appointment, measured against the end of the season (BR83, BR84) | **Delivered** |
| **Club governance & administration** | C19 | The committee as a record: who holds which office, elected at which AGM, serving until the next. An overdue AGM is flagged rather than hidden (BR86), holders must be adults (BR87), and a missing card is shown rather than refused (BR88) | **Delivered** |
| **Player performance record** | C20 | What a player did in a season — appearances, minutes, goals and assists, against fixtures the club records itself. Physique and position on a profile card with the identification photograph, shown to club staff only so the photograph stays inside the consent it was collected under (BR100). **Advanced metrics are designed and unbuilt**: xG, shots and big chances need event data with pitch coordinates, which no volunteer records and no provider sells for junior football ([scope 30 §5](../../scope/30_the-player-record-and-what-a-statistic-costs.md)) | **Delivered** |
| **Audit** | Cross-cutting | Append-only record of overrides, pack generation and handover, and authority transfers. **Append-only by the absence of an update policy**, not by convention | **Delivered** |
| **Tenant isolation** | C10, P5 | Every table carries `club_id` and every policy keys off it, enforced by the database so a query missing its filter returns nothing rather than everything. Proved behaviourally, not just structurally | **Delivered** |
| **Platform administration** | C10 | Creates a club, its first season and its first administrator atomically and idempotently, from `/platform`, replacing four hand-typed SQL statements whose failure mode was a half-created tenant. **Reads club metadata and never tenant contents** — the boundary that let this be built without the P5 exception scope 28 feared, since creating a tenant needs no ability to read inside one ([decision 9](../../decisions/9_platform_administration_provisions_but_never_reads.md)) | **Delivered** |
| **Demonstration access & prospect capture** | C10 | A stranger sees the product working — a real tenant of invented families — in exchange for an email address, with no account and read-only rights. Marketing consent asked separately, refusable, and recorded with the words shown (BR91–BR93) | **Delivered** |

## Partial — and what is missing matters

| Application Service | Realises | Delivered | Missing | Status |
| ------------------- | -------- | --------- | ------- | ------ |
| **Player finance management** | C3 | Payment plans with instalments that **must** sum to the plan total (BR74), append-only payments and refunds (BR77), vouchers attached, verified or rejected with the relief receipt they imply (BR81), and the no-pay-no-play eligibility rule including the case that looks finished everywhere and is not (BR79) | **No payment provider.** Square is the confirmed choice and nothing integrates with it: every payment is recorded by hand by a treasurer. No invoicing, no reconciliation, no treasurer's own screen — finance is worked from the registration detail page | **Partial** |
| **Consent & privacy rights** | C15 | Capture: the collection notice, identification photograph and publicity consents as three independent revocable records (BR48, BR56, BR57), plus prospect marketing consent (BR93) | **No data-subject rights.** Access, correction, erasure and de-identification (BR49) are designed in the retention annex and unimplemented. **No revocation route**: `revoked_at` exists on both consent records and nothing sets it | **Partial** |
| **Multitenant platform operations** | C10 | Tenant isolation (above), role-based access through `club_membership`, per-season configuration, roles granted and revoked at a club (`/registrar/access`), and **the owner-issued onboarding link of [decision 7](../../decisions/7_tenant-provisioning-by-owner-issued-invitation.md)** — `/platform` emails a club's named contacts a magic link that creates the account on first use, and `claim_club_access()` attaches the membership the club recorded for that address | **No club branding**, and no way to invite a colleague from inside a club: `/registrar/access` grants a role to an account that already exists, so anyone but a club's first two contacts still signs up on their own before an admin can attach them | **Partial** |

## Documented, not built

Each of these has a written design and no code. That is a deliberate state,
not a backlog item that got forgotten.

| Application Service | Realises | Where the design lives | Why it is not built |
| ------------------- | -------- | ---------------------- | ------------------- |
| **Account identification** | C1, C19 | [Scope 29 WP1](../../scope/29_actors-access-and-permissions.md), BR106–BR108 | Aligned and specified, not yet migrated. It says *who* is signed in rather than which email address: an administrator links an account to the Person it belongs to, and the session strip, the access screen and the audit log read that link. **The only piece of scope 29 needing a migration**, which is why it was separated from the screen rather than folded into it |
| **Historical data import** | C9 | [Scope 28 §4](../../scope/28_onboarding-a-club-and-its-history.md) | **Blocked on a question, not on effort**: [#57](../../scope/open-questions.md) asks what lawful basis covers a decade of children's records handed over by a club. Scope 28 says it must be answered before the first import. BR90 (imported history is history) exists so the answer has something to attach to |
| **Life member register** | C18 | [Scope 18](../../scope/18_life-members.md) | `person_role` does not carry a life-member role yet. Small, and waiting on nothing but priority |
| **Marketing website** | — | [Scope 28 §3](../../scope/28_onboarding-a-club-and-its-history.md) | Explain, qualify, capture. The *capture* third arrived early with the demonstration door; the explaining is not written |

## Not started

No design and no code. Listed so the scope of what exists is not mistaken
for the scope of what was promised.

| Capability | What it would offer |
| ---------- | ------------------- |
| **C4 — Referee lifecycle** | Profile, classification pathway, availability, appointments, conflict detection |
| **C5 — Referee finance** | Fee schedules, claims, approval, payment batches, remittances |
| **C7 — Communications** | Templated transactional messages and reminders. **Note this one**: the marketing consent captured at the demonstration door has nothing to send it with, and no unsubscribe route until this exists |
| **C8 — Reporting & dashboards** | The registration, financial and referee dashboards that imported history (C9) is *for* |
| **C11 — Competition & calendar** | Association competition catalogue, regulations, playing formats |
| **C12 — Carnival & event management** | Multi-club events and the account-free public view — the one deliberate P5 exception ([decision 3](../../decisions/3_public-event-data-crosses-tenant-isolation.md)) |
| **C13 — Calendar distribution** | A Person's confirmed commitments as a subscribable feed ([decision 4](../../decisions/4_calendar-distribution-by-feed-not-account-access.md)) |
| **C14 — External reconciliation** | Continuous matching against SQUADI / PlayFootball. **Blocked externally**: Football Queensland restricts API access to approved system partners ([#39–#41](../../scope/open-questions.md)) |
| **C17 — Mobile experience** | One app per Person, showing the role they are currently acting in |

## What this adds up to

The **registration slice is complete and then some**: identity, capture,
validation, submission, teams, safeguarding, governance and the money that
gates eligibility all work end to end, under tenant isolation the database
enforces.

Three things are worth saying plainly about the rest.

**Nothing sends anything.** No email, no SMS, no reminder, no unsubscribe.
Every communication in the product today is a human copying something out of
a screen, and the marketing consent now being collected has nowhere to go
until C7 exists.

**Nothing takes money.** Square is chosen and unintegrated; a treasurer
types in what arrived. The rules about money are enforced; the movement of
it is not automated.

**The referee half of the product does not exist.** C4 and C5 are a third
of the original motivation and have no code at all. That is a scope
decision, not an oversight — but a reader of the strategy layer should not
have to infer it.
