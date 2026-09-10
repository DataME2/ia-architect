# Project Scope — Narrowing What a Member Can Read

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/narrow-the-reads`.
**Status: aligned, not implemented.** Two of the three role answers need the
club's confirmation before the migration is written.

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
| 1_strategy | **No new capability; P5 is applied, not amended.** The narrowing makes P5 mean more rather than less — today a member of the right club sees almost everything in it, which satisfies tenant isolation and nothing else |
| 2_business | **BR63 restated** (an account at 13, rights at 18) and **BR120–BR122 added**: what each role may read, that a family reads only their own household, and that a narrowing is proved by a test that fails when it is widened. #58 answered for three of the seven roles; two need the club |
| 3_information | No new table. **Twenty-six select policies rewritten**, and a new `app_my_person_ids()` — the caller's own Person plus the children they hold authority over — as the scoping predicate |
| 4_application | No new route. `loadMe` gains a path that does not require a `club_membership`, which is what family access will need once it is unblocked |
| 5_technology | **No change.** Policies and one function on the stack that exists |

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
| **Baseline** (today) | 26 of 44 tables readable by any member in any role. A coach reads every family's balance. Families cannot sign in at all. #58 recorded and unanswered |
| **Target** (this initiative) | Reads scoped to what a role needs. A coach sees their own teams; money reaches the roles that handle it. The family surface has somewhere safe to attach, and attaches in a later initiative |

## Work packages and deliverables

### WP1 — `app_my_person_ids()`, and the tests that prove a narrowing

- **Deliverables:** the scoping function — caller's own Person plus children
  they hold `is_authority` over — and a behavioural suite that asserts each
  narrowing **by widening it and failing**, in the pattern
  `24_player_record.sql` established for physique.
- **Outcome:** the mechanism exists and is proved before any policy moves.

### WP2 — Money and contact details *(needs the club's answer)*

- **Deliverables:** `payment`, `payment_plan`, `payment_installment`,
  `registration_voucher` narrowed to admin, treasurer and registrar.
- **Blocked on:** whether a **coach** should see a family's balance. BR78
  currently says *any* club member may read what a family owes, so this
  restates BR78 and needs the club rather than a guess.

### WP3 — The child's record *(needs the club's answer)*

- **Deliverables:** `registration`, `consent`, `guardianship`,
  `registration_document`, `validation_result` narrowed to the roles that
  process them, plus the coach's own team.
- **Blocked on:** [#58](./open-questions.md) proper — what a coach should
  see. Majestri, which these clubs already use, withholds financial data
  from team officials; that is evidence, not an answer.

### WP4 — The family surface *(deferred by decision)*

- **Deliverables:** none in this initiative. Recorded so the sequencing is
  legible: the ask that motivated all of the above is the last thing built,
  because it is the thing that makes the rest urgent.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| The scoping function and its proof | **Family accounts** — deferred deliberately, WP4 |
| Narrowing money and the child's record | Narrowing the referee record, already narrowed by scope 33 |
| BR63 restated: an account at 13 | Consent, erasure, publicity or the calendar feed at 13 — those stay at 18 |
| Answering #58 for three roles | Answering it for `coach` and `committee` — the club's call |

## Gap notes

- **Two work packages are blocked on the club, and that is the point.**
  BR52 says the privacy framework is recorded per tenant rather than assumed
  platform-wide, and what a coach may see about a child is exactly that kind
  of decision. Guessing it would be the failure this document exists to
  prevent, one layer up.
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
