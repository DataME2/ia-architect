# Project Scope — Match Officials, and Who Governs the Club

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/identity-and-registration`.

Two asks from the club, and a correction neither of them contained.

## The correction: MiniRefs

The club's rule is *match officials and team officials need a Working with
Children Check; players do not*. Implemented literally, that would have been
wrong — in law, not merely in practice.

**Queensland exempts volunteers under 18 from the Blue Card**, and Football
Queensland's referee pathway **starts at MiniRefs**: twelve-year-olds
officiating under-7s, already recorded in this project's own classification
reference since [scope 2](./2_business-actors-and-open-questions.md). A rule
demanding a card from every match official would have made the platform
refuse the very people that pathway exists to bring in.

The existing behavioural suite caught it before the rule was written:
`supabase/tests/13` grants a `referee` role to a child, and it was right to.

**BR84 therefore exempts anyone under 18**, measured at the end of the
season so that someone turning 18 mid-season is treated as the adult they
will be. [Scope 25](./25_teams-and-team-officials.md)'s team trigger had the
same latent error and is corrected here.

The exemption is asserted in the suite as hard as the requirement is,
because an over-strict safeguarding rule fails *quietly*: the club works
around it, and the workaround is where the real risk goes.

## What the new rule found

Adding BR84's trigger made `supabase/tests/16` fail — and the failure was a
real bug in `merge_person`, not in the test.

**A merge moved a person's roles and left their clearance behind.** Merging
a coach into their duplicate would carry the coaching role to the survivor
and strip the card, and the new trigger would then reject the survivor's own
role. `clearance` and `team_member` had both been added since the merge
function was written, and neither was repointed.

[Scope 24](./24_one-creation-path-and-duplicate-resolution.md) predicted
exactly this and could not prevent it:

> *the next table added to this schema needs to be considered against
> `merge_person`, and there is nothing that forces that consideration yet.*

Two tables later, nothing did. The fix repoints `clearance` **first**,
before the roles that are validated against it, and also moves
`team_member` and `committee_position`. What forces the consideration now is
a test that merges someone whose clearance is the thing making their role
legal.

## Club governance

The club asked to identify its committee first, and recorded the shape:
elected at an Annual General Meeting, serving until the next — about a year.

**BR85** models the *term* rather than a person's tenure. That is what makes
"who was on the committee in March" answerable, and what stops a committee
list quietly becoming a list of everyone who has ever been on one.

**BR86** is the part that earns its place. The next-AGM date is **stated by
the club, not computed as a year from the start**: a club that meets three
months late has a committee whose authority is a real question, and deriving
the date would answer it silently and wrongly. An overdue term still
governs — the club has not stopped having a committee — but its mandate has
not been renewed, and the screen says so.

This connects governance to rules that already depend on it. **BR21** says a
Voucher Program cannot be applied to a family's invoice until the Committee
approves it. Until somebody records who the Committee is, *"the Committee
approved it"* is a claim rather than a record.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | New capability **C19 — Club governance & administration**. Everything else serves **C15** and the existing safeguarding principle **P7** |
| 2_business | **BR84** (match officials, with the under-18 exemption), **BR85** (a position is held for one term), **BR86** (an overdue mandate is flagged, and the end date is stated not computed). New objects: **Committee Term**, **Committee Position** |
| 3_information | `committee_term`, `committee_position`. In [1_data-objects.md](../ea/3_information/1_data-objects.md) |
| 4_application | The governance screens, the BR84 trigger, and the `merge_person` repair. In [2_application-components.md](../ea/4_application/2_application-components.md) |
| 5_technology | No change |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** (before) | Only team officials were checked; a referee needed nothing. No committee anywhere, so BR21's approvals pointed at nobody. `merge_person` silently dropped clearances and team places |
| **Target** (delivered) | Adults in child-facing roles need a card wherever the role is granted; under-18s are exempt; the club records its committee with a term that can lapse visibly. Proved across 17 further scenarios — 127 in total |

## Work packages and deliverables

### WP1 — BR84 and the exemption *(done)*

- **Deliverables:** `app_needs_clearance`, `app_clearance_covers`; the
  `person_role` trigger; 0010's team trigger corrected.
- **Outcome:** a referee needs a card, a MiniRef does not, and both are
  proved.

### WP2 — `merge_person` repaired *(done)*

- **Deliverables:** `clearance`, `team_member` and `committee_position`
  repointed, clearance first.
- **Outcome:** merging a coach no longer strips the card that makes their
  role legal.

### WP3 — Governance *(done)*

- **Deliverables:** `committee_term`, `committee_position`;
  `src/domain/governance/term.ts` with 18 unit tests;
  `/registrar/governance` with a Governance button on the queue.
- **Outcome:** the club can record its committee, and see when the mandate
  runs out.

### WP4 — Proof *(done)*

- **Deliverables:** `supabase/tests/18_match_officials_and_governance.sql`,
  17 scenarios.
- **Outcome:** verified to fail. Removing the under-18 exemption and the
  clearance move breaks **three** suites, including *"a MiniRef under 18 was
  refused for having no Blue Card"*.

## In scope / out of scope

**In scope:** clearance for match officials and coaches wherever the role is
granted; the under-18 exemption; committee terms, positions and
resignations; the AGM-overdue flag.

**Out of scope:** linking a Committee approval to the Term that granted it.
BR86 makes the term visible; BR21's approval record does not yet name it,
because voucher-program enablement is not built. Also out: elections,
nominations, quorum, and anything else a constitution says about how a
committee is *chosen* — this records the outcome, not the process.

## Gap notes

**A committee member needs no clearance, and that is a decision not an
oversight.** Many Australian clubs do require blue cards of committee
members; many do not, and the answer depends on whether the role is
child-related in practice. Guessing *yes* would have locked a club out of
recording its own committee before anyone held a card. Raised as
[#55](./open-questions.md).

**Age is the only exemption test.** A person aged 18 or over in a
child-facing role needs a card, full stop. Real exemption schemes are more
textured — registered teachers and police officers are exempt in
Queensland, for instance — and encoding those would mean holding a
profession per person and being right about several states' rules. The
narrow version is honest; the broad version would be a guess wearing a
constraint.

**An unknown person fails closed.** `app_needs_clearance` returns *true* for
a person id it cannot find, so a dangling reference demands a card rather
than waiving one.

**BR54's question #54 is unchanged.** BR84 makes the *appointment* safe on
one more surface. A clearance revoked mid-season still leaves a live role
standing, and still needs the scheduler nothing here provides.

## Open questions

**#55 — Does a Committee Member need a Working with Children Check?**
Adopted for now: **no**, and neither does a guardian. The rule as built
covers referees, coaches and team officials — the roles the club named.
Committee membership is governance rather than a child-facing role by
default, but some clubs treat it as one and some state guidance points that
way for office-bearers of a child-serving organisation. Guessing *yes*
would have blocked a club from recording its committee at all, which is
worse than asking.
