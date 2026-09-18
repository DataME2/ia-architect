# Project Scope — A Player Reaches the Workspace BR63 Promised

_[← Scope index](./README.md) · [EA home](../ea/README.md)_

**ArchiMate viewpoint:** Implementation & Migration.
**Delivered as:** branch `claude/player-invitation`.
**Status: built.**

## Why this exists

BR63 says a Person of thirteen or over "may hold their own account and see
their own record." Traced end to end while answering a direct question
about how a player reaches `/me`, the promise turned out to be only half
true: a player can create an `auth.users` account, and `PlayerWorkspace`
already renders correctly once that account is linked to their Person —
but **nothing ever links it**. `/registrar/access`, the only screen that
calls `link_account_to_person()`, builds its account list from
`app_club_accounts()`, which reads `club_membership` — and a player
deliberately holds no `club_membership` row (the same reason a guardian
holds none, decision 11). The account a player creates for themselves
never appears on the one screen that could attach it to anybody.

A guardian does not have this problem. Scope 35 WP4 built a real
self-service path — `guardian_invitation` and `claim_family_access()` — for
exactly the same structural reason a guardian needs one: no
`club_membership` to hang a link off. This closes the identical gap for a
player, by moving that same shape one row over.

## The shape, moved rather than reinvented

`player_invitation` is `guardian_invitation`'s table, with the target
being the player's own Person rather than a guardian's. `claim_player_access()`
is `claim_family_access()`'s function, unchanged in every property that
matters: the email is read from the caller's own session, never an
argument; the club is derived from the invitation, never supplied; and no
`club_membership` row is ever created — a player's read access comes
entirely from `app_my_person_ids()` (0043) and `person_role`, exactly as it
already did for the account that never existed.

**BR150's gate mirrors BR126's exactly, for the same reason.** BR126
refuses a guardian invitation before a linked child's registration is
COMPLETE, because an empty workspace reads as broken rather than as early.
A player invited before their own registration is COMPLETE would open
`/me` to the same nothing. The trigger checks the player's own registration
directly, rather than through a guardianship join — there is no
intermediary here, the player is the registration.

**Thirteen, not eighteen.** BR63's own threshold, restated rather than
reinvented — the same number BR137 already uses for a player declaring
their own officiating interest. BR149 (scope 63)'s self-correction is
narrower on purpose, at eighteen; this is BR63's original promise, and it
gets BR63's original number.

## EA alignment (assessed top-down before implementing)

| Layer | Impact |
| ----- | ------ |
| 1_strategy | No new goal. Realises P1 and BR63, both already adopted, neither previously reachable for a player specifically |
| 2_business | **BR150 added** |
| 3_information | **One new table, `player_invitation`** — `guardian_invitation`'s shape, targeting a player's own Person. `claim_player_access()`, `guardian_invitation`'s claim function, moved |
| 4_application | New panel on the registration detail page (`/registrar/[registrationId]`) beside `GuardianInvite`, to invite the player themselves. `claim_player_access()` wired into `/auth/callback` alongside `claim_club_access()` and `claim_family_access()` |
| 5_technology | No change |

## Deliverables

- **Migration:** `supabase/migrations/0053_player_invitation.sql` — `player_invitation`, a trigger enforcing BR150 (thirteen or over, own registration COMPLETE), RLS (club-officer read and insert, no update — claimed only through the function), `claim_player_access()`.
- **Data:** `src/data/player-invitation.ts` — `loadPlayerInvitationStatus`, `recordPlayerInvitation`.
- **Screens:** `PlayerInvite.tsx` on the registration detail page, beside `GuardianInvite`; `invitePlayerAction` in `src/app/registrar/actions.ts`, the same anon-key `signInWithOtp` shape `inviteGuardianAction` already uses.
- **Wiring:** `claim_player_access()` added to `/auth/callback/route.ts`.
- **Tests:** `supabase/tests/54_player_invitation.sql`.
- **Rule:** BR150.

## In scope / out of scope

| In scope | Out of scope (gaps, candidate future work) |
| -------- | ------------------------------------------ |
| A player of thirteen or over invited to their own workspace, once COMPLETE | A player under thirteen — BR63's own floor; nothing here changes it |
| No `club_membership` ever granted | A combined invite ("invite the family") — the guardian and the player are separate people with separate accounts and separate invitations, sent separately, on purpose |
| The database refusing an early or underage invitation | Retrying a failed send — `record_interest`'s BR147 pattern exists and was not pulled in here, to keep this change to the one gap that was asked about |

## Gap notes

- **A player and their guardian can now both be invited, and nothing coordinates the two.** A club inviting a fifteen-year-old and their parent sends two separate links, from two separate places on the same page. That is correct — they are different people with different accounts — but a registrar doing this for the first time may expect one button.
