# Domain Context and Rules

_[← Business layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** none new — this document carries the problem
statement, system context, glossary, and business rules that bind the
elements defined elsewhere in this layer.

## Problem statement

Clubs in Australia and New Zealand run player and referee administration
across disconnected tools — cloud databases, spreadsheets, forms, SQUADI,
PlayFootball, email, WhatsApp, Google Drive, Stripe, Square, Xero, CSVs,
and PDFs — with no official API available for SQUADI or Football Australia.
This produces duplicated identities, registrations no one can confirm are
complete, fragmented finance and referee tracking, and heavy manual
reconciliation. Let'sDataTalk consolidates this into one multitenant,
`Person`-centered platform without requiring the external systems to change
first (Principle P2,
[1_strategy/1_motivation.md](../1_strategy/README.md)).

## System context

```mermaid
flowchart LR
  subgraph EXT["Club's existing sources (read-only)"]
    majestri["Majestri<br>(incumbent club<br>management system)"]:::business
    squadi["SQUADI"]:::business
    playfootball["PlayFootball"]:::business
    sheets["Spreadsheets /<br>forms"]:::business
    pay["Stripe / Square"]:::business
    acct["Xero / accounting"]:::business
    assoc["Governing Body /<br>Association<br>(competitions & calendar)"]:::business
  end

  ldt["Let'sDataTalk<br>platform"]:::business
  users["Club staff,<br>families, referees"]:::business
  public["General public<br>(unauthenticated)"]:::business
  cal["Referee's own calendar<br>(Gmail / Outlook / Apple)"]:::business

  EXT -->|read-only extraction,<br>CSV import| ldt
  ldt -->|CSV export,<br>reconciliation exceptions| EXT
  ldt -->|reconciliation: who is missing<br>from which system (C14)| users
  users -->|registration, availability,<br>designations, payments| ldt
  ldt -->|dashboards, communications| users
  ldt -->|published carnival schedules<br>& results, no login (P6)| public
  cal -->|subscribes to and pulls<br>the referee's own ICS feed| ldt

  classDef business fill:#fffbb5,stroke:#b8a200,color:#333
```

## Glossary

Canonical English terms; reuse these in code, commits, and future
documents rather than re-deriving translations from the Spanish discovery
material.

| Term | Meaning |
| ---- | ------- |
| **Person** | The single identity a human has in the system, independent of role (Principle P1) |
| **Person Role** | A time-bounded role a Person holds at a club, for a season |
| **Tenant / Club** | The unit of logical data separation in the multitenant platform |
| **Registration** | A Player's season-scoped enrollment record |
| **Guardian** | The Parent/Guardian responsible for a minor Player |
| **Classification** | A referee's current standing on the Football Queensland pathway (e.g. MiniRefs 5.0, Club Based Match Official 4.5, …) |
| **Pathway** | The progressive structure of referee classifications and promotion routes |
| **Availability** | A referee's declared window of matches they can be designated to |
| **Designation / Appointment** | The assignment of a referee (or Assistant Referee, Fourth Official, …) to a specific match |
| **Decline rate** | The proportion of designations a referee declines, subject to a classification/competition-specific maximum |
| **Governing Body / Association** | The external football association per state/region that defines competition structure and publishes the season calendar (Football Queensland, Football NSW, Northern NSW Football, Capital Football, Football South Australia, Football West, New Zealand Football, …) |
| **Competition** | A named league or cup run by a Governing Body for a season, with a type, format, and tier — see [4_business-objects.md](./4_business-objects.md#competitions--calendar) |
| **Playing Format** | The on-field rules an age group or competition is played under — players per side (MiniRoos 4v4/7v7/9v9), field and goal size, ball size, match duration, and whether results are published; authored by the Governing Body / Association |
| **Competition Regulation** | An association-imposed rule on a Competition beyond its format — eligibility, age dispensation, squad and interchange limits, finals qualification, forfeit and disciplinary consequences |
| **Competition Format** | How a Competition's rounds are structured: Knock Out, Round Robin, Double Round Robin, or Enhanced Round Robin (Fixed Number of Rounds or Full Rounds Only) |
| **Match** | A single fixture within a Competition, on the Competition Calendar, that a referee can be designated to and paid for |
| **Claim** | A referee's request for payment for a verified match |
| **Remittance** | The record of a referee payment batch actually paid out |
| **Voucher Program** | A state government (or other) youth-sport discount scheme a club may choose to accept for its invoices, subject to Committee approval (BR21) — e.g. Queensland Play On!/FairPlay, NSW Active and Creative Kids, SA Sports Vouchers, WA KidSport, Victoria Get Active Kids, Tasmania Ticket to Play |
| **Voucher** | A discount instrument applied to an invoice, redeemed under a Committee-approved Voucher Program (BR21), only by Finance Admin or Treasurer (BR22) |
| **Voucher Verification** | The check of a Voucher's code against its issuing government's own public interface before the Voucher is applied (BR25) |
| **Voucher Claim** | The club's request to a Voucher Program's issuing government for reimbursement of an applied Voucher (BR23, BR24) |
| **RAW / STAGING / Unified model** | The three stages historical data passes through during consolidation (see [3_business-processes.md](./3_business-processes.md#historical-data-consolidation-process)) |
| **Carnival / Grassroots Event** | A one-off, often multi-club event (MiniRoos Invitational Carnival, Girls United Carnival, WinterFest, Pacific Championships, talent-ID tournament) — see [4_business-objects.md](./4_business-objects.md#carnivals--grassroots-events) |
| **Carnival Conditions** | The event-specific rules (points system, tie-breakers, match format, eligibility, code of conduct) an Events Coordinator configures for one Carnival before publishing it (BR29) |
| **Carnival Fixture** | A single scheduled match within a Carnival/Grassroots Event, distinct from a season **Match** |
| **Ladder / Standings** | The computed points-table for a round-robin-format Carnival, derived from results using its Carnival Conditions |
| **Responsible person** | The one Person recorded as accountable for a Carnival/Grassroots Event — holds the Events Coordinator role for it, whether or not they also hold Registrar, Secretary, or another club role (BR29) |
| **Public Event View** | The account-free, published schedule/draw (date, time, venue), next-fixture, ladder, and results of a Carnival/Grassroots Event, club/team-level only by default (BR26) — the scoped public exception to tenant isolation (Principle P6, BR27) |
| **Calendar Subscription** | A Person's opt-in to receive their own appointments as an iCalendar feed, via a private tokenised URL their existing Google/Outlook/Apple calendar subscribes to (BR30, BR31) |
| **Calendar Event** | The published iCalendar entry for one confirmed appointment — a convenience copy, never authoritative (BR34) |
| **iCalendar / ICS feed** | The open RFC 5545 format and `webcal:` subscription convention every major calendar client consumes, letting one feed serve Gmail, Outlook, and Apple Calendar alike without a per-vendor integration |
| **Majestri** | The incumbent club management system most football clubs already run — registration intake, dashboards, email/SMS, volunteers, officials — and which already performs periodic manual comparisons against PlayFootball and SQUADI |
| **External System Extract** | A CSV report pulled from an external system (e.g. the Squadi Registration Report or User Report), carrying its own known limitations alongside its rows (BR45) |
| **Reconciliation Run** | One comparison of the club's registrations against an external system's extract, as at that extract's date (BR46) |
| **Reconciliation Exception** | A specific difference the run found — most consequentially a Player missing from the governing body's system, which is an eligibility risk, not a tidiness issue (BR47) |
| **Identity Match Candidate** | A proposed cross-system identity match made without a shared identifier, awaiting human confirmation (BR44) |
| **Consent Record** | An explicit, scoped, revocable record of a guardian's consent to process a minor's data — what, by whom, when (BR48) |
| **Erasure Request** | A data subject's request to delete their data, with its outcome and, where refused or partial, the specific lawful basis relied on (BR49) |
| **WWCC Clearance** | A holder's Working with Children Check as tracked by the platform — its number, jurisdiction, validity dates, and current status, re-verified on a schedule (BR51) and driving automatic withdrawal on expiry (BR50) |
| **Working with Children Check (WWCC)** | A mandatory clearance for adults working with children in child-related sectors; state-specific in Australia (e.g. Queensland's Blue Card), verified in real time through state government online portals using the worker's clearance number, surname, and date of birth. New Zealand's equivalent is unconfirmed (open question 14, [docs/scope/open-questions.md](../../scope/open-questions.md)) |
| **Appointing party** | Whichever body designates a referee to a match — the club itself, or an association/competition body (e.g. Football Queensland) — determines who is financially responsible for that designation (see BR16) |
| **International Transfer Certificate (ITC)** | A certificate from a Player's former national association authorising their registration with a new one; required whenever the Player's immediately preceding registration was with a different national association, requested solely by Football Australia (BR35, BR38) — see [4_business-objects.md](./4_business-objects.md#international-transfers) |
| **Minor (ITC)** | FIFA's international-clearance definition: a player aged 10–17 (narrower than the general legal-minor threshold of under 18 used elsewhere, e.g. BR1); a player under 10 is exempt from the ITC process entirely (BR37) |
| **Minor ITC Application** | One of six FIFA-prescribed application forms (by exception category — parents relocating for non-football reasons, five years' continuous residence, academic exchange, or refugee status), submitted with supporting documentation via the Member Federation, to obtain international clearance for a Minor (ITC) (BR37) |

## Business rules

Every rule the Compliance & data quality service (deterministic layer,
[2_business-services.md](./2_business-services.md)) evaluates. New rules
get a row here, with rationale, before they get code (`ea-first-change`).

| # | Rule | Applies to | Rationale / source |
| - | ---- | ---------- | --------------------- |
| BR1 | A minor's registration cannot be COMPLETE without an associated Guardian | Player registration | Duty of care; a minor cannot be the sole responsible party |
| BR2 | A registration cannot be COMPLETE with a required document missing | Player registration | Compliance and eligibility depend on document completeness |
| BR3 | A registration cannot be COMPLETE with an outstanding payment | Player registration / finance | Financial control |
| BR4 | A voucher cannot be applied to more than one invoice | Player finance | Prevents double-discounting (e.g. PlayOn Sports Voucher duplication) |
| BR5 | Two Person records with matching strong identifiers (name + date of birth, or external ID) are flagged as a possible duplicate, not silently merged | Identity | Merging identities is a human decision; false merges are costly to undo |
| BR6 | A referee cannot be designated to a match they are also registered as a Player in | Referee appointment | Blocking conflict — direct role conflict in the same match |
| BR7 | A referee cannot hold two simultaneous designations | Referee appointment | Blocking conflict — a person cannot officiate two matches at once |
| BR8 | A referee's classification must meet or exceed the competition's minimum for the designation to be valid | Referee appointment | Blocking conflict — competency requirement |
| BR9 | A referee with an active suspension cannot be designated | Referee appointment | Blocking conflict — disciplinary status |
| BR10 | A referee with an expired mandatory accreditation cannot be designated | Referee appointment | Blocking conflict — compliance requirement |
| BR11 | Same-club affiliation, a family relationship with a participant, limited travel time, or excessive consecutive matches produce a warning, not a block, and every override is audited | Referee appointment | Judgment calls that a human coordinator should see, not calls the system should make unilaterally |
| BR12 | A referee's decline rate over the configured window must not exceed the classification/competition's configured maximum | Referee compliance | Configurable per classification/competition, not hardcoded (see Football Queensland pathway rules) |
| BR13 | A referee payment claim requires a verified match before it can be created | Referee finance | Prevents paying for unverified/undisputed matches |
| BR14 | A referee cannot be paid twice for the same verified match | Referee finance | Prevents duplicate payment |
| BR15 | The AI Assistant's output on any of the above never itself changes a status, approves a document, or executes a payment — only a human role does | Cross-cutting | Principle P3; see [1_business-actors-and-roles.md](./1_business-actors-and-roles.md#ai-actor) |
| BR16 | The appointing party pays the referee: the club pays when the club made the designation; an association or government entity (e.g. Football Queensland) pays when it made the appointment | Referee finance | Stakeholder confirmation (see [docs/scope/open-questions.md](../../scope/open-questions.md)) |
| BR17 | No referee payment claim is generated for a cancelled match | Referee finance | Stakeholder confirmation — no service was delivered, so no payment is owed |
| BR18 | A referee payment claim for an abandoned match requires the referee's explanation of the reason for abandonment before it can be approved | Referee finance | Stakeholder confirmation — payment eligibility depends on why the match was abandoned |
| BR19 | A paid or volunteer worker in a child-related role must hold a current Working with Children Check (state-specific, e.g. Queensland's "no card, no start" Blue Card requirement) before starting, verified through the relevant state government portal | Identity / compliance | Legal requirement in Australia; duty of care (see the **Blue Card Administration** actor, [1_business-actors-and-roles.md](./1_business-actors-and-roles.md)) |
| BR20 | A Match Official Appointment must reference a Match that exists in the club's Competition Calendar for the current Season | Referee appointment | Closes the gap between "Match played" ([3_business-processes.md](./3_business-processes.md#referee-appointment-process)) and where a Match actually comes from ([Season competition setup process](./3_business-processes.md#season-competition-setup-process)) — an appointment cannot be proposed for a fixture that was never entered/published |
| BR21 | A Voucher Program cannot be applied to a club's invoices until the club's Committee approves it (Club Voucher Program Enablement) | Player finance / Club governance | Which discount programs a club participates in is a Club governance decision, not an automatic default — state programs carry different eligibility rules, values, and reimbursement mechanics the Committee must knowingly accept before families rely on them |
| BR22 | Only Finance Admin or Treasurer may generate/apply an approved Voucher on a Player's invoice | Player finance | Separates the Committee's governance approval (BR21) from financial execution — the Committee decides whether a program is accepted, but only a finance officer touches an invoice, the same separation already held between referee-payment approval and execution |
| BR23 | A Voucher Claim can only be submitted for a Voucher already applied to an invoice | Player finance | Prevents claiming reimbursement for a discount that was never actually granted (mirrors BR13) |
| BR24 | A Voucher cannot be claimed from its issuing government more than once | Player finance | Prevents duplicate reimbursement from a government counterparty (mirrors BR14; distinct from BR4, which blocks applying one Voucher to two invoices) |
| BR25 | A Voucher's code must be verified against the issuing government's public verification interface, with the result recorded, before it is applied to a Player's invoice | Player finance | Reduces the risk of applying a duplicate, expired, or invalid code; the check may be performed by the Assistant (AI, advisory — decision [2](../../decisions/2_ai-voucher-code-verification.md)), but the decision to apply the Voucher remains Finance Admin/Treasurer's alone (Principle P3, BR22) |
| BR26 | A Carnival/Grassroots Event's Public Event View shows, at club/team level only: the fixture schedule and draw (date, kickoff time, and venue), each team's next unplayed fixture, the ladder/standings (where the format has one), and results. Individual player names are never published unless the Events Coordinator explicitly marks the event as adult/open-age and opts in per event | Carnival & event management | Adopted interpretation ([open question #23](../../scope/open-questions.md)); club/team-level detail is what coaches, parents, and the public actually asked to follow, while protecting minors' identity by default, in the spirit of Principle P4 |
| BR27 | Once an Events Coordinator publishes a Carnival/Grassroots Event, its Public Event View is visible to unauthenticated visitors across every participating club — a scoped exception to tenant isolation for that specific published, non-personal content only | Carnival & event management | Principle P6; carnivals span multiple clubs by design and exist to be publicly followed — see decision [3](../../decisions/3_public-event-data-crosses-tenant-isolation.md) |
| BR28 | A match official appointed to a Carnival Fixture goes through the same eligibility/conflict checks as a season Match Official Appointment (BR6–BR11) | Carnival & event management / Referee appointment | Consistency — a MiniRef or Club Based Match Official officiating a carnival fixture is still subject to the same role-conflict and competency rules as a season match |
| BR29 | Only the Events Coordinator recorded as a Carnival/Grassroots Event's responsible person may create or change its Carnival Conditions — regardless of whether that Person also holds Registrar, Secretary, or another club role | Carnival & event management / Club governance | One accountable owner per event's rules, so the ladder's points system and other conditions can't be changed by whoever happens to be logged in; mirrors the BR21/BR22 pattern of naming exactly who may act |
| BR30 | A Calendar Subscription's feed contains only the subscribing Person's own appointments — never another Person's, and never a whole club's or competition's schedule | Calendar distribution | The feed URL is a bearer credential outside the platform's session control; scoping it to one Person keeps a leaked URL's blast radius to that Person's own commitments, and keeps tenant isolation (Principle P5) intact for everything else |
| BR31 | A Calendar Subscription's feed URL is unguessable, and the subscriber may revoke or rotate it at any time, immediately invalidating the old URL | Calendar distribution | Anyone holding the URL can read the feed, so it must be treated as a credential — revocation is the only remedy once a URL leaks (e.g. a shared device, a forwarded email) |
| BR32 | A Calendar Event carries only non-personal match detail — competition, date, time, venue, and the subscriber's own role — never another participant's, official's, or player's personal data | Calendar distribution / Privacy | The feed leaves the platform's access control behind and lands in a third-party calendar account; minimising its content is what keeps that transfer proportionate (Principle P4's spirit, for a destination the platform does not control) |
| BR33 | For a referee who is a minor, the Calendar Subscription is issued to their Parent/Guardian, not to the minor directly | Calendar distribution / Duty of care | Mirrors BR1's duty-of-care pattern — a minor's schedule (where they will be, and when) is exactly the data a guardian should control the distribution of |
| BR34 | The platform's own Match Official Appointment remains authoritative: a Calendar Event is a one-way convenience copy, and changing or deleting it in a personal calendar never accepts, declines, or cancels a designation | Calendar distribution / Referee appointment | Prevents a personal calendar edit from silently bypassing the eligibility and conflict checks (BR6–BR11) and the payment chain (BR13) that depend on the appointment's real status |
| BR35 | A Player Registration cannot reach COMPLETE if the Player's immediately preceding football registration was with a different national association, until a valid International Transfer Certificate (ITC) is on file — this is what the existing `PENDING_EXTERNAL_REGISTRATION` status ([3_business-processes.md](./3_business-processes.md#player-registration-process)) represents | Player registration / Compliance | FIFA Regulations on the Status and Transfer of Players, and Football Australia's National Registration Regulations (NRRs) — see the *Guide to International Transfer Certificates* resource, [1_strategy/2_capabilities-and-resources.md](../1_strategy/2_capabilities-and-resources.md) |
| BR36 | A registration blocked under BR35 may proceed on a provisional basis once 30 days have elapsed since Football Australia requested the ITC from the former association with no response — never before that request is actually sent | Player registration | FIFA's 30-day non-response rule; the clock starts when Football Australia sends the request, not when the Player submits their registration |
| BR37 | A Player who is a Minor (ITC) — aged 10–17 — additionally requires international clearance via a Minor ITC Application matching one of FIFA's defined exception categories before BR35 can be satisfied; a Minor under 10 is exempt from the ITC process entirely | Player registration / Guardianship / Compliance | FIFA Art. 19 bars international transfers of players under 18 by default, to prevent exploitation, with narrow, documented exceptions only |
| BR38 | Only Football Australia — never a Club or Member Federation — may request a Player's ITC from their former national association | Player registration / Compliance | Football Australia is the sole body in Australia authorised to make an ITC request; Clubs and Member Federations submit through it, they don't request directly |
| BR39 | SQUADI is the system of record for the data items it holds. Where Let'sDataTalk and SQUADI disagree, SQUADI is authoritative: the difference is raised as a reconciliation exception for a human to resolve, never silently overwritten in either direction | Cross-cutting / data quality | Stakeholder confirmation (July 2026). Naming one authoritative source is what makes reconciliation decidable — without it, two systems disagreeing is an unresolvable tie. Consistent with Principle P2: Let'sDataTalk reads SQUADI, it does not write back |
| BR40 | Personal and operational records are retained for **three years**, after which they are subject to the project's deletion policy | Cross-cutting / privacy | Stakeholder confirmation (July 2026); matches the pilot club's own three-year historical data horizon. **Caveat:** Australian statutory minimums may exceed three years for some record classes (financial/tax records, and child-safety records tied to WWCC) — a flat three-year rule may not be lawful for those. Flagged as [open question #29](../../scope/open-questions.md) before this becomes a deletion job |
| BR41 | A referee's fee rate is determined by the appointing party together with the referee's affiliation — whether they officiate as a club-registered official or under a body corporate such as Football Queensland — plus their registration status and declared availability | Referee finance | Stakeholder confirmation (July 2026), extending BR16 from *who pays* to *what determines the rate*. The rate table itself is still unknown ([open question #1](../../scope/open-questions.md)) — this rule fixes the shape of the lookup, not its values, and stays configuration rather than code |
| BR42 | A referee who declines a proposed designation, or withdraws from one already accepted, must record a brief reason; withdrawal after acceptance additionally notifies the Referee Coordinator | Referee appointment | Stakeholder confirmation (July 2026). A bare decline count (BR12) says nothing about *why* — capturing the reason is what lets a coordinator distinguish an unavailable referee from a disengaging one, and gives the referee a fair record when a decline is later reviewed against BR12's threshold |

| BR43 | A Player may not take the field until their external registration with the Governing Body's system of record (SQUADI) is complete. `PENDING_EXTERNAL_REGISTRATION` is therefore an **eligibility gate on participation**, not merely an administrative state on the way to COMPLETE | Player registration / eligibility | Football Queensland policy, confirmed by the stakeholder (July 2026): no SQUADI registration, no playing time. This is why registration latency is a football problem and not only an admin one — the measured baseline is *weeks* ([1_strategy/1_motivation.md](../1_strategy/1_motivation.md)), and every week of it is potentially a week the player cannot play |

| BR44 | Identity matching across systems must not assume a shared external identifier. The Squadi User Report lost its FA ID column in March 2025, so matching falls back to name + date of birth + email; every resulting match is a **candidate for human confirmation**, never an automatic merge | External reconciliation / identity | Extends BR5 to the cross-system case. Without a stable key, a confident-looking match can be two different children with the same common name and birth year — a false merge here would attach one child's registration, payments, and eligibility to another |
| BR45 | Every External System Extract records the known limitations of its own format alongside its data — excluded rows, role coverage, absent fields, and season scope — and any reconciliation result derived from it is qualified by them | External reconciliation / data quality | A comparison is only as trustworthy as the extract beneath it. The Registration Report silently omits `De-Registered` rows and carries no role; the User Report covers only Player/Coach/Team Official, has no registration date, and may span seasons. "Missing from SQUADI" means something different under each — unqualified, the number misleads |
| BR46 | A reconciliation result carries the as-at date of the extract it was computed from, and is flagged as stale once older than the configured threshold | External reconciliation | The pilot club's comparisons were last run 15 May 2026 and were still being read ten weeks later. A gap list is a snapshot, and an undated snapshot invites decisions on facts that have moved |
| BR47 | A Player present in the club's own registrations but absent from the governing body's system is raised as an **eligibility exception**, not merely listed as a data difference, because under BR43 that Player cannot take the field | External reconciliation / eligibility | Connects the reconciliation count to its actual consequence. The pilot club's 40 players missing from SQUADI are not 40 rows to tidy — they are 40 children who may arrive on match day and be turned away |

| BR48 | A minor's personal data is processed only under **explicit, recorded guardian consent** that states what was consented to, by whom, and when — and that the guardian can withdraw at any time. Withdrawal stops further processing for the withdrawn purpose; it does not retroactively erase records a lawful basis requires retaining (BR49) | Privacy / duty of care | Principle P7. Guardianship (BR1) establishes *who is responsible*; it is not itself consent to process. Separating the two makes consent auditable and revocable per purpose, rather than an unwritten implication of registering |
| BR49 | A data subject (or their guardian) may request **erasure**. The request is honoured unless a named lawful basis requires retention — statutory financial or child-safety minimums, an active eligibility record (BR43), or audit integrity — in which case the record is **de-identified rather than deleted** where that satisfies the obligation, and **every refusal or partial refusal records the specific basis relied on** | Privacy | Principle P7. Erasure is never absolute: GDPR Art. 17(3) exempts legal obligation and legal claims, and Australian/NZ law is correction-oriented with no general erasure right at all. A protocol that silently ignores requests, or one that deletes records the club is legally required to keep, both fail — the recorded basis is what makes the decision defensible |
| BR50 | **Expiry or revocation of a Working with Children Check automatically withdraws the holder from every *future* assignment** — match official appointments, carnival fixtures, and any child-related role — blocks new ones, and notifies both the holder and the responsible coordinator that the resulting vacancies need re-filling. Past assignments are left untouched as historical record | Compliance / safeguarding | Principle P7, and the gap BR10 and BR19 leave between them: BR19 checks the clearance *before starting*, BR10 blocks a *new* designation, and neither removes someone already on next Saturday's match sheet. Point-in-time verification is not safeguarding — a lapsed clearance must reach forward, not just sideways |
| BR51 | A Working with Children Check's validity is **re-verified on a recurring schedule**, not only at onboarding, so that expiry, suspension, or revocation is detected by the platform rather than discovered on match day | Compliance / safeguarding | Makes BR50 operable — automatic withdrawal is only as timely as the check that triggers it. State registers can also revoke mid-term, which an onboarding-only check would never see |
| BR52 | The privacy framework applying to a tenant is **determined by jurisdiction and recorded in that tenant's configuration**, never assumed platform-wide | Privacy / multitenancy | The platform spans Australia and New Zealand, whose regimes differ (and differ again from GDPR, should the EU ever be in scope). One hardcoded interpretation would be wrong somewhere; recording it per tenant keeps consent wording, retention, and erasure handling answerable to the right law |

Rule parameters that vary by classification, competition, association,
season, or event (availability weeks, decline-rate thresholds,
confirmation/verification hour limits, fee schedules, competition
classification minimums, voucher program values/frequency/eligibility,
carnival/grassroots event type and format) are **configuration data, not
code** — see
[1_strategy/2_capabilities-and-resources.md](../1_strategy/2_capabilities-and-resources.md)'s
note on the Football Queensland pathway resource, the competitions-per-state
resource, the state voucher-programs resource, and the regional
carnivals/grassroots events resource, and
[docs/scope/open-questions.md](../../scope/open-questions.md) for the ones
whose actual values are still unconfirmed.
