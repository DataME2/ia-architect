# Project Scope — A Committee Grants Hardship

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/a-committee-grants-hardship`.
**Status: built.**

BR79, "no pay, no play", is absolute. [Question 50](./open-questions.md)
asked whether there is a hardship override and who grants it, and expected
BR21's shape: a committee decision, recorded, with the approver named. The
club asked for it to be built in October 2026. Until now the Committee
workspace carried a "Hardship requests" placeholder.

| Step | Who | Recorded |
| - | - | - |
| Ask | The family (whoever answers for the player, BR62), or the registrar or treasurer on their behalf | The reason, who asked, when |
| Decide | A committee member: committee, admin, secretary or treasurer | Approve **until a date**, or decline **with a reason**. Who and when are written by the database, and an audit line is added |
| Effect | Every screen that reads BR79's verdict | "Clear to play" until the date. **The amount is still owed** |

## Design

- **Migration 0077:**
  - `hardship_request`, with one open request per registration.
  - `app_decide_hardship()` is the only way to decide; there is no update
    policy.
  - `app_registration_money()` gains `hardship_until`, so every screen
    already reading the verdict carries the override with no extra lookup.
- **BR79's verdict:** `playEligibility` gives "playing under a hardship the
  committee approved until …, the $X is still owed". A coach sees only
  "clear to play"; the reason stays with the family and the committee
  (BR78).
- **Screens:**
  - the guardian's Fees panel asks for hardship while money is owed, and
    shows the request's state;
  - the Committee workspace's **Hardship requests** panel lists what is
    waiting and what is in force.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR164 added**; BR79 notes its one exception; question 50 resolved |
| 3_information | New `hardship_request` |
| 4_application | `app_decide_hardship()`, `app_may_decide_hardship()`. The verdict gains `hardship_until`. Guardian request form; committee decision panel |
| 5_technology  | No change. Migration 0077, suite 77 |

## Out of scope / gaps

- **No bell item for a waiting request yet.** The Committee workspace lists
  them; a bell item needs a new inbox kind.
- A hardship does not make a registration COMPLETE (BR3): it changes
  whether the player may take the field, not whether they are registered.
