# Decision 12 — An unsubscribe link is derived, not stored

_[← Decisions](./README.md) · [Enterprise architecture](../ea/README.md)_

**Status:** Accepted (September 2026). **Built** — migration 0030,
[scope 36](../scope/36_the_platform_learns_to_send_and_to_stop.md) WP1.

## The question

BR128 requires that **every** message carries a link letting the recipient
withdraw consent without holding an account. The link must work from a
message sent a year ago, must be unguessable, and must be revocable.

Where does the token behind that link live?

## The tempting answer, and why it is refused

The repository already has a token pattern, and it is emphatic:
[BR73](../ea/2_business/5_domain-context-and-rules.md) stores a
registration invitation's token **as a hash only**, displays it once at
issue, and cannot recover it afterwards — which is why there is a *reissue*
button and no *show the link* button ([decision 6](./6_public-registration-through-a-scoped-function.md)).

Applying that pattern here breaks the requirement outright. If only the hash
is stored, the plaintext exists for exactly one message. Every subsequent
message needs a **new** token, which means either every older message's
unsubscribe link is dead, or the table accumulates one live token per
message ever sent.

Both fail BR128. A dead unsubscribe link in a marketing email is not a
technicality — it is the exact failure the requirement exists to prevent,
and the person hitting it has no account to fall back on.

**Storing the plaintext is the other tempting answer**, and it is worse than
it looks. The token is weak in what it grants — anyone holding it can stop
email to one address, which is low harm and reversible. The real exposure is
the table itself: a plaintext token column beside an email address is an
**enumerable list of every address the platform has ever contacted**, which
is a more attractive target than anything the token unlocks.

## The decision

**Derive the token rather than store it.** Each subscriber row carries a
random, non-secret `unsubscribe_salt`. The token is

```
token = base64url( HMAC-SHA256( MESSAGING_UNSUBSCRIBE_SECRET, salt ) )
```

and the link is `/unsubscribe/<row id>.<token>`.

The row **also** stores `sha256(token)`. That pair is what makes the scheme
work in this architecture: the *application* re-derives the token from the
salt whenever it composes a message, and the *database* verifies a presented
token against the stored hash — exactly as `submit_public_registration`
verifies an invitation (BR73) — so the unsubscribe is a narrow
`security definer` function reached by `anon`, and **the secret never enters
the database**. Neither stored value is useful without it: a salt derives
nothing, and a hash confirms only a token you already hold.

This gives all four properties at once:

- **Durable** — the same salt derives the same token forever, so a link in a
  year-old message still works.
- **Unguessable** — without the server secret, the stored salt yields
  nothing.
- **Revocable** — rotating the row's salt invalidates every previously
  issued link immediately, which is the BR73 property that mattered.
- **Not enumerable at rest** — the database holds a salt and a hash, neither
  of which is a credential. A dump grants nothing without the secret, which
  lives only in the server's environment alongside the service-role key.
- **No new bypass** — verification is a `security definer` function granted
  to `anon`, the shape this repository already uses for its one public
  write. Unsubscribing needed no addition to `RlsBypassReason`.

## What this costs, stated honestly

**A new secret to manage.** `MESSAGING_UNSUBSCRIBE_SECRET` joins
`SUPABASE_SERVICE_ROLE_KEY` as a server-scoped variable that must be set per
environment and must never reach the browser bundle. Losing it is not
catastrophic — it invalidates outstanding links, and the next message
carries working ones — but rotating it silently breaks every link already
in someone's inbox, so it is rotated deliberately or not at all.

**The code fails closed without it.** A send attempted with no secret
configured raises rather than sending a message with a broken or absent
unsubscribe link. A message nobody can escape from is worse than a message
not sent.

## What it does not change

BR73's pattern stands where it belongs. A registration invitation authorises
**writing into a club's tenant**, is issued deliberately by an officer, and
is meant to be short-lived — hash-only and reissue-not-reveal is right for
it. This token authorises one thing, for one address, in the recipient's own
favour. Different exposure, different answer; the precedent is not being
overturned so much as bounded.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Hash only, fresh token per message (BR73's pattern) | Older messages' links die — fails BR128 |
| Hash only, one live row per message sent | Unbounded growth, and still a plaintext token in flight for each |
| Plaintext token column | Turns the table into an enumerable contact list; the stored value *is* the credential |
| Signed JWT in the URL, nothing stored | Cannot be revoked without a denylist, which is the stored row again — and puts the recipient's identity in a token anyone can decode |
| Require an account to unsubscribe | Fails BR128 outright, and asks someone to join the thing they are leaving |
