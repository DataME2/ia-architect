# Project Scope — Working from a List Rather Than a Spreadsheet

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

[Scope 34](./34_paying_the_officials.md) built C5 end to end and said so
plainly at the time: *"WP1, WP3 and WP4 — database delivered."* Every rule
about referee money runs — verification, the stored rate, the refusals, the
batch that closes before it is paid — and until now **none of it was
reachable from a screen**. A coordinator could not record that a match was
officiated; a treasurer could not raise, approve, or batch a claim.
Scope 53 closed the first blocker in this chain — a club could not even
*author* a rate — and this closes what is left of it.

## What "database delivered" actually meant

Reachable only from `psql`. `appointment_verification`,
`referee_payment_claim` and `referee_payment_batch` have carried real
policies and real triggers since migration 0026–0027, and nothing in
`src/app` has ever inserted a row into any of them. `docs/spec/requirements.md`
still read *"claim approval remains unwired"* against FR-C17.7 up to this
scope — a note scope 36 left true and nothing since had gone back to close.

## The four acts, and why they stay four screens rather than one form

**Verifying is not accepting a claim.** BR119 keeps them apart on purpose —
the person who watched the match confirms it happened; the person who was
paid does not get to advance their own claim by filling in a form that also
raises it. So verification and claim-raising are two separate acts even
when, in the ordinary case, the same coordinator does both back to back.

**Raising is not approving.** [Open question #71](./open-questions.md)
answered this the way BR78 already answers it for player money: the
coordinator who chose the official raises the claim; the treasurer who owns
the club's money approves it. A screen that let one role do both would be
offering a shortcut the database already refuses — `referee_payment_claim_raise`
and `referee_payment_claim_decide` are two policies naming two different
role sets, and putting one button in front of a coordinator that calls the
treasurer's policy would just be a button that fails when pressed.

**Approving is not batching.** A claim can sit `approved` for weeks before a
treasurer is ready to pay a run of them together — `batch_id` is nullable
on purpose. Forcing every approval straight into an open batch would mean a
treasurer either batches constantly or leaves claims sitting `raised`
because approving now feels premature.

**Batching is not paying.** BR117's own shape: closing is the moment a
batch's total becomes a fact, and paying is a second, later act recording
what actually left the bank. Collapsing them would mean a batch's total is
still a guess at the exact moment the club treats it as a remittance record.

## The screen's job, since the rules are the database's

Every refusal that matters here is already enforced by a trigger: BR13,
BR14, BR17, BR18, BR117, BR119. The screen's job — the same job scope 53's
fee editor and scope 51's designation answer both took — is to **name the
refusal in words a person can act on** rather than let a raw constraint
violation reach them, and to **never offer an act the database will refuse**,
so a treasurer does not press a button only to be told no by a trigger they
cannot see. `claimable()` in `src/domain/officiating/fees.ts` already
computes exactly that verdict as a pure function; this closes the gap
between it having existed since scope 34 and a screen ever calling it.

**The rate is resolved once, at raise time, and stored.** BR116 requires
this — the claim carries the amount it was computed at, never recomputed —
so the screen calls `rateFor` once when the coordinator raises the claim,
using the appointment's own role, competition, classification and
appointing party, and writes the result. A rate that cannot be resolved
(`rateFor` → `none`) is shown as exactly that, not silently as zero, because
scope 53 built the whole editor around the same distinction.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** G4's referee lifecycle goal gains its last unbuilt screen rather than a new goal |
| **2_business** | **No new rules.** BR13, BR14, BR16, BR17, BR18, BR41, BR116, BR117, BR119 all get a caller for the first time. `notifyClaimApproved` (existing, unwired since scope 36) gets one too |
| **3_information** | **No change.** 0026–0027's tables were already right; nothing here adds a column |
| **4_application** | Four new screens (`/registrar/verification`, and the claim/batch screens under `/registrar/referee-payments`), one pure decision module, one data module, and the wiring of an existing notification |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | Every rule about referee money is enforced and none of it is reachable — an official cannot be verified, claimed for, approved, batched, or paid through the product |
| **Target** | A coordinator verifies a played fixture and raises a claim at the rate resolved and stored at that moment; a treasurer approves or rejects with a reason, batches approved claims, closes a batch, and records what was paid; the official is told when their claim is approved |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | `src/web/claim-view.ts` — the pure decisions: which appointments are verifiable, `claimable()` wired to real data, batch totals restated for display, parsing the verify/raise/decide/batch forms | **Delivered** |
| **WP2** | `src/data/claims.ts` — verification, raising, approving, rejecting, batch create/add/close/pay | **Delivered** |
| **WP3** | `/registrar/verification` — played fixtures with an accepted official and no verification yet | **Delivered** |
| **WP4** | `/registrar/referee-payments` — claims a coordinator may raise, a treasurer's queue to decide, and batch management | **Delivered** |
| **WP5** | Wire `notifyClaimApproved` from the approval action | **Delivered** |
| **WP6** | Unit tests for the pure layer; `npm run check:full` clean | **Delivered** |

## What this initiative does not do

- **No banking details, deliberately**, exactly as scope 34 recorded. A
  remittance records that the club paid through its own bank; it never
  stores how.
- **BR12's decline-rate threshold** still waits on a season of history to
  set a number — nothing here invents one.
- **No bulk verification or bulk claim-raising.** Scope 54 built bulk
  reminders because a registrar chases forty families at once; a treasurer
  approving referee claims a handful at a time after a round of matches
  does not have the same shape, and a bulk button here would be the first
  place a treasurer approves money without reading each line.
- **No CSV export of a remittance.** The batch is the record; exporting it
  to hand to a bank is a convenience for a later pass, not a rule this
  initiative enforces.
