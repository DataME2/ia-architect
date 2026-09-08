# Decision 10 — An account's identity is asserted by an administrator, never inferred from an email address

_[← Decisions](./README.md) · [Enterprise architecture](../ea/README.md)_

**Status:** Accepted (September 2026)

## The question

The platform cannot say who is signed in. `club_membership` binds an
`auth.users` id to a club and a role; nothing binds it to a `person`. So the
session strip can show a club and a role but never a name, the audit log
records a uuid that resolves to nothing a club would recognise, and a
committee member cannot be shown *their* governance record because the
system does not know which committee member they are. This is the one place
Principle **P1** — one Person, many roles — is not honoured: a club officer
is two unrelated records.

Closing it needs one thing settled first. **How does the platform learn that
this account is that Person?**

## The tempting answer, and why it is refused

Both records hold an email address. `person.email` is on the registration
form; `auth.users.email` is what somebody signed in with. Matching them
would close the gap in a single statement, with no screen, no migration
beyond a view, and no work for any club.

It is also wrong, and wrong in a way that fails silently.

**An email address is a routing detail, not proof of identity.** In a
football club specifically:

- **Families share an inbox.** One address covers two parents and three
  children, and `person.email` is set on each of them. A match is
  ambiguous, and whichever row the query returns first wins.
- **Club addresses outlive their holders.** `secretary@club.org.au` has
  belonged to three secretaries. The account signing in is whoever holds it
  now; the `person` row it matches may be the one who left in 2023.
- **`person.email` is typed by a registrar** from a form a parent filled in.
  It is not verified, and nothing stops it being anybody's address.

So inferring identity from a match means: anybody who registers with the
club secretary's address is recognised by the platform as the club
secretary. That is the same shape as the failure
[decision 9](./9_platform_administration_provisions_but_never_reads.md)'s
tests already catch — *a stranger claimed a club by naming its contact
address* — arriving through a different door. `claim_club_access()` is
allowed to use an email address because what it grants is **access the club
already recorded** for that address, and a club administrator chose it. What
is at stake here is different: not what an account may reach, but **who the
platform will say it is**, in an audit log written to answer that question
after something went wrong.

## The decision

**An account is linked to a Person by an administrator of that club, or it
is not linked at all** (BR107). The link is a recorded assertion by someone
accountable, not a computed match.

Three consequences, all deliberate:

**The link is its own table, `account_person`, not a column.** The obvious
home is `club_membership` — and it is unique on `(club_id, user_id, role)`,
so an account holding both `admin` and `registrar` is two rows. A
`person_id` column would be stored twice and could disagree with itself, and
revoking one role would silently drop half the link. What is being recorded
is one fact per account per club, so it gets a table whose uniqueness says
that — **in both directions** (BR106). The reverse direction is the one
nobody looks for: without it, two accounts both claim to be the treasurer,
and revoking one leaves the other.

**A composite foreign key, not a trigger.** `person` is tenant-scoped, so a
link must not reach a Person at another club. `foreign key (club_id,
person_id) references person (club_id, id)` makes that a constraint the
database enforces, rather than a check three screens must remember. It is
the cheaper half of the pattern `assert_appearance_is_coherent()` needed a
trigger for, because only two tables are involved.

**Unlinked is displayed as unlinked** (BR108). No falling back to an email
address when the link is missing. A screen that quietly shows `h.bell@…`
where a name should be makes an unlinked account look linked, and the gap
becomes invisible again — which is exactly how it survived until
[scope 29](../scope/29_actors-access-and-permissions.md) went looking for
it.

## What this does not decide

**Self-service linking is not ruled out forever, only ruled out now.** A
person proving their own identity — by following a link sent to an address a
registrar recorded, in the shape of decision 7 — is a defensible future
mechanism, because it is *possession of the inbox at this moment* rather
than *a string matching a string*. It needs the platform to send email,
which it cannot yet do at all, so it is not on the table.

**Nothing about permissions changes.** The link says who an account is. It
does not say what they may do — that stays with `club_membership` and the
policies. In particular, being linked to a Person who holds a
`committee_position` grants nothing; whether it should is
[#59](../scope/open-questions.md).

## Consequences

- The session strip, the access screen and the audit log can name a person.
  The access screen listing `h.bell@…` was the complaint that raised this.
- **Most accounts will be unlinked for a while**, because linking is manual
  and nobody has done it yet. The screens must read well in that state,
  which is what BR108 is for.
- A club that never links anybody is no worse off than today. Nothing
  depends on the link existing.
- The audit log gains nothing retrospectively. Events already written hold a
  uuid, and the link resolves it *now* — which is enough, because the uuid
  is stable.

## What would change this

The platform gaining the ability to send email, which makes a
prove-your-own-address flow buildable and would move linking from an
administrator's chore to a self-service step at first sign-in. The rule that
would survive that change is BR107's second half: **never inferred from a
matching address**. Possession of an inbox is evidence; a string comparison
is not.
