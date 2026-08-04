# Value Proposition

_[← Strategy layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Value, Meaning.

The externally-facing statements of what Let'sDataTalk is and what it is
worth — the *Meaning* the architecture carries to a reader outside it.
Recorded here so that pitch language and architecture stay answerable to
each other: every claim below should be traceable to a Goal, Capability,
or Principle, and where a claim runs ahead of what is built, this document
says so rather than letting the gap be discovered in a sales conversation.

## Positioning statement (pitch)

> Let'sDataTalk is a multiclub, multitenant, AI-assisted football
> operations platform that unifies registrations, finance, documents,
> referee management, competitions, and community events around a single
> `Person` identity — allowing one individual to seamlessly participate as
> a player, referee, coach, guardian, or committee member without
> duplicated records.

## Commercial statement (for clubs)

> Let'sDataTalk is a next-generation SaaS platform for grassroots football
> clubs that replaces disconnected spreadsheets, registration systems,
> payment tools, and communication channels with one intelligent operating
> platform. Built around a single `Person` model, it gives clubs a
> complete view of every participant, from players and families to
> referees, coaches, and volunteers.

The commercial statement's "**replaces**" is deliberate and consistent
with [decision 5](../../decisions/5_replace-the-incumbent-rather-than-integrate.md):
Let'sDataTalk competes for the incumbent's market rather than
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

## Claim boundaries

Four places where the statements above, read plainly by a club, would
promise more than the architecture delivers. None is a reason to change
the wording — they are the notes a person using it in a sales conversation
needs to have already read.

- **"Replaces registration systems" does not mean replacing SQUADI, and
  cannot.** Football Queensland confirmed in writing (31 July 2026) that
  affiliated clubs are *required* to use Squadi for competition
  administration, and BR43 makes Squadi registration an eligibility gate on
  taking the field. What Let'sDataTalk replaces is **Majestri,
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

## Where these statements are used

The [repository README](../../../README.md) carries the long-form
description, [CLAUDE.md](../../../CLAUDE.md) the one-paragraph rule, and
this document the externally-facing wording. When the product's positioning
changes, this file changes first and the others follow — not the reverse.
