# Let'sDataTalk — Requirements

_[← specs](./README.md) · [Design](./design.md) · [Tasks](./tasks.md) · [Business rules](../docs/ea/2_business/5_domain-context-and-rules.md)_

**Let'sDataTalk** is a multiclub, multitenant, AI-assisted platform that
centralizes player registration, finance, documents, referee management,
competitions and community carnivals for football clubs in Australia and
New Zealand — built around **a single `Person` who can be a player,
referee, coach, guardian and committee member at once**, instead of five
duplicated records.

## How to read this document

Each requirement carries a **user story** and numbered **acceptance
criteria** in `WHEN … THEN the system SHALL …` form. "SHALL" is binding;
"SHOULD" appears nowhere in this document on purpose.

| Marker | Meaning |
| ------ | ------- |
| ✅ **Implemented** | Working end to end and exercised by tests |
| 🟡 **Partial** | The criterion is met in part; the gap is stated on the criterion itself |
| ⬜ **Not implemented** | No code satisfies this yet |

Every requirement traces to the **business rules** it formalises (`BR<n>`,
defined in
[5_domain-context-and-rules.md](../docs/ea/2_business/5_domain-context-and-rules.md))
and to an architecture **capability** (`C<n>`, defined in
[2_capabilities-and-resources.md](../docs/ea/1_strategy/2_capabilities-and-resources.md)).
Those documents remain authoritative; this one restates them as testable
behaviour.

**Ubiquitous criteria** (no WHEN clause) state invariants that hold at all
times, not responses to an event.

---

# Part A — Identity

## Requirement 1 — One Person, many roles

**User story.** As a club registrar, I want each human to exist once in the
system regardless of how many capacities they act in, so that I never
reconcile five records for the same person and never ask a family for the
same details twice.

**Traces to:** P1, BR106–BR108 · C1 · **Status: ✅ Implemented**

### Acceptance criteria

1. The system SHALL hold exactly one `Person` record per human per club,
   carrying every role that human holds. ✅
2. WHEN a Person is recorded as a player and later also as a referee, coach,
   guardian or committee member, THEN the system SHALL attach an additional
   role to the existing `Person` and SHALL NOT create a second identity
   record. ✅
3. WHEN a Person holds two or more roles in the same season, THEN the system
   SHALL treat those roles as concurrent and SHALL NOT require either to be
   ended first. ✅
4. WHEN a role is scoped to a season, THEN the system SHALL record the
   season on the role, so that role history across seasons is queryable. ✅
5. IF a proposed change would introduce a role-specific identity table (a
   separate "referee record" with its own name and date of birth), THEN the
   system SHALL be considered in violation of Principle P1 and the change
   SHALL be refused. ✅

## Requirement 2 — Legal name and preferred name are different facts

**User story.** As a registrar submitting a player to the governing body, I
want the name I submit to be the name on the passport, so that the external
registration is not rejected for a mismatch that costs the child playing
time.

**Traces to:** BR55 · C1 · **Status: ✅ Implemented**

### Acceptance criteria

1. The system SHALL store `legal_given_names` and `legal_family_name`
   separately from `preferred_name`, as first-class columns. ✅
2. WHEN a submission pack, identity document or cross-system match is
   produced, THEN the system SHALL use the legal name only. ✅
3. WHEN any human-facing screen displays a Person, THEN the system SHALL
   display the preferred name where one exists. ✅
4. WHEN a registration is validated and the legal name has not been verified
   against a source document, THEN the system SHALL fail rule BR55 and
   SHALL state that verification is what is missing. ✅
5. The system SHALL NOT implement the preferred name as a display override
   on a single name column, because that permits the preferred name to reach
   a submission pack. ✅

## Requirement 3 — An account is a credential, not an identity

**User story.** As a club administrator, I want to state which Person a
sign-in account belongs to, so that the platform never guesses someone's
identity from their email address.

**Traces to:** BR106–BR108, decision 10 · C1 · **Status: ✅ Implemented**

### Acceptance criteria

1. The system SHALL link an account to at most one Person per club, and a
   Person to at most one account. ✅
2. WHEN an administrator links an account to a Person, THEN the system SHALL
   record the link and SHALL record who asserted it. ✅
3. WHEN a non-administrator attempts to create a link, THEN the system SHALL
   refuse it. ✅
4. WHEN an account's email address matches a Person's email address, THEN
   the system SHALL NOT infer a link. ✅
5. WHEN an account has no link, THEN the system SHALL display it as
   **unlinked**, and SHALL NOT display a guess. ✅
6. WHEN a link is removed, THEN the system SHALL retain both the Person and
   the account. ✅

## Requirement 4 — Duplicates are surfaced, never silently merged

**User story.** As a registrar, I want the system to tell me when two
records look like the same child and let me decide, so that two siblings
sharing a family email are not merged into one player.

**Traces to:** BR5, BR82 · C1, C6 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN two Person records share an email address **and** a date of birth,
   THEN the system SHALL raise them as the same human for confirmation. ✅
2. WHEN two Person records share an email address but differ in date of
   birth, THEN the system SHALL treat them as different humans. ✅
3. The system SHALL NOT merge two Person records automatically under any
   circumstance. ✅
4. WHEN a human confirms a duplicate and chooses the surviving Person, THEN
   the system SHALL re-point every registration, role, guardianship and
   consent at the survivor. ✅
5. WHEN a duplicate is resolved, THEN the system SHALL retain the
   non-surviving record as a tombstone pointing at the survivor, and SHALL
   NOT delete it. ✅
6. WHEN a registration has an unresolved duplicate candidate, THEN the
   system SHALL place it in the registrar's action queue even if every other
   rule passes. ✅

---

# Part B — Multitenancy and access

## Requirement 5 — Strict tenant isolation

**User story.** As a club committee member, I want certainty that no other
club can see our families' data, so that I can sign off on the platform
holding children's personal information.

**Traces to:** P5, BR120 · C10 · **Status: ✅ Implemented**

### Acceptance criteria

1. Every table holding club data SHALL carry a `club_id` and SHALL have
   Row-Level Security enabled with at least one policy. ✅
2. WHEN a query omits its tenant filter, THEN the system SHALL return no
   rows, and SHALL NOT return rows belonging to other clubs. ✅
3. WHEN a signed-in user of club A attempts to read, insert, update or
   delete a row of club B, THEN the system SHALL refuse it at the database,
   not in application code. ✅
4. WHEN an anonymous caller or a non-member queries any club table, THEN the
   system SHALL return nothing. ✅
5. WHEN a migration adds a table without a policy, THEN the build SHALL
   fail. ✅
6. WHEN a read policy names the roles the data is for, THEN a test SHALL
   assert that an excluded role reads nothing. 🟡 *(Convention today, not a
   gate — see Requirement 5.7.)*
