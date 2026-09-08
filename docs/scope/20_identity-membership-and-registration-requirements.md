# Project Scope — Identity, Membership, and What a Registration Requires

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/identity-and-registration`.

Two capabilities that the MVP slice ([scope 17](./17_mvp-registration-slice.md))
carried in the schema but never surfaced: **C1 — Identity & role
management**, and the requirements half of **C2 — Player registration
management**. Building them turned up a defect in the running system, and
that defect is the reason this document exists rather than a commit message.

## The silent pass

**BR2 — "a registration cannot be COMPLETE with a required document
missing" — has passed on every registration ever made, and could not have
failed.** The rule compares a registration's *required* document types
against its *provided* ones, and both come from `registration_document`
rows. Nothing in the system ever created one. Empty minus empty is empty,
so the rule reported **pass**, and the registrar's queue reported the
document check as done.

A safeguarding rule that cannot fail is worse than an absent one. An absent
check is a known gap; a check that always passes is a gap the screen
actively denies. **BR3** was vacuous for the same reason —
`outstanding_amount_cents` defaulted to zero and nothing ever set it.

The cause is not in the rules, which are correct, or in the screens, which
render them faithfully. It is that a registration was created without the
thing the rule is about. So the fix goes where registrations are created,
not into each screen that reads one.

## The invisible principle

The same shape of gap, one table over. **`person_role` has had a table,
policies and a check constraint since migration 0001, and no code at all.**
Principle **P1** — a player, referee, coach, guardian and committee member
are roles a `Person` holds, never separate identities — was true in the
schema and unrepresented in the running system.

It showed most clearly in what the registrar could see. The queue lists
*registrations*, so a guardian created by a family's public submission
appeared nowhere: they existed only as the far end of a foreign key, with
no screen that would ever render them. A parent who also coaches looked
like nothing at all, because neither role was recorded.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No change. This *implements* **C1** and completes **C2**, both of which have existed since [scope 1](./1_bootstrap-strategy-and-business-architecture.md). Principle **P1** gains its first representation in running software; **P5** is unchanged and re-proved |
| 2_business | **No new business rule.** BR2, BR3 and BR55 are implemented as written — the change is that they can now fail. That the initiative adds no rule is the point: what was missing was never a requirement, it was the data the requirements were about |
| 3_information | **`season`** gains `required_document_types` and `registration_fee_cents` — the club's per-season registration configuration. In [1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 4_application | New components: the people directory, season requirements screen, document and fee handling on the registration detail, and a fourth behavioural SQL suite. In [2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology | No change. Same stack, same deployment |

No decision record. Both changes implement decisions already recorded — P1
in [scope 17](./17_mvp-registration-slice.md)'s P1/P5 resolution, and the
public write surface in
[decision 6](../decisions/6_public-registration-through-a-scoped-function.md).
Where a genuine choice was made (see *Gap notes*) it is small enough to
live in the migration's own comment.

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | BR2 and BR3 reported pass on every registration, because nothing gave them anything to check. `person_role` was unwritten and unread. A guardian was invisible to every screen. A season had no notion of what it required or what it cost |
| **Target** (delivered) | A season carries its checklist and its fee; both are stamped onto a registration when it is created, so BR2 and BR3 can fail. A registrar has a directory of people, sees a Person's roles across the season, and grants or revokes them. Proved across 15 further behavioural scenarios — 53 in total |

## Work packages and deliverables

### WP1 — Season configuration and the fix at source *(done)*

- **Deliverables:**
  `supabase/migrations/0006_season_requirements_and_roles.sql` — two
  columns on `season`, a derived backfill of `person_role` from the
  registrations and guardianships that already exist, and a replacement of
  `submit_public_registration` that stamps the checklist, the fee, and the
  player and guardian roles onto every new registration.
- **Outcome:** BR2 and BR3 have something to check, and P1 is written at
  the moment identity is created rather than by a later screen nobody
  remembers to visit.

### WP2 — The people directory *(done)*

- **Deliverables:** `src/web/people-view.ts` (pure: ordering, search, role
  ordering, counts, the unknown-date-of-birth sentinel),
  `src/app/registrar/people/`, and `loadPeople` / `setSeasonRole` in
  `src/data/queries.ts`.
- **Outcome:** one row per human, with the roles they hold this season and
  the people they are responsible for in both directions. A parent who
  coaches is one row with two roles.

### WP3 — Requirements and fees on the screens *(done)*

- **Deliverables:** `src/app/registrar/season/` (the checklist and fee),
  document receipt and the fee balance on the registration detail,
  `src/web/money.ts`, and `applySeasonChecklist` for registrations created
  before a checklist existed.
- **Outcome:** the registrar can satisfy BR2 and BR3 rather than only
  reading their verdict.

### WP4 — Proof *(done)*

- **Deliverables:** `supabase/tests/13_requirements_and_roles.sql` — 15
  scenarios; 26 further unit tests across `people-view` and `money`.
- **Outcome:** verified to fail. With the checklist loop, the fee and the
  player role removed from the migration, the suite reports *expected 2
  required documents from the season checklist, found 0 — BR2 would pass
  vacuously*, and three further failures. A test for a silent bug that has
  not itself been made to fail is not evidence.

## In scope / out of scope

**In scope:** season-level document requirements and fee; the checklist and
roles written at registration; the people directory with role grant and
revoke; marking a document received; recording an outstanding balance.

**Out of scope:** document *upload* (the file into Storage — the rows here
record what is required and what arrived, not the artefact); payment
records, plans, instalments and reconciliation, which are **C3** and want
their own ledger; club staff administration (`club_membership` still has no
screen, so a second registrar is added by hand); life members
([scope 18](./18_life-members.md), still aligned-but-unbuilt); and the
cross-club identity question, which remains where
[scope 17](./17_mvp-registration-slice.md) left it — in BR44's matching and
C14.

## Gap notes

**Existing registrations were deliberately not backfilled with a
checklist.** They keep the requirements they were created with, which is
none. Giving them the new checklist by migration would turn families'
completed registrations into blocked ones overnight, on a requirement they
were never told about — so it is a registrar's explicit, audited act from
the registration's own page. The cost is honest and visible: BR2 stays
vacuous for those rows until someone applies the checklist, and the screen
says so in those words.

**Roles, unlike the checklist, were backfilled** — because they are derived
rather than invented. Every existing registration implies a player role and
every guardianship a guardian role; the migration writes exactly that and
nothing more.

**The fee is set, not paid down.** The registration detail sets the
outstanding balance outright rather than recording a payment against it.
This slice holds no payment records, and building a ledger out of a text
box would be a worse lie than not having one. The audit event carries the
before and the after, which is the honest version of the same history until
C3 exists.

**A guardian created through the public form has no date of birth**, and
the function records `1900-01-01`. The directory recognises the sentinel
and shows *not recorded*: telling a registrar that a parent is 126 is worse
than telling them nothing. It is a placeholder standing in for an absent
value, and it should become a nullable column when something other than
this one screen depends on it.

## Open questions

None raised. The initiative implements existing rules and adds none.

The nearest live question it touches is
[#32](./open-questions.md) — decomposing the registration delay. It moves
slightly closer to answerable: BR2 and BR3 failures now enter
`validation_result` as real events rather than never occurring, so the
blocker summary on the registrar's queue will, from this point forward,
count document and payment delay instead of silently reporting neither.
