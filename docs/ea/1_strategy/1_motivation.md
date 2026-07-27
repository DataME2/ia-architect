# Motivation

_[← Strategy layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Stakeholder, Driver, Goal, Principle.

## Stakeholders and drivers

| Stakeholder | Concern | Driver |
| ----------- | ------- | ------ |
| Club administrative staff (Club Admin, Registrar, Treasurer, Committee, Referee Coordinator, and related roles — see [2_business/1_business-actors-and-roles.md](../2_business/1_business-actors-and-roles.md)) | Too much manual, repetitive administrative work | Registration, finance, and referee data spread across SQUADI, PlayFootball, spreadsheets, forms, email, WhatsApp, and Google Drive, with no consolidated view and no official API to integrate against |
| Families and players | Registration is confusing and repetitive; unclear whether it is actually complete | No single place shows missing documents, pending payments, or overall status |
| Referees | Classification, availability, appointments, and payment are tracked separately even though they concern one person | No unified referee profile; conflicts between a person's player and referee roles aren't checked automatically |
| Pilot club | Wants measurable proof that the platform reduces admin work and errors before recommending it further | Committed at least three years of historical data (~700 seasonal registrations/year) to validate against |
| Let'sDataTalk (the vendor) | Needs a sellable, multitenant SaaS product across many AU/NZ clubs, not a one-off tool for a single club | Revenue depends on subscription and data-services income across multiple tenants |
| General public, coaches, and parents following grassroots events; clubs and Football Queensland as event hosts | Regional carnivals and grassroots events (MiniRoos Invitational Carnivals, Girls United Carnivals, WinterFest, Pacific Championships, talent-ID tournaments) currently have no consolidated draw/schedule/results support, so families and the public rely on ad hoc social media posts and printed programs | These events span multiple clubs by design and are meant to be followed by people who don't have (and shouldn't need) a Let'sDataTalk account |

## Goals

- **G1 — Single identity per person.** Every player, referee, coach,
  guardian, and committee member is one `Person` record that can hold
  several roles, simultaneously or across time, instead of separate
  identities per concern. See Principle P1 below and
  [3_information's future data model](../3_information/README.md)
  (not yet drafted).
- **G2 — Verifiable, complete registrations.** A club can always tell which
  season registrations are complete, and exactly what's missing (documents,
  payment, external registration) for the rest.
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
  pilot club before wider rollout.
- **G7 — Carnival & grassroots event visibility.** Clubs (and Football
  Queensland) can publish one-off, multi-club carnival and grassroots
  events — draws, schedules, and results — and coaches, parents, and the
  general public can follow them without a Let'sDataTalk account, without
  exposing individual (especially minors') names by default. See
  Principle P6 below.

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

A proposed change that would give an AI actor authority to act on identity,
payment, or promotion decisions without a human, that would write to a
club's production system without a scoped exception to P2, or that would
publish personal/registration/finance data beyond what P6 explicitly
carves out, contradicts a Principle here — surface it instead of
proceeding (`ea-first-change`, step 1).
