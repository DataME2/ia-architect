# Motivation

_[← Strategy layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Stakeholder, Driver, Goal, Principle.

## Stakeholders and drivers

| Stakeholder | Concern | Driver |
| ----------- | ------- | ------ |
| Club administrative staff (Club Admin, Registrar, Treasurer, Committee, Referee Coordinator, and related roles — see [2_business/1_business-actors-and-roles.md](../2_business/1_business-actors-and-roles.md)) | Too much manual, repetitive administrative work | Registration, finance, and referee data spread across SQUADI, PlayFootball, spreadsheets, forms, email, WhatsApp, and Google Drive, with no consolidated view and no official API to integrate against |
| Families and players | Registration is confusing and repetitive; unclear whether it is actually complete | No single place shows missing documents, pending payments, or overall status. **Measured baseline (stakeholder, July 2026): registration currently takes _weeks_.** The stated bottleneck is SQUADI itself — described as confusing and difficult to use on both web and phone — and under Football Queensland policy a player who is not registered in SQUADI **cannot take the field** when the season starts, so the delay is not merely administrative: it costs playing time (BR43) |
| Referees | Classification, availability, appointments, and payment are tracked separately even though they concern one person | No unified referee profile; conflicts between a person's player and referee roles aren't checked automatically |
| Pilot club | Wants measurable proof that the platform reduces admin work and errors before recommending it further | Committed at least three years of historical data (~700 seasonal registrations/year) to validate against |
| Let'sDataTalk (the vendor) | Needs a sellable, multitenant SaaS product across many AU/NZ clubs, not a one-off tool for a single club | Revenue depends on subscription and data-services income across multiple tenants |
| Governing bodies / state associations (Football Queensland the named example) — **prospective customer; first contact made July 2026** | Would want jurisdiction-wide control of Competition Regulations, Playing Formats, and the registration process its member clubs follow, rather than each club re-keying the same reference data | Currently modeled only as an external, read-only data source ([2_business/1_business-actors-and-roles.md](../2_business/1_business-actors-and-roles.md)). Serving one as a *tenant* would need an association tier that can see across member clubs — which Principle P5 forbids today; see [open question #31](../../scope/open-questions.md). **Football Queensland's 31 July 2026 reply to the pilot club's API request** establishes the counterparty's stated position: SQUADI API access is restricted to Football Australia, Football Queensland, and *approved system partners*, and is not issued to affiliated clubs — so the relationship Let'sDataTalk needs is **partner status, not credentials** (see the response Resource, [2_capabilities-and-resources.md](./2_capabilities-and-resources.md), and [open questions #39–#41](../../scope/open-questions.md)) |
| General public, coaches, and parents following grassroots events; clubs and Football Queensland as event hosts | Regional carnivals and grassroots events (MiniRoos Invitational Carnivals, Girls United Carnivals, WinterFest, Pacific Championships, talent-ID tournaments) currently have no consolidated draw/schedule/results support, so families and the public rely on ad hoc social media posts and printed programs | These events span multiple clubs by design and are meant to be followed by people who don't have (and shouldn't need) a Let'sDataTalk account |
| Life Members — individuals a club has honoured with lifetime membership for service, including those who have since died | Every club maintains this group informally, and their current contact details go stale between the occasions a club actually needs them — an anniversary, a reunion, an honour board. A person who dies is exactly the record a participation-based retention rule would eventually discard, which loses club history rather than merely tidying it (raised August 2026) | No existing capability distinguishes "stopped playing" from "life member" or from "deceased" — BR40's retention job cannot tell them apart today |

## Goals

- **G1 — Single identity per person.** Every player, referee, coach,
  guardian, and committee member is one `Person` record that can hold
  several roles, simultaneously or across time, instead of separate
  identities per concern. See Principle P1 below and
  [3_information's future data model](../3_information/README.md)
  (not yet drafted).
- **G2 — Verifiable, complete registrations.** A club can always tell which
  season registrations are complete, and exactly what's missing (documents,
  payment, external registration) for the rest. "External registration" is
  the FIFA/Football Australia International Transfer Certificate (ITC)
  process for a Player whose immediately preceding registration was
  overseas (BR35–BR38,
  [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md)).
- **G3 — Consolidated player finance control.** Fees, payment plans,
  installments, vouchers (state government youth-sport voucher programs
  such as Queensland's Play On!/FairPlay, NSW's Active and Creative Kids,
  SA's Sports Vouchers, WA's KidSport, Victoria's Get Active Kids, and
  Tasmania's Ticket to Play — each enabled for a club only with Committee
  approval, see BR21 in
  [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md)),
  and reconciliation are tracked in one place instead of across Stripe,
  Square, Xero, and spreadsheets.
- **G4 — Full referee lifecycle management.** Classification history,
  fitness/training/knowledge requirements, availability, appointments, and
  payment are tracked end to end, with automatic detection of conflicts
  between a person's referee role and their other roles (player, coach,
  team manager, family member).
