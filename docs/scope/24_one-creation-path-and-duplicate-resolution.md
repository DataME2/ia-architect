# Project Scope — One Creation Path, and Resolving a Duplicated Human

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/identity-and-registration`.

Found by looking at the pilot club's live data after applying migration
0008, rather than by anyone reporting it.

## Two implementations of one process

Every rule added since [scope 20](./20_identity-membership-and-registration-requirements.md)
— the season checklist (BR2), the season fee (BR3), the roles that make P1
true, the shared guardian (BR80) — went into `submit_public_registration`.

The registrar-assisted form built its own registration out of six separate
inserts. So the club had **two implementations of one business process, and
only one of them was correct.** Registrations made through the screen the
*club* uses came out with no roles, no document checklist, no fee, and a
freshly duplicated parent every time. The family link got all four.

The production evidence, at the point it was found: four registrations, two
roles, and one parent recorded **four times** under four spellings of her
name, sharing one email address.

The fix is not to copy the rules into the second path — that is how the
divergence happened. `app_create_registration` holds the process once.
`submit_public_registration` (security definer, resolves a token) and
`submit_club_registration` (security invoker, RLS decides) are thin wrappers
around it. One body, two privilege contexts, and neither can reach another
club: the anonymous path takes its tenant from the invitation, the club path
is held by the policies.

The registrar action shrank from 200 lines to 113, and the deleted 87 were
the wrong ones.

## The check that would have caught it

`supabase/tests/16_one_path_and_merging.sql` creates a registration **each
way** and demands the same shape: same checklist, same fee, same roles, one
shared guardian. Restoring the old divergence makes it report all four
defects by name.

That equivalence is the durable part. Any future change that teaches one
surface something the other does not know now fails CI.

## Resolving a duplicated human

BR5 has always flagged duplicates and refused to merge them. What it never
had was a way for a person to *resolve* one — and a screen that nags without
ever clearing is a screen people stop reading.

Worse, the flagging was per registration. **A guardian has no registration
of their own**, so the four copies of one parent appeared on no screen at
all. That is how they reached four.

**BR5 is restated on the club's rule: the email address settles it, in both
directions.**

- A shared email **and date of birth** is the same human, even where the
  names disagree — people abbreviate, marry, and mistype, and the four
  records here shared nothing but an address.
- The same name with **different** emails is two different humans, and is no
  longer raised at all. A club really does have two families called Nguyen.
- Name and date of birth with no email to separate them stays a *possible*
  match, presented as weaker.

**BR82** adds the resolution: a human picks which record survives, and
`merge_person` repoints every registration, role, guardianship, consent and
submission record in one transaction. The duplicate is kept as a tombstone
pointing at the survivor.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No change. This is **P1** being made true in the running system rather than in one of two code paths |
| 2_business | **BR5 restated** (email decides, in both directions) and **BR82** added (human-chosen survivor, tombstone not delete) |
| 3_information | `person.merged_into_person_id`, and the rule that every lookup filters on it. In [1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 4_application | `app_create_registration` and its two wrappers; the duplicates screen; `merge_person`. In [2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology | No change |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | Two divergent creation paths, the club's own being the wrong one. Duplicates flagged per registration, so guardians — the records that actually duplicated — were invisible, and nothing could resolve one |
| **Target** (delivered) | One creation path, with an equivalence test between the two surfaces. A club-wide duplicates screen where a registrar picks the survivor and everything folds into it. Proved across 12 further behavioural scenarios — 97 in total |

## Work packages and deliverables

### WP1 — One creation path *(done)*

- **Deliverables:** `app_create_registration`; `submit_public_registration`
  and `submit_club_registration` reduced to wrappers; `src/app/register/actions.ts`
  rewritten to call the function rather than rebuild the process.
- **Outcome:** the rules cannot fall behind on one surface again.

### WP2 — BR5 restated *(done)*

- **Deliverables:** `br5-duplicate-candidates.ts` with `MatchConfidence` and
  `findDuplicatePairs`; 16 unit tests including the sibling case.
- **Outcome:** the four-Karens case is detected; two Nguyen families are not.

### WP3 — Merging *(done)*

- **Deliverables:** `person.merged_into_person_id`; `merge_person()`;
  `/registrar/duplicates` with the side-by-side choice.
- **Outcome:** a registrar can clear the list, and the club can see what
  each side would bring before choosing.

### WP4 — Proof *(done)*

- **Deliverables:** `supabase/tests/16_one_path_and_merging.sql`, 12
  scenarios.
- **Outcome:** verified to fail. Restoring the old divergent club path
  reports *"checklists differ: link produced 2, club screen produced 0
  (BR2) | fees differ | player roles differ | the two paths created 2
  guardians for one parent (BR80)"*.

## In scope / out of scope

**In scope:** collapsing the two creation paths; club-wide duplicate
detection; merging two Person records.

**Out of scope:** merging more than two at once — the four existing copies
are cleared by three pairwise merges, which is more clicks but keeps every
decision reviewable. Also out: un-merging. A tombstone makes it *possible*
to write later; nothing does today, and a reversal is a different kind of
care than a merge.

## Gap notes

**Existing duplicates are not merged automatically, and must not be.** The
four records in the pilot club's data are surfaced on the new screen for a
registrar to resolve. A migration that merged them would be exactly the
silent merge BR5 has forbidden since the first scope document — and it would
be guessing which spelling of the name the club considers real.

**A merge is pairwise and one-directional.** Four copies take three merges.
Batch-merging a whole group is tempting and was left out deliberately: the
choice of survivor is the decision, and making it once for a group hides
which records were folded where.

**`registration_document` and `payment` are not repointed** — they hang off
a registration, not a person, and the registration moves. Vouchers likewise.
Worth stating because the next table added to this schema needs to be
considered against `merge_person`, and there is nothing that forces that
consideration yet.

## Open questions

**#53 — Should a merge be reversible?** The tombstone makes it possible: the
duplicate's own details are kept, and the audit event records what moved. But
un-merging after a season of activity is a different problem — the survivor
has since accumulated registrations that were never the duplicate's. Left
unbuilt rather than half-built.
