# Decision 15 — The competition catalogue is shared reference data, not a club's own

_[← Decisions](./README.md) · [Enterprise architecture](../ea/README.md)_

**Status:** Accepted (September 2026). **Built** — migration 0032,
[scope 38](../scope/38_the_catalogue_that_makes_br8_computable.md) WP1.

## The question

C11 needs each association's competitions — tier, playing format, and the
**minimum official classification** BR8 compares against. Every table in
this schema carries a `club_id` and every policy keys off it, because that
is how P5 is enforced.

Does the catalogue?

## The tempting answer, and why it is refused

**Give it a `club_id` like everything else.** It costs nothing to write, it
needs no exemption from `check_rls.py`, and it keeps the rule that has held
for thirty-one migrations: every table is tenant-scoped.

It is refused because of what it would mean in practice.

**Forty clubs re-key the same list.** Football Queensland publishes its
competitions once. Under per-club copies, every affiliated club types them
in again — which is precisely the pain
[the motivation document](../ea/1_strategy/1_motivation.md) names as an
association's concern: *"rather than each club re-keying the same reference
data"*. Building the fix for that pain in a shape that reproduces it is a
poor trade.

**And the copies disagree.** This is the part that settles it. BR8 refuses
a designation where the referee's classification is below the competition's
minimum. If the minimum is a per-club value, then the same fixture in the
same competition is **eligible at one club and refused at another**, because
two registrars typed different numbers. A rule whose answer depends on who
typed the reference data is not a rule; it is a local custom with a rule's
error message.

## The decision

**The catalogue is shared reference data.** `association`,
`classification_level` and `competition` carry no `club_id` and no
`person_id`. They are readable by every authenticated club and written only
by platform administration.

Which competitions a club actually plays in **is** the club's own business,
so `club_competition` is an ordinary tenant-scoped row with an ordinary
policy.

**This does not weaken P5**, and the reason is structural rather than
argued. P5 says one club's data is never visible to another. The catalogue
is not a club's data: it is an external association's published material,
and the tables have **no column that could carry any** — no person, no
club, no registration, no money. There is nothing tenant-scoped in them to
leak, which is the same instinct as the carnival design's public fixture
table carrying no `person_id` column at all: the safety property lives in
the shape of the table rather than in remembering to filter it.

It is also narrower than [P6](../ea/1_strategy/1_motivation.md), the
exception this project has already accepted. P6 makes published event data
visible to **unauthenticated** visitors. This is visible only to signed-in
members of some club.

**Written by platform administration** is consistent with
[decision 9](./9_platform_administration_provisions_but_never_reads.md)
rather than a stretch of it. That decision draws the line at *tenant
contents*: provisioning creates the container and never reads inside one.
Maintaining shared reference material is not reading inside one either.

## What this costs, stated honestly

**Three entries in `check_rls.py`'s exemption list**, and that list carries
a warning written before this decision existed: *"Keep this empty if at all
possible: every entry is a table whose isolation has to be reasoned about by
hand, which is exactly what this check exists to avoid."* This decision
triples it, from three tables to six.

The mitigation is that the reasoning is short and checkable: **the table has
no tenant column because it has no tenant data, and it has no column that
could hold any.** RLS is still enabled and a read policy still exists — it
is `using (true)` for `authenticated` rather than club-keyed, and writes are
refused to everyone but a platform administrator. A reader can verify the
claim by reading twelve lines of `create table`.

**A club cannot correct the catalogue.** If Football Queensland renames a
competition, the club waits for the platform owner. That is a real
operational cost and the right side to err on: a club editing shared data
is how the copies start disagreeing again.

**And the catalogue will be wrong before it is right.** Nobody has
catalogued the Football Queensland pathway — `referee_classification.level`
has been free text since it was written for exactly that reason. Shipping
an empty catalogue that a platform administrator fills in is honest; seeding
it with levels somebody guessed would refuse the real ones, which is the
trap that comment already warns about.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| `club_id` on every catalogue table | Forty clubs re-key one list, and BR8's answer starts depending on who typed it |
| Global catalogue, writable by any club admin | The copies stop disagreeing and start overwriting each other instead |
| An association as a tenant, owning its own catalogue | The association tier P5 forbids today ([#31](../scope/open-questions.md)). A much larger change, and this decision does not foreclose it — the catalogue simply gains an owner later |
| Keep free text, sort it out when an association is a customer | Leaves BR8 uncomputable indefinitely, which is the rule this whole phase exists to make real |