7. The system SHALL enforce criterion 6 mechanically rather than by review.
   ⬜

## Requirement 6 — Tenant provisioning and licensing

**User story.** As the platform owner, I want a club to exist only because I
authorised it after a signed contract, so that tenancy is never created by
self-service.

**Traces to:** BR89, BR94–BR98, BR124, BR96, BR97 · C10 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN the platform owner provisions a club, THEN the system SHALL create
   the club, its first season and its first administrator atomically, and
   SHALL be idempotent on retry. ✅
2. WHEN a club is provisioned, THEN the system SHALL record a primary and a
   secondary responsible person, each with a name, email address and phone
   number. ✅
3. WHEN a responsible person is recorded, THEN the system SHALL email them a
   single-use sign-in link, and their administrator membership SHALL come
   into effect only when they claim it. ✅
4. WHEN an invited person signs in for the first time, THEN the system SHALL
   require them to choose their own password before proceeding, and SHALL
   NOT email a password. ✅
5. A club SHALL hold at least two administrators, and the system SHALL
   refuse removal of the second-last one. ⬜
6. WHEN a licence term's end date passes, THEN the system SHALL mark the
   licence lapsed, and renewal SHALL be recorded as a new term rather than
   an edit to the existing one. ✅
7. WHEN a club's licence has lapsed, THEN the system SHALL place the club in
   **read-only** while leaving every record readable and deleting nothing.
   🟡 *(The lapse is displayed; writes are not restricted.)*
8. The platform administration console SHALL provision clubs and SHALL NOT
   read any club's operational data. ✅

## Requirement 7 — Who may do what at a club

**User story.** As a club administrator, I want to grant and revoke access
from inside the application, so that staff turnover does not require a
support request.

**Traces to:** BR78, BR120, BR22 · C10 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN an administrator grants a role at their club, THEN the system SHALL
   record it as a membership row and the role SHALL take effect on the
   member's next request. ✅
2. WHEN a Person holds two roles at one club, THEN the system SHALL record
   two rows, and revoking one SHALL NOT affect the other. ✅
3. WHEN a coach views a player, THEN the system SHALL show whether that
   player is clear to take the field and SHALL NOT show what the family
   owes. ✅
4. WHEN a role other than Finance Admin or Treasurer attempts to agree a
   payment plan, record a payment, or apply a voucher, THEN the system SHALL
   refuse it. ✅
5. A read policy SHALL name the roles the data is for, rather than granting
   every member of the club. ✅

---

# Part C — Registration and documents

## Requirement 8 — Collect a registration once

**User story.** As a parent, I want to give my child's details once, so that
registering does not mean typing the same values into three systems.

**Traces to:** G6, BR90 · C2 · **Status: ✅ Implemented**

### Acceptance criteria

1. The system SHALL provide exactly one creation path for a registration,
   used by both the club officer and the public family link. ✅
2. WHEN a registration is created, THEN the system SHALL stamp the club's
   per-season document checklist and registration fee onto it. ✅
3. WHEN a registration is created for a Person under 18, THEN the system
   SHALL require an associated guardian before the registration can reach
   COMPLETE. ✅
4. WHEN a family registers a second child, THEN the system SHALL reuse the
   guardian Person already held, matched within the club on the normalised
   email address. ✅
5. WHEN no email address is given for a guardian, THEN the system SHALL
   create a new guardian Person rather than guessing a match. ✅
6. WHEN a registration is imported from a previous season, THEN the system
   SHALL mark it historical, and SHALL NOT place it in the registrar's
   queue, include it in a submission pack, or trigger reminders on it. ⬜

## Requirement 9 — A family registers without an account

**User story.** As a club registrar, I want to send a family a link that
lets them register with no account, so that account creation is not a
barrier to the thing I actually need from them.

**Traces to:** BR72, BR73 · C2 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a registrar issues a registration invitation, THEN the system SHALL
   generate an unguessable token scoped to exactly one club and one season.
   ✅
2. WHEN an invitation is issued, THEN the system SHALL display the link once
   and SHALL store only its hash. ✅
3. WHEN a registrar asks to see an existing link again, THEN the system
   SHALL be unable to show it and SHALL offer reissue instead. ✅
4. WHEN a family submits through a valid link, THEN the system SHALL write
   only to that link's club and season. ✅
5. WHEN a token is unknown, revoked or expired, THEN the system SHALL refuse
   the submission **identically** in all three cases, so that the response
   does not reveal which. ✅
6. WHEN a family opens the link, THEN the system SHALL NOT disclose any
   existing registration, person or club data through it. ✅
7. The public write path SHALL be a single `security definer` function with
   a pinned `search_path`, and SHALL be the only anonymous write surface. ✅

## Requirement 10 — Required documents

**User story.** As a registrar, I want each registration to carry its own
checklist of required documents, so that "what is missing" is a stored
answer rather than something I work out per child.

**Traces to:** BR2 · C2, C6 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a registration is created, THEN the system SHALL create one document
   row per requirement in the season's checklist, none pre-satisfied. ✅
2. WHEN a required document is missing, THEN the system SHALL fail rule BR2
   and SHALL name which document is missing. ✅
3. WHEN a document file is uploaded, THEN the system SHALL store it in
   private storage whose object path begins with the `club_id`, under
   policies that check that prefix. ✅
4. A registration SHALL NOT reach COMPLETE while any required document is
   missing. ✅

## Requirement 11 — Consent is explicit, scoped and revocable

**User story.** As a guardian, I want to know exactly what I consented to
and to withdraw it, so that agreeing to my child being registered is not
also agreeing to their photograph appearing on social media.

**Traces to:** P7, BR48, BR56, BR57, BR67 · C15 · **Status: ✅ Implemented**

### Acceptance criteria

1. The system SHALL record consent as **one row per purpose** —
   registration collection notice, identification photograph, publicity —
   and SHALL NOT record it as a boolean on the Person. ✅
2. WHEN consent is granted, THEN the system SHALL record what was consented
   to, by whom, and when. ✅
3. WHEN a guardian withdraws consent, THEN the system SHALL record the
   revocation and SHALL stop future processing for that purpose. ✅
4. WHEN a minor's registration is validated with no unrevoked collection
   consent, THEN the system SHALL fail rule BR48. ✅
5. WHEN consent is given to hold a photograph, THEN the system SHALL NOT
   treat that as consent to transmit or publish it. ✅
6. WHEN a Person reaches 18, THEN the system SHALL transfer authority from
   the guardian to them, and SHALL leave contactability untouched. ✅
   *(BR67 — `is_authority` and `is_contact` were two flags from the first
   migration for exactly this.)*
