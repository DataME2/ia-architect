# Capabilities and Resources

_[← Strategy layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Capability, Resource, Course of Action.

## Capabilities

What Let'sDataTalk must be able to do to realize the goals in
[1_motivation.md](./1_motivation.md).

| # | Capability | Realizes goal(s) |
| - | ---------- | ------------------ |
| C1 | **Identity & role management** — maintain one `Person` per human, with roles (player, referee, coach, guardian, committee member, …) that can overlap and change over time | G1 |
| C2 | **Player registration management** — season registrations, guardians, required documents, registration status, and international transfer clearance (ITC) for players whose last registration was overseas | G2 |
| C3 | **Player finance management** — fees, payment plans, installments, vouchers, reconciliation | G3 |
| C4 | **Referee lifecycle management** — profile, classification pathway, fitness/training/knowledge requirements, availability, appointments, role-conflict detection, post-match verification | G4 |
| C5 | **Referee finance management** — fee schedules, payment claims, approval, payment batches, remittances | G4 |
| C6 | **Data quality & compliance** — deterministic rule evaluation, duplicate detection, exception lists, audit trail | G2, G4, G5 |
| C7 | **Communications** — templated transactional messages, reminders, generic-question FAQ handling | G5 |
| C8 | **Reporting & dashboards** — registration, financial, and referee dashboards for administrative decisions | G2, G3, G4 |
| C9 | **Historical data consolidation** — read-only extraction of the pilot club's multi-year data into a RAW → STAGING → unified model pipeline | G6 |
| C10 | **Multitenant platform operations** — tenant provisioning, role-based access control, per-club branding and season configuration, central super-administration | G1–G6 (cross-cutting) |
| C11 | **Competition & calendar management** — maintain each governing association's competition catalog (tiers, format), its **Competition Regulations and Playing Formats** (small-sided rules, field and ball dimensions, match duration, squad sizes per age group), each club's season entries into those competitions, and the resulting match calendar that referee appointment and team/registration structure depend on | G2, G4 |
| C12 | **Carnival & event management** — create and manage one-off, multi-club carnival/grassroots events (draws or fixtures, results), and publish an account-free public view of them for coaches, parents, and the general public | G7 |
| C13 | **Calendar distribution** — publish a Person's own confirmed commitments (initially referee appointments) as a standards-based calendar feed their existing Gmail, Outlook, or Apple calendar subscribes to, so appointments, changes, and cancellations appear in the calendar they already use | G4, G5 |
| C14 | **External registration reconciliation** — continuously match the club's own registrations against the governing bodies' systems (SQUADI, PlayFootball/Football Australia), identify who is missing from which, resolve identity across systems that no longer share a stable identifier, and surface each gap as an actionable exception carrying its eligibility consequence (BR43) rather than as a spreadsheet row | G2, G6 |
| C15 | **Consent & privacy rights management** — capture explicit, scoped, revocable guardian consent for minors; service data-subject requests (access, correction, erasure) against a recorded lawful basis; and hold the per-jurisdiction privacy configuration that determines which framework applies to which tenant | G1, G5 (cross-cutting, with P7) |
| C16 | **External registration submission** — assemble the club's own validated registrations into a structured, versioned **Registration Submission Pack** that the governing body can import into its own system, hand it over through a controlled channel, and track what was sent, when, to whom, and what came back. The platform produces a file; it never connects to the governing body's system | G2, G6 |

## Resources

| Resource | Notes |
| -------- | ----- |
| Pilot club's ≥3 years of historical data | Read-only access (Principle P2); the primary asset for validating C6, C8, C9 before wider rollout |
| Football Queensland *Referee Pathway & Promotion Structure for Match Officials* | External reference document; source of the classification and administrative-requirement rules C4/C6 must encode as data, not code |
| Square (initial payment provider) | First integration for C3, per pilot-club confirmation (supersedes the discovery document's original Stripe assumption — see [docs/scope/open-questions.md](../../scope/open-questions.md)); Xero is the next post-MVP priority for treasurer/accounting integration (see Courses of action) |
| *Australia Competitions per State* discovery reference (state associations + New Zealand Football) | External reference document cataloguing each state/regional association's competitions, tiers, and format taxonomy (Weekly Competition / Tournament; Knock Out, Round Robin, Double Round Robin, Enhanced Round Robin — Fixed Number of Rounds / Full Rounds Only); source of the Competition object C11 must encode as configuration data, not code. Confirms real structural variance between Australian state associations and New Zealand Football (national + regional leagues, Chatham Cup, Kate Sheppard Cup), relevant to [open question #14](../../scope/open-questions.md) |
| CSV import/export tooling | No official SQUADI or Football Australia API is available to affiliated clubs (confirmed in writing 31 July 2026 — see the Football Queensland response row below); C2/C4/C9 depend on CSV-based reconciliation rather than live integration. **This fallback is no longer unqualified:** the same reply states SQUADI's terms of use do not permit club accounts or Squadi data to be connected or integrated with unauthorised third-party systems, and whether a club-exported CSV consumed by Let'sDataTalk falls inside that restriction is unresolved (BR53, [open question #39](../../scope/open-questions.md)) |
| **Football Queensland's response to the API access request (31 July 2026)** | The pilot club (North Star FC) made a written developer-access request; Football Queensland's Registrations team replied with four material statements. **(1) Access tiering:** Squadi *does* support API integrations, but access is "generally restricted to Football Australia, Football Queensland and approved system partners", and credentials "are not ordinarily provided directly to affiliated clubs" — so the route is **approved system partner status**, not a club-issued key. **(2) Mandated platform:** affiliated clubs "are required to use Squadi for competition administration and related functionality" — the SQUADI dependency (BR43) is contractual, not merely practical. **(3) The terms-of-use restriction:** the terms "do not permit club accounts or Squadi data to be connected or integrated with unauthorised third-party systems" — the single most consequential sentence for this architecture, because it reaches the CSV fallback and not only the API. **(4) An open door:** FQ asked what functionality, information, use, and internal system are involved, and offered to advise whether Squadi already covers it or what supported process applies. The door is open, and the answer given to those four questions determines which side of statement (3) the platform lands on. Source of BR53 and [open questions #39–#41](../../scope/open-questions.md); see [scope document 13](../../scope/13_squadi-access-refusal-and-the-terms-of-use-constraint.md) |
| **The club's reply to Football Queensland (August 2026)** | The pilot club withdrew the API request as framed and asked instead for the *outcome*: a parent **confirming** a registration the club has prepared from its own records, rather than re-keying it. Three questions were put to FQ — (a) does Squadi already support **club-side bulk or assisted registration submission**; (b) if not, what is the supported process for a club holding accurate member data; (c) if neither, what are the criteria and pathway for **approved system partner** status. The argument was framed on outcomes FQ shares: registrations taking weeks because parents start and abandon, duplicate/mismatched records created by re-keying (a data-quality problem at FQ's end too), and players unable to take the field when they do not appear correctly in Squadi. **Awaiting reply** — it is the single response that resolves [open questions #39, #40, #42](../../scope/open-questions.md) and the fixture-feed half of [#19](../../scope/open-questions.md). The reply also states to FQ that the club's system "has no connection to Squadi and holds no Squadi data" — see BR53's note and [scope document 13](../../scope/13_squadi-access-refusal-and-the-terms-of-use-constraint.md) on what that commits the architecture to |
| **Majestri — the incumbent club management system (discovered July 2026)** | Most football clubs, including the pilot club, already run an "advanced" team-sports club management system called Majestri: it handles registration intake, dashboards, email/SMS, volunteers, and match officials, and it already performs **periodic manual comparisons** of its own registrations against PlayFootball v2.0 and SQUADI. Let'sDataTalk is therefore **not entering an empty space** — it enters one with an established incumbent that already covers part of the same ground. **Positioning decided (August 2026): Let'sDataTalk replaces Majestri** and competes for the market it occupies, rather than complementing or integrating with it — see [decision 5](../../decisions/5_replace-the-incumbent-rather-than-integrate.md). Majestri is therefore modeled as the competitive and operational baseline clubs migrate *from*, never as a source system to integrate with |
| **The measured reconciliation gap (pilot club, 2026 season)** | From the club's own Majestri screen, 2026 Season / All Competitions (1 Jan – 1 Aug 2026): **799 players, 707 registrations, 49 incomplete.** Against PlayFootball v2.0: 721 matched, **78 missing.** Against SQUADI: 759 matched, **40 missing.** Both comparisons last run **15 May 2026** — roughly ten weeks stale at time of recording. Those 40 players missing from SQUADI are, under BR43, players who cannot take the field. This is the project's most concrete baseline: not an anecdote, a count |
| **SQUADI extract formats (as supported by Majestri, July 2026)** | Two CSV reports, each with material blind spots that shape what any comparison can actually conclude — **Squadi Registration Report**: First Name, Last Name, Email, DOB, Registration Divisions, Payment Status, FA ID / Gov Body ID, Registration Date (AEDT/AEST/ACDT); has no notion of role, and excludes rows whose Payment Status is `De-Registered`. **Squadi User Report**: Id, First Name, Middle Name, Last Name, Gender, Date Of Birth, Email, Mobile Number, Role, Competition Name; covers only Player, Coach and Team Official roles, carries **no Registration Date**, has unclear season scope (potentially spanning more than one), and — critically — **the FA ID column was removed in March 2025**, so this report offers no stable external identifier at all. Source of BR44–BR47 and [open question #34](../../scope/open-questions.md) |
| **SQUADI — the pilot club's system of record (confirmed July 2026)** | SQUADI is the authoritative source for the data items it holds; where Let'sDataTalk and SQUADI disagree, SQUADI wins and the difference is raised as a reconciliation exception rather than silently overwritten (BR39, [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md)). This makes SQUADI simultaneously the system of record (this row), the club's most-wanted integration (Goal G6's confirmed success outcome, [1_motivation.md](./1_motivation.md)), and an integration with no official API — the three facts together are what [open question #27](../../scope/open-questions.md) has to reconcile |
| **Privacy and child-safeguarding frameworks (assessed July 2026)** | The binding regimes differ by jurisdiction and do **not** align on erasure. **Australia:** Privacy Act 1988 (Cth) and the Australian Privacy Principles — APP 11.2 requires destruction or de-identification once information is no longer needed and APP 13 gives a right of *correction*, but the APPs contain **no general right to erasure**. **New Zealand:** Privacy Act 2020, likewise correction-oriented. **EU GDPR:** binds only if the platform processes EU residents' data or targets the EU; it is the only one of the three carrying a true Art. 17 "right to be forgotten", itself subject to Art. 17(3) exemptions for legal obligation and legal claims. **Child safeguarding:** state-based, e.g. Queensland's Working with Children (Risk Management and Screening) Act 2000 (Blue Card). Building to GDPR is therefore a deliberate **design choice** — the highest common denominator, and futureproofing for expansion — not a description of what currently binds AU/NZ operations; see [open question #36](../../scope/open-questions.md) |
| Technology stack | Not yet chosen — see [5_technology](../5_technology/README.md) (not started) and the `stack-selection` skill when that layer is assessed |
| Australian state government youth-sport voucher programs (discovery reference) | Six state programs catalogued: Queensland Play On!/FairPlay (up to A$200/child/financial year, low-income families), NSW Active and Creative Kids (2 × A$50/child/year, school-aged), SA Sports Vouchers (2 × A$100/child/calendar year, Reception–Year 9), WA KidSport (up to A$300/child aged 5–18, concession-card holders), Victoria Get Active Kids Voucher (up to A$200, concession-card holders), Tasmania Ticket to Play (2 × A$100/child aged 5–18, concession-card holders); source of the Voucher Program object C3 must encode as configuration data, not code, and of the per-club Committee approval gate (BR21, [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md)). New Zealand has no equivalent nationwide government voucher scheme — alternative funding (Tū Manawa Active Aotearoa, local council grants, gaming/philanthropic trusts) runs through the existing Grants Committee Member / Grants Coordinator roles instead of this resource (see [open question #20](../../scope/open-questions.md)) |
| Voucher-program claim mechanisms (researched July 2026) | None of the six state programs exposes a general-purpose claims API at the pilot club's scale: QLD, SA, WA, Victoria, and Tasmania all require a human or CSV-upload interaction with a government-run provider portal to redeem a voucher and be reimbursed; NSW's Active and Creative Kids API exists but is restricted to organisations with 1,000+ under-18 members, which the pilot club (~700 seasonal registrations/year) does not meet. Source of Voucher Claim (C3) and the CSV/portal-based claim submission approach in the Voucher application and claim process ([2_business/3_business-processes.md](../2_business/3_business-processes.md#voucher-application-and-claim-process)); see [open question #21](../../scope/open-questions.md) on formally requesting dedicated API access |
| iCalendar (RFC 5545) and the `webcal:` subscription convention | Open, vendor-neutral standard every major calendar client already consumes — Google Calendar, Outlook/Microsoft 365, and Apple Calendar all subscribe to an ICS URL without any per-vendor API, OAuth grant, or app-store presence. The basis for C13 delivering "add it to my Gmail/Outlook calendar" without Let'sDataTalk holding write access to anyone's mailbox or calendar account (see decision [4](../../decisions/4_calendar-distribution-by-feed-not-account-access.md)) |
| Regional carnivals and grassroots events (stakeholder-provided examples) | MiniRoos Invitational Carnivals (single-day, round-robin, club-hosted), Girls United Carnivals (modified-format, female football celebration carnivals in regions such as Brisbane, Townsville, and Hervey Bay through October–November), and other named events (WinterFest, Pacific Championships, talent-ID tournaments) hosted by local clubs and Football Queensland. No catalogued reference document exists yet for the full list and exact format rules per event type (unlike the *Australia Competitions per State* resource for C11) — source of the Carnival/Grassroots Event object (C12); see [open question #22](../../scope/open-questions.md) |
| Football Australia *Guide to International Transfer Certificates* (March 2019) | External reference document; source of the ITC/Minor ITC Application business objects and BR35–BR38 ([2_business/4_business-objects.md](../2_business/4_business-objects.md#international-transfers), [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md)). Predates the national association's 2021 rebrand from FFA to Football Australia, and names the "Play Football" self-registration platform already modeled as PlayFootball elsewhere in this document — currency of both the guide and the platform name is unconfirmed, see [open question #27](../../scope/open-questions.md) |

## Courses of action

- **Build in module order:** platform base (C1, C10) → player registration
  and finance (C2, C3) → referee management (C4, C5) → communications and
  dashboards (C6, C7, C8) → historical consolidation running alongside from
  the start (C9), since the pilot club's data is available immediately and
  profiling it early de-risks C2–C6.
- **Defer direct external integrations except payments.** SQUADI,
  PlayFootball, Football Queensland, WhatsApp, Xero, and Strava
  integrations are deferred past the MVP (see
  [3_value-stream.md](./3_value-stream.md)); the MVP relies on CSV
  import/export and supervised reconciliation instead. Square (C3) is the
  exception — it is the adopted first payment provider, integrated from
  the MVP rather than deferred.

  > **Resolved by the staged registration ladder (below).** The apparent
  > conflict with Goal G6's success outcome — SQUADI/Football Australia
  > synchronisation — is settled by *sequencing* rather than by rewriting
  > either the metric or this deferral: stage 1 proves the value without
  > any integration at all, and stages 2–3 add the integrations if and when
  > access exists.
- **Registration proves itself in three stages, and only stage 1 is
  unconditional.** Adopted July 2026 to resolve what was
  [open question #27](../../scope/open-questions.md):

  | Stage | What it proves | Depends on |
  | ----- | -------------- | ---------- |
  | **1 — SQUADI-ready ("one-shot")** | How fast a registration can be completed from the *club's* perspective, and — critically — submitted to SQUADI **right first time**: collected once, deterministically validated (BR1–BR5), and handed over as a complete, correct submission instead of a guardian guessing their way through an unfamiliar interface. Demonstrable **pre-MVP**, on the pilot club's real historical data | Nothing external — no API, no integration. This is why it is the stage the project commits to |
  | **1.5 — Structured handover** | The same validated registration leaving the platform as a **submission pack** the governing body imports itself, or that a club admin keys in from without re-deriving anything. Removes the re-keying error loop without any integration | **Nothing from the platform's side** — it produces a file and never touches Squadi, so neither BR53's terms-of-use question nor P2's write-back prohibition is engaged. Full value depends on Football Queensland agreeing to *receive and import* it ([open question #46](../../scope/open-questions.md)); partial value does not, since the same pack guides correct first-time entry |
  | **2 — SQUADI synchronisation** | The same registration flowing through to SQUADI, removing the duplicate entry a parent or guardian performs manually today — the target shape being **the club prepares, the parent confirms** | Either **existing club-side bulk/assisted submission in Squadi** if such functionality exists ([open question #42](../../scope/open-questions.md) — the cheapest route by far, and a supported one), or **approved system partner status** ([#41](../../scope/open-questions.md)). Not a club-level API request, which was made and declined on 31 July 2026. **Both routes additionally need a scoped P2 exception** ([#43](../../scope/open-questions.md)), since both write into a system the platform does not own |
  | **3 — Football Australia** | National-level registration, including the ITC path for players arriving from overseas (BR35–BR38) | Football Australia access, and stage 2 in place |

  Staging this way means the pilot club can see and judge the core benefit
  — speed of registration — **before** any API negotiation succeeds or
  fails, while keeping its stated success outcome (Goal G6) intact as the
  destination rather than the entry ticket. Stages 2 and 3 remain
  conditional and are not promised on the Q4 2026 timeline.

  > **Stage 1 must attack the real bottleneck, not route around it.** The
  > confirmed baseline is *weeks*, and the stated cause is SQUADI itself —
  > hard to use, and a hard gate: no SQUADI registration, no playing time
  > (BR43). A stage 1 that merely made the *club's* internal process fast
  > while leaving the family to fight SQUADI unaided would improve a
  > number nobody is complaining about. What makes stage 1 worth
  > demonstrating without an API is **first-time-right submission** —
  > collect once, validate deterministically, and hand SQUADI a complete
  > and correct registration, so the step that currently fails and
  > re-loops stops doing so.
  >
  > This only works on the portion of those weeks caused by confusion,
  > error, and abandonment. Any portion caused by association processing
  > time, payment clearing, or the 30-day ITC provisional window (BR36) is
  > **not removable by better data entry** — which is why decomposing the
  > baseline is the measurement task in
  > [open question #32](../../scope/open-questions.md), and why stage 1's
  > target should be set against the removable portion only.
- **The route to SQUADI runs through partner status, and the first move is
  a scoping answer, not a second request.** Football Queensland declined
  club-level API access on 31 July 2026 and named "approved system
  partners" as the tier that does hold it. Two consequences follow. First,
  stage 2 of the registration ladder is a **commercial/contractual motion
  owned by Let'sDataTalk the vendor**, not a technical request the pilot
  club can make on its own behalf — and it is the same door as the
  governing-body tier ([open question #31](../../scope/open-questions.md)),
  so the two are best walked through together rather than as separate
  approaches to the same organisation. Second, FQ asked four scoping
  questions, and **the answer is itself an architectural risk**: describing
  Let'sDataTalk as a system that holds and reconciles Squadi data invites
  the terms-of-use restriction the same reply already stated, while
  describing the actual near-term intent — helping families submit *into*
  Squadi correctly the first time (stage 1) — describes something with no
  data connection at all. What is asked for should match the stage actually
  being built ([open question #40](../../scope/open-questions.md)).
- **Displace the incumbent rather than sit beside it.** Let'sDataTalk
  competes for Majestri's market ([decision 5](../../decisions/5_replace-the-incumbent-rather-than-integrate.md)),
  which makes C1–C9 a **minimum viable displacement set** rather than a
  build order: a club switching arrives expecting registration intake,
  dashboards, email/SMS, volunteers, and match officials to already work.
  Two consequences follow that the Q4 2026 target was not set against.
  First, **the chosen wedge is currently blocked** — the most defensible
  reason to displace Majestri is that its SQUADI/PlayFootball comparison is
  manual, periodic, and stale, and C14 answers exactly that, but BR53
  prohibits building it pending [open question #39](../../scope/open-questions.md).
  Until that resolves the replacement is *weaker* than the incumbent on the
  axis chosen to beat it. Second, **every sale is a migration** out of
  Majestri, mid-season, and whether Majestri supports bulk export of a
  club's own data is unknown ([#45](../../scope/open-questions.md)).
- **Hand over a file instead of asking for a connection.** With no reply
  from Football Queensland, the platform stops waiting for permission it
  cannot obtain and inverts the direction: it becomes the **source of truth
  for the club's own registration data** and emits a structured submission
  pack (C16) that the governing body imports into Squadi itself. The
  platform never connects to Squadi, never ingests Squadi data, and never
  writes into it — so **BR53's unresolved terms-of-use question and P2's
  write-back prohibition are both side-stepped rather than resolved**, which
  is the point: neither needs an answer for this route to be built.

  Two honest limits ship with it. **Football Queensland has not agreed to
  receive or import anything** ([open question #46](../../scope/open-questions.md)) —
  the club can build the export unilaterally but cannot make anyone consume
  it. And **the target format is unknown** ([#44](../../scope/open-questions.md)),
  so the pack mirrors the Squadi report columns already documented from the
  incumbent's extracts as the best available proxy. The design absorbs both:
  the same pack that FQ would import is also the pack a club admin or family
  keys in from, correctly, first time — which is stage 1 and needs nobody's
  permission.
- **Carnival & event management (C12) is deferred past the Q4 2026 MVP.**
  It is architected now (goal G7, this capability, the business layer
  additions in [2_business/](../2_business/README.md)) so the public-access
  model is designed alongside tenant isolation from the start rather than
  bolted on later, but it builds after the season-long capabilities (C1–C11)
  it partly reuses (e.g. referee eligibility checks) — adopted
  interpretation, see [open question #24](../../scope/open-questions.md).
- **Calendar reaches referees by subscription, not by account access.** C13
  publishes each Person's own appointments as an iCalendar feed their
  existing Google/Outlook/Apple calendar subscribes to — the calendar client
  pulls, Let'sDataTalk never holds a credential for, or writes into, anyone's
  personal calendar account. This keeps Principle P2 intact with no exception
  needed, and works identically across every provider instead of requiring a
  separate integration per vendor. Two-way sync via the Google Calendar API
  or Microsoft Graph (which *would* need write access, per-vendor OAuth, and
  a P2 exception) is deliberately deferred — see decision
  [4](../../decisions/4_calendar-distribution-by-feed-not-account-access.md)
  and [open question #26](../../scope/open-questions.md).
- **A governing-body tier is a strategic option, not a committed
  direction.** If Let'sDataTalk reaches decision-makers at a governing
  entity (Football Queensland is the named example), the multitenant
  architecture could serve the *association* as the customer — the
  association driving registration across its member clubs, and owning
  Competition Regulations and Playing Formats centrally rather than each
  club holding its own copy. Commercially this is the largest available
  move: it converts a per-club sale into a jurisdiction-wide one, and it
  makes the association the authority for exactly the reference data
  (regulations, playing formats, competition structure) that clubs
  currently re-key.

  The registration baseline sharpens this considerably. Football
  Queensland mandates SQUADI registration as a precondition for playing
  (BR43), and the same registration currently takes weeks because SQUADI
  is hard to use — so the governing body's own policy is what converts a
  usability problem into lost playing time across its whole jurisdiction.
  That is an association-level problem with an association-level
  incentive to fix, and it is a materially stronger opening than a
  per-club efficiency pitch.

  It is recorded here as a **Course of Action under consideration**, not
  as architecture, because it is conditional on access this project does
  not yet have — and because it collides with a Principle. An association
  tenant that can see across its member clubs is precisely what
  **Principle P5 (strict tenant isolation)** forbids today. Serving it
  needs an *association-tier tenancy model* — nested or hierarchical
  tenancy, with a scoped exception like P6's — designed deliberately
  rather than discovered mid-build. See
  [open question #31](../../scope/open-questions.md); nothing in the
  current business layer assumes this tier exists.
- **Free/low-cost tiers first.** Infrastructure for the prototype and
  pilot stays on free or low-cost tiers where possible, with a deliberate
  decision point before moving to paid plans as volume grows — see
  [5_technology](../5_technology/README.md) once a stack is chosen.
- **Two-track approach to government voucher integration.** No state
  voucher program currently offers the pilot club a general claims API
  (see the voucher-program claim mechanisms resource above), so C3 pursues
  two tracks in parallel: (1) **pending, not started** — formally request
  dedicated API/endpoint access from each state government administering
  a voucher program, starting with the pilot club's own jurisdiction (see
  [open question #21](../../scope/open-questions.md)); (2) **interim,
  scoped for the MVP** — the Assistant (AI actor) verifies a Voucher code
  against the issuing government's own public verification interface
  (read-only, advisory — see decision
  [2](../../decisions/2_ai-voucher-code-verification.md)) and records the
  result before Finance Admin or Treasurer applies it (BR22, BR25,
  [2_business/5_domain-context-and-rules.md](../2_business/5_domain-context-and-rules.md));
  the actual reimbursement claim is still submitted through each
  program's own CSV/portal mechanism until track 1 succeeds.
