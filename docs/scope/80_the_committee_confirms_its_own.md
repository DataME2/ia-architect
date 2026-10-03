# Project Scope — The Committee Confirms Its Own

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/the-committee-confirms-its-own`.
**Status: built.**

On /governance, North Star's positions all showed as not confirmed. Two
things caused that:

- **Nothing recorded confirmation.** A position was a row an admin typed,
  and only access (BR153) could be "confirmed", by an admin or the current
  President.
- **There was no current President.** The 2026–27 term had its AGM on
  2026-05-29 but **starts on 2027-06-01**, so no term was current. It also
  holds **two live Presidents, two Treasurers and two Secretaries**, and
  nothing stopped that.

The club's rule, October 2026:

| Position | Confirmed by | Rule |
| - | - | - |
| President, Secretary, Treasurer, **IT Manager** | The **AGM election** resolution for the term. Refused while an office has two live holders | BR166 |
| Vice-president, Registrar, Committee member, Subcommittee member | The confirmed **President, Treasurer and Secretary**, each pressing Confirm; the third confirms it. Every confirmation is audited and sent to the committee's inboxes | BR167 |

## Design

- **Migration 0079:**
  - `it-manager` added as an office, carrying the IT manager's access.
  - `confirmed_at` and `confirmed_by_resolution_id` on `committee_position`.
  - A resolution category, `agm_election`, whose insert trigger confirms the
    officers, or refuses and names a doubled office.
  - `committee_position_confirmation`, one row per executive office per
    position, written only by `app_confirm_committee_position()`.
  - `app_notify_committee()` writes to every term member's inbox.
- **Governance screen:**
  - a **Confirmed** column showing where each position stands, for example
    "1 of 3 — awaiting Treasurer, Secretary";
  - a **Confirm** button, shown only to a confirmed executive officer who
    has not yet confirmed;
  - "AGM election (confirms the officers)" offered as a resolution category.

## For North Star specifically

The confirmations stay out of reach until two data problems are fixed:

- **Resign the duplicate officers**, so one President, one Treasurer and one
  Secretary remain.
- **Correct the term's start date.** It reads 2027-06-01 for an AGM held on
  2026-05-29.

Then record the AGM election resolution.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR166 and BR167 added**; IT Manager becomes an elected office |
| 3_information | `committee_position` confirmation columns; `committee_position_confirmation` |
| 4_application | The election trigger, the confirmation function, committee notifications, and the Confirmed column |
| 5_technology  | No change. Migration 0079, suite 79 |

## Out of scope / gaps

- **A confirmed position does not yet gate access.** BR153's access
  confirmation is still separate; whether access should wait for confirmation
  is a question for the club.
- The minutes of the meeting that elected the committee belong in the
  Management Committee Hub ([scope 81](./81_the_management_committee_hub.md)).
