# Project Scope — Privacy, Consent, and Safeguarding

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/new-session-oizu88`.

A stakeholder check — *"have we covered privacy and Working with Children
Checks?"* — found the architecture **partly covered and materially
short**. An audit of the existing documents confirmed:

| Concern | Before this initiative |
| ------- | ---------------------- |
| WWCC verification at onboarding | ✅ BR19, Blue Card Administration actor |
| Blocking a *new* designation on expired accreditation | ✅ BR10 |
| **Withdrawing someone already on a future match sheet** | ❌ **absent** |
| **Continuous re-verification** | ❌ absent — BR19 is point-in-time |
| Named privacy framework (GDPR / APPs / NZ Privacy Act) | ❌ absent entirely |
| Explicit, recorded, revocable parental consent | ❌ absent — Guardianship is a relationship, not consent |
| Right-to-erasure protocol | ❌ absent |

The most consequential gap is the third row. BR19 checks a clearance
*before* someone starts and BR10 blocks a *new* designation — but nothing
removed a coach or referee from **next Saturday's match sheet** when their
card lapsed on Tuesday. Point-in-time verification is not safeguarding.

This initiative adds Principle **P7**, Capability **C15**, five business
rules (**BR48–BR52**), four business objects, two processes, and a
service. No application code is written.

## A correction worth stating plainly

The request framed this as *"absolute compliance with GDPR and local
frameworks like the APPs"*. Those are not the same standard, and the
difference matters for the erasure requirement specifically:

- **GDPR** carries a true right to erasure (Art. 17) — itself subject to
  Art. 17(3) exemptions for legal obligation and legal claims.
- **The Australian Privacy Principles carry no general right to erasure.**
  APP 11.2 requires destruction or de-identification once information is
  no longer needed; APP 13 gives a right of *correction*. There is no
  APP equivalent of "delete me".
- **New Zealand's Privacy Act 2020** is likewise correction-oriented.
- **GDPR binds this platform only** if it processes EU residents' data or
  targets the EU — which the stated AU/NZ market does not, today.

So a "Right to be Forgotten protocol" is a **deliberate choice to exceed
what AU/NZ law requires**, not a compliance obligation being met. That is
a defensible and arguably good choice — it is the high-water mark and it
futureproofs expansion — but it should be knowing rather than assumed,
which is why it is recorded as an adopted interpretation in
[open question #36](./open-questions.md) rather than stated as fact.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact                                              |
| ------------- | ---------------------------------------------------- |
| 1_strategy    | New **Principle P7** (safeguarding and privacy built in, per jurisdiction) — the first new Principle since P6; new **Capability C15** (Consent & privacy rights management); new Resource cataloguing the four relevant frameworks and where they diverge on erasure. P4 is unchanged and remains narrower — it governs AI services specifically, where P7 governs consent, erasure, and clearance lifecycle (see [1_motivation.md](../ea/1_strategy/1_motivation.md), [2_capabilities-and-resources.md](../ea/1_strategy/2_capabilities-and-resources.md)) |
| 2_business    | New **Consent & privacy rights** service; new **Consent and erasure** and **WWCC clearance lifecycle** processes; new objects Consent Record, Erasure Request, WWCC Clearance, Privacy Configuration; new rules **BR48–BR52**; three new glossary terms. No new actor — Secretary / Member Protection Officer, Blue Card Administration, and Volunteer Coordinator already hold these concerns |
| 3_information | No change — not started. Substantially affected when assessed: consent scoping, erasure vs. de-identification, and per-tenant privacy configuration are all data-model concerns, and BR40's retention rule now has BR49 pulling against it |
| 4_application | No change — not started. BR50's automatic withdrawal and BR51's scheduled re-verification are the first rules requiring a *scheduled background process* rather than request-time evaluation — worth noting when that layer is assessed |
| 5_technology  | No change — not started |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | WWCC was verified once, at onboarding, and expiry blocked only new designations. No privacy framework was named anywhere in the architecture. Consent was implied by registering; erasure was not modeled at all |
| **Target** (delivered) | Consent is explicit, scoped, and revocable; erasure is honoured unless a recorded lawful basis prevents it; WWCC validity is re-checked on a schedule and its lapse **automatically withdraws the holder from every future assignment**, with the resulting vacancies notified to the coordinator who must re-fill them |

## Work packages and deliverables

### WP1 — Strategy layer

- **Deliverables:** `docs/ea/1_strategy/1_motivation.md` (Principle P7),
  `docs/ea/1_strategy/2_capabilities-and-resources.md` (Capability C15;
  the privacy/safeguarding frameworks Resource)
- **Outcome:** safeguarding and privacy are a Principle a proposed change
  is checked against, not a feature backlog item — and the jurisdictional
  differences are recorded where someone will read them before assuming
  one rule fits everywhere.

### WP2 — Consent and erasure

- **Deliverables:** `docs/ea/2_business/5_domain-context-and-rules.md`
  (BR48, BR49, BR52 + glossary), `docs/ea/2_business/4_business-objects.md`
  (Consent Record, Erasure Request, Privacy Configuration),
  `docs/ea/2_business/3_business-processes.md` (Consent and erasure
  process), `docs/ea/2_business/2_business-services.md` (service)
- **Outcome:** consent is auditable and revocable per purpose; erasure has
  a protocol that neither ignores requests nor destroys records the club
  is legally obliged to keep, with the basis for every refusal recorded.

### WP3 — WWCC block-out logic

- **Deliverables:** `docs/ea/2_business/5_domain-context-and-rules.md`
  (BR50, BR51), `docs/ea/2_business/4_business-objects.md` (WWCC
  Clearance), `docs/ea/2_business/3_business-processes.md` (WWCC clearance
  lifecycle process)
- **Outcome:** the gap between BR19 and BR10 is closed — a lapsed
  clearance reaches *forward* into existing future assignments, not just
  sideways into new ones, and the vacancies it creates are surfaced rather
  than left silently uncovered.

### WP4 — Governance scaffolding

- **Deliverables:** this scope document, `docs/scope/README.md` index row,
  `docs/scope/open-questions.md` (#36–#38)
- **Outcome:** the GDPR-as-choice interpretation, the age-of-control gap,
  and the re-verification frequency are owned questions rather than
  assumptions.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Principle P7, Capability C15, BR48–BR52, four objects, two processes, one service | A **legal review** confirming any of this satisfies the APPs, the NZ Privacy Act, or GDPR — this is architecture, not advice |
| Automatic withdrawal from future assignments on WWCC lapse, with coordinator notification | The re-verification *frequency* and whether state registers support programmatic checks ([#38](./open-questions.md)) |
| Erasure with recorded lawful-basis exceptions, and de-identification where deletion is unlawful | Reconciling BR49 against BR40's three-year retention and [#30](./open-questions.md)'s statutory-minimum question — the same legal answer settles both |
| Per-tenant privacy configuration (BR52) | Consent wording, privacy notices, or any drafted legal text |
| — | Any code — no `src/`, no tests, no build |

## Gap notes

- **BR49 and BR40 pull against each other, deliberately.** BR40 sets a
  three-year retention; BR49 lets a subject ask for deletion sooner; and
  [#30](./open-questions.md) already questions whether three years is
  lawful for financial and child-safety records. All three need the *same*
  legal answer, and until it exists neither a retention job nor an erasure
  workflow should be built — either could destroy records the club is
  required to keep.
- **Withdrawal has a blast radius not yet traced.** BR50 removes a person
  from future assignments, but those assignments may already appear in a
  published carnival view (BR26 — club/team level only, so probably not by
  name) and *will* appear in an already-synced calendar feed (BR30), which
  only clears on the client's next refresh (BR46-style staleness). The
  match sheet is authoritative; the copies lag. Worth explicit handling
  when the information layer designs the feed.
- **The age-of-control gap is live today.** BR33 issues a minor referee's
  calendar feed to their guardian, BR48 puts consent with the guardian,
  and BR49 lets the guardian request erasure — all with no upper age
  bound. A 17-year-old Club Based Match Official is a data subject with
  their own interests, and the architecture currently gives them none.
  See [#37](./open-questions.md).
- **"Automated verification" may not be available.** BR51 assumes the
  platform can re-check a clearance on a schedule. Queensland's Blue Card
  and equivalent registers are portal-based lookups requiring a person to
  enter a card number, surname, and date of birth; whether any offers
  programmatic access is unconfirmed ([#38](./open-questions.md)). If not,
  "continuous" degrades to "whenever someone remembers", and BR50's
  automatic withdrawal fires late — which is a materially weaker
  safeguard than the rule implies.

## Open questions

- **#36 (new).** Is GDPR a binding requirement or a voluntarily adopted
  design standard? Adopted interpretation: design standard.
- **#37 (new).** At what age does a young person take control of their own
  consent, erasure, and calendar feed from their guardian?
- **#38 (new).** How often must a WWCC be re-verified, and do the state
  registers support programmatic checking at all?
