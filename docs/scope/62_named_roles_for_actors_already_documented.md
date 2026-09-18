# Project Scope — Named Roles for Actors Already Documented

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/actors-and-roles-in-the-database`.
**Status: built.**

## Why this exists

[`docs/ea/2_business/1_business-actors-and-roles.md`](../ea/2_business/1_business-actors-and-roles.md)
names 48 human actors. Checking which of them exist as a role the
database actually recognises found nine that do not exist anywhere —
not a `club_membership.role`, not a `person_role.role`, not a
`committee_position.position`, nothing. The document described a club
org chart the schema could not grant access against.

This closes that gap for the actors it is safe to close it for, and
says plainly why three of the nine are not closed here.

## What "closes the gap" means, and does not

**A role value, not a screen.** This mirrors the codebase's own history:
`committee` existed on `club_membership` for a long time before
[scope 57](./57_the_committee_records_its_own_decisions.md) gave it
anything to write, and `viewer` still has almost nothing that names it.
Naming a role before building its screen is the established pattern, not
a new one — the alternative is refusing to record who somebody is until
a screen exists to make use of it, which blocks the club's own
recordkeeping on this project's backlog.

**Twelve names, one role.** The business document lists twelve **program
coordinators** — FQPL Mens and U23s, Academy (three variants), Masters
Men, Senior Metro, Junior Metro, Women's/Girls, MiniRoos, Little Stars
and Rising Stars, Development (U8–U12) — each a distinct job title and
none a distinct permission. Adding twelve near-identical values to
`club_membership_role_check` is precisely the shape
`supabase/migrations/0032_competition_catalogue.sql`'s own comment warns
against: *"a check constraint listing the formats
somebody guessed would refuse the real ones."* One `program_coordinator`
role is added instead, and the twelve titles stay exactly where they
already were — named in the business document as job titles a club
assigns a Person, not as twelve database identities that would gate
nothing differently from each other.

## What this does not do, and why not

**Football Australia is not modeled here.** It is the correct answer to
BR38 — the sole body that may request an International Transfer
Certificate — and it is an *external organisation*, not a role a club
grants. Modeling it means an ITC application object, a submission
process, and BR35–BR38's workflow, none of which exist. A role value
with nothing behind it would be worse than the honest gap the business
document already records.

**The AI Assistant is not modeled here, and this is deliberate, not an
oversight.**
[Decision 1](../decisions/1_ai-assistant-autonomy-level.md) settles the
Assistant's autonomy at **advisory** and gives it no decision rights —
[`AssistantNote.tsx`](../../src/app/_components/AssistantNote.tsx)'s own
header calls itself "the guardrail," structurally unable to render a
committing control. A `club_membership` row is an access grant: whatever
the Assistant could do with one, decision 1 already says it may not
decide anything, act unsupervised, or hold a channel a human did not
open. Giving it a role would not add a capability — it would create the
one thing decision 1 was written to prevent, a control surface for
something that is supposed to have none. Reversing that is a decision
record of its own, not a role addition, and nothing here asks for it.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No new goal or principle. Every actor added here was already named in the strategy-adjacent business document; this gives nine of them a value the schema recognises |
| 2_business | **BR125 found unenforced while adding the Technical Director.** The rule's own text already claimed the coach-can-write fix ("previously admin, registrar and coordinator could write them and the coach could only read: the wrong way round") — the database still only granted admin, registrar and coordinator write access on `player_profile`. Fixed alongside the role addition it was blocking |
| 3_information | No new table. `club_membership_role_check` gains 13 values; `grant_club_role` is rewritten to accept them (a migration once applied is never edited, so 0042's body is reproduced with the wider list); `player_profile_manage` and `_select` gain `coach` and `technical_director` |
| 4_application | No new route. The roles are grantable from the existing Access screen the moment this is applied — nothing in `src/app` names them yet, which is the "role before screen" pattern stated above |
| 5_technology | No change |

## The roles added

| Business document name | `club_membership.role` value |
| ----------------------- | ----------------------------- |
| Digital Technology Manager | `digital_technology_manager` |
| Director of Football | `director_of_football` |
| Head of Performance | `head_of_performance` |
| Head of Community Football | `head_of_community_football` |
| Head of Women's Football | `head_of_womens_football` |
| Technical Director | `technical_director` |
| Grants Committee Member | `grants_committee_member` |
| Appeals Panel Member | `appeals_panel_member` |
| Grants Coordinator | `grants_coordinator` |
| Volunteer Coordinator | `volunteer_coordinator` |
| Player Welfare Officer | `player_welfare_officer` |
| Social Media Communication and Club Photographer | `social_media_and_photographer` |
| (twelve program coordinator titles) | `program_coordinator` |

None of these thirteen values carry a select or manage policy of their
own beyond `technical_director`'s addition to `player_profile` — they
are grantable and readable on `club_membership` exactly as `committee`
and `viewer` have always been, and nothing else in the schema names them
yet.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Thirteen new `club_membership.role` values | Football Australia / ITC objects (BR35–BR38) — a capability, not a role |
| BR125 enforced: coach and Technical Director may record physique | The AI Assistant as a role — refused on decision 1's own terms |
| `grant_club_role` accepts the wider list | A dedicated screen for any of the thirteen roles |
| | Volunteer hour tracking or rebates — the business document's own "no volunteer model" note stands; only the coordinator identity is added |

## Gap notes

- **Secretary / Member Protection Officer, Finance Admin, Referee
  Coordinator Admin, Referee Admin Back-Up and Blue Card Administration
  remain covered only by a broader existing role** (`secretary` as an
  office, `treasurer`, `coordinator`, `admin`/`registrar`). They were not
  in the list this initiative was asked to close and are not touched
  here.
- **Twelve titles became one role.** If a club's own reporting later
  needs to tell a MiniRoos Coordinator from a Masters Men Coordinator
  apart, that is free text on the membership row or a small reference
  table — the same choice `competition.tier` and `referee_classification.level`
  already made — not a second attempt at enumerating them.
