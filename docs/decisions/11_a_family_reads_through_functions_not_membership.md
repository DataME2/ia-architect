# Decision 11 — A family reads through scoped functions, not through a club membership

_[← Decisions](./README.md) · [Enterprise architecture](../ea/README.md)_

**Status:** Accepted (September 2026). **Not built** — the family surface is
deferred behind [scope 35](../scope/35_narrowing_what_a_member_can_read.md)'s
read-narrowing by decision.

## The question

Every guardian, and every player over thirteen, should be able to sign in
and see their own workspace. Registration already records them as a
`Person`; nothing records them as somebody who can sign in.

How do they get read access to their own records?

## The tempting answer, and why it is refused

`club_membership` is how access works. Adding `guardian` and `player` to its
seven roles is a two-line migration, and `/me` would start working for them
almost immediately.

It would also hand **every parent every other family's records.**

Twenty-six of forty-four tables are readable by any member of the club in
any role — `payment`, `payment_plan`, `registration`, `person`, `consent`,
`guardianship`, `registration_voucher` among them. That is not a bug to fix
alongside; it is what `club_id in (select app_member_club_ids())` has meant
since the first migration, and it is [#58](../scope/open-questions.md),
recorded and unanswered.

**The second tempting answer is worse.** Keep the membership and add an `or`
clause to each of those twenty-six policies, scoping a family to their own
household. That is precisely the shape
[decision 8](./8_demo_access_by_anonymous_session_and_a_read_only_role.md)
rejected for the demonstration door: *"an `or` clause on two dozen select
policies forever, on the exact predicates P5 rests on."* It was the wrong
trade for a stranger looking at fictional data; it is a worse one for a
parent looking at real children.

Both share a failure mode. A policy that is *almost* right is not visibly
wrong — the club sees a working screen, and the leak is a query nobody runs
until somebody does.

## The decision

**A family holds no `club_membership`.** Their reads go through
`security definer` functions that derive the Person from `auth.uid()` and
return only that household: the caller's own record, and the children they
hold `is_authority` over through `guardianship`.

This is the pattern the codebase already runs on, four times:

| | Function | What it derives rather than accepts |
| --- | --- | --- |
| [Decision 6](./6_public-registration-through-a-scoped-function.md) | `create_registration_from_invitation` | the club, from the invitation |
| [Decision 8](./8_demo_access_by_anonymous_session_and_a_read_only_role.md) | `enter_demo` | the club, looked up not supplied |
| [Decision 9](./9_platform_administration_provisions_but_never_reads.md) | `platform_clubs` | the allowlist, unreadable through the API |
| [Decision 10](./10_identity_is_asserted_never_inferred.md) | `app_who_am_i` | the Person, from the asserted link |

**Nothing a caller can set reaches another household**, because the
household is not an argument. That is the whole property, and it is the same
sentence decision 6 opens with.

Three consequences follow, all deliberate.

**No P5 exception is bought.** A family is not a tenant reader with a
narrower filter; they are not a tenant reader at all. P5 stays exactly as
strict as it was, which is what makes this cheaper than the alternatives
rather than merely different.

**The twenty-six policies are untouched by the family surface.** They still
need narrowing — a coach reading every family's balance is wrong whether or
not parents can sign in — but that is scope 35's own work, driven by #58 and
answered by the club. This decision does not depend on it, and does not
pretend to solve it.

**`account_person` is the join, and identity stays asserted.** A family
member reaches their household only once an administrator has linked their
account to their Person (BR107). An unlinked account is nobody, and
[decision 10](./10_identity_is_asserted_never_inferred.md) is why: matching
`person.email` to `auth.users.email` would let anybody who registered with a
shared family inbox read that household. Families are the population where
shared inboxes are the norm, so the rule earns its keep here more than
anywhere.

## What this does not decide

**When the family surface is built.** The product owner chose to narrow the
reads first, so this is a design waiting for its turn rather than a design
being implemented. Recorded now because it is the reason the narrowing is
urgent, and a decision written after the fact reads as a justification.

**Who links a family account to a Person.** Today only an administrator can
(BR107), and doing that by hand for six hundred families is not a plan. The
shape that would work is decision 7's again — a link the club issues, which
the person follows — but sending it needs the platform to send email, which
it cannot do at all.

**Whether a thirteen-year-old sees the same workspace as their guardian.**
They do not: BR63 as restated gives them an account, and BR48, BR49, BR57
and BR33 keep consent, erasure, publicity and the calendar feed with the
guardian until eighteen ([#37](../scope/open-questions.md), resolved and not
reopened).

## Consequences

- `loadMe` needs a path that does not begin at `club_membership`, which it
  does today — it returns an empty snapshot when there is none.
- Every family read is a function, so the surface is small, greppable, and
  each addition is a deliberate act rather than a policy that quietly
  already covered it.
- A club officer who is also a parent has both: a membership for the club's
  records, and the family functions for their own household. They are
  different questions and the platform answers them separately.

## What would change this

The twenty-six policies being narrowed to the point where a `family` role
would be safe — which is scope 35's own target. Even then the function
surface would likely stay: it is a smaller thing to audit than a role whose
reads are defined by absence across two dozen tables.
