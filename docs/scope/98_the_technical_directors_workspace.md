# Project Scope — The Technical Director's Workspace

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/pitchpeople`.

`qa.techdirector` failed QA for a reason that is not a defect: the Technical
Director had permissions and nowhere to use them. The role could confirm a
player's correction (BR149) and write squads and player physique (BR125),
but it had no workspace on `/me`. Its holder also had no way to learn that
anything about a player had changed, short of opening every record. The
product owner asked for three things (October 2026):

1. **How does a TD know** about any player modification or notification?
2. **The TD works in their own workspace**, with its access and permissions
   written down, to be adjusted after testing.
3. **What if the TD holds verifiable information about a player?** The TD
   should be able to correct a player's **Apps, Min, Goals and Assists**.

## EA alignment (assessed top-down before implementing)

| Layer         | Impact |
| ------------- | ------ |
| 1_strategy    | **No change.** Serves G5 (less manual admin) for an actor already documented |
| 2_business    | **BR176**: the TD's workspace and the player activity it reads. **BR177**: a recorded appearance is corrected only with a stated, verifiable source, kept with the correction. [Actors and roles](../ea/2_business/1_business-actors-and-roles.md) gains the TD's decision rights |
| 3_information | **New data object `appearance_correction`**: append-only, holding before, after, the source, who and when. Player activity is **read from `audit_event`** through one function, filtered to player facts with no money in them (BR78) |
| 4_application | A sixth lens on `/me`, **Technical Director**, with a workspace for squads, corrections waiting, player activity, and "what you may do". The player record gains **Correct** for each appearance and **Record a missing appearance**, for the TD and for anyone who records appearances (BR158) |
| 5_technology  | Migration 0093 and RLS suite 93 |

## Plateaus

| Plateau | State |
| ------- | ----- |
| **Baseline** | A TD signs in to nothing. A recorded appearance cannot be edited from any screen ("Edit the existing entry instead" pointed at no edit), and a direct update leaves no reason behind |
| **Target** | The TD lands on their own workspace. It shows every squad, the corrections waiting on them, and every change to a player in the last 30 days: registration, team sheet, record and appearances, never money. Any appearance can be corrected, with its source kept for good |

## Work packages and deliverables

### WP1 — The rules and the data (BR176, BR177, 0093)

- **Deliverables:**
  - BR176 and BR177 in [`5_domain-context-and-rules.md`](../ea/2_business/5_domain-context-and-rules.md).
  - `supabase/migrations/0093_the_technical_directors_workspace.sql`:
    - `appearance_correction`, append-only: readable by the club's members, and written only through the function below;
    - `app_correct_appearance(...)`: security definer. It records, corrects or removes one appearance. It is refused without a source of at least eight characters, and refused for anyone who is neither the TD nor somebody BR158 lets record it;
    - `app_player_activity(club, days)`: security definer, for the TD or an admin. It returns player facts from `audit_event` with each subject named, and no money;
    - the receipt.
  - `supabase/tests/93_the_technical_directors_workspace.sql`.
- **Outcome:** a statistic changed without a reason cannot be written, and a TD can read what changed without being able to read the money.

### WP2 — The workspace

- **Deliverables:**
  - `src/web/role-context.ts`: the `technical` lens.
  - `src/data/me.ts`: the holding, derived from `technical_director` access.
  - `src/web/technical-director.ts` (tested): the documented permission list, and the activity feed's wording.
  - `src/data/technical-director.ts`.
  - `src/app/me/_workspaces/TechnicalDirectorWorkspace.tsx`: squads (the Team Dugout, [scope 99](./99_the_team_dugout_and_the_competition_calendar.md)), corrections waiting, player activity, and "What you may do as Technical Director".
- **Outcome:** the TD works where every other role works, and sees the same changes the registrar would.

### WP3 — Correcting a statistic

- **Deliverables:**
  - `src/app/registrar/players/[registrationId]/`: a **Correct** form per appearance (minutes, goals, assists, started, or "did not play") and **Record a missing appearance**, both requiring a source.
  - `canCorrectAppearance` in `src/web/player-view.ts` (tested).
  - The list shows each appearance's last correction and its source.
- **Outcome:** Apps, Min, Goals and Assists can be put right by whoever holds the evidence, and the evidence stays attached.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------- |
| The TD workspace, activity feed and permission list | Email or push for player changes (a C7 communication, BR127–BR131) |
| Correcting and recording appearances with a source | Attaching the evidence file itself |
| | Per-team scoping of the TD (question 78's second half) |

## Gap notes

- **The feed is pulled, not pushed.** The bell (BR159) carries things to
  *do*, such as a correction to confirm; activity is a thing to *know*, and
  lives on the workspace. Pushing it would make the bell a news ticker. An
  email digest is the natural next step, under the communication rules.
- **The source is text.** A link to a match report or a referee's card
  photo can be pasted. Storing the file itself would need a bucket and its
  own policy.

## Open questions

- **85: Does a TD's correction need a second person's confirmation?**
  Adopted: **no**. The correction takes effect and is kept with its source,
  who made it and when, append-only, so it can always be traced. If the
  club wants two people, BR149's confirm step is the pattern to reuse.
