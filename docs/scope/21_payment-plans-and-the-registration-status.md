# Project Scope — Payment Plans, and a Status That Moves

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/identity-and-registration`.

Two processes were checked end to end against what the code actually does.
The **player registration process** was documented and largely built, with
one thing missing that nobody had noticed. The **payment plan process** was
a diagram and nothing else — the first piece of **C3** to exist.

## What the check found

**The registration status never moved.** The process runs draft → review →
paid → complete, and the schema has carried `PENDING_DOCUMENTS` and
`PENDING_PAYMENT` since migration 0001. Neither had ever been written. A
registration created by a family sat at `DRAFT` until a submission pack
carried it away; the queue could say a registration was blocked, but the
registration itself could not. The two statuses that exist to say *why*
something is waiting were decoration.

That went unnoticed because until
[scope 20](./20_identity-membership-and-registration-requirements.md) the
rules that would justify those statuses could not fail. With BR2 and BR3
able to fail, deriving the status became possible — and the absence became
visible.

**The payment plan process had no implementation at all.** Business
services listed it as *Pending*, and `outstanding_amount_cents` was a
single number a registrar typed. There was no plan, no instalment, no
receipt, and therefore no way for a club to offer a family anything other
than payment in full.

## The rule that had to change

**BR3 blocked on any outstanding balance.** That is correct for a fee due
in full, and wrong the moment a club offers instalments: a family three
weeks into a five-month plan, having paid everything asked of them, would
have been held out of the season by a rule meant to catch non-payment.

The plan would have been worthless. The club could offer one, and the child
still could not play, because the balance the plan exists to spread would
itself be the blocker.

So BR3 is **restated**: what blocks is *arrears* — an instalment already
past its due date and unpaid — not the balance. Where no plan exists the
whole amount is due and the rule is unchanged. This is the initiative's one
change to documented behaviour, and it is the reason this is a scope
document rather than a commit.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No change. Implements the first slice of **C3** (player finance) against **G3**. No new or excepted Principle: the finance tables are tenant-scoped like everything else, and **P5** is re-proved rather than amended |
| 2_business | **BR3 restated** (arrears, not balance) and **BR74–BR78** added: instalments sum exactly, one live plan, the plan finishes inside the season, payments are append-only, and only Finance Admin or Treasurer may move money. The payment plan process gains the detail it never had; **Payment Plan / Installment** splits into three objects, one of them **Payment** |
| 3_information | Three data objects — `payment_plan`, `payment_installment`, `payment` — in [1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 4_application | The finance domain, its screens, the derived registration status, and a fourth behavioural SQL suite. In [2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology | No change. No payment provider is integrated; see *Gap notes* |

No decision record. BR78's separation follows BR22, already recorded; the
append-only treatment follows `validation_result` and the audit log,
already established. The one genuine judgement — deriving status rather than
letting a human set it — is argued in the module that does it.

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | A registration's status never changed except by a submission pack. A fee was one number a registrar typed, payable in full or not at all; nothing recorded that money had arrived |
| **Target** (delivered) | A treasurer agrees a plan; instalments are generated cent-exact and cannot be written otherwise; receipts accumulate and cannot be rewritten; BR3 blocks on falling behind rather than on owing; and the registration's status follows its rule outcomes. Proved across 15 further behavioural scenarios — 68 in total |

## Work packages and deliverables

### WP1 — The finance domain *(done)*

- **Deliverables:** `src/domain/finance/` — schedule generation with the
  remainder on the first instalment, month-end clamping, oldest-first
  allocation, and arrears; `src/web/plan-view.ts` for the screen's
  decisions; `src/web/money.ts` reused for parsing.
- **Outcome:** every money decision is a pure function, tested without a
  database — 47 unit tests across the two files.

### WP2 — Schema, and three rules the database enforces *(done)*

- **Deliverables:** `supabase/migrations/0007_payment_plans.sql` — the
  three tables, their policies, a **partial unique index** for BR75, and a
  **deferred constraint trigger** for BR74 that fires from both sides of
  the plan/instalment relationship.
- **Outcome:** BR74 and BR77 hold against any writer, not only against this
  application. That is the whole reason they are in the database: this code
  is not the last thing that will ever write these tables.

### WP3 — Screens and the status *(done)*

- **Deliverables:** the payment panel on the registration detail;
  `createPlanAction`, `cancelPlanAction`, `recordPaymentAction`;
  `statusFromValidation` wired into the registrar's re-check.
- **Outcome:** a treasurer can agree a plan and record money; a
  registration's status now says what it is waiting for.

### WP4 — Proof, and a simulated season *(done)*

- **Deliverables:** `supabase/tests/14_payment_plans.sql` — 15 scenarios.
- **Outcome:** verified to fail. Dropping the BR74 trigger produces *"an
  instalment was deleted, leaving the plan short"*; loosening the receipt
  policy to `for all` produces *"a recorded payment was rewritten"* and
  *"a recorded payment was deleted"*.
- A full season was also simulated through the unmodified domain code — a
  $120.50 fee over three monthly instalments, with one instalment paid
  late, one part-paid, and one reversed as a correction. BR3 failed and
  recovered at each point, the status followed it, and the ledger
  reconciled to the cent.

## In scope / out of scope

**In scope:** payment plans with weekly, fortnightly and monthly cadences;
instalment schedules; recorded payments including refunds and corrections;
arrears-aware BR3; derived registration status.

**Out of scope:** the payment **provider**. Square is not integrated, and
nothing here initiates or confirms a transaction — the club records what it
received. Also out: vouchers applied to a plan (BR21–BR25 remain unbuilt),
guardian notification of a balance, dunning, and reconciliation against a
provider statement, all of which the process diagram shows and none of
which exists yet.

## Gap notes

**No provider integration, deliberately.** The club's own books have to be
right whether or not an integration ever arrives, and building the ledger
around a provider's webhook makes the books a projection of someone else's
system. The `method` and `reference` columns are where a provider's
identity lands when one is added; nothing else needs to change.

**Allocation is computed, never stored.** A family paying $50 against a $40
instalment has made no statement about allocation. Recording a guess as
though they had turns an arithmetic question into a disputed fact, so
oldest-first is applied at read time and can be re-derived from the
receipts at any point.

**`registration.outstanding_amount_cents` is now derived where a plan
exists** — plan total minus every receipt — so a reversing entry corrects
it by the same route as an ordinary payment and the two cannot disagree.
Without a plan it remains the registrar's own figure, reduced by each
receipt, because there is no recorded total to derive from. That asymmetry
is real and worth knowing about.

**The status has no value for "not valid yet".** A registration blocked by
a missing guardian (BR1) or an unverified legal name (BR55) stays in
`DRAFT`, because inventing a status would be a schema change to describe
what the rule outcomes already say. If that proves confusing on the queue,
the fix is a screen, not a status.

## Open questions

None raised.

Two existing questions move: [#32](./open-questions.md)'s decomposition of
the registration delay now has payment as a *measurable* component, since
BR3 failures enter `validation_result` as real events with the status
transitions to match. And BR40's retention window will eventually have to
say what happens to a `payment` row, which is append-only by BR77 and
therefore cannot simply be deleted by a disposal job — worth noting before
[#30](./open-questions.md) is answered rather than after.
