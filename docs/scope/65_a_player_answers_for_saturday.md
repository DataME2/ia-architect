# Project Scope — A Player Answers for Saturday

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/player-availability-responses`.
**Status: built.**

## Why this exists

BR62 has been written since the business layer was drafted and has never
had code: *"a Player or match official responds to a fixture or
appointment as available or not available, and a negative response
requires a brief reason. The reason is recorded and visible to the
responsible coach, technical director, or coordinator only — never to
other participants."* Both `PlayerWorkspace` and `CoachWorkspace` have
carried a `ComingSoon` panel naming exactly this gap since scope 32 built
the five role workspaces around unbuilt capability rather than shipping
them half-done.

A registrar looking at the player workspace asked, directly, for the panel
to become real, plus two things that follow once it does: a guardian needs
to know when their child's answer is still outstanding, and a coach needs
the roster to show it at a glance rather than as a list to cross-reference.

## Who answers for a minor

BR63 already drew the line this rule needs: a Person of thirteen or over
may **see** their own fixtures and availability, but every *deciding*
right — consent, erasure, publicity, and now this — stays the Guardian's
until eighteen. **The guardian holding authority answers for a minor of
any age**; the player's own workspace shows the fixture and the current
answer read-only, with a note explaining why the buttons are not there.
This was confirmed directly rather than inferred from the object
definition's ambiguous phrasing ("the Guardian where the participant is a
minor") — the alternative (a thirteen-to-seventeen-year-old answering for
themselves, treating a match-day response as routine rather than a
decision) was considered and set aside as inconsistent with BR63's own
reasoning for keeping seeing and deciding apart.

## The shape, moved rather than reinvented

**BR113's routing, reused rather than copied.** Migration 0045 built
`app_may_answer_designation(person_id, club_id, as_of)` — the official
themselves once adult, otherwise every Parent/Guardian holding authority —
and its own comment named this rule as one of the places that routing was
owed ("a participation response already is the guardian's"). The function
is generic despite its name (it reads only `guardianship` and
`app_is_adult_on`, never `match_official_appointment`), so migration 0054
calls it directly rather than defining a second copy that could drift from
it — the drift 0045's own comment warns against, on the side of the rule
where drift means the wrong adult recorded as deciding for a child.

**One table, one row per (fixture, person).** 0024's
`referee_availability`/`referee_unavailability` split exists because a
*season* default of "available" is an assumption the club makes on a
referee's behalf, and only an explicit "no" overrides it. A fixture
response has no such default: "available" is exactly as much a fact as
"not available", and no row at all means "has not answered yet" — one
table with a `status` column says that correctly, and BR150's precedent
(a single `player_invitation` row rather than two tables) already
established the same instinct for this codebase.

**`responded_by_person_id` is required even for an adult**, where 0045
left it optional. BR62's own object definition names "who gave it" as part
of what a Participation Response *is*, not an afterthought added once a
second answerer needed distinguishing.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | No new goal. Realises BR62/BR63, both already adopted and both left unbuilt since the business layer was drafted. |
| 2_business    | **BR62 restated** with the "who answers for a minor" clause the object definition left implicit. No new rule number — the permission BR62 already describes is unchanged; only its first implementation. |
| 3_information | **One new table, `participation_response`** — BR113's shape, one row per (fixture, person) rather than the referee availability split. Reuses `app_may_answer_designation` and `app_is_adult_on` (0045) rather than adding parallel functions. |
| 4_application | The `ComingSoon` panel in `PlayerWorkspace` becomes real: an adult answers for themselves, a minor sees a read-only status. `GuardianWorkspace` gains the same answer form for the selected child, plus an exclamation badge on every child card whose next fixture is unanswered. `CoachWorkspace`'s `ComingSoon` panel becomes a roster of green/red/amber pills for the next fixture. |
| 5_technology  | No change. |

## Deliverables

- **Migration:** `supabase/migrations/0054_a_player_answers_for_saturday.sql` — `participation_response`, a trigger enforcing BR62/BR63 (reusing `app_may_answer_designation`), a check constraint requiring a reason on decline, RLS (family read/answer via `app_my_family_person_ids`, officer read/manage for admin/registrar/coordinator/coach — nobody else, matching BR62's "never to other participants").
- **Domain:** `src/web/participation-answer.ts` — form parsing, the coach's banner colour, and the guardian's "needs an answer" flag, kept pure and unit-tested.
- **Data:** `src/data/participation.ts` — `loadParticipationResponse`, `loadFixtureParticipationResponses`, `recordParticipationResponse`.
- **Screens:** `AvailabilityAnswer.tsx` (shared by `PlayerWorkspace` and `GuardianWorkspace`), `answerParticipationAction` in `src/app/me/_participation/actions.ts`, the roster banner in `CoachWorkspace`.
- **Tests:** `supabase/tests/55_a_player_answers_for_saturday.sql` (14 scenarios), `src/web/participation-answer.test.ts`.
- **Rule:** BR62, restated.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| An adult player answers for themselves; a guardian answers for a minor of any age | A thirteen-to-seventeen-year-old answering for themselves — considered and set aside, see above |
| The reason on a decline, visible only to admin/registrar/coordinator/coach | A written reminder chasing an unanswered response — `AssistantNote` on the coach workspace still says so is not built |
| A coach's roster banner for the next fixture only | Answering more than one fixture ahead from the coach or guardian screen — both read only the next one, matching every other panel on these workspaces |
| A guardian's exclamation badge, computed at read time | A persisted, dismissible notification through scope 58's inbox — deliberately not wired; see below |

## Gap notes

- **The exclamation badge is a read-time flag, not a notification.** It
  recomputes on every page load rather than being written, stored, or
  dismissible. Scope 58 built exactly that mechanism for a different
  event (a declared officiating interest) and is the obvious next home for
  this one too, once a club asks for it to survive being looked at once.
- **No reminder is sent for an unanswered response.** The coach workspace
  still says so, honestly, in an `AssistantNote` rather than a
  `ComingSoon` panel — the roster itself is real now, the chase is not.
- **A guardian's badge costs one query per child.** A household is a
  handful of children in practice; the day that stops being true, this is
  the query worth batching first.