7. WHEN authority transfers, THEN the system SHALL NOT reset the answers a
   guardian already gave. ✅ *(BR67 transfers the rights, not the
   consents. Whether an eighteen-year-old is asked again about publicity is
   an unanswered product question, not a defect.)*

## Requirement 12 — The identification photograph

**User story.** As a registrar, I want a photograph on the player record for
identification at a match, without the platform quietly acquiring the
location the photo was taken.

**Traces to:** BR56, BR100, BR105 · C15 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a photograph is chosen, THEN the system SHALL crop and re-encode it
   **in the browser**, and SHALL NOT store the file the user selected. ✅
2. WHEN a photograph is written without an unrevoked consent for that
   purpose, THEN the **database** SHALL refuse the write. ✅
3. WHEN club staff open a player record, THEN the system SHALL display the
   photograph. ✅
4. WHEN a photograph would be shown outside the club or included in an
   export, THEN the system SHALL treat that as a different purpose requiring
   its own consent. ✅

## Requirement 13 — Deterministic validation and derived status

**User story.** As a registrar, I want the system to tell me precisely what
is outstanding on every registration, so that chasing families is a sorted
list rather than an inspection.

**Traces to:** P3, BR1–BR3, BR48, BR55 · C6 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a registration is evaluated, THEN the system SHALL evaluate every
   rule and SHALL persist one result per rule, carrying the rule's
   identifier, its verdict and a human-readable message. ✅
2. The system SHALL express each rule as a pure function, evaluable without
   a database. ✅
3. WHEN rules are evaluated, THEN the system SHALL derive the registration's
   status from the outcomes, and SHALL NOT accept a status set by hand. ✅
4. WHEN a registrar asks what a registration was blocked on at an earlier
   date, THEN the system SHALL answer from stored results rather than
   recomputing. ✅
5. A rule result SHALL record the business rule identifier (`BR55`), not a
   prose label. ✅
6. Deterministic rules SHALL be evaluated before any generative AI step. ✅

## Requirement 14 — The submission pack

**User story.** As a registrar, I want to hand the governing body one
versioned file of validated registrations, so that the handover is a record
rather than an email thread.

**Traces to:** BR58–BR60 · C16 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a pack is generated, THEN the system SHALL freeze its manifest and
   SHALL record its version, generation timestamp, generator, club and
   season. ✅
2. WHEN a generated pack is modified in any way, THEN the database SHALL
   refuse it. ✅
3. WHEN a pack is previewed, THEN the system SHALL show exactly who would be
   included and exactly who would be excluded, with the reason. ✅
4. WHEN a pack is handed over, THEN the system SHALL record the channel and
   the time, once, and SHALL refuse a second handover record. ✅
5. A pack SHALL carry only the fields the recipient needs for the stated
   purpose. ✅
6. WHEN a pack has been sent, THEN the system SHALL keep each person's state
   as *sent* and SHALL NOT treat sending as confirmation of registration. ✅

## Requirement 15 — External registration is an eligibility gate

**User story.** As a coach, I want to know that a player on my team sheet
can legally take the field, so that a compliant-looking registration is not
mistaken for an eligible player.

**Traces to:** BR43, BR60, BR35–BR38 · C2, C16 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN a player's registration is complete internally but not yet confirmed
   in the governing body's system, THEN the system SHALL hold the status at
   `PENDING_EXTERNAL_REGISTRATION`. ✅
2. The system SHALL treat `PENDING_EXTERNAL_REGISTRATION` as an eligibility
   gate on taking the field, not as paperwork. ✅
3. WHEN a player is present in the club's registrations and absent from the
   governing body's system, THEN the system SHALL raise an **eligibility
   exception**, not a data difference. ⬜
4. WHEN a player's immediately preceding registration was with a different
   national association, THEN the system SHALL hold the registration until a
   valid International Transfer Certificate is on file. ⬜
5. WHEN an ITC has been requested by Football Australia and 30 days have
   elapsed with no response, THEN the system SHALL permit the registration
   to proceed provisionally, and never before that request. ⬜
6. The system SHALL NOT write into a governing body's production system
   without an explicit scoped exception to Principle P2. ✅

---

# Part D — Finance

## Requirement 16 — Payment plans

**User story.** As a treasurer, I want to agree an instalment plan with a
family, so that a fee the family cannot pay at once does not become a fee
they never pay.

**Traces to:** BR74–BR76 · C3 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a payment plan is created, THEN its instalments SHALL sum to
   **exactly** the plan total, to the cent. ✅
2. WHEN an even split leaves a remainder, THEN the system SHALL allocate the
   remainder to a real instalment and SHALL NOT round it away. ✅
3. The system SHALL NOT create an instalment worth nothing. ✅
4. WHEN a plan is committed whose instalments do not sum to the total, THEN
   the database SHALL refuse the transaction. ✅
5. WHEN the plan total is raised without rescheduling, THEN the database
   SHALL refuse it. ✅
6. A registration SHALL have at most one live plan at a time. ✅
7. WHEN a plan is superseded, THEN the system SHALL cancel it with its date
   recorded, and SHALL NOT delete or silently replace it. ✅
8. A plan's final instalment SHALL fall on or before the end of the season
   the registration is for. ✅

## Requirement 17 — Payments are append-only

**User story.** As a treasurer, I want a receipt that cannot be quietly
altered, so that the club's books can be trusted at audit.

**Traces to:** BR77, BR78 · C3 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a payment is recorded, THEN the system SHALL NOT permit it to be
   edited or deleted. ✅
2. WHEN a refund or correction is required, THEN the system SHALL record a
   new reversing entry naming the entry it reverses. ✅
3. WHEN payments are allocated against instalments, THEN the system SHALL
   allocate oldest-first and SHALL compute the allocation at read time
   rather than storing it. ✅
4. WHEN a role other than Finance Admin or Treasurer attempts to record a
   payment, THEN the system SHALL refuse it. ✅
5. The append-only property SHALL be enforced by the **absence of an update
   policy** rather than by application convention. ✅

## Requirement 18 — Vouchers

**User story.** As a treasurer, I want a government youth-sport voucher to
reduce a family's balance only after someone has checked it, so that an
invalid code is not silently absorbed by the club.

**Traces to:** BR21–BR25, BR81, BR4 · C3 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN a voucher is attached to a registration, THEN the system SHALL place
   it in `ATTACHED` and SHALL reduce no balance. ✅
2. WHEN a club officer verifies an attached voucher, THEN the system SHALL
   apply its value as an ordinary payment. ✅
3. WHEN a voucher program has not been approved by the club's Committee,
   THEN the system SHALL refuse to apply vouchers from it. ✅
4. WHEN a role other than Finance Admin or Treasurer attempts to generate or
   apply a voucher, THEN the system SHALL refuse it. ✅
