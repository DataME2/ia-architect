# Project Scope — Thirteen Decides Money and Saturdays

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/thirteen-decides-money-and-saturdays`.
**Status: built.**

[Scope 73](./73_a_referee_decides_from_thirteen.md) moved designations and
match confirmation to thirteen. It left three questions at eighteen because
the club had not been asked about them: Saturday availability (BR62), pay or
credit (BR152), and where a referee is paid (BR161).
[Question 80](./open-questions.md) put them to the club, which answered
**(C): thirteen for all three**.

| | Under 13 | 13 to 17 | 18 and over |
| - | - | - | - |
| Answer for Saturday (BR62) | Guardian with authority | **The person, or a guardian with authority** | The person |
| Pay or credit on a referee claim (BR152) | Guardian | **The official, or a guardian** | The official |
| Where a referee is paid (BR161) | Guardian | **The official, or a guardian** (the latest nomination stands) | The official |

**One function moved.** All three rules ask `app_may_answer_designation`
(0045). Migration 0075 redefines it as "the person from thirteen, plus every
authority guardian until eighteen", so the three rules cannot drift apart.

**Saturday availability is the player's own answer.** It covers every
13–17 player, not only officials, because BR62's response is a player's
answer to their own fixture. A player's self-correction of their record
(BR148) uses a different gate and stays at eighteen.

## Production, clarified by the product owner

The development project holds **synthetic data only**. Production will be a
**new Supabase project, tagged prod**, created once the product meets
expectations. In production:

- the simulated referee payout is refused;
- bank account numbers are encrypted at rest.

Both are recorded as preconditions in
[2_deployment.md](../ea/5_technology/2_deployment.md). Scope 76's "simulation
would run in production" gap is therefore a production-setup step, not a
defect in development.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No change |
| 2_business    | **BR62, BR152 and BR161 restated**; question 80 resolved ([open-questions.md](./open-questions.md)) |
| 3_information | No new table |
| 4_application | `app_may_answer_designation` redefined (0075). The player answers their own Saturday from 13. The Referee workspace offers pay/credit and the nomination from 13. The bell carries a 13+ person's own availability and unsettled claims |
| 5_technology  | No change in development. Two production preconditions recorded |

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The three answers at thirteen | BR148 self-correction, which stays at eighteen |
| | "Credit" landing automatically. The product owner's wording ("a credit must be deposited in the parent/player bank account") is being confirmed before it is built |
