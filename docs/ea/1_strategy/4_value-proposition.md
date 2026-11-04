# Value Proposition

_[← Strategy layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Value, Meaning.

The externally-facing statements of what PitchPeople is and what it is
worth — the *Meaning* the architecture carries to a reader outside it.
Recorded here so that pitch language and architecture stay answerable to
each other: every claim below should be traceable to a Goal, Capability,
or Principle, and where a claim runs ahead of what is built, this document
says so rather than letting the gap be discovered in a sales conversation.

## Positioning statement (pitch)

> PitchPeople is a multiclub, multitenant, AI-assisted football
> operations platform that unifies registrations, finance, documents,
> referee management, competitions, and community events around a single
> `Person` identity — allowing one individual to seamlessly participate as
> a player, referee, coach, guardian, or committee member without
> duplicated records.

## Commercial statement (for clubs)

> PitchPeople is a next-generation SaaS platform for grassroots football
> clubs that replaces disconnected spreadsheets, registration systems,
> payment tools, and communication channels with one intelligent operating
> platform. Built around a single `Person` model, it gives clubs a
> complete view of every participant, from players and families to
> referees, coaches, and volunteers.

## Commercial headline (the front door)

> **Less time chasing admin. More time running your club.**
>
> Connect registrations, families, club finance, teams and match-official
> administration through one football operations platform.

Added October 2026 ([scope 118](../../scope/118_the_front_door_speaks_to_a_club.md)).
The tagline, *One identity. Every role. Connected football.*, names the
idea (**P1**); the headline names the benefit, which is what a club hears
first. Each noun in the supporting line is a delivered service: registration
(**C2**), the household (**C17**), fees, plans and referee payments (**C3**,
**C5**), teams and their competitions (**C11**), and designation through to
verification (**C4**). The front door applies the claim boundaries below: it
says Squadi stays the competition system, that the Assistant never decides,
and that nothing moves money.

## Financial Intelligence (proposed, November 2026)

> **PitchPeople Financial Intelligence** helps football organisations
> understand, manage and improve their financial position through connected
> financial management, transparent policies, payment integration and
> actionable insights.

Added for Goal **G9** ([scope 134](../../scope/134_pitchpeople_financial_intelligence.md)).
**A statement of direction, not of the product today**: most of what it
names is Pending (C22–C25). It is offered as two experiences over one
architecture:

| Experience | Primary customer | Says to them |
| ---------- | ---------------- | ------------ |
| **PitchPeople Club Finance** | Clubs and academies | What you are owed, what you collected, what an event will cost you before you commit to it, and why every charge is what it is |
| **PitchPeople Football Governance** | Associations and governing bodies | Publish a policy once, explain every charge it produces, receive your clubs' applications, and report what your revenue is said to fund — reading a club's figures only where the club has granted it (P8) |

The commercial statement's "**replaces**" is deliberate and consistent
with [decision 5](../../decisions/5_replace-the-incumbent-rather-than-integrate.md):
PitchPeople competes for the incumbent's market rather than
complementing it.

## Traceability

| Claim | Grounded in |
| ----- | ----------- |
| Single `Person` identity, many roles, no duplicated records | Principle **P1**, Goal **G1**, Capability **C1** |
| Registrations | **G2**, **C2** |
| Finance (fees, plans, vouchers, reconciliation) | **G3**, **C3**, **C5** |
| Referee management (classification → availability → appointment → payment) | **G4**, **C4**, **C5** |
| Competitions | **C11** |
| Community events | **G7**, **C12** |
| Multiclub / multitenant | Principle **P5**, **C10** |
| AI-assisted | Principle **P3**, **C6**, **C7** |
| Replaces spreadsheets, registration systems, payment tools, communication channels | [Decision 5](../../decisions/5_replace-the-incumbent-rather-than-integrate.md); **C7**, **C8**, **C9** |
| Complete view of every participant | **C8**, **G1** |
| Understand and improve the club's financial position | **G9**, **C3**, **C8** — Pending beyond scope 133's report |
| Event profitability before committing | **G9**, **C22** — Pending |
| Transparent policies; every charge explained | **G9**, **C23** — Pending |
| Payment integration | **C24**, [decision 20](../../decisions/20_payments_through_a_provider_port_never_on_the_platform.md) — Pending |
| Benchmarks against other clubs | **C25**, **P8** — Pending |

## Claim boundaries

Four places where the statements above, read plainly by a club, would
promise more than the architecture delivers. None is a reason to change
the wording — they are the notes a person using it in a sales conversation
needs to have already read.

- **"Replaces registration systems" does not mean replacing SQUADI, and
  cannot.** Football Queensland confirmed in writing (31 July 2026) that
  affiliated clubs are *required* to use Squadi for competition
  administration, and BR43 makes Squadi registration an eligibility gate on
  taking the field. What PitchPeople replaces is **Majestri,
  spreadsheets, forms, and the disconnected tooling around** registration —
  it makes the club's side of registration coherent and submits into Squadi
  correctly, rather than removing Squadi from the club's life. A club that
  hears otherwise discovers the difference at the worst possible moment.
  See [scope document 13](../../scope/13_squadi-access-refusal-and-the-terms-of-use-constraint.md).
- **"AI-assisted" never means AI-decided.** Principle **P3** and BR15 hold
  the line: the assistant drafts, summarises, classifies, and flags, and a
  human approves every document, registration, payment, and promotion.
  Marketing language implying automated approval would contradict
  [decision 1](../../decisions/1_ai-assistant-autonomy-level.md), and it is
  also the wrong sell — the club's exposure is *why* the human stays in the
  loop.
- **"Competitions and community events" describe the destination, not the
  Q4 2026 release.** Carnival & event management (**C12**) is explicitly
  deferred past the MVP ([open question #24](../../scope/open-questions.md)),
  and **C11** covers the competition/calendar structure that referee
  appointment depends on rather than a full competition-management product.
  The pitch is accurate about the platform; it is ahead of the first
  release.
- **"Documents" has no capability of its own.** Document handling exists as
  *required documents* within registration (**C2**) and the **Person
  Document** business object — not as a document-management capability with
  versioning, expiry, or sharing. Either the claim is read narrowly
  (registration documents) or a capability is needed; today the
  architecture supports only the narrow reading.

### Financial Intelligence's own boundaries

Five more, added with G9. Each is a sentence a salesperson will be tempted
to drop, and each is load-bearing.

- **"Payment integration" moves no money until a provider is approved and
  tested.** Today every receipt is typed by a treasurer and every payout is
  simulated ([decision 16](../../decisions/16_the_platform_records_a_payout_a_provider_moves_it.md)).
  Even once integrated, the provider moves the money and the platform
  records it ([decision 20](../../decisions/20_payments_through_a_provider_port_never_on_the_platform.md)).
- **"Financial management" is not accounting.** The platform keeps the
  club's obligations, receipts and the reasons behind them. It does not keep
  the books of account, lodge a BAS or GST return, or decide a tax
  treatment: GST and financial-year settings are the club's own statements,
  confirmed with its accountant (BR219).
- **"Transparency" never means verification.** A governing body's
  *reported* allocation of its revenue is shown as reported, with its
  source, and distinguished from independently *audited* expenditure. The
  platform cannot verify how a governing body spends its money, and must not
  imply it does (BR216).
- **"Benchmarking" is opt-in, aggregated and suppressible.** No club is in a
  cohort it did not join, and no figure is shown for a cohort small or
  lopsided enough to identify a member (BR217). It is never a way to see
  another club's numbers.
- **"Governing-body reporting" happens only by the club's grant.** An
  association is not entitled to a club's financial records by being its
  association (P8; BR214).

## Where these statements are used

The [repository README](../../../README.md) carries the long-form
description, [CLAUDE.md](../../../CLAUDE.md) the one-paragraph rule, and
this document the externally-facing wording. When the product's positioning
changes, this file changes first and the others follow — not the reverse.
