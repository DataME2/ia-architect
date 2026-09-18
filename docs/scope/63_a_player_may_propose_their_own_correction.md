# Project Scope — A Player May Propose Their Own Correction

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/player-self-correction`.
**Status: built.**

## Why this exists

The player workspace has said "yours only" since it was built — a player's
own fixture, registration and season figures — and has never let the player
change any of it. Wrong preferred position, an old email address, a squad
number nobody updated: every one of these sat until a registrar noticed or
was told by hand. Requested September 2026, alongside [scope 62](./62_named_roles_for_actors_already_documented.md)'s
audit, and recorded as **BR149**.

## The shape, borrowed rather than invented

BR55 already solved this problem for the legal name: a family states it, a
registrar confirms it, and the confirmed value is the only one anyone
downstream ever sees. This applies the same shape one level down — the
*subject* states it about themselves, and a role the system already trusts
confirms it — and reuses the machinery [scope 39](./39_asking_at_the_door_whether_they_also_officiate.md)
built for exactly this pattern: `officiating_interest` is a claim a
coordinator reviews before it becomes a `referee_classification`;
`player_record_correction` is a claim a coach, coordinator, registrar or
admin reviews before it becomes the real `person`/`player_profile` row.

**A separate table, not shadow columns on the real ones.** Writing the
proposed values into `person`/`player_profile` directly — even behind an
`is_pending` flag — puts the unconfirmed value in the same row as the
confirmed one, which is precisely the confusion BR149 exists to prevent:
a reader who forgets to check the flag reads the guess as the fact. A
separate table with its own lifecycle means the confirmed columns are
**never** written until a human says so, and there is nothing to forget
to check.

## What may be proposed, and what may not (BR149, #77)

| Proposable | Excluded, and why |
| ---------- | ------------------ |
| `person.preferred_name` | — |
| `person.email` | — |
| `player_profile.preferred_position` | — |
| `player_profile.secondary_position` | — |
| `player_profile.preferred_foot` | — |
| `player_profile.squad_number` | — |
| — | `person.legal_given_names`/`legal_family_name` — BR55's registrar-verified identity |
| — | `person.date_of_birth` — drives BR63's account threshold, BR84's clearance exemption, BR69's life membership; too eligibility-critical for self-report at any age |
| — | `person.photo_path` — BR56's own consent-gated flow |
| — | `player_profile.height_cm`/`weight_kg` — BR125 assigns these specifically to the coach or Technical Director, "the people who see the child," not to self-report even by an adult |

## Who may propose, and who may confirm

**Propose: the player themselves, and only once they are eighteen.**
Resolved from the caller's own session the way [`answerDesignationAction`](../../src/app/me/_designations/actions.ts)
already resolves an answerer — never a form field naming who — and
enforced again in the database by a trigger, the same belt-and-braces every
age-gated rule in this schema uses (0045's `assert_designation_is_answered_by_its_adult`
is the direct precedent). A guardian does not propose on a minor's behalf;
BR149 is deliberately narrower than decision 11's family reads, because a
minor's record already has a registrar-facing correction path and this one
does not reopen it.

**Confirm: admin, registrar, coordinator, coach or Technical Director** —
the same set BR125 already trusts with a player's physique, since a
squad-number or position change is exactly the kind of thing the person
picking the team needs to have actually seen.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No new goal. Serves the same instinct as BR55 and BR136 — a claim is not a fact until somebody who may confirm it has |
| 2_business | **BR149 added.** Resolves [#77](./open-questions.md), which scope 62's audit raised |
| 3_information | **One new table, `player_record_correction`** — a claim, never a direct write to `person`/`player_profile`. One live pending proposal per registration (unique partial index), the same shape `officiating_interest_pending_idx` uses |
| 4_application | New panel on the player workspace (`PlayerWorkspace.tsx`) to propose and to see a pending proposal's state; new panel on the registrar's player detail page to confirm or decline. `src/data/player-record-correction.ts` for both sides' reads and writes |
| 5_technology | No change |

## Deliverables

- **Migration:** `supabase/migrations/0052_player_record_self_correction.sql` — `player_record_correction`, a trigger enforcing BR149's adult-and-own-registration gate, RLS (own read via `app_my_person_ids()`, officer read via the five confirming roles, propose via an RLS insert policy, no update policy at all), and `app_review_player_record_correction()`.
- **Data:** `src/data/player-record-correction.ts` — `proposeCorrection`, `loadMyCorrection`, `loadPendingCorrections`, `reviewCorrection`.
- **Screens:** a propose/pending panel on `PlayerWorkspace.tsx`, shown only once `ageAt(dateOfBirth, today) >= 18`; a confirm/decline panel on `/registrar/players/[registrationId]`.
- **Tests:** `supabase/tests/53_player_record_self_correction.sql`.
- **Rule:** BR149.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| Self-service correction for an adult player, six fields | A guardian proposing on a minor's behalf — BR149 is deliberately narrower than decision 11's family reads |
| One pending proposal at a time per registration | A history of past proposals surfaced on screen — the table keeps every row (append is never destructive), but no screen lists anything but the live one, the same choice `officiating_interest`'s own screen made ([#79](./open-questions.md)) |
| Confirm/decline by the five roles BR125 already trusts | A notification to the confirming roles when a proposal arrives — `notification` (scope 39's gap, closed by scope 58) is the obvious mechanism and was not wired here, to keep this change to the one thing that was asked for |

## Gap notes

- **No notification.** A coach or admin only sees a pending correction by opening the player's record. [Scope 58](./58_a_bell_for_the_referee_coordinator.md) built exactly the mechanism this would need — the same shape, a different `kind`. Left for whoever picks it up next, named rather than silently absent.
