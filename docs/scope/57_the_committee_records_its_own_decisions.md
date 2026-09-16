# Project Scope — The Committee Records Its Own Decisions

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `spec-driven-development`.

[Open question #59](./open-questions.md) answered that the Committee may
record its own decisions — a dated resolution naming what was decided, who
moved it, and which Committee Term it belongs to (BR123). Nothing had ever
written one: `committee`, the role the answer names, had held no policy
anywhere since scope 29 found the gap, and BR123 itself had no table.

**BR21 was found unenforced while this was being built, and it is one of
the oldest rules in the project.** *A Voucher Program cannot be applied to
a club's invoices until the club's Committee approves it.*
`registration_voucher.program` has taken any string since migration 0008
with nothing behind it — any club officer could attach a voucher for any
program, approved or not.
[`docs/ea/2_business/4_business-objects.md`](../ea/2_business/4_business-objects.md)
has named the missing mechanism the whole time: **Club Voucher Program
Enablement**, "records the Committee's approval and date; gates whether
Finance Admin or Treasurer can apply that program's Vouchers."
`src/data/governance.ts`'s own header said a registrar reads the governance
screen to check this by eye — BR21 was never a rule the database asked
about; it was a rule a human was trusted to have checked.

## One resolution mechanism, two callers

`committee_resolution` is general — Q59's own answer lists more than
vouchers: buying goals, hiring or promoting a coach, funding a coaching
licence, enabling a voucher programme. `club_voucher_program_enablement` is
the one caller built here, because it is the one rule already written down
and waiting. A future decision that needs its own gate points at a
resolution the same way `category` lets this one be found, rather than
growing a second free-text column somewhere else that also means "the
Committee said yes."

## Two tables neither shape could reuse

`committee_term` and `committee_resolution` share a club but carry no
composite key between them — `committee_term` has never needed one, the
same shape `committee_position` (0011) already settled by trigger rather
than by a `(club_id, id)` foreign key. `committee_resolution` follows that
same settlement twice over: once for its own `term_id`, and again for
`club_voucher_program_enablement.resolution_id`, whose citing trigger
checks the resolution's club **and** its category — a composite key would
only have given the first.

## Append-only, the same absence that makes a payment one

No update or delete policy exists on `committee_resolution`, the same gap
that makes `payment` and `audit_event` append-only (BR77's own mechanism).
A resolution corrected after the fact is a new resolution recording the
correction, not an old one rewritten to read as if it had always said that
— the record is a fact about when a decision was made, and rewriting it
would make the fact untrue.

## The gate matches a program the way `rateFor` matches a competition

`assert_voucher_program_is_enabled` compares `program` trimmed and
lower-cased, the same free-text problem BR115's competition matching
solved in scope 34 — a club typing "Play On!" once and "play on" the next
time has not named two programs, and a gate that treated them as different
would refuse a voucher a registrar had every reason to think was approved.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| **1_strategy** | **No change.** No new goal — BR21 gains the enforcement it always claimed to have |
| **2_business** | **No new rule.** BR123 gets its first table and caller; BR21 gets enforced for the first time since migration 0008 |
| **3_information** | Two new tables: `committee_resolution`, `club_voucher_program_enablement` (migration 0049) |
| **4_application** | `src/data/governance.ts` extended (`recordResolution`, `enableVoucherProgram`), `src/web/governance-view.ts` extended (parsing, labels, the case-insensitive match helper), and the existing governance screen gains a resolution list and a Voucher Program section |
| **5_technology** | **No change** |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | The Committee could decide nothing the database recorded, and any club officer could attach a voucher for any program string whether or not the Committee had approved it |
| **Target** | `committee` or `admin` records a dated resolution; enabling a Voucher Program requires citing one recorded with category `voucher_program`, for the same club; `registration_voucher` refuses any program the club has not enabled this way |

## Work packages

| WP | Deliverable | State |
| -- | ----------- | ----- |
| **WP1** | Migration 0049 — `committee_resolution`, `club_voucher_program_enablement`, the citing trigger (BR21's resolution must be its own club's and its own category), and the gate on `registration_voucher` | **Delivered** |
| **WP2** | `src/data/governance.ts` — `recordResolution`, `enableVoucherProgram`, and `loadGovernance` extended to read both new tables | **Delivered** |
| **WP3** | `src/web/governance-view.ts` — `parseResolution`, `parseEnablement`, `enabledProgramNames`, category labels | **Delivered** |
| **WP4** | Governance screen — recording a resolution per term, and a club-wide Voucher Program section listing what is enabled and a form to enable another | **Delivered** |
| **WP5** | `supabase/tests/50_committee_resolutions_and_voucher_programs.sql` — who may record and enable, append-only, the club-and-category check on citing a resolution, the gate itself (accept, case-insensitive match, refuse), and P5 | **Delivered** |
| **WP6** | Fixtures for suites `15_vouchers_and_siblings.sql` and `39_reporting.sql` updated to seed a Committee approval for the programs they already tested against — the new gate would otherwise have failed them incidentally, for a reason neither suite is about | **Delivered** |
| **WP7** | Unit tests for the pure layer; `npm run check:full` clean | **Delivered** |

## What this initiative does not do

- **No screen change to how a voucher is attached.** `attachVoucher` in
  `src/data/vouchers.ts` already surfaces a database error generically; the
  new trigger's refusal reaches the registrar's screen unchanged.
- **No retroactive enablement.** A club with vouchers already attached
  under a program nobody formally approved keeps them — this gates new
  attachments, not history, the same way BR115's rate versioning never
  rewrites a claim already raised.
- **No second `category`.** `general` covers every other decision Q59's
  answer names for now; a future caller adds its own category and citing
  check when it exists, rather than this initiative guessing its shape in
  advance.

**Addendum ([scope 61](./61_a_committee_office_that_does_not_take_down_me.md)):**
a `committee_resolution` read that failed for any reason — including a
schema cache not yet reflecting this migration — crashed the unrelated
`/me` personal workspace for any account holding a committee office, since
`loadGovernance` was called there only to label or fill a workspace tab.
Fixed there with `loadGovernanceOrEmpty`; this initiative's own tables and
the registrar governance screen's behaviour are unchanged.
