# Decision 8 — The demonstration club is entered with an anonymous session and a read-only role

_[← Decisions](./README.md) · [Enterprise architecture](../ea/README.md)_

**Status:** Accepted (August 2026)
**Realises:** C10 (multitenant platform operations), P5 (strict tenant isolation)

## The question

A prospect will not be given an account before they have seen anything, and
will not create one to look. So the demonstration club has to be reachable
**without authentication**. The club that sells the platform also wants to
know who looked.

How does an unauthenticated stranger read a tenant's data without that
becoming the hole through which someone reads a real club's?

## What was considered

| Option | Why not |
| ------ | ------- |
| **A policy letting `anon` read the demo club** — `... or club_id = <demo>` added to every select policy | The honest cost is 24 tables of new policy surface, each an `or` clause that has to be right, on the exact predicates P5 rests on. It is also **the first P5 exception since P6's carnival data** ([decision 3](./3_public-event-data-crosses-tenant-isolation.md)), bought for something that does not need one. And it is permanent: every table added later needs the clause too, and forgetting it fails *open* for the demo and closed for nobody |
| **A parallel read path** — `security definer` functions returning demo data to `anon` | A second implementation of every query in the application, which would drift from the first. The demo would then be showing a reimplementation of the product rather than the product |
| **A shared demo account with a password on the page** | A published credential is a credential. It is also a *writing* credential unless a new role is invented anyway, so it solves nothing and adds a secret to leak |
| **No login at all; make the demo pages static screenshots** | Cheapest, and worthless. The thing being sold is that the rules actually refuse things |

## The decision

**A visitor exchanges an email address for an anonymous Supabase session and
a `viewer` membership of the demonstration club. No password, and no
account.**

Two mechanisms, and each is doing one job.

**The anonymous session** makes `auth.uid()` a real subject. Every existing
policy then applies unchanged — the demo is reached *through* the security
model rather than around it, and there is no second code path to keep in
step. P5 is untouched: **this decision adds no cross-tenant read**, and the
demonstration club is isolated from the real ones by exactly the mechanism
that isolates the real ones from each other.

**The `viewer` role** makes the visit read-only, and it needs no new policy
to do so. Reads in this schema are membership-based:

```sql
for select using (club_id in (select app_member_club_ids()))
```

and writes are role-based:

```sql
for all using (app_has_role(club_id, array['admin','registrar']))
```

So **a role that no write policy names can read its club and change
nothing** — automatically, everywhere, and for every table added in future
without anyone remembering to exclude it. That property is the reason this
shape was chosen over a permissions list that has to be maintained.

The door itself is `enter_demo(email, phone)`, a `security definer`
function in the shape [decision 6](./6_public-registration-through-a-scoped-function.md)
established: an unauthenticated caller performs **exactly one scoped write**,
and **the club is looked up, never supplied**. There is no argument to this
function that reaches a real tenant.

## Why an email address, and only an email address

The instruction was to hook a prospect, not to interrogate one. Email is
required because it is the only thing worth having from that page; phone is
offered because a club interested enough to look is worth ringing. Nothing
else is asked, because every additional required field is a prospect who
closed the tab.

The address is not verified, and deliberately so — verification would mean a
round trip through an inbox before anyone sees anything, which defeats the
point. A false address costs one row.

## Consequences

- **`prospect` lives outside the club-scoped world**, as scope 28 §3 said the
  marketing surface must. It has no `club_id`, no API access in either
  direction, and one row per address rather than per visit. It is the first
  entry in `check_rls.py`'s `TENANTLESS_ALLOWED`, which is a list that should
  stay this short.
- **Anonymous sign-in must be enabled** on the Supabase project. It is off by
  default, and while it is off the door reports that rather than blaming the
  visitor's details.
- **`auth.users` accumulates a row per visitor.** Acceptable, and cleanable:
  an anonymous user with a `viewer` membership and nothing else is safe to
  delete at any time.
- **A visitor who already belongs to a real club is refused.** A registrar
  wandering through the marketing page must not quietly acquire a second
  membership, because the screens show one club and which one would then
  depend on insertion order.
- **The demo club must exist.** `enter_demo` refuses rather than inventing
  one, so a deployment without `supabase/demo/seed.sql` applied says so.
- **A `viewer` may still append to `audit_event`**, which admits any member.
  That is the correct outcome: the visit is recorded and cannot be rewritten.

## How it is proved

`supabase/tests/20_demo_front_door.sql` — 12 scenarios against a real
Postgres with the real migrations, run by `scripts/test_rls.sh` in CI. It
asserts the visitor can read the demo, **cannot write anything anywhere**,
cannot see that another club exists, and cannot read back the prospect list
they themselves wrote to.

The read-only claim was verified by breaking it: adding `viewer` to one
write policy makes the suite fail, so the guarantee is tested rather than
vacuously true.