- **G5 — Less manual administrative work, safely.** Deterministic
  compliance rules run first; generative AI assists (drafts, summarizes,
  answers generic questions) but never takes an action with effect on its
  own — see Principle P3 and
  [decision 1](../../decisions/1_ai-assistant-autonomy-level.md).
- **G6 — First live version before the end of Q4 2026,** validated on the
  pilot club before wider rollout. **Confirmed success outcome
  (stakeholder, July 2026):** the pilot club judges success primarily by
  whether the platform can *synchronise registration with SQUADI and
  Football Australia* — today a parent or guardian must complete that
  registration themselves, which is complicated and time-consuming.
  **How that outcome is reached is staged** (adopted July 2026): stage 1
  demonstrates registration speed from the club's own perspective with no
  external integration at all — provable pre-MVP; stage 2 adds SQUADI
  synchronisation; stage 3 adds Football Australia, including the ITC path.
  Only stage 1 is unconditional — stages 2 and 3 depend on API access that
  does not exist today, so the outcome above is the destination, not the
  entry ticket. See the staged registration ladder in
  [2_capabilities-and-resources.md](./2_capabilities-and-resources.md).

  > **Stated plainly (August 2026), the outcome is: one registration, not
  > three.** Today a family can be asked to register the same child three
  > separate times — with the club, in Squadi, and in PlayFootball — each in
  > a different interface, each re-keying the same values, each an
  > opportunity for the mismatch that causes the delay (BR55). Everything in
  > the registration ladder serves this single sentence, and it is the
  > clearest test of whether a proposed feature is worth building: **does it
  > reduce the number of times a parent types their child's details?** If
  > not, it is not this goal.

  > **Stage 2's dependency hardened from "absent" to "refused at club
  > level" (31 July 2026).** Football Queensland's reply to the pilot club's
  > written API request states that SQUADI API access is restricted to
  > Football Australia, Football Queensland, and *approved system partners*,
  > and is **not ordinarily provided to affiliated clubs**. The ladder's
  > staging holds — this is precisely the outcome staging was designed to
  > survive — but the route to stage 2 is now known to run through
  > **partner status**, a commercial and contractual motion, rather than
  > through a technical request the pilot club can make on its own behalf.
  > The same reply raises a separate and larger question about the CSV
  > fallback that stage 1 itself relies on — see
  > [scope document 13](../../scope/13_squadi-access-refusal-and-the-terms-of-use-constraint.md).
