# Decision 6 — Public registration writes through a scoped database function, not a service-role key

_[← Decisions](./README.md) · [EA home](../ea/README.md)_

**Status:** adopted, August 2026.
**Realised by:** `supabase/migrations/0005_registration_invitations.sql`,
`src/app/join/`, `src/data/invitations.ts`.

## The problem

A family is not a tenant user. Every Row-Level Security policy in this
schema keys off `auth.uid()` resolving to a `club_membership` row, so an
anonymous guardian following a registration link has no policy that would
let them insert anything — and requiring them to create an account first
reproduces the barrier the whole slice exists to remove (BR55, Goal G6:
*does it reduce the number of times a parent types their child's details?*).

Something has to let an unauthenticated caller write into exactly one club.
The question is what.

## Options considered

| Option | Why not |
| ------ | ------- |
| **Make the family an authenticated user** | Correct in the long run for a family portal, and wrong here: it puts an account-creation step in front of the one flow whose measured problem is that families abandon it partway. It also creates an identity per guardian for a form most will complete once |
| **Insert with the service-role key from a server action** | The tempting shortcut, and the dangerous one. That key bypasses RLS **for every club at once**, so a bug in one route handler — a `club_id` taken from the request body, a missing filter — is a cross-tenant write with nothing beneath it to catch the mistake. It would make P5 depend on application code being correct, which is precisely the property the stack was chosen to avoid |
| **A permissive `anon` insert policy on `person`/`registration`** | Would let *any* anonymous caller insert into *any* club, since a policy cannot see which link the caller followed. Strictly worse than the service-role option, because it is permanently open rather than open only where the code is wrong |
| **A `security definer` function scoped by an invitation token** *(adopted)* | The bypass exists in exactly one place, is auditable in the migration, and cannot be pointed at another club: the `club_id` written comes from the invitation row the token resolves to, never from the caller |

## The decision

**One `security definer` function, `submit_public_registration`, is the
entire public write surface.** It takes an opaque token, resolves it to a
`registration_invitation` row, and inserts the person, guardianship,
consents and registration against **that row's** `club_id` and `season_id`.
The caller supplies field values; it does not supply the tenant.

Four properties make that safe enough to publish:

1. **The tenant is not an argument.** There is no parameter a caller could
   set to reach another club. The worst a stolen token achieves is a junk
   registration in the club that issued it — recoverable, and visible to the
   registrar who has to approve it anyway.
2. **It writes and never reads.** The function returns an identifier and
   nothing else. `anon` holds no `select` grant on any table, so there is no
   cross-tenant *visibility* here at all, which is why this is not an
   exception to Principle P5 in the way P6 is.
3. **`search_path` is pinned.** A `security definer` function that resolves
   unqualified names through the caller's `search_path` is a well-known
   privilege-escalation route; this one sets it explicitly.
4. **It enforces the rules it is the boundary for.** BR1's guardian
   requirement and BR48's collection notice are checked *in the function*,
   not only in the form. The form's checks are a courtesy to the family; an
   anonymous caller can skip the form entirely.

## What it costs

- **A `security definer` function is a standing RLS bypass**, and reviewing
  it is not the same as reviewing ordinary code. It is deliberately small,
  and `supabase/tests/12_public_registration.sql` asserts behaviourally that
  it refuses a revoked, expired or unknown token and cannot be aimed at
  another club.
- **Anyone with the link can submit.** That is what "no account" means. The
  mitigations are expiry, revocation, a recorded use count, and the fact
  that every submission lands in a queue a human works through — not
  secrecy.
- **No rate limiting yet.** A leaked link can be submitted through
  repeatedly, which is a nuisance rather than a breach, but it is unbuilt
  and recorded as a gap in
  [scope document 19](../scope/19_tokenised-family-link.md).

## What would change it

An answer to [#42](../scope/open-questions.md) — Squadi supporting
club-side assisted submission — would make the family's destination the
federation's own confirmation step rather than this form, and the
invitation would carry them there instead. The function stays either way;
what changes is what happens after it returns.
