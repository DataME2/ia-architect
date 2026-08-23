# Decision 7 — A tenant is created by an owner-issued invitation, not by signing up

_[← Decisions](./README.md) · [Enterprise architecture](../ea/README.md)_

**Status:** Accepted (August 2026)
**Realises:** C10 (multitenant platform operations), P5 (strict tenant isolation)

## The question

A club becomes a tenant. Who is allowed to make that happen, and through
what mechanism?

The schema currently forbids it outright — `club` denies every write
unconditionally, and the first `club_membership` cannot be created because
creating one requires already being an admin of the club being joined. So
provisioning happens through elevated SQL, by hand, by the platform owner
([annex](../annexes/tenant-provisioning.md)). That works for one club and
does not survive ten.

## What was considered

| Option | Why not |
| ------ | ------- |
| **Self-service sign-up** from the marketing site | The commercial model rules it out before the security model does. First year is **A$12,000 including onboarding, migration and configuration**; every sale is a **mid-season displacement of Majestri** ([decision 5](./5_replace-the-incumbent-rather-than-integrate.md)); and the buyer is a **committee**, which decides in a meeting and records it in minutes. Nobody puts that on a signup form. An empty tenant is also worth nothing to a prospect — the value is *their* data migrated |
| **Keep hand-run SQL indefinitely** | Safe and unscalable. It also puts the founder in the mechanics of every onboarding, not just the decision, and a hand-typed four-statement sequence is a half-completed tenant waiting to happen |
| **A platform super-admin who creates clubs through the app** | Requires a cross-tenant actor, which is a **P5 exception** — the first since P6. Worth noting that provisioning does not actually need one: creating a tenant requires no ability to *read* another tenant. Conflating the two would buy an exception for nothing |

## The decision

**A tenant is created only on the platform owner's authorisation, given when
a customer signs a contract directly with them. The mechanism is a
single-use, expiring, revocable onboarding link that only the owner can
issue.**

This generalises [decision 6](./6_public-registration-through-a-scoped-function.md)
one level up. That decision established the pattern: an unguessable,
hashed, expiring token lets an unauthenticated party perform **exactly one
scoped write**, through a `security definer` function whose tenant is not an
argument. The same shape provisions a club:

1. Contract signed → the owner issues an onboarding link carrying the club
   name and jurisdiction that were agreed.
2. The club's first administrator **creates their own account** through
   ordinary Supabase Auth. This is already safe and already true: a
   signed-in user with no membership sees exactly what a stranger sees.
3. They redeem the link → one function creates the `club` row and their
   first `admin` membership, atomically.

## Why this shape

**It separates authorisation from typing.** The founder decides; the club
does the data entry. That is the half worth delegating, and the half that
must never be.

**It solves the bootstrap paradox inside the security model** rather than by
stepping around it. Today provisioning requires a connection with RLS
disabled. Under this decision it requires a token the owner alone can mint.

**It reuses a proven surface.** Decision 6's reasoning, its threat model and
its behavioural tests all transfer. A second bespoke public write path would
be a second thing to get right.

**It avoids writing `auth.users` by hand.** GoTrue owns that table, and
inserting into it directly is how sign-in breaks. Letting the administrator
create their own account and then attaching them sidesteps it entirely.

## Consequences

- **There is no self-service sign-up, deliberately**, and the marketing site
  must never be able to create a tenant. Its job is explain, qualify,
  capture — writing to a prospect record outside the club-scoped world, or
  to nothing at all.
- **The owner remains a single point of failure** for onboarding. That is
  correct at this stage and should be revisited if the business ever has
  resellers or federation-level partners.
- **A revoked or expired link must fail identically to an unknown one**, for
  the same reason BR73 gives: distinguishing them tells a prober which
  guesses were close.
- **The link is a credential.** Stored as a hash, shown once, and treated
  the way BR73 treats a registration token.
- **Central super-administration stays unbuilt**, and remains a P5 exception
  requiring its own decision record if it is ever built.

## Not yet built

Nothing here is implemented. Provisioning is still the hand-run sequence in
the [annex](../annexes/tenant-provisioning.md), which is the right amount of
machinery for one club. This decision records the shape so the next club is
not an excuse to invent a different one.
