# Project Scope — Narrowing What a Member Can Read

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/narrow-the-reads`.
**Status: WP1–WP3 aligned and unblocked, not implemented. WP4 resumed,
September 2026** — see below.

This initiative exists because of a request it does not deliver.

**The ask, September 2026:** every guardian and every player over thirteen
who is already registered should be able to sign in and see their own
workspace — the `/me` shell scope 32 built. That is a reasonable thing to
want and it is currently impossible, for a reason worth stating plainly.

## Why family access is blocked, and by what

**Twenty-six of forty-four tables are readable by any member of the club, in
any role.** `payment`, `payment_plan`, `registration`, `person`, `consent`,
`guardianship`, `registration_voucher` are all on that list — it is what
`club_id in (select app_member_club_ids())` means, applied uniformly since
the first migration.

So the obvious implementation of the ask — give a parent a
`club_membership` with a new `guardian` role — **hands every parent every
other family's balance, every child's consents, and every guardian's
contact details.** Not as a bug: as the documented behaviour of the schema.

That is [open question #58](./open-questions.md), which scope 29 raised and
recorded as *"unchanged, and recorded rather than quietly narrowed"*. It
stops being a recorded observation the moment families have accounts, and
becomes the thing standing between the club and a data breach it would have
caused by following instructions.

**Sequencing chosen by the product owner, September 2026: narrow the reads
first.** Family access is deliberately deferred behind this, rather than
built alongside it. The alternative — ship family accounts and narrow
afterwards — means the window between the two is the breach.

## What is not blocked, and is settled here

**A player of thirteen may hold an account; the rights still transfer at
eighteen.** The product owner's answer, September 2026.

This needs care, because [#37 was resolved at eighteen](./open-questions.md)
*"across every right — consent (BR48), erasure (BR49), the calendar feed
(BR33), the mobile account (BR63), and publicity (BR57)"*. The answer here
**does not reopen that**. It separates two things #37 answered together:

| | Age | Rule |
| --- | --- | --- |
| **Signing in and seeing your own record** | 13 | BR63, restated |
| Consent, erasure, publicity, the calendar feed | 18 | BR48, BR49, BR57, BR33 — unchanged |

A thirteen-year-old can see their own fixture, their own availability and
their own appearance record. They cannot grant a consent, request an
erasure, or receive the calendar feed — those remain the guardian's until
BR67's recorded transfer on their eighteenth birthday.

**No password is ever emailed**, which BR98 already settles: the credential
is a single-use link, and the person chooses a password on arrival. The
question was asked and the answer was already written down.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | **No new capability; P5 is applied, not amended.** The narrowing makes P5 mean more rather than less — today a member of the right club sees almost everything in it, which satisfies tenant isolation and nothing else. WP4's family surface is the same principle from the other side: not a P5 exception, a caller who is never a tenant reader at all |
| 2_business | **BR63 restated** (an account at 13, rights at 18) and **BR120–BR122 added**: what each role may read, that a family reads only their own household, and that a narrowing is proved by a test that fails when it is widened. #58 answered in full, and BR78, BR97, BR123–BR125 follow from the club's replies. **BR126 added** (WP4, September 2026): a guardian is invited only once a linked child is COMPLETE |
| 3_information | WP1–3: no new table, twenty-six select policies to rewrite. **WP4, built:** one new table, `guardian_invitation` (BR126's gate is a trigger on it), and two new functions — `app_family_club_ids()` and `app_my_family_person_ids()`, the caller's own Person plus the children they hold authority over — as an *additive* scoping predicate on twelve existing tables, never a rewrite of the twenty-six WP1–3 still owns |
| 4_application | WP1–3: no new route. **WP4, built:** `loadMe` gained the path that does not require `club_membership` — it was returning an empty snapshot whenever that table held no row, which was every guardian; a registrar's registration-detail screen gained a guardian-invite panel, gated on COMPLETE |
| 5_technology | **No change.** Policies and functions on the stack that exists |

## The design, and why not the obvious one

**Families get no `club_membership` at all.**

The obvious shape — a `family` role added to the seven — was rejected for
the reason [decision 8](../decisions/8_demo_access_by_anonymous_session_and_a_read_only_role.md)
gives about the demonstration door: a role that needs different *reads*
would put an `or` clause on two dozen select policies forever, on the exact
predicates P5 rests on. Decision 8 avoided that for a stranger; the same
argument holds for a parent.

Instead the family surface is **`security definer` functions that derive the
Person from the caller** — `claim_club_access`, `app_who_am_i` and
`app_club_accounts` are the same pattern, and decision 6 is where it starts.
The tenant and the person are never arguments, so there is nothing a caller
can set that reaches another household.

That is recorded as [decision 11](../decisions/11_a_family_reads_through_functions_not_membership.md).

## Plateaus

| Plateau | State |
| ------- | ------- |
| **Baseline** (today) | 26 of 44 tables readable by any member in any role. A coach reads every family's balance. Families cannot sign in at all |
| **Target** (this initiative) | Reads scoped to what a role needs. A coach sees their own teams; money reaches the roles that handle it. A guardian, invited once a child's registration is verified COMPLETE, reads their own household through decision 11's functions and nothing else |

## Work packages and deliverables

### WP1 — `app_my_person_ids()`, and the tests that prove a narrowing

- **Deliverables:** the scoping function — caller's own Person plus children
  they hold `is_authority` over — and a behavioural suite that asserts each
  narrowing **by widening it and failing**, in the pattern
  `24_player_record.sql` established for physique.
- **Outcome:** the mechanism exists and is proved before any policy moves.

### WP2 — Money and contact details *(unblocked, September 2026)*

- **Deliverables:** `payment`, `payment_plan`, `payment_installment`,
  `registration_voucher` narrowed to admin, treasurer and registrar.
- **Answered:** a coach sees **whether a player is clear to take the
  field, never the balance** — BR78 as restated. The answer is what makes
  the narrowing buildable: BR79 is computed fresh every time rather than
  stored, so the verdict can be shown without the figure behind it.

### WP3 — The child's record *(unblocked, September 2026)*

- **Deliverables:** `registration`, `consent`, `guardianship`,
  `registration_document`, `validation_result` narrowed to the roles that
  process them, plus the coach's own team.
- **Answered:** a coach sees whether a player is **completely
  registered**, whether they are **clear to play**, and **which consents
  are granted** — the photograph consent in particular, since a coach
  takes team photographs. Also in this package: `fixture` and
  `appearance` narrowed to the roles [#64](./open-questions.md) names,
  which is now a narrowing owed rather than a question open.

### WP4 — The family surface *(resumed, September 2026)*

- **Deliverables:** `app_family_club_ids()` and `app_my_family_person_ids()`
  — the decision-11 functions, deriving the caller's own Person and the
  children they hold `is_authority` over from `auth.uid()`, never from an
  argument. Additive `_select_family` policies on the twelve tables the
  built guardian workspace ([scope 32](./32_the-role-context-shell-and-a-second-palette.md))
  already reads: `account_person`, `club`, `season`, `person`,
  `guardianship`, `registration`, `consent`, `payment_plan`, `payment`,
  `payment_installment`, `team_member`, `team`, `fixture`. `guardian_invitation`,
  gated by BR126, and `claim_family_access()` — decision 10's identity
  assertion, executed on arrival rather than inferred, the same shape
  `claim_club_access()` already uses for `club_contact`.
- **Reopened out of order, and why that is sound rather than a reversal.**
  The original deferral reasoned about the rejected design — a `guardian`
  role on `club_membership` — where shipping family accounts before the
  narrowing meant every parent inherited the 26 wide-open policies during
  the window between the two. Decision 11 replaced that design before this
  initiative was written down: **no membership is ever granted**, so no
  guardian account touches the tables WP1–WP3 narrow. There is no window,
  because there is nothing shared to widen. WP1–WP3 remain unblocked and
  undone, tracked separately.
- **Additive, not a rewrite.** Every `_select_family` policy sits alongside
  the existing membership-based one — Postgres combines permissive policies
  with `or` — so a club officer's read is unchanged and a family's read is a
  second, narrower door into the same tables.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| The scoping function and its proof | Narrowing the referee record, already narrowed by scope 33 |
| Narrowing money and the child's record | Consent, erasure, publicity or the calendar feed at 13 — those stay at 18 |
| BR63 restated: an account at 13 | **BR123's committee decision record** — a new object, and its own initiative |
| Answering #58 in full | A family-facing document upload — `GuardianWorkspace` still says a registrar records what was sighted |
| **Family accounts (WP4)**, resumed September 2026: `guardian_invitation`, the family-scoped read functions, `claim_family_access()` | WP1–WP3 themselves — the staff-facing narrowing is still aligned and unimplemented |

## Gap notes

- **The club answered, and the answer was better than the question.** #58
  asked what a coach should *see*; the reply drew the line at what a coach
  should *know* — completely registered, clear to play, consents granted —
  and put finance on the other side of it. That is buildable precisely
  because BR79 is a computed verdict rather than a stored balance, so the
  coach can be told *clear* without being shown a figure. A guess would
  have narrowed the table and shown them the number.
- **Nothing here gives a family an account**, so the ask remains
  unfulfilled until WP4. The cost of the sequencing is that a parent still
  cannot sign in; the cost of the alternative is that they could, and so
  could every other parent, into each other's records.
- **`viewer` and `committee` still mean nothing** — neither appears in a
  write policy, and after this neither will appear in a narrowed read
  policy either. [#59](./open-questions.md) is unchanged and unanswered.

## Open questions

- **[#73] May a coach see a family's outstanding balance?** Adopted for
  now: **no**, pending the club — Majestri withholds financial data from
  team officials and the pilot club already accepts that product. This
  **restates BR78**, which currently grants every member a read on money, so
  it is a change to documented behaviour rather than an implementation
  detail.
- **[#74] Does a player of thirteen see their own money?** Adopted:
  **no.** They see fixtures, availability and their own appearance record;
  what the family owes is the guardian's business until eighteen. A
  thirteen-year-old told they owe $180 is a conversation the club did not
  intend to start.