- **G7 — Carnival & grassroots event visibility.** Clubs (and Football
  Queensland) can publish one-off, multi-club carnival and grassroots
  events — draws, schedules, and results — and coaches, parents, and the
  general public can follow them without a Let'sDataTalk account, without
  exposing individual (especially minors') names by default. See
  Principle P6 below.
- **G8 — Life members are recognised, and never lost to a retention job.**
  A club can hold an honorary Life Member as a `Person` role like any
  other (Principle P1), keep a living life member's contact details
  demonstrably current so a celebration invitation actually reaches them,
  and — once a life member has died — keep their record permanently, for
  the club's own history and honour rolls, without a communication ever
  being attempted. Raised by stakeholder request, August 2026; not served
  by G1–G7, which assume a person is either currently participating or
  fading toward disposal, never permanently honoured regardless of
  participation.

## Principles

- **P1 — One Person, many roles.** Players, referees, coaches, and
  guardians are never modeled as separate, standalone identities. A change
  that would introduce a role-specific identity instead of a role on
  `Person` violates this principle.
- **P2 — Read-only at the source, for now.** Extraction from a club's
  existing systems (SQUADI, PlayFootball, spreadsheets, accounting systems)
  uses read-only access only; Let'sDataTalk does not write back into a
  club's production systems during this phase. A change that requires
  write access to an external club system needs a new principle or an
  explicit, scoped exception — surface it rather than assuming it.

  > **P2 does not answer the question Football Queensland raised.** This
  > principle constrains *writing*, on the assumption that reading a club's
  > own data out of its own systems is uncontroversial. FQ's 31 July 2026
  > reply states that SQUADI's terms of use "do not permit club accounts or
  > Squadi data to be connected or integrated with unauthorised third-party
  > systems" — a restriction on **connection and ingestion**, not on
  > write-back. Being read-only is therefore not, by itself, a defence.
  > BR53 carries the resulting rule; [open question #39](../../scope/open-questions.md)
  > carries the unresolved interpretation.
  >
  > **Separately, stage 2 collides with P2 head-on.** The outcome the pilot
  > club actually wants — the club submitting a prepared registration that
  > the parent merely *confirms*, instead of re-keying it into SQUADI — is
  > a **write into an external production system**, which this principle
  > forbids without an explicit scoped exception. That holds for every
  > mechanism, including a *supported* bulk upload: being permitted by the
  > counterparty answers BR53, not P2. No exception is modeled here yet —
  > adding one for a capability the platform may never be permitted to
  > build would be premature — but it must be settled before stage 2 is
  > designed rather than discovered during it. See
  > [open question #43](../../scope/open-questions.md).
- **P3 — Deterministic rules before generative AI, and AI never has final
  authority.** Data-quality and compliance checks are deterministic rules,
  evaluated before any generative AI step. The AI assistant may draft,
  summarize, classify, or flag for a human — it may never approve an
  identity document, reject a player, modify a debt, approve a payment, or
  promote a referee on its own. See
  [decision 1](../../decisions/1_ai-assistant-autonomy-level.md).
- **P4 — No sensitive personal data of minors to uncontrolled AI services.**
  Free-tier or otherwise non-controlled generative AI services never
  receive personal data belonging to a minor.
- **P5 — Strict tenant isolation.** One club's data is never visible to
  another tenant. Every business and information-layer element that
  touches club data states how tenant isolation is enforced for it (or is
  explicitly out of scope until it does).
- **P6 — Published event data is public by design; a scoped exception to
  P5.** A carnival/grassroots event's schedule, draw, and results, once
  published by its Event Coordinator, are visible to any visitor —
  including unauthenticated ones — across every participating club, because
  such events span multiple clubs by design and exist to be publicly
  followed. This exception covers *only* that specific published, non-
  personal content (BR26–BR27,
  [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md));
  a club's registration, finance, and compliance data remain fully
  tenant-isolated under P5. See decision
  [3](../../decisions/3_public-event-data-crosses-tenant-isolation.md).

- **P7 — Safeguarding and privacy are built in, per jurisdiction, from day
  one.** The platform handles children's personal data across more than one
  legal regime, so three things are structural rather than features added
  later: (a) **explicit, recorded, revocable guardian consent** before a
  minor's data is processed (BR48); (b) a **right-to-erasure protocol**
  that honours a request unless a named lawful basis requires retention,
  and records that basis when it refuses (BR49); and (c) **continuous**
  Working with Children Check verification whose expiry *withdraws
  existing assignments*, not merely blocks new ones (BR50, BR51). Which
  framework binds a given tenant is determined by jurisdiction and
  recorded, not assumed (BR52). A change that collects a minor's data
  without recorded consent, or that leaves someone on a future match sheet
  after their clearance lapses, contradicts this principle.

A proposed change that would give an AI actor authority to act on identity,
payment, or promotion decisions without a human, that would write to a
club's production system without a scoped exception to P2, or that would
publish personal/registration/finance data beyond what P6 explicitly
carves out, contradicts a Principle here — surface it instead of
proceeding (`ea-first-change`, step 1).
