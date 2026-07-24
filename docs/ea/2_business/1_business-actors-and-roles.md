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
| Club officer | Human | **Vice President** | Deputizes for the President; club leadership continuity (Optional role) |
| Club officer | Human | **Secretary / Member Protection Officer** | Club records and governance administration; club's member protection (child safety) officer |
| Club officer | Human | **Treasurer** | Approves referee payment batches; owns overall club finance |
| Club officer | Human | **Digital Technology Manager** | Club-side technology liaison; co-owns tenant configuration and data quality with Club Admin |
| Registration officer | Human | **Registrar** | Reviews and approves season registrations, documents, and exceptions |
| Football operations lead | Human | **Director of Football** | Team, category, and program structure |
| Football operations lead | Human | **Head of Performance** | Player and team performance programs across football operations |
| Football operations lead | Human | **Head of Community Football** | Community-level (grassroots/non-elite) football program structure |
| Football operations lead | Human | **Head of Women's Football** | Women's program structure and oversight |
| Football operations lead | Human | **Technical Director** | Coaching pathway and playing-technical standards across all programs |
| Committee member | Human | **Committee Member** | Club governance decisions |
| Committee member | Human | **Subcommittee Member** | Delegated governance within a subcommittee |
| Committee member | Human | **Grants Committee Member** | Reviews and decides grant funding applications |
| Committee member | Human | **Appeals Panel Member** | Reviews and decides appeals against registration or compliance decisions escalated by the Registrar or Finance Admin (see [open questions](../../scope/open-questions.md)) |
| Finance officer | Human | **Finance Admin** | Day-to-day fees, payments, vouchers, and reconciliation |
| Finance officer | Human | **Grants Coordinator** | Tracks grant funding applications and reporting; supports the Grants Committee |
| Referee operations lead | Human | **Referee Coordinator** | Proposes designations, manages referee compliance and payment approval workflow |
| Referee operations lead | Human | **Referee Coordinator Admin** | Administrative support for referee designations and compliance record-keeping, reporting to the Referee Coordinator |
| Referee operations lead | Human | **Referee Admin Back-Up** | Back-up cover for referee administration when the Referee Coordinator/Admin is unavailable (Optional role) |
| Compliance officer | Human | **Blue Card Administration** | Verifies and records Working with Children Checks for paid staff and volunteers (Queensland Blue Card and interstate equivalents — see [5_domain-context-and-rules.md](./5_domain-context-and-rules.md)) |
| Compliance officer | Human | **Volunteer Coordinator** | Registers volunteer Persons and their roles; tracks their Working with Children Check compliance |
| Welfare officer | Human | **Player Welfare Officer** | Player safeguarding and welfare concerns; escalation point for member protection issues |
| Communications officer | Human | **Social Media Communication and Club Photographer** | Club social media content and match-day photography — supports the Communications business service |

## Football operations actors

| Actor | Kind | Role | Concern |
| ----- | ---- | ---- | ------- |
| Team staff | Human | **Coach** | Team coaching; may also hold a referee or committee role |
| Team staff | Human | **Team Manager** | Team-level administration |

## Football program coordinators

Category/age-group-level administration under a Football operations lead;
each concerns the Player Registration business service
([2_business-services.md](./2_business-services.md)) for its own program.

| Actor | Kind | Role | Concern |
| ----- | ---- | ---- | ------- |
| Program coordinator | Human | **FQPL Mens and U23s Coordinator** | Football Queensland Premier League Men's and U23 team administration |
| Program coordinator | Human | **Academy Coordinator (U13–U18)** | Academy program administration for U13–U18 age groups |
| Program coordinator | Human | **Academy Assessment Coordinator** | Academy player assessment and selection administration |
| Program coordinator | Human | **Academy Game Day Coordinator** | Academy match-day operations |
| Program coordinator | Human | **Academy Coordinator (U8–U12 Junior)** | Academy program administration for U8–U12 junior age groups |
| Program coordinator | Human | **Development Coordinator (U8–U12 Junior)** | Junior development program administration for U8–U12 |
| Program coordinator | Human | **Masters Men Coordinator** | Masters men's team administration |
| Program coordinator | Human | **Senior Metro Coordinator** | Senior metro competition team administration |
| Program coordinator | Human | **Junior Metro Coordinator** | Junior metro competition team administration |
| Program coordinator | Human | **Women's/Girls Teams Coordinator** | Women's and girls' team program administration |
| Program coordinator | Human | **MiniRoos Coordinator** | MiniRoos (youngest participant) program administration |
| Program coordinator | Human | **Little Stars and Rising Stars Coordinator** | Little Stars and Rising Stars program administration |

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

## External actor

Not a role a `Person` holds (the pattern every actor above follows) — an
organisation external to every tenant, whose competition structure and
calendar clubs consume rather than control.

| Actor | Kind | Role | Concern |
| ----- | ---- | ---- | ------- |
| State/regional football association | Organisation (external) | **Governing Body / Association** | Defines competition structure, tiers, format, and publishes the season calendar for its jurisdiction (Football Queensland, Football NSW, Northern NSW Football, Capital Football, Football South Australia, Football West, New Zealand Football, …); shared reference data across every club in that jurisdiction, not owned by any one tenant (Principle P5 still applies to how a club's own Season Competition Entries are isolated) |

Read-only, like every other external source in
[5_domain-context-and-rules.md](./5_domain-context-and-rules.md#system-context)
(Principle P2) — Let'sDataTalk consumes published competition/calendar data,
it does not write back into an association's systems.

## Roles this project does not yet model

Banking-detail custody for minor referees is mentioned in the source
discovery material as an external constraint but is not modeled as an
actor here — it is an open question (see
[docs/scope/open-questions.md](../../scope/open-questions.md)) pending
confirmation of exactly how it interacts with the platform. (Working with
Children Check verification is now modeled — see the **Blue Card
Administration** actor above and
[5_domain-context-and-rules.md](./5_domain-context-and-rules.md).) The
Governing Body / Association is now modeled at the structural level
(competition catalog and calendar, above); *how* its data actually reaches
the platform (a live feed vs. manual/CSV entry, per association) is still
open — see [open question #19](../../scope/open-questions.md).

The discovery document's full club org chart also names several purely
facility, hospitality, and venue-operations roles — **Uniform Shop
Coordinator**, **Grounds Coordinator**, **Grounds Maintenance**, **Club
Physio**, **Strength and Conditioning Coach**, **Canteen Manager**,
**Sponsorship Coordinator**, **Fundraising Coordinator**, **Venue Hire
Coordinator**, **Events Coordinator**, **Club Facilities Coordinator**,
**Bar Coordinator**, and **Cleaner**. None of their concerns touch a
modeled capability (C1–C11,
[1_strategy/2_capabilities-and-resources.md](../1_strategy/2_capabilities-and-resources.md)) —
they are recorded here for completeness rather than modeled as actors, and
would only need a row above if a future capability (e.g. venue/facility
booking) brought them into the platform's scope.

## Mapping to the process roles

The template's change process defines three roles — **Requester**,
**Agent**, and **Reviewer** (see [CONTRIBUTING.md](../../../CONTRIBUTING.md)).
These are roles in how *this repository* is developed, distinct from the
business actors above (who are roles in the football administration domain
the software serves): a Requester (e.g. the pilot club, or Let'sDataTalk
product ownership) states a requirement, an Agent (human contributor or AI
coding agent) walks the EA layers and implements, and a Reviewer approves
and merges.
