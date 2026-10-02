# Project Scope — The Treasurer Reads the Referee Side

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/the-treasurer-reads-the-referee-side`.
**Status: built.**

The club asked, October 2026, that "all actors work in harmony" in the
referee pipeline. That pipeline runs designate → answer → officiate → verify
→ claim → approve → pay.

Until now the treasurer saw only the money end. They could approve a claim,
but could not open Designations or Verify a match to see that the official
was designated, accepted and verified. They also had no way to undo a
payment run created by mistake. On North Star there were two empty
"Untitled payment run" runs.

| | Before | Now |
| - | - | - |
| Designations | "Only an administrator, registrar or coordinator" | **Read only**: each fixture's officials and their answer |
| Verify a match | Same refusal | **Read only**: what is waiting to be verified |
| An open payment run | Could only be closed | **Can be deleted**; its claims wait for a run again |
| A closed or paid run | — | Still never deleted (BR117) |

## Permissions

The referee rows of the permission matrix were never written down. They are
now in [scope 29 §2](./29_actors-access-and-permissions.md), read from
`pg_policies` after migration 0074, alongside every other area.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR163 added; BR117 extended** ([5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)) |
| 3_information | No new table |
| 4_application | `match_official_appointment_select` now includes the treasurer, replacing 0073's narrower read. A delete trigger on `referee_payment_batch`. Read-only views on the Designations and Verify a match pages. "Delete this payment run" on an open run |
| 5_technology  | No change. Migration 0074. Suite 73 extended to 5 scenarios |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The treasurer reading designations and verifications | The treasurer reading the match officials' record (classification, accreditations): not asked, and it is a record about children |
| Deleting an open payment run | Deleting a closed or paid run, which BR117 refuses |
| | Hiding menu links a role cannot open at all (the committee still sees Designations and is refused) |

## Gap notes

- **A claim can still be taken out of a closed run.** The batch trigger
  (0027) checks only a claim *joining* a closed run, not one leaving it. That
  is unchanged here and worth closing separately.
