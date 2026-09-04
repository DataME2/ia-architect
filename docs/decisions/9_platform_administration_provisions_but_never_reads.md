# Decision 9 — Platform administration provisions tenants and never reads inside one

_[← Decisions](./README.md) · [Enterprise architecture](../ea/README.md)_

**Status:** Accepted (September 2026)
**Realises:** C10 (multitenant platform operations), P5 (strict tenant isolation)

## The question

The platform owner needs to create clubs. Today that is four hand-typed SQL
statements run with Row-Level Security bypassed
([annex](../annexes/tenant-provisioning.md)), which is the right amount of
machinery for one club and does not survive ten.

[Scope 28 §2](../scope/28_onboarding-a-club-and-its-history.md) said this
needed its own decision record before any code, because a platform
administrator sounded like a cross-tenant reader — and this project has
granted exactly one P5 exception deliberately
([decision 3](./3_public-event-data-crosses-tenant-isolation.md)).

## The distinction that settles it

**Creating a tenant requires no ability to read inside one.**
[Decision 7](./7_tenant-provisioning-by-owner-issued-invitation.md) already
noted this in passing; it is the whole answer here. A console that creates
clubs, opens their first season and attaches their first administrator
touches `club`, `season` and `club_membership` — and needs nothing from
`person`, `registration`, `payment`, `consent`, `clearance` or
`audit_event`.

So the exception can be drawn far narrower than "super-admin":

| | Platform administration |
| --- | --- |
| Create a club, its first season, its first admin | **Yes** |
| List clubs — name, jurisdiction, when created, whether provisioned | **Yes**, and this is the only cross-tenant *read* |
| Read any club's people, registrations, money, consents, cards, audit log | **No, ever** |

**That second row is the exception**, and it is worth naming rather than
waving through: reading a list of club names is reading across tenants.
It is metadata about the platform's own customers, held by the party that
contracted with them, and it contains no personal data and no child's
record. The third row is where P5 stays absolute.

## The decision

**A platform administrator may provision tenants and read tenant metadata.
It may never read tenant contents. It is a separate identity holding no
`club_membership`, and it is enumerated in the database rather than
inferred.**

Three mechanisms, each doing one job.

**A `platform_admin` table.** Membership of it is the authorisation, and
nothing can write to it through the API — no policy permits it, so adding a
platform administrator is a deliberate act by the database owner, exactly
like the bootstrap it replaces. The allowlist is data, not a hardcoded
email, so revoking access is a `delete` rather than a deploy.

**`security definer` functions that check it.** Provisioning runs with RLS
bypassed because it must — `club` denies every write unconditionally and the
first `club_membership` cannot be created by anyone. Each function verifies
the caller is a platform administrator before doing anything, and the checks
are in the database, so a mistake in a page cannot reach them.

**No membership, deliberately.** If platform administration were attached to
an account that also held `club_membership` rows, nobody reviewing that
account could tell which of its powers came from being a club admin and
which from being the platform. Separate identity, and the console refuses an
account that holds any membership.

## Why the console is a route in the same application

Not a second deployment, and not an unguessable URL.

**Obscurity is not the control.** A path nobody has published is still a
path, and treating it as a boundary means the day it leaks is the day the
boundary is gone. Authorisation is the boundary: the functions check
`platform_admin` and refuse everyone else, whether or not they found the
page.

**It answers "not found" rather than "forbidden"** to everyone else, which
is a courtesy on top of the control rather than a substitute for it — there
is no reason to confirm the route exists to someone who may not use it.

**A second deployment would buy a second thing to keep in step** — its own
build, its own environment variables, its own copy of the data layer — to
protect a boundary the database is already enforcing.

## Consequences

- **It cannot create accounts, and does not need to.** Writing `auth.users`
  needs the Auth admin API and the service-role key, which no page may hold.
  **Amended September 2026**, because the first version of this made the
  owner the bottleneck it was meant to remove: the console recorded a
  responsible person it could not attach, and somebody had to come back
  later and provision again.

  The club's responsible people are now recorded as **pending grants**
  (`club_contact`, BR94) and emailed a sign-in link by Supabase itself — an
  ordinary magic-link sign-up on the **anon key**, so no elevated credential
  enters the application. Their membership comes into existence when they
  use the link (`claim_club_access`, BR95). The separation decision 7 draws
  is unchanged and now complete: the owner authorises, the person arrives,
  and nobody types anything twice.
- **Provisioning becomes idempotent and atomic**, replacing four hand-typed
  statements where the failure mode was a half-created tenant.
- **The allowlist holds one account**, `jsuarez@datamanagementengineer.com`,
  added September 2026 and holding no club membership — which is what keeps
  every ordinary policy denying it.
- **Every provisioning action is audited into the club it created**, so a
  club can see how it came to exist.
- **This does not deliver decision 7's onboarding link.** That remains the
  answer when clubs provision themselves; this is the owner doing it
  directly, which is what the owner asked for.

## What would change this

If the platform ever needs to answer "how many registrations does each club
have?" for billing or support, that is a **second** exception and needs its
own decision — aggregate counts across tenants are not metadata about
customers, they are a summary of tenant contents. The narrowness here is
deliberate so the next widening has to be argued rather than assumed.