5. WHEN a voucher code is applied, THEN the system SHALL record the result of
   verifying it against the issuing government's public interface. 🟡
   *(Recorded as a human's verification; no automated check.)*
6. A voucher SHALL NOT be applied to more than one invoice, and SHALL NOT be
   claimed from its issuing government more than once. ⬜ *(No invoice or
   claim object exists; the slice works from the registration balance.)*

## Requirement 19 — No pay, no play

**User story.** As a coach, I want one answer to "can this child take the
field", so that I am not reading a finance screen ten minutes before kickoff.

**Traces to:** BR79, BR3, BR103 · C3 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN eligibility to play is asked, THEN the system SHALL compute it fresh
   from the registration status **and** the outstanding balance together,
   and SHALL NOT read a stored flag. ✅
2. WHEN any amount is outstanding, THEN the system SHALL report the player
   as not eligible, regardless of registration status and regardless of a
   payment plan. ✅
3. WHEN the balance is a credit, THEN the system SHALL NOT treat it as an
   obstacle. ✅
4. WHEN a registration looks complete in every other respect but money is
   owed, THEN the system SHALL still report not eligible. ✅
5. WHEN an appearance is recorded for a player who was not eligible, THEN
   the system SHALL record it and flag it, and SHALL NOT refuse it. ✅

---

# Part E — Teams, safeguarding and governance

## Requirement 20 — No card, no start

**User story.** As a club secretary, I want a person without a current
Working with Children Check to be impossible to add to a team, so that
compliance is a property of the system rather than of my memory.

**Traces to:** P7, BR19, BR83, BR84, BR54, BR50, BR51 · C1, C2 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN a team official — coach, assistant coach, manager or any non-playing
   role — is added to a team without a **verified** Working with Children
   Check, THEN the database SHALL refuse it. ✅
2. WHEN an existing team member row is **updated** to a non-playing role,
   THEN the system SHALL apply the same check, so that promoting a player
   row to a coach row is not a bypass. ✅
3. WHEN a clearance is checked, THEN the system SHALL check it against the
   **end of the season being registered for**, not against today. ✅
4. WHEN a match official is appointed, THEN the system SHALL require the same
   verified clearance a team official requires. ✅
5. WHEN the person is under 18, THEN the system SHALL exempt them from
   criteria 1 and 4. ✅
6. The system SHALL record `verified_at` separately from the card number, so
   that a typed-in number nobody checked is distinguishable from a verified
   one. ✅
7. WHEN a Working with Children Check expires or is revoked, THEN the system
   SHALL withdraw the holder from every **future** assignment, not merely
   block new ones. ⬜
8. WHEN a club is linked as the responsible organisation in the state
   register, THEN the system SHALL treat that register as the primary
   mechanism for maintaining validity. ⬜

## Requirement 21 — The committee as a record

**User story.** As a club secretary, I want the committee's composition and
mandate recorded, so that an approval resting on committee authority points
at an actual committee.

**Traces to:** BR85–BR88, BR123 · C19 · **Status: 🟡 Partial**

### Acceptance criteria

1. A committee position SHALL be held for exactly one committee term,
   running from one Annual General Meeting to the next. ✅
2. WHEN a term passes its next-AGM date without renewal, THEN the system
   SHALL flag it as overdue while continuing to permit the committee to
   govern. ✅
3. WHEN a person who was not an adult at the term's start is appointed to a
   committee position, THEN the database SHALL refuse it. ✅
4. WHEN a committee or subcommittee member holds no Working with Children
   Check, THEN the system SHALL surface it as a gap on the governance screen
   and SHALL NOT block the appointment. ✅
5. WHEN a position holder leaves early, THEN the system SHALL record a
   resignation date rather than deleting the position. ✅
6. WHEN the committee makes a decision, THEN the system SHALL record a dated
   resolution naming what was decided, who moved it, and which term it
   belongs to. ⬜
7. WHEN something rests on committee authority, THEN it SHALL point at a
   recorded resolution. ⬜

## Requirement 22 — The player performance record

**User story.** As a coach, I want a player's season record with an honest
account of where the numbers came from, so that I am not shown a statistic
that implies more rigour than it has.

**Traces to:** BR99, BR101–BR104, BR125 · C20 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN any statistic is entered, THEN the system SHALL record who entered
   it and when. ✅
2. The system SHALL NOT present match data as verified. ✅
3. WHEN advanced metrics exist for some fixtures and not others, THEN a
   player's totals SHALL state the base they were computed over, and SHALL
   NOT be averaged across fixtures lacking them. ✅
4. WHEN a model such as xG is applied to a format it was not calibrated for,
   THEN the system SHALL label it as not applicable to that format. ✅
5. Height and weight SHALL be optional, season-scoped, recorded by a coach
   or technical director, and readable only by the roles that pick teams. ✅
6. A registration SHALL NOT require height or weight to complete. ✅

---

# Part F — Referee management

## Requirement 23 — The referee's own record

**User story.** As a referee coordinator, I want a match official's
classification, accreditations and suspensions in one place, so that
deciding who can officiate a fixture is not an archaeology exercise.

**Traces to:** BR110, BR111, BR9 · C4 · **Status: ✅ Implemented**

### Acceptance criteria

1. A referee profile SHALL attach to a Person who already exists, per
   Requirement 1. ✅
2. WHEN a referee is classified, THEN the system SHALL record a **new dated
   row** carrying what they were classified as, by whom, and from when. ✅
3. The system SHALL NOT overwrite a classification, so that "what were they
   in 2024?" remains answerable. ✅
4. WHEN the current classification is needed, THEN the system SHALL take the
   latest row. ✅
5. WHEN an accreditation is checked, THEN the system SHALL check it against
   the **date of the fixture**, not against today. ✅
6. WHEN a referee holds an active suspension, THEN the system SHALL refuse
   any designation. ✅

## Requirement 24 — Declaring availability

**User story.** As a referee, I want to say when I am available, so that I
am not appointed to a match I cannot reach and then penalised for declining.

**Traces to:** BR62 · C4 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a referee declares availability for a season, THEN the system SHALL
   record it. ✅
2. WHEN a referee declares a specific unavailability, THEN the system SHALL
   record it separately from the absence of a declaration, because "has not
   said" and "has said no" are different answers. ✅
3. WHEN a player or match official responds negatively to a fixture or
   appointment, THEN the system SHALL require a brief reason. ✅
4. WHEN a reason is recorded, THEN the system SHALL make it visible to the
   responsible coach or coordinator. ✅

## Requirement 25 — Designations and the conflicts that refuse them

**User story.** As a referee coordinator, I want the system to refuse an
appointment that should never have been offered, so that a conflict of
interest is not discovered at the ground.

**Traces to:** BR6–BR11, BR20, BR28, BR42, BR109, BR111–BR114 · C4 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN a proposed official is registered as a player in that match, THEN
   the system SHALL refuse the designation. ✅
2. WHEN a proposed official holds **any** other role in that fixture —
   coach, team official, or guardian of a participating player — THEN the
   system SHALL refuse the designation. ✅
3. WHEN a proposed official already holds a designation at the same time,
   THEN the system SHALL refuse it. ✅
4. WHEN a proposed official's classification is below the competition's
   minimum, THEN the system SHALL refuse it. ✅ *(Genuinely, from scope 38.
   Before the catalogue this was a warning that said it could not judge, so
   an official **below** a minimum produced nothing at all.)* **Only a
   sighted classification is compared** (BR138, Requirement 38.8).
5. WHEN a proposed official's mandatory accreditation has expired as at the
   fixture date, THEN the system SHALL refuse it. ✅
6. WHEN the conflict is same-club affiliation, a family relationship with a
   participant, limited travel time, or excessive consecutive matches, THEN
   the system SHALL raise a **warning** rather than a block, and SHALL audit
   every override. ✅
7. WHEN a designation is made, THEN the system SHALL record which party made
   it — the club or the association. ✅
8. WHEN an official declines or withdraws, THEN the system SHALL NOT record
   the decline at all until a reason is given, and only recorded declines
   SHALL count toward a decline rate. ✅
9. WHEN the proposed official is under 18, THEN the system SHALL propose the
   designation to their parent or guardian, who accepts or declines. ⬜
10. WHEN an official's decline rate over the configured window exceeds the
    configured maximum, THEN the system SHALL apply the configured
    consequence. ⬜ *(Threshold awaits a season of history.)*
11. A designation SHALL reference a fixture that exists in the club's
    calendar for the current season. ✅

## Requirement 26 — Paying the officials

**User story.** As a treasurer, I want to pay match officials from verified
matches at the rate that applied on the day, so that a later rate change
does not silently restate what we owed.

**Traces to:** BR13–BR18, BR41, BR114–BR119 · C5 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN a payment claim is created for a match that has not been verified,
   THEN the system SHALL refuse it. ✅
2. WHEN the person who officiated attempts to verify that same match, THEN
   the system SHALL refuse it. ✅
3. WHEN a claim is created, THEN the system SHALL store the amount it was
   computed at, alongside the schedule it came from, and SHALL NOT recompute
   the rate at read time. ✅
4. WHEN a club changes a rate, THEN the system SHALL publish a **new dated
   schedule**, and the previous schedule SHALL remain readable. ✅
5. WHEN a match was cancelled, THEN the system SHALL generate no claim. ✅
6. WHEN a match was abandoned, THEN the system SHALL require the official's
   explanation before the claim can be approved. ✅
7. WHEN a claim already exists for a verified match, THEN the system SHALL
   refuse a second one. ✅
8. WHEN a payment batch is closed, THEN the system SHALL admit no further
   claims to it. ✅
9. WHEN a remittance is recorded, THEN the system SHALL treat it as a record
   of a payment the club made elsewhere, and SHALL NOT initiate a transfer.
   ✅
10. WHEN an association made the appointment, THEN the association SHALL be
    the paying party and the club SHALL record no claim. ✅
11. WHEN a club authors a fee schedule, THEN the system SHALL provide a
    screen to do so. ⬜ *(Schema and rate resolution exist; no editor.)*
12. The system SHALL NOT store an official's banking details. ✅

---

# Part G — Competitions and community carnivals

## Requirement 27 — Competitions and the season calendar

**User story.** As a registrar, I want the association's competitions,
playing formats and regulations held as reference data, so that every club
is not re-keying the same catalogue into a free-text box.

**Traces to:** BR20, BR8, BR12, BR134, BR135 · C11 · **Status: 🟡 Partial**

### Acceptance criteria

1. The system SHALL hold each governing association's competition catalogue,
   including tier, playing format and minimum official classification. ✅
2. The catalogue SHALL be held **once** and read by every club, and SHALL
   NOT be copied per club. ✅ *(BR134,
   [decision 15](../docs/decisions/15_the_competition_catalogue_is_shared_reference_data.md)
   — a per-club minimum makes the same fixture eligible at one club and
   refused at another.)*
3. WHEN a fixture is created, THEN the system SHALL reference a competition
   from that catalogue rather than accepting free text. 🟡 *(Enforced at
   the write path; **not** refused by the database. A trigger doing that was
   written and removed: with an empty catalogue it leaves a club unable to
   record a competition at all.)*
4. WHEN a competition defines a minimum classification, THEN Requirement
   25.4 SHALL evaluate against it. ✅
5. A classification level SHALL be ranked within its association, and levels
   from different associations SHALL NOT be compared. ✅ *(BR135, enforced
   by a trigger rather than by convention.)*
6. WHEN a competition states no minimum, THEN the system SHALL report that
   there is nothing to compare, and SHALL NOT invent a floor. ✅
7. Rule parameters that vary by classification, competition, association,
   season or event SHALL be configuration data, and SHALL NOT be hardcoded.
   ✅
8. The system SHALL hold each association's Competition Regulations as
   documents. ⬜ *(The catalogue holds names, tiers, formats and minimums,
   not rulebooks.)*

## Requirement 28 — Community carnivals and grassroots events

**User story.** As a parent at a regional carnival, I want to see the draw
and the results on my phone without an account, so that following my child's
weekend does not require joining a platform.

**Traces to:** P6, BR26–BR29, BR139, BR140, decision 3 · C12 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN an Events Coordinator creates a carnival or grassroots event, THEN
   the system SHALL permit it to span multiple clubs by design, **including
   clubs that do not use this platform**. ✅
2. WHEN an Events Coordinator publishes an event, THEN its Public Event View
   SHALL be visible to unauthenticated visitors across every participating
   club. ✅
3. The Public Event View SHALL show, at club and team level only: the
   fixture schedule and draw with date, kickoff time and venue; each team's
   next unplayed fixture; and the ladder or standings where the format has
   one. ✅
4. The Public Event View SHALL NOT show individual participants' names, and
   SHALL NOT show any registration, finance or compliance data. ✅ **By
   construction, not by filtering**: the tables carry no `person_id` column
   at all (BR139), asserted against `information_schema` rather than
   trusted.
5. WHEN an event is unpublished, THEN it SHALL be invisible outside the host
   club again. ✅ *(BR140. Nothing recalls what was already copied.)*
6. Before publication, an event SHALL be invisible to every club but the
   host. ✅ *(#81 — P5 holds right up to the moment P6 is invoked.)*
7. An unauthenticated visitor SHALL be able to read a published event and
   SHALL NOT be able to write any part of it. ✅
8. WHEN a person other than the recorded Events Coordinator attempts to
   change the Carnival Conditions, THEN the system SHALL refuse it,
   regardless of any other role they hold — while leaving the rest of the
   event an ordinary club officer's work. ✅ *(BR29.)*
9. Publication SHALL be the only mechanism by which tenant-isolated data
   becomes public, and SHALL be scoped to the content in criterion 3. ✅
   *(Publishing a carnival exposes exactly three tables and nothing else —
   asserted.)*
10. WHEN a match official is appointed to a carnival fixture, THEN the
    system SHALL apply the same eligibility and conflict checks as
    Requirement 25. ⬜ *(`match_official_appointment` references `fixture`,
    a different table, so the path is **not wired at all** rather than
    wired loosely — a half-checked appointment would be worse than an
    unbuilt one.)*
11. The system SHALL provide an index of published events. ⬜ *(A visitor
    follows a link their club sent them. A directory would raise a P6
    question nobody has asked.)*

## Requirement 29 — Calendar distribution

**User story.** As a referee, I want my appointments in my own phone
calendar, so that I do not check a website to know where I am on Saturday.

**Traces to:** BR30–BR34, BR141, decision 4 · C13 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN a Person subscribes, THEN the feed SHALL contain only that Person's
   own appointments, and never another Person's, a club's, or a
   competition's schedule. ✅
2. The feed SHALL be a **projection with no parameter the holder can vary**,
   rather than a filtered query. ✅ *(BR141 — the holder of the URL is
   unauthenticated by definition.)*
3. The feed URL SHALL be unguessable, and the subscriber SHALL be able to
   revoke or rotate it at any time with immediate effect on the old URL. ✅
   *([Decision 12](../docs/decisions/12_an_unsubscribe_link_is_derived_not_stored.md)'s
   construction reused — a new salt, and no revocation list to maintain.)*
4. The URL SHALL be displayed once and SHALL NOT be redisplayed from stored
   state. ✅ *(It is a bearer credential; the same reason BR73 shows an
   invitation link once.)*
5. A calendar event SHALL carry only non-personal match detail —
   competition, date, time, venue, and the subscriber's own role. ✅
   *(Asserted against the function's own output columns, not trusted.)*
6. WHEN an appointment is proposed rather than accepted, THEN the event
   SHALL say so. ✅ *(A calendar showing a proposal as a commitment sends
   somebody to a ground they never agreed to attend.)*
7. WHEN a fixture is cancelled, THEN the event SHALL be marked cancelled
   rather than disappearing. ✅
8. WHEN the subscriber is a minor, THEN the system SHALL issue the
   subscription to their parent or guardian rather than to them. ✅
   *(A trigger, not a screen — a feed is a record of where a child will be.)*
9. WHEN a calendar event is changed or deleted in a personal calendar, THEN
   the system SHALL NOT treat that as accepting, declining or cancelling a
   designation. ✅ *(BR34, enforced by absence: no function accepts calendar
   data.)*
10. The feed SHALL carry a player's fixtures as well as an official's
    appointments. ⬜ *(Decision 4 says "initially referee appointments";
    honoured rather than widened.)*
11. The feed SHALL emit a `VTIMEZONE` component. ⬜ *(Events carry a TZID and
    rely on the client resolving the IANA name. A strict RFC 5545 reader may
    refuse it; correct transition rules per zone are a library's job.)*

---

# Part H — The person-facing experience

## Requirement 30 — One active role at a time

**User story.** As a parent who also coaches and sits on the committee, I
want one sign-in and an explicit switch between those hats, so that I am
never shown a merged view that belongs to none of them.

**Traces to:** BR61, BR63, BR65 · C17 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a Person holds several roles, THEN the system SHALL present exactly
   one active role context at a time. ✅
2. WHEN the Person switches role, THEN the switch SHALL be explicit, and the
   system SHALL NOT merge two roles' views or permissions. ✅
3. WHEN a Person holds exactly one role, THEN the system SHALL resolve it
   without presenting a switch. ✅
4. A Person of thirteen or over SHALL be able to hold their own account and
   see their own record. ✅
5. WHEN a Person views their eligibility and compliance status, THEN the
   system SHALL show their own and never another Person's. ✅

## Requirement 31 — A family reads its own household

**User story.** As a guardian, I want to see every child I am responsible
for and what each of them is waiting on, so that I do not ring the club to
find out.

**Traces to:** BR121, BR126, decision 11 · C17 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a guardian signs in, THEN the system SHALL show their own Person and
   the children they hold authority over, and nothing else. ✅
2. The family's read SHALL be reached through a function keyed on the
   caller's own session, and SHALL NOT be granted by a club membership role.
   ✅
3. WHEN a registrar invites a guardian, THEN the database SHALL refuse the
   invitation unless a child under that guardian's authority already has a
   registration at COMPLETE. ✅
4. WHEN a household card states a child's status, THEN it SHALL reflect
   Requirement 19's eligibility verdict, so that a child who cannot take the
   field is not shown as ready. ✅

## Requirement 32 — Mobile and offline

**User story.** As a player arriving at an unfamiliar ground with no signal,
I want to see my next fixture and its venue, so that the app is useful at
exactly the moment connectivity fails.

**Traces to:** BR64, BR66 · C17 · **Status: ⬜ Not implemented**

### Acceptance criteria

1. WHEN there is no connectivity, THEN the system SHALL display the Person's
   next fixture, venue, kickoff and role information. ⬜
2. WHEN a cached view is displayed, THEN the system SHALL display the time
   it was last synchronised. ⬜
3. The offline experience SHALL be read-only. ⬜
4. WHEN a fixture's time, venue or status changes, THEN the system SHALL
   notify every affected participant, and the platform's record SHALL remain
   authoritative over any cached or previously-notified copy. ⬜

---

# Part I — Cross-cutting

## Requirement 33 — The AI assistant never has final authority

**User story.** As a club committee member, I want certainty that no
automated system approved a document or rejected a child, so that
accountability for a decision always rests with a person.

**Traces to:** P3, P4, BR15, decision 1 · C6 · **Status: 🟡 Partial**

### Acceptance criteria

1. The AI assistant SHALL draft, summarise, classify and flag for a human.
   ✅
2. The AI assistant SHALL NOT approve an identity document, reject a player,
   modify a debt, approve a payment, or promote a referee. ✅
3. WHEN the assistant produces output, THEN the interface SHALL offer
   exactly two controls — use it, or dismiss it — and SHALL expose no
   third that commits anything. ✅
4. Deterministic rules SHALL be evaluated before any generative step. ✅
5. The system SHALL NOT send a minor's personal data to a free-tier or
   otherwise uncontrolled generative AI service. ✅ *(Vacuously true: no
   generative integration exists.)*
6. WHEN a generative integration is added, THEN criteria 2–5 SHALL be
   asserted by an automated check rather than by convention. ⬜

## Requirement 34 — Communications

**User story.** As a registrar, I want the system to tell a family what is
outstanding, so that chasing forty families is not forty manual emails.

**Traces to:** BR42, BR64, BR93, BR127–BR131 · C7 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN a registration is missing a document, payment or consent, THEN the
   system SHALL be able to send a templated reminder to the responsible
   guardian. ✅ *(Composed from the registration's own rule outcomes, re-read
   at send time so what the family is told is true when it is sent.)*
2. WHEN a fixture changes, THEN the system SHALL notify every affected
   participant. ✅ *(Wired by [scope 38](../docs/scope/38_the_catalogue_that_makes_br8_computable.md):
   a fixture now has an edit path. What changed is computed from before and
   after, so a submit that changed nothing announces nothing.)*
3. WHEN an official withdraws after accepting, THEN the system SHALL notify
   the Referee Coordinator. ✅
4. WHEN a claim is approved, THEN the system SHALL notify the official. 🟡
   *(Built and uncalled: claim approval is database-only — R26 has no
   approval screen.)*
5. WHEN a recipient has given marketing consent, THEN every message sent
   under it SHALL carry a working unsubscribe, and withdrawal SHALL take
   effect without an account. ✅ **This was the one gap that was a live
   exposure rather than an absent feature. It is closed** — and the link is
   durable rather than per-message, so one in a year-old email still works
   ([decision 12](../docs/decisions/12_an_unsubscribe_link_is_derived_not_stored.md)).
6. Suppression state SHALL be held by the platform rather than by the
   message provider, so that it survives a provider change. ✅
7. Marketing and operational contact SHALL be suppressed separately, and
   suppressing operational contact SHALL be shown to the club so it falls
   back to another channel rather than assuming delivery. ✅ *(BR130.)*
8. Every message SHALL be recorded, including the ones deliberately not
   sent. ✅ *(BR127 — an absent row would mean both "never attempted" and
   "correctly withheld".)*
9. WHEN no email provider is configured, THEN the system SHALL record the
   attempt as failed and say so, and SHALL NOT report a success. ✅
10. WHEN a recipient has withdrawn, THEN no sender SHALL be able to override
    it — there SHALL be no force, priority or importance flag that sends
    anyway. ✅
11. The system SHALL support campaigns, and SHALL consume the provider's
    bounce and complaint feedback. ⬜

## Requirement 35 — Privacy rights: erasure and retention

**User story.** As a parent, I want to ask for my child's data to be erased
and be told plainly if the law requires the club to keep some of it, so that
"no" is a reason rather than a silence.

**Traces to:** P7, BR40, BR49, BR52, BR69–BR71, BR132, BR133 · C15 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN a data subject or their guardian requests erasure, THEN the system
   SHALL honour it unless a named lawful basis requires retention. ✅
2. WHEN erasure is refused, THEN the system SHALL record and state **every**
   basis that bound it, and the date the last of them expires. ✅
3. WHEN erasure is honoured, THEN the system SHALL delete the Person and
   everything attached, and SHALL NOT redact in place — a blanked record is
   re-identifiable from any team sheet
   ([decision 13](../docs/decisions/13_erasure_is_all_or_nothing.md)). ✅
4. WHEN an erasure is honoured, THEN the record of the request SHALL survive
   it, carrying no personal data of the erased Person. ✅ *(BR132.)*
5. WHEN a Person is still active in football, THEN the system SHALL retain
   their record for at least ten years. ✅
6. WHEN a record is past its retention period, THEN the system SHALL
   **propose** disposal to a person, and no schedule SHALL delete a
   Person's record on its own. ✅ *(BR133,
   [decision 14](../docs/decisions/14_retention_proposes_a_person_disposes.md).)*
7. WHEN a Person is a deceased Life Member, THEN the system SHALL retain
   their record indefinitely for the club's history, overriding
   participation-based retention, and SHALL never attempt a communication.
   ✅ *(Never proposed for disposal; contact suppressed under R34.)*
8. WHEN a living Life Member's contact details have not been reconfirmed
   within the configured period, THEN the system SHALL flag them for review.
   ✅
9. The privacy framework applying to a tenant SHALL be determined by
   jurisdiction and recorded in that tenant's configuration, and SHALL NOT
   be assumed platform-wide. ✅ *(`club.privacy_framework`, derived at
   provisioning and then recorded — a club that changes jurisdiction does
   not retroactively change the framework its records were collected
   under.)*
10. The retention review SHALL run on a schedule without a person pressing
    a button. ⬜ *(Idempotent and callable by hand; there is no production
    environment to schedule it in.)*

## Requirement 36 — The club owns its data

**User story.** As a club president considering this platform, I want to
know we can take our data and leave, so that adopting it is not a one-way
door.

**Traces to:** BR68, BR39 · C10 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a club requests its data, THEN the system SHALL produce a complete,
   club-scoped export in a machine-readable format. ✅ *(One JSON document,
   scoped by the same `club_id` every policy keys off, and audited — an
   export is every child's record leaving the building.)*
2. The system SHALL hold club data as a **processor on the club's behalf**,
   never as owner. ✅ *(Stated and honoured; the export that makes it
   operative is absent.)*
3. The system SHALL be the source of truth for the club's own registration
   data at the point of submission, and SHALL NOT claim authority over the
   governing body's confirmation of eligibility. ✅

## Requirement 37 — Audit

**User story.** As an auditor, I want an unalterable record of consequential
actions, so that "who approved this, and when" is answerable years later.

**Traces to:** BR11, BR15, BR59, BR67, BR101 · Cross-cutting · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a conflict warning is overridden, a pack is generated or handed
   over, or authority is transferred, THEN the system SHALL append an audit
   event recording who, what, when and which row. ✅
2. The audit record SHALL be append-only, enforced by the absence of an
   update policy. ✅
3. WHEN a rule outcome is recorded, THEN it SHALL carry the business rule
   identifier so that the record stays readable against this document. ✅

## Requirement 38 — Asking whether they also officiate

**User story.** As a club referee coordinator, I want every registration to
ask whether the player or their family would like to officiate, so that
recruiting referees is not word of mouth in a club whose players are exactly
the people who could do it.

**Traces to:** BR136–BR138, BR63, BR84 · C4 · **Status: ✅ Implemented**

### Acceptance criteria

1. WHEN a registration is captured through **either** entry point — the
   registrar's form or the account-free family link — THEN the system SHALL
   ask whether they would like to officiate, whether they have officiated
   before, and for an accreditation number and level. ✅
2. WHEN neither question is answered affirmatively, THEN the system SHALL
   record nothing. ✅ *(A row of falses is noise a coordinator must read and
   dismiss.)*
3. WHEN a declaration is recorded, THEN the system SHALL create **no**
   referee role, referee profile or classification. ✅ *(BR136.)*
4. WHEN a declaration is recorded, THEN the system SHALL record who made it.
   ✅ *(BR137 — "their mother thought they were Level 4" and "they said they
   were Level 4" are different conversations to have with the register.)*
5. WHEN a person under thirteen attempts to declare their own interest, THEN
   the database SHALL refuse it; a guardian with authority MAY declare for
   them at any age. ✅ *(BR63's threshold governs who may declare for
   themselves, not who may be declared — MiniRefs are children.)*
6. WHEN a person with no authority over the subject attempts to declare,
   THEN the database SHALL refuse it. ✅
7. WHEN a coordinator accepts a declaration, THEN the system SHALL create
   the referee profile and the season role **of the season the registration
   was for**, and SHALL record any declared level as **unsighted**. ✅
8. WHEN the declared level is unsighted, THEN it SHALL count towards nothing
   in Requirement 25.4's comparison, and SHALL be reported as *unchecked*
   rather than as *none*. ✅ *(BR138.)*
9. WHEN BR84 refuses the season role because the person is an adult with no
   verified clearance, THEN the system SHALL still record the decision and
   SHALL say that a card is what is missing. ✅
10. WHEN a declaration is declined, THEN the system SHALL keep it as
    declined rather than removing it. ✅ *(#79.)*
11. An accreditation number SHALL be readable only by the roles that act on
    it, and SHALL NOT appear on the player record. ✅ *(BR120.)*
12. WHEN a declaration is decided, THEN the family SHALL be told. ⬜ *(C7
    exists; the template and the call do not.)*

---

---

## Requirement 39 — Numbers a committee can act on

**User story.** As a club committee member, I want the registration,
financial and officiating figures on a screen, so that the questions a
committee meeting asks are answered from the system rather than from
somebody's recollection and a spreadsheet.

**Traces to:** BR142, BR143, BR78, BR81 · C8 · **Status: 🟡 Partial**

### Acceptance criteria

1. WHEN a reader whose role may not have a figure requests it, THEN the
   system SHALL **refuse** the report and SHALL NOT compute a partial one.
   ✅ *(BR142. Row-Level Security hides rows and does not refuse sums, so a
   finance report aggregating what the caller can see would hand a coach
   `$0 outstanding` — correct isolation producing a confident lie.)*
2. WHEN a reader whose role may have a figure requests it, THEN the system
   SHALL compute it over **all** of the club's rows for that season,
   including rows an ordinary query as that reader would not have returned.
   ✅
3. WHEN the role check is made, THEN it SHALL be made **per report** rather
   than once for all three — a treasurer has the finance summary and not the
   registrar's queue; a coordinator the reverse. ✅
4. WHEN a figure is shown, THEN it SHALL state what it was computed over and
   the moment it was computed. ✅ *(BR143 — a screen with no as-at is read
   as current however old the tab is.)*
5. WHEN a proportion has a base of zero, THEN the system SHALL show no
   percentage. ✅ *(0 of 0 is 100% complete is arithmetically defensible and
   operationally a lie.)*
6. WHEN money is summarised, THEN amounts owed and amounts in credit SHALL
   be counted apart and SHALL NOT be netted. ✅ *(A club owed $80 that owes
   $20 back is not a club owed $60; netting names neither the arrears to
   chase nor the refunds to pay.)*
7. WHEN voucher relief is summarised, THEN only a voucher that has been
   verified or claimed SHALL count. ✅ *(BR81 — an attached voucher has
   moved no money, and counting it overstates what the club has collected.)*
8. WHEN registrations blocked by a rule are counted, THEN each registration
   SHALL count once for that rule however many times it has been
   re-evaluated. ✅ *(`validation_result` is a history; counting every row
   makes the number worse the more diligently the registrar works.)*
9. WHEN a report is requested for a club the reader holds no membership at,
   THEN it SHALL be refused. ✅
10. A committee SHALL be able to compare a season against the one before it.
    ⬜ *(One club, one season, one moment. No trend, no comparison, no
    export, and nothing scheduled — waiting on imported history, which is
    blocked on [#57](../docs/scope/open-questions.md).)*
11. Arrears SHALL be aged. ⬜ *(Overdue is a count and a total, not
    30/60/90.)*

## Coverage summary

| Part | Requirements | Implemented | Partial | Not implemented |
| ---- | ------------ | ----------- | ------- | --------------- |
| A — Identity | 1–4 | 4 | 0 | 0 |
| B — Multitenancy and access | 5–7 | 2 | 1 | 0 |
| C — Registration and documents | 8–15 | 6 | 2 | 0 |
| D — Finance | 16–19 | 3 | 1 | 0 |
| E — Teams, safeguarding, governance | 20–22 | 1 | 2 | 0 |
| F — Referee management | 23–26 | 2 | 2 | 0 |
| G — Competitions and carnivals | 27–29 | 0 | 3 | 0 |
| H — Person-facing experience | 30–32 | 2 | 0 | 1 |
| I — Cross-cutting | 33–37 | 4 | 3 | 0 |
| J — Referee recruitment | 38 | 1 | 0 | 0 |
| K — Reporting | 39 | 0 | 1 | 0 |
| **Total** | **39** | **25** | **14** | **0** |

**Read that last row carefully.** Twenty-five requirements implemented is a
working product for one club's registration, finance, officiating and
privacy obligations. **Nothing is left unstarted.** Every requirement in
this document is now implemented or partial, which is a different claim from
*finished*: fourteen are partial, and what is missing from each is named on the criterion rather
than in a summary. Requirement 32's mobile client is the largest single
absence, and Requirement 35.10's retention schedule is the one waiting on a
production environment rather than on work. Competitions joined them in September
2026 ([scope 38](../docs/scope/38_the_catalogue_that_makes_br8_computable.md)),
which mattered less for the catalogue itself than for the rule it unblocked:
**BR8 had been a warning that said it could not judge**, so an official
below a competition's minimum produced nothing at all.

Requirement 34 moved from *not implemented* to *partial* in September 2026
([scope 36](../docs/scope/36_the_platform_learns_to_send_and_to_stop.md)),
which closed the only item on this list that was arguably non-compliant
today rather than merely absent. What remains of it is ordinary missing
feature — campaigns, bounce handling, and two notifications waiting on
screens that belong to other requirements.

Requirement 35 followed it ([scope 37](../docs/scope/37_forgetting_and_the_reasons_not_to.md)),
which matters for a different reason: erasure and retention are **statutory
rather than desirable**, and a platform holding children's data across two
legal regimes could not previously honour an erasure request or explain a
refusal. What remains of that one is a scheduler, and there is no production
environment to run it in.

A status here is a claim about code, checked in September 2026. The
reproducible measurements behind it are in
[docs/spec/requirements.md §1](../docs/spec/requirements.md).
