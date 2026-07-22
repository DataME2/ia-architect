# Business Actors and Roles

_[← Business layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Business Actor, Business Role.

Notation: `ea-doc-style`'s human/AI/hybrid actor convention — every actor
states its kind, and AI/hybrid actors carry autonomy level, decision
rights, and escalation path. Every actor below is a role a `Person` can
hold (Principle P1,
[1_strategy/1_motivation.md](../1_strategy/1_motivation.md)) — the same
human can be a Player in one club, a Parent/Guardian in another, and a
Referee across both, simultaneously or over time.

## Platform-level actor

| Actor | Kind | Role | Concern |
| ----- | ---- | ---- | ------- |
| Let'sDataTalk operator | Human | **Super Admin** | Central, cross-tenant administration: provisioning clubs, platform-wide configuration, support |

## Club governance and administration actors

| Actor | Kind | Role | Concern |
| ----- | ---- | ---- | ------- |
| Club administrator | Human | **Club Admin** | Owns a club's tenant configuration, users, and branding |
| Club officer | Human | **President** | Club leadership and oversight |
| Club officer | Human | **Secretary** | Club records and governance administration |
| Club officer | Human | **Treasurer** | Approves referee payment batches; owns overall club finance |
| Registration officer | Human | **Registrar** | Reviews and approves season registrations, documents, and exceptions |
| Football operations lead | Human | **Director of Football** | Team, category, and program structure |
| Football operations lead | Human | **Head of Women's Football** | Women's program structure and oversight |
| Committee member | Human | **Committee Member** | Club governance decisions |
| Committee member | Human | **Subcommittee Member** | Delegated governance within a subcommittee |
| Finance officer | Human | **Finance Admin** | Day-to-day fees, payments, vouchers, and reconciliation |
| Referee operations lead | Human | **Referee Coordinator** | Proposes designations, manages referee compliance and payment approval workflow |

## Football operations actors

| Actor | Kind | Role | Concern |
| ----- | ---- | ---- | ------- |
| Team staff | Human | **Coach** | Team coaching; may also hold a referee or committee role |
| Team staff | Human | **Team Manager** | Team-level administration |

## Participant actors

| Actor | Kind | Role | Concern |
| ----- | ---- | ---- | ------- |
| Family member | Human | **Parent or Guardian** | Registers and manages a minor's registration, documents, and payments |
| Football participant | Human | **Player** | Registers each season; tracks their own registration status |

## Match official actors

| Actor | Kind | Role | Concern |
| ----- | ---- | ---- | ------- |
| Match official | Human | **Referee** | Declares availability, accepts/declines designations, is paid per the fee schedule |
| Match official | Human | **Assistant Referee** | Same concerns as Referee, at the Assistant Referee fee rate |
| Match official | Human | **Club Based Match Official** | Entry-level classification (4.5) on the Football Queensland pathway — see [3_business-processes.md](./3_business-processes.md) |
| Match official | Human | **MiniRef** | Youngest classification (5.0) on the pathway |

## AI actor

| Actor | Kind | Role | Autonomy level | Decision rights | Escalation path |
| ----- | ---- | ---- | --------------- | ---------------- | ----------------- |
| Assistant | AI | **Data & Communications Assistant** | **Advisory** — suggests, drafts, and flags; a human decides and acts on everything it produces | May: validate data against deterministic rules and surface the result; classify and summarize pending cases; draft communications and generic-question answers; explain missing information; propose case priority. May **not**: approve identity documents, reject a player, modify a debt, approve or execute a payment, or promote a referee — ever, regardless of confidence (Principle P3) | Registrar (registration cases), Finance Admin (payment cases), Referee Coordinator (referee cases) — routed by case type; never resolves an ambiguous or out-of-policy case itself |

See [decision 1](../../decisions/1_ai-assistant-autonomy-level.md) for why
this is set at **advisory** rather than a stronger autonomy level.

## Roles this project does not yet model

Working with Children Check verification, banking-detail custody for minor
referees, and association/federation-level actors (Football Queensland,
Football Australia) are mentioned in the source discovery material as
external constraints but are not modeled as actors here — they are open
questions (see
[docs/scope/open-questions.md](../../scope/open-questions.md)) pending
confirmation of exactly how they interact with the platform.

## Mapping to the process roles

The template's change process defines three roles — **Requester**,
**Agent**, and **Reviewer** (see [CONTRIBUTING.md](../../../CONTRIBUTING.md)).
These are roles in how *this repository* is developed, distinct from the
business actors above (who are roles in the football administration domain
the software serves): a Requester (e.g. the pilot club, or Let'sDataTalk
product ownership) states a requirement, an Agent (human contributor or AI
coding agent) walks the EA layers and implements, and a Reviewer approves
and merges.
