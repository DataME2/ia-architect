# Project Scope — A Coach Sees Their Own Team

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/a-coach-sees-their-own-team`.
**Status: built.**

The club answered [#78b](./open-questions.md) in October 2026 with option
(B). Together with [#73](./open-questions.md) and the child's-record package
of [scope 35](./35_narrowing_what_a_member_can_read.md) (WP3), that answer
closes two gaps that were left open:

- **Any member read every family.** 36 of the 70 tables were readable by any
  club member in any role. A coach could open every child's record, contact
  details and consents in the club.
- **The coach saw the balance.** #73 said a coach is told *clear to play*
  and never what the family owes. Migration 0068 hid payment plans and
  receipts, but the balance itself is a column on `registration`. The
  coach's own workspace showed "$180 owing".

| Who | People, guardians, consents, registrations | The balance |
| - | - | - |
| Admin, treasurer, registrar, IT manager | Club-wide | **The figure** |
| Every other officer (secretary, committee, coordinator, …) and the demo `viewer` | Club-wide | Owes / owes nothing |
| A member whose only role is **coach** | **Their own teams this season**, and those players' guardians | Owes / owes nothing |
| A Parent/Guardian holding authority | Their household (decision 11, unchanged) | **The figure** |
| A player of 18 or over, about themself | Themself | **The figure** |
| A player under 18, about themself | Themself | Owes / owes nothing (BR78: the family's money is the guardian's business) |

## The design

- **The balance is hidden by a column privilege, not by a policy.** Row-level
  security decides which rows a caller reads. It cannot hide one column from
  some app roles and show it to others, because every signed-in caller is
  the same Postgres role. So 0070 revokes SELECT on
  `outstanding_amount_cents` from every signed-in caller, and
  `app_registration_money()` returns, per registration, the figure (or null)
  and `owes`. Writes are unchanged.
- **"Coach" is a membership, not a team role.** The narrowing applies to a
  member whose *only* club role is `coach`. A coach who also holds an office
  reads as the officer. "Their teams" means every team on which they are
  any non-player `team_member` (coach, assistant coach, manager, team
  official), not withdrawn, in a season that has not ended.
- **Officers-only tables.** `account_person`, `guardian_invitation`,
  `player_invitation`, `registration_invitation` and `registration_voucher`
  are not read by a coach at all. A coach still reads their own login link
  through the family policy.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change. P5 is applied more narrowly, not amended |
| 2_business    | **BR78 now enforced in the database; BR120 applied to the coach** ([5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md)). #78b built and #73 enforced in full ([open-questions.md](./open-questions.md)); scope 35 WP3 delivered for the coach |
| 3_information | No new table. The balance column is no longer selectable |
| 4_application | New functions: `app_reads_club_wide()`, `app_my_team_person_ids()` and `app_registration_money()`. Twelve read policies rewritten. Every registration read goes through `withMoney`. The coach's squad shows "Not clear to play" |
| 5_technology  | No change. One migration (0070) and one behavioural RLS suite (70) |

## Work packages and deliverables

### WP1 — The database

- `supabase/migrations/0070_a_coach_sees_their_own_team.sql`.
- `supabase/tests/70_a_coach_sees_their_own_team.sql` covers 9 scenarios.
  Suite 15 now reads the balance through the function.
- `supabase/tests/99_grants.sql` narrows the column again after its blanket
  grant, so the tests see what production sees.

### WP2 — The screens

- `src/data/registration-money.ts`: `REGISTRATION_COLUMNS` and `withMoney`.
  Every registration read selects the permitted columns and then asks the
  function for the money.
- The domain's `Registration.outstandingAmountCents` can now be null ("not
  yours to see"), next to `owesMoney`:
  - BR3 and BR79's `playEligibility` give the verdict without naming an
    amount.
  - The queue says "Money outstanding".
- The coach's squad says "Not clear to play" instead of "$X owing".
- A player under 18 no longer sees a balance pill on their own workspace.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| People, guardians, consents, roles, registrations, documents and validation results for a coach | `fixture`, `appearance`, `team`, `team_member`: still club-wide; #64 names the roles for fixtures and appearances |
| The balance for everyone but the money roles and the family | (C) of #78b: scoping every role with a team or program, writes included |
| | `viewer` (the demo door) keeps the club-wide read; it reads a demo club only |

## Gap notes

- **A new column on `registration` is invisible until it is granted.** The
  table-wide SELECT is gone, so the next migration that adds a column must
  `grant select (that_column) on registration to authenticated`, and add it
  to `99_grants.sql`. Otherwise every read of it fails with "permission
  denied". The failure is loud, which is the right way round.
- **Last season's teams fall away.** A coach reads only the teams of
  seasons that have not ended. Once a season ends, that season's players
  drop out of the coach's view unless they are on a current team.
