# Decision 14 — Retention proposes; a person disposes

_[← Decisions](./README.md) · [Enterprise architecture](../ea/README.md)_

**Status:** Accepted (September 2026). **Built** — migration 0031,
[scope 37](../scope/37_forgetting_and_the_reasons_not_to.md) WP3.

## The question

BR40: retention follows participation status, not a single clock. A Person
still active in football is kept at least ten years; one who has stopped
fades toward disposal; a deceased Life Member is kept forever (BR70).

Something has to act on that. What?

## The tempting answer, and why it is refused

**A nightly job that deletes what is past its period.** It is the obvious
shape, it is what "retention policy" means in most systems, and the
platform already has a bypass reason for exactly this kind of work —
`createAdminClient('scheduled-job')` was enumerated for BR50, BR51 and
BR67 before any of them existed.

It is refused because of what the rows are.

**These are children's records, and the failure mode is silent.** A
retention job is a predicate over participation. Get the predicate wrong —
a season boundary off by one, a role query that misses a player who moved
clubs, a life-member flag that was never set — and the job deletes records
that should have been kept. Nobody notices, because noticing would require
the thing that is gone. A club discovers it at the moment it needs its own
history, years later, with no way back.

Compare that with the cost of being wrong in the other direction: a record
is kept a few months longer than necessary, and a person on a screen says
"yes, dispose of these." One of those is recoverable.

**It is the same instinct as P3.** The platform's founding principle about
automation is that deterministic machinery may evaluate, draft, classify
and flag — and that a human makes the decision that has effect. That
principle was written about an AI assistant approving documents. A
scheduled job deleting a child's record is the same shape wearing different
clothes, and exempting it because it is "just a cron" would be exempting it
because it is less visible, not because it is less consequential.

## The decision

**The schedule computes and flags. A person disposes** (BR133).

The job evaluates each Person's retention state — active, lapsed, life
member, deceased life member — and writes what it found. What it never does
is delete. Records past their retention period appear on a club screen as a
proposal, with the state that put them there, and disposal is an act by a
club officer that writes an audit event.

The same job carries the two transfers that *are* safe to automate, because
neither destroys anything:

- **Authority at eighteen** (BR67): `is_authority` goes false on the
  birthday, `is_contact` does not. Recorded as an audit event.
- **Life member contact review** (BR71): a living life member whose details
  have not been reconfirmed within the configured period is flagged.

## What this costs, stated honestly

**Nothing is disposed of until somebody does it**, so a club that never
looks at the screen retains everything forever. That is a real failure mode
and the better one: over-retention is a compliance question a club can
answer and act on, and it leaves the evidence needed to answer it.

**It needs a screen and a habit**, where a cron would have needed neither.
The screen is cheap. The habit is the club's, and the platform's job is to
make the list short and the reason for each row obvious rather than to act
on the club's behalf.

**A deceased Life Member is never proposed at all.** BR70 overrides the
participation clock outright, so those rows never reach the list — their
absence from it is the rule working, not a gap in it.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Nightly job deletes what is past its period | A wrong predicate destroys a club's history and leaves nothing to notice it by |
| Job deletes, with a grace period and a warning email | Better, and still ends in an unattended delete — the grace period only moves when the silent failure happens |
| No retention machinery at all; the club deletes by hand | BR40 becomes aspirational, and nobody can answer what is past its period |
| Job flags, and disposal is automatic once flagged for N days | The human step becomes a timeout, which is a delete with extra steps |
