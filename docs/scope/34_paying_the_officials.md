# Project Scope — Paying the Officials

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/referee-lifecycle`.
**Status: WP1 delivered in the database. WP2's schema and rate resolution
delivered; the editor screen is not built. WP3 and WP4 specified.**

C5 — referee finance — is the second half of what a club actually needs from
[scope 33](./33_the-referee-record-and-what-an-appointment-rests-on.md).
Appointing an official and never paying them is not a workflow a volunteer
club would adopt; the money is why the record is kept at all.

Its rules were written years ago and, like C4's, none has ever run: BR13,
BR14, BR16, BR17, BR18 and BR41. **This initiative implements them.**

## A correction this document starts from

Scope 33 recorded C5 as blocked on open questions [#1](./open-questions.md)
and [#4](./open-questions.md). **Both were resolved in August 2026.** The
error was in the reading, not in the log.

It matters because **#1 does not merely unblock C5 — it designs it.** The
question *"what is the current referee fee schedule"* was resolved **by
dissolving it**: there is no single rate table, each club's **Committee sets
its own**, so the values are per-tenant configuration authored by a club
role. The platform therefore ships a **fee-schedule editor and seeds
nothing**. A shipped rate table would have been a number invented by a
vendor and relied on by a treasurer.

#4 adopts an operational interpretation for a minor referee's banking
details and says plainly that it is not a legal sign-off. This initiative
takes the narrower path anyway — see *Out of scope*.

## What C5 actually rests on

**BR13: a claim requires a verified match.** Nothing verifies anything —
that is scope 33's WP4, unbuilt. So the first work package here is the
verification C5 cannot exist without, and calling C5 "blocked" was wrong
only in the sense that it was mis-attributed: the dependency is real and
internal.

**BR16: the appointing party pays.** Answered by the club in September 2026
and recorded as BR114: the designation stores whether the club or the
association appointed, including the case where Football Queensland cannot
fill a senior fixture and the club appoints a backup. **The payer is read
off that stored fact, never off the grade** — which is what makes a claim
computable at all.

**BR41: the rate depends on the appointing party, the official's
affiliation, their classification, and the competition.** All four are now
recordable: BR114 gives the first, the club's own record gives the second
and third, and the fourth is `fixture.competition` — free text, until C11.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | **No new capability and no new principle.** C5 has existed since the bootstrap. P4 (no minors' data to uncontrolled AI) is why the banking exclusion below is drawn where it is, and is applied rather than amended |
| 2_business | **BR115–BR118 added**: a fee schedule is a dated version rather than an edited row; a claim carries the rate it was computed at; a batch is closed before it is paid; and a remittance records a payment the club made elsewhere. The **Referee finance** business service moves from Pending to Partial. BR13, BR14, BR16, BR17, BR18 and BR41 gain enforcement for the first time |
| 3_information | New: `referee_fee_schedule`, `referee_fee_rate`, `appointment_verification`, `referee_payment_claim`, `referee_payment_batch`. Money follows the shape `payment` already established — **append-only, corrected by a reversing entry rather than an edit** (BR77's reasoning, applied to the other direction of the ledger) |
| 4_application | New service **Referee finance management**; routes under `/registrar/referees/fees` and `/registrar/referees/claims`; `src/domain/officiating/fees.ts` for rate resolution, pure so the arithmetic is testable without a database |
| 5_technology | **No change.** Migrations and pure modules on the stack that exists |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (today) | A designation exists and nothing follows it. No verification, no rate, no claim, no payment. Six business rules about referee money, none enforced |
| **Target** (this initiative) | A club records its own fee schedule; a verified appointment produces a claim at the rate that applied on the day; claims are approved and batched by a treasurer; and a remittance records that the club paid, without the platform ever moving money |

## Work packages and deliverables

### WP1 — Verification, which BR13 requires *(database delivered)*

Scope 33's WP4, delivered here because C5 cannot start without it.

- **Deliverables:** `appointment_verification` — who confirmed the official
  turned up and officiated, when, and the abandonment explanation BR18
  needs. A verification is **not** a state on the appointment: it is a
  separate fact, recorded by somebody other than the person being paid.
  This is **BR119**, and it is enforceable only because the
  account-to-Person link of [scope 29's WP1](./29_actors-access-and-permissions.md)
  exists — before it, the platform could not tell that the account
  clicking verify and the official named on the appointment were the same
  human. It fires on the *asserted* link, never on a matching name.
- **Outcome:** BR13 has something to require, and the person being paid
  cannot advance their own claim.

### WP2 — The fee schedule the club authors *(schema and rate resolution delivered; editor not built)*

- **Deliverables:** `referee_fee_schedule` (a dated version per club) and
  `referee_fee_rate` (the rows: appointing party, role, classification,
  competition, amount). `src/domain/officiating/fees.ts` resolving a rate
  for an appointment — most specific match wins, and **no match is an
  answer**, not a zero.
- **Outcome:** BR41's determinants become a lookup rather than a memory.

### WP3 — Claims

- **Deliverables:** `referee_payment_claim` carrying the resolved rate **as
  a stored amount** (BR116), refused for an unverified appointment (BR13),
  refused twice for one appointment (BR14), refused for a cancelled fixture
  (BR17), and refused for an abandoned one without the explanation (BR18).
- **Outcome:** the club knows what it owes its officials.

### WP4 — Approval, batches, remittances

- **Deliverables:** `referee_payment_batch`, treasurer approval, and a
  remittance recording that payment was made outside the platform.
- **Outcome:** a treasurer works from a list rather than a spreadsheet.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| The club's own fee schedule, versioned | Any seeded or vendor-supplied rate table — [#1](./open-questions.md) dissolved that question deliberately |
| Claims computed from a stored rate | Automatic claim creation — a claim is raised by a person |
| Treasurer approval and batching | **Moving money.** Nothing here initiates a transfer, as nothing in the player finance slice does |
| A remittance as a recorded fact | **Storing banking details** — see the gap note |
| BR13, BR14, BR16, BR17, BR18, BR41 enforced | BR12's decline-rate threshold, still waiting on a season of history |

## Gap notes

- **No banking details are stored, and that is narrower than
  [#4](./open-questions.md) permits.** The adopted interpretation allows a
  club to retain a minor's own account details; it also says plainly that it
  is not a legal sign-off and that this stays sensitive, regulated data
  about children. The platform does not need them: a club pays through its
  own bank, and a remittance records *that it paid*. Holding a
  twelve-year-old's account number would buy nothing and carry everything.
  Revisit only when a club asks and the legal question is actually answered.
- **Nothing moves money**, exactly as in the player finance slice. Square is
  chosen and unintegrated. A treasurer records what they paid, because the
  club's books have to be right whether or not an integration ever arrives.
- **No notification.** BR42's coordinator notification is unbuildable for
  the same reason as everywhere else, and so is telling a referee their
  claim was approved. They find out by being paid.
- **A claim is per appointment, not per match.** Where an association
  appointed, the club records no claim at all — BR16 says the association
  pays, and the platform has no visibility of what they paid. A club that
  wants that number will have to ask them.

## Open questions

- **[#71] Who may approve a referee payment claim — the Treasurer alone, or
  the Referee Coordinator who proposed the designation?** Adopted for now:
  **the treasurer, matching BR78's separation for player money.** The
  coordinator raises, the treasurer approves; the person who chose the
  official is not the person who authorises paying them. If a small club
  finds that unworkable it is a governance decision for them, not a default
  the platform should have picked.
- **[#72] Does a rate change apply to appointments already made?** Adopted:
  **no** — a claim carries the rate that applied on the date of the fixture
  (BR115, BR116), so a mid-season schedule change does not silently
  reprice games already played. The alternative is a treasurer discovering
  that last month's total has moved.
