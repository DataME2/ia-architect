# Project Scope — The Executive Records Resolutions

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/the-executive-records-resolutions`,
stacked on [scope 85](./85_sponsor_invoices_and_club_referrals.md).
**Status: built.**

Reported by the product owner during QA, October 2026:

1. **The admin and registrar could see the committee resolution queue on
   the governance screen, but the President's workspace could not.** The
   President lands on the Committee workspace on `/me`. It showed hardship
   and vouchers, but no resolutions and no positions awaiting confirmation
   (BR166, BR167).
2. **The Secretary and Treasurer should be able to record resolutions.**
   0049 allowed only `admin` and `committee`, so a Secretary holding just
   the `secretary` role was refused by the database.
3. **"Re-check and record" crashed** with a row-level security error for a
   treasurer or committee member. Only an admin or registrar may write
   `validation_result` (0002), but the button showed for every role that
   can open a registration.

## Design

- **Migration 0084:** `committee_resolution_record` now admits `admin`,
  `committee`, `secretary` and `treasurer`. It is still append-only, with
  no update or delete policy.
- **Committee workspace:** a new "Committee resolutions" panel shows:
  - every position in the governing term that is not yet confirmed, with
    what it awaits (the AGM election resolution, or the executives still to
    confirm);
  - the term's latest five resolutions;
  - a link to `/registrar/governance`, where the record form and the
    confirm buttons are.
- **Re-check:** the button shows only to admin or registrar, and the action
  refuses anyone else with a plain message. That matches the policy, which
  is unchanged.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR123 amended**: the Secretary and Treasurer also record resolutions |
| 3_information | No new table; one policy widened |
| 4_application | Committee workspace panel; re-check gated by role |
| 5_technology  | Migration 0084, suite 84 |

## Out of scope / gaps

- **Voucher-program enablement** (also admin and committee only) is
  unchanged; it was not asked.
- ~~Recording from the workspace itself.~~ Done in the follow-up below.

## Follow-up: the committee acts from its workspace

QA found that the panel only *showed* the queue. The President had no
button to confirm a position and no way to record the AGM election from
`/me`. The panel now reuses the governance screen's own forms:

- **Record a resolution** (the same form, `RecordResolutionForm`), for
  anyone 0084 admits: admin, committee, secretary or treasurer. Recording
  the **AGM election** confirms the officers (BR166). That is the first
  step, because only a confirmed executive can confirm anybody else.
- **Confirm** (`ConfirmPositionButton`) beside a position that is waiting
  on an executive office the viewer holds, confirmed (BR167).
- Every governance action now also refreshes `/me`.

No rule changed, so no migration.
