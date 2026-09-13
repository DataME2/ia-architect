# Decision 13 — Erasure is all or nothing, and a refusal names its basis

_[← Decisions](./README.md) · [Enterprise architecture](../ea/README.md)_

**Status:** Accepted (September 2026). **Built** — migration 0031,
[scope 37](../scope/37_forgetting_and_the_reasons_not_to.md) WP2.

## The question

BR49: a data subject or their guardian may request erasure, and the request
is honoured unless a named lawful basis requires retention.

A club holds a child's registration, their consents, their documents, and
the payments the family made. Some of that a statutory minimum requires the
club to keep. What does "erase" do to the rest?

## The tempting answer, and why it is refused

**Redact in place.** Keep the rows a lawful basis requires — the payments,
the eligibility record — and blank the identifying columns: names to
`Erased`, email to null, photograph gone. The family gets most of what they
asked for, the club keeps its books, and nobody has to say no.

It is the wrong answer for three reasons, and the third is the one that
settles it.

**It is not erasure, and calling it erasure is the problem.** A redacted
`person` row still joins to a registration, a team, a fixture and a payment
schedule. Anyone holding a team sheet from that season re-identifies the
row in about a minute. Telling a parent their child's data is erased when
it is pseudonymised at best is a claim the platform cannot support.

**It makes every other rule conditional.** BR55 requires a legal name;
BR1 requires a guardian; BR2 counts documents. A half-erased Person is a
Person every one of those rules now has to special-case, and the first one
that forgets produces a validation failure nobody can explain, on a record
nobody can look at.

**And it hides the refusal.** The parent asked a question — *will you
delete my child's data?* — and partial redaction answers it with a shrug.
BR49's actual requirement is not that erasure always succeeds. It is that
the answer is **honoured, or refused with a named basis**, and a refusal
someone can read is a better outcome than a deletion they cannot verify.

## The decision

**Two outcomes, and no third.**

- **No binding basis** → the `person` row is deleted, and the schema's
  existing `on delete cascade` takes its registrations, roles, consents,
  documents and guardianships with it. Nothing is left behind to
  re-identify.
- **Any binding basis** → nothing is deleted, and the request is recorded
  as refused, **naming every basis that bound it** with the date each
  expires. The family is told which, in words, and when it will lapse.

A basis is a row in `retention_basis` — statutory financial minimum, child
safety, an active eligibility record, life membership (BR70, which never
expires). `erasureVerdict()` is a pure function over those rows, so the
refusal is explainable rather than emergent.

**A refused request is not the end of it.** The bases carry expiry dates,
so the same request becomes honourable later, and the record says when.
That is what makes "no, until 2033" an honest answer rather than a
brush-off.

## What this costs, stated honestly

**Some families will be told no**, where a redaction would have let the
club say yes. That is the cost, and it is the point: the answer is true.

**A cascade delete is unrecoverable.** There is no tombstone, by design — a
tombstone that identified the erased Person would defeat the erasure. What
survives is the `erasure_request` row, which records *that* a person was
erased and by whose authority, and **carries no personal data of theirs**
(BR132). A club that erases the wrong Person restores from backup or not at
all, which is why the screen names the person and what will go, and why the
act is a person's and not a schedule's ([decision 14](./14_retention_proposes_a_person_disposes.md)).

**The duplicate tombstone pattern is deliberately not reused.** BR82 keeps
the non-surviving Person of a merge, pointing at the survivor, because that
merge is a correction and the pointer is the correction's record. An
erasure is the opposite intent, and the same mechanism would undo it.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Redact identifying columns, keep the rows | Not erasure; re-identifiable from any team sheet; special-cases every rule |
| Delete and keep a tombstone | A tombstone that identifies the erased Person defeats the erasure |
| Delete what is unbound, keep what is bound | The bound rows reference the Person, so deleting the Person is exactly what a basis forbids — this is redaction wearing a different hat |
| Always honour, and let the club worry about its statutory minimums | Puts the club in breach to make the platform look agreeable |
