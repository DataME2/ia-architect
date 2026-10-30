# Decision 18 — A minor official's messages are between adults

_[← Decisions](./README.md) · [scope 126](../scope/126_match_officials_on_the_board.md)_

**Status:** Accepted (October 2026). Planned, not built.

## Context

[Scope 126](../scope/126_match_officials_on_the_board.md) adds direct
messages between a club's referee coordinators and its match officials. Some
officials are children: a referee can start at 13 or 14, and an under-13
official's matches are already confirmed by a guardian (BR63). The club has no
safeguarding policy on electronic communication with children yet (open
question 111), and a private channel between an adult and a child is the
thing such policies exist to govern.

## Decision

On 30 October 2026 the product owner answered: messages are between adults
only, when the official is a minor.

1. **An adult official is messaged directly.** The thread is between the
   official and the club's coordinators and admin, and nobody else reads it.
2. **A minor official is never a party to a thread.** For an official under
   18 on the day a message is sent, the thread is between the coordinators
   and the official's guardians (the guardians recorded for them, BR63's
   people). The official is not sent the message and cannot write in the
   thread.
3. **Age is decided when the message is sent, not when the thread opens.**
   On an official's eighteenth birthday new messages reach them directly, and
   the guardians' earlier thread stays with the guardians.
4. **The rule lives in the database.** The RLS that lets a person read or
   write a thread checks the official's date of birth against the message's
   date, so a screen cannot get it wrong.

## Consequences

- A coordinator arranging a minor's match talks to a parent, as they already
  do for availability and confirmations.
- The club's safeguarding policy (question 111) can still narrow this, for
  example by copying a second club official into every guardian thread. It
  cannot widen it to a direct channel with a child without a new decision.
