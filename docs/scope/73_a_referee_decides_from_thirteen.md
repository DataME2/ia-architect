# Project Scope — A Referee Decides from Thirteen

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/a-referee-decides-from-thirteen`.
**Status: built.**

The club answered [#79](./open-questions.md) in October 2026, and went
further than any of the options framed for it. Until now an official under
18 decided nothing: a guardian answered every designation (BR113, confirmed
as #70), and only a MiniRef's guardian could say a match went ahead (BR151).
The club's answer draws the line at **thirteen** instead:

| | Under 13 | 13 to 17 | 18 and over |
| - | - | - | - |
| **Confirms the match went ahead** (BR151) | The guardian holding authority | **The official** | The official |
| **Answers a designation** (BR113) | The guardian holding authority | **The official or the guardian; the first answer stands** | The official |
| **Own workspace** (BR150) | None (BR63, 0060) | **Invited automatically** once they hold a referee role | Invited automatically |

The workspace is the existing one: a linked account reaches the official's
own Person through the family read paths (decision 11), so it sees their
appointments, their claims and their own record, and nothing of anybody
else's. No club membership is ever granted.

## What deliberately does not change

`app_may_answer_designation` (0045) answers three questions, not one: who
answers a designation, and, reused by 0054 and 0057, who answers Saturday's
availability (BR62) and who chooses pay or credit on an approved claim
(BR152). The club decided the first. Changing the shared function would have
moved the other two to thirteen as a side effect. So designations get their
own function, `app_may_answer_as_official`, which adds the official from
thirteen, and **BR62 and BR152 stay at eighteen**. Whether they should follow
is recorded below as a gap, for the club to decide.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change. P1 (the official is one Person who acts for themselves) within P7's duty of care: the under-13 line is kept |
| 2_business    | **BR113 restated, BR150 and BR151 extended** in [5_domain-context-and-rules.md](../ea/2_business/5_domain-context-and-rules.md). #79 answered and #70 partly reversed in [open-questions.md](./open-questions.md) |
| 3_information | No new table. `match_official_appointment.responded_by_person_id` (0045) now also names the official themself |
| 4_application | `app_may_answer_as_official()`, the confirmation trigger, the invitation gate, `inviteWorkspaces` and the Referee workspace's "Confirm the match" panel |
| 5_technology  | No change. One migration (0069) and one behavioural RLS suite (69) |

## Work packages and deliverables

### WP1 — The rules, in the database

- `supabase/migrations/0069_a_referee_decides_from_thirteen.sql`:
  - `app_may_answer_as_official(person, club, as_of)`: the shared answerers plus the official from thirteen.
  - The designation trigger reads it, and refuses an answer that would overwrite another person's (the first answer stands).
  - The confirmation trigger: the guardian under thirteen, the official from thirteen.
  - The invitation gate accepts a referee role in a season that has not ended, as an alternative to a COMPLETE registration.
- `supabase/tests/69_a_referee_decides_from_thirteen.sql`.

### WP2 — The screens

- The designation's "who answers" sentence and the bell include a 13–17 official.
- `inviteWorkspaces` and the People screen invite a 13+ official when a referee role is granted.
- The Referee workspace offers "Confirm the match" for the official's own past appointments from thirteen.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| Confirming a match, answering a designation, an own workspace from 13 | Saturday availability (BR62) and pay or credit (BR152) for a 13–17 official, which stay with the guardian until the club says otherwise |
| | A guardian workspace for the guardian of a referee who is not a registered player (BR126 needs a COMPLETE registration) |
| | "Owed to you" and the accreditation view (the next initiative after the coach narrowing) |

## Gap notes

- **BR62 and BR152 still stop at eighteen.** A 15-year-old now answers their
  own designation and confirms their own match, but their guardian still
  answers their Saturday availability and chooses how their claim is paid.
  That may be right, since money and team selection are different from
  officiating, but it was not asked, so it is not assumed.
