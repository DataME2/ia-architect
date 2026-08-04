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

**Amended August 2026,** once the stakeholder confirmed the club's
re-verification cadence: **BR51 was restated** around register
*notification* rather than platform *polling*, and **BR54** added — test a
clearance against the end of the season, not against today. See the
"Automated verification" gap note below.

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
| 2_business    | New **Consent & privacy rights** service; new **Consent and erasure** and **WWCC clearance lifecycle** processes; new objects Consent Record, Erasure Request, WWCC Clearance, Privacy Configuration; new rules **BR48–BR52**, with BR51 later restated and **BR54** added (August 2026); four new glossary terms including *Linked organisation (WWCC)*. No new actor — Secretary / Member Protection Officer, Blue Card Administration, and Volunteer Coordinator already hold these concerns |
| 3_information | No change — not started. Substantially affected when assessed: consent scoping, erasure vs. de-identification, and per-tenant privacy configuration are all data-model concerns, and BR40's retention rule now has BR49 pulling against it |
| 4_application | No change — not started. BR50's automatic withdrawal is the first rule requiring a *scheduled background process* rather than request-time evaluation. BR51, as restated, additionally needs an **inbound path for register notifications** — an event the platform receives rather than a job it runs — which is a different integration shape and worth noting when that layer is assessed |
| 5_technology  | No change — not started |

## Plateaus

| Plateau                | State                     |
| ----------------------- | ------------------------- |
| **Baseline** (before)  | WWCC was verified once, at onboarding, and expiry blocked only new designations. No privacy framework was named anywhere in the architecture. Consent was implied by registering; erasure was not modeled at all |
| **Target** (delivered) | Consent is explicit, scoped, and revocable; erasure is honoured unless a recorded lawful basis prevents it; WWCC validity is maintained by register **notification** to the linked club plus an annual season-start reconciliation, is tested against the *season's end* rather than today (BR54), and its lapse **automatically withdraws the holder from every future assignment**, with the resulting vacancies notified to the coordinator who must re-fill them |

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
  (BR50, BR51, BR54 + the *Linked organisation* glossary term),
  `docs/ea/2_business/4_business-objects.md` (WWCC
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
| Principle P7, Capability C15, BR48–BR52 and BR54, four objects, two processes, one service | A **legal review** confirming any of this satisfies the APPs, the NZ Privacy Act, or GDPR — this is architecture, not advice |
| Automatic withdrawal from future assignments on WWCC lapse, with coordinator notification | Confirming the club is linked in the register for every child-related role, and the per-state/NZ notification mechanics ([#38](./open-questions.md)) |
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
- **"Automated verification" may not be available — resolved differently
  than expected (August 2026).** BR51 originally assumed the platform would
  re-check a clearance on a schedule, and the concern was that Queensland's
  Blue Card and equivalent registers are portal-based lookups with no
  programmatic access. The answer turns out not to need one. The stakeholder
  confirmed the club's cadence — **annually, at the start of the season in
  January, by visual check of the expiry date** — and assessing it exposed
  both the real hole and the real mechanism:
  - **The hole:** a visual expiry check cannot detect a **cancellation**.
    Blue Card Services monitors cardholders' police information
    continuously and can cancel mid-term, while the card in the holder's
    hand still shows a valid expiry date. An annual glance cannot tell a
    cancelled card from a live one — and cancellation, not expiry, is the
    event the WWCC regime exists to catch.
  - **The mechanism:** **organisation linkage.** A club linked to its
    cardholders in the register is *notified* of status changes. That makes
    BR51's "continuous" real as **push rather than polling**, needing no
    API at all — which is why the original framing of this gap was solving
    the wrong problem.
  - **The cheap fix alongside it:** BR54 — test each clearance against the
    **end of the season**, not against today. A card expiring in June
    passes a January validity check and lapses mid-season; testing coverage
    instead converts the same annual effort into months of warning.

  What remains open ([#38](./open-questions.md)): confirming the club is
  actually linked for every child-related role, the notification mechanics
  per state, and New Zealand's equivalent.

- **Submitting the photograph onward is a disclosure, not a transfer of a
  copy.** The stated intent (August 2026) is to send the same headshot to
  SQUADI with the bulk registration. That is reasonable — the governing
  body has the same identification problem the club does — but it changes
  three things at once, which is why BR48, BR49, and BR56 were all amended
  together rather than just BR56:
  - **Consent must name it.** Consenting to the club *holding* a child's
    photograph is not consenting to the club *sending it to a third party*.
    BR48 now requires the disclosure to be named in the consent.
  - **Erasure cannot reach it.** Once the photograph is in SQUADI, a later
    erasure request to the club cannot recall it — BR39 makes SQUADI the
    system of record, and the club has no delete authority there. BR49 now
    states that limit and requires it to be disclosed at consent time. A
    protocol promising more than the club can deliver is worse than one
    honest about its edge.
  - **Capture must satisfy the strictest destination.** SQUADI's photo
    specification is unknown ([#44](./open-questions.md)). A snapshot good
    enough for the club that fails an external dimension, background, or
    recency rule sends the guardian back around the loop BR55 exists to
    remove — the same first-time-right logic, applied to the photo.

  All of this is **stage 2 work** regardless, gated on
  [#42](./open-questions.md) and [#43](./open-questions.md). The photo can
  be collected and used for club identification now; it cannot be sent
  anywhere until the submission route exists and P2's exception is settled.

- **Publicity consent is a third, separate consent — and the club–FQ
  disclosure is not the same kind of thing.** The stakeholder asked
  (August 2026) for registration to capture consent to use a photo in
  social media, advertising, and promotional material, noting that
  club-to-Football-Queensland sharing "remains confidential and can be
  shared without issues". Both halves are recorded, but they are governed
  differently:
  - **The FQ disclosure is fine, and BR48 already covers it.** Registering
    a player with the governing body is the *primary purpose* the data was
    collected for, so disclosing it is what the collection was always for.
    One correction only: **confidential is not the same as reversible.**
    FQ handling the data properly does not give the club authority to
    delete it there, which is the limit BR49 now states — and the club's
    privacy notice should describe its own handling, not promise FQ's on
    FQ's behalf.
  - **Publicity is a different purpose entirely, and BR57 makes it a
    separate, optional, off-by-default consent.** Two reasons it cannot be
    a clause in the registration consent. Consent must be *freely given*:
    if refusing publicity blocked registration, the choice would cost a
    child their season, which is no choice at all. And **publication is a
    safety question for some children** — family court orders, family
    violence, children in care — which is why the default is off, the
    setting is per-Person, and revocation is immediate. Revocation stops
    future use and withdraws club-controlled material, but the consent
    states plainly that already-shared material cannot be fully recalled.

## Open questions

- **#36 (new).** Is GDPR a binding requirement or a voluntarily adopted
  design standard? Adopted interpretation: design standard.
- **#37 (new).** At what age does a young person take control of their own
  consent, erasure, and calendar feed from their guardian?
- **#38 (new).** How often must a WWCC be re-verified, and do the state
  registers support programmatic checking at all?
